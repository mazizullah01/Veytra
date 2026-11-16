-- Product Health: returns, reviews, AI insight cache, and alerts.

CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'completed', 'cancelled')),
  notes text,
  evidence_url text,
  evidence_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS returns_user_id_idx ON public.returns (user_id);
CREATE INDEX IF NOT EXISTS returns_order_id_idx ON public.returns (order_id);
CREATE INDEX IF NOT EXISTS returns_status_idx ON public.returns (status);

CREATE TABLE IF NOT EXISTS public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  qty integer NOT NULL CHECK (qty > 0),
  reason text NOT NULL
    CHECK (reason IN (
      'too_small', 'too_large', 'wrong_fit', 'quality', 'damaged',
      'wrong_item', 'description', 'color', 'value', 'changed_mind', 'other'
    )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_items_return_id_idx ON public.return_items (return_id);
CREATE INDEX IF NOT EXISTS return_items_product_id_idx ON public.return_items (product_id);

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_reviews_product_id_idx ON public.product_reviews (product_id);

CREATE TABLE IF NOT EXISTS public.product_health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT '',
  source_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  kind text NOT NULL,
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'dismissed')),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS product_health_alerts_status_idx ON public.product_health_alerts (status);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_health_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS returns_select_own ON public.returns;
CREATE POLICY returns_select_own ON public.returns
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS returns_insert_own ON public.returns;
CREATE POLICY returns_insert_own ON public.returns
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'requested'
  );

DROP POLICY IF EXISTS returns_update_own_requested ON public.returns;
CREATE POLICY returns_update_own_requested ON public.returns
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'requested')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status IN ('requested', 'cancelled'));

DROP POLICY IF EXISTS return_items_select_own ON public.return_items;
CREATE POLICY return_items_select_own ON public.return_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS return_items_insert_own ON public.return_items;
CREATE POLICY return_items_insert_own ON public.return_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_id AND r.user_id = (SELECT auth.uid()) AND r.status = 'requested'
    )
  );

DROP POLICY IF EXISTS product_reviews_select_all ON public.product_reviews;
CREATE POLICY product_reviews_select_all ON public.product_reviews
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS product_reviews_insert_own ON public.product_reviews;
CREATE POLICY product_reviews_insert_own ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS product_reviews_update_own ON public.product_reviews;
CREATE POLICY product_reviews_update_own ON public.product_reviews
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Insights and alerts are service-role only (no client policies).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_reviews TO anon, authenticated;
GRANT SELECT ON public.product_reviews TO anon;
