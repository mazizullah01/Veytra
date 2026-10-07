ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe';
ALTER TABLE public.orders ALTER COLUMN payment_method SET DEFAULT 'stripe';
ALTER TABLE public.orders ADD COLUMN stripe_session_id text;
CREATE UNIQUE INDEX orders_stripe_session_id_unique ON public.orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
-- Remove the previous browser-confirmed payment surface, including column grants.
DROP POLICY IF EXISTS orders_confirm_payment ON public.orders;
REVOKE UPDATE ON public.orders FROM anon, authenticated;
REVOKE UPDATE (status, payment_status) ON public.orders FROM anon, authenticated;
ALTER POLICY orders_insert ON public.orders WITH CHECK (
  user_id = (SELECT auth.uid()) AND status = 'pending' AND payment_status = 'unpaid'
  AND payment_method = 'stripe' AND stripe_session_id IS NULL
);
-- Existing unpaid PayPal orders can now be paid securely through Stripe.
UPDATE public.orders SET payment_method = 'stripe' WHERE payment_status = 'unpaid';
UPDATE public.orders SET status = 'confirmed', payment_status = 'paid' WHERE status = 'paid';
