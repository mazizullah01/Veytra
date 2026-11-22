-- Human-readable customer order references (#VT-1000…) while keeping UUID primary keys.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq START WITH 1000;

-- Backfill existing rows in creation order.
WITH ranked AS (
  SELECT id,
         '#VT-' || lpad(nextval('public.orders_order_number_seq')::text, 4, '0') AS ref
  FROM public.orders
  WHERE order_number IS NULL
  ORDER BY created_at ASC NULLS LAST, id ASC
)
UPDATE public.orders o
SET order_number = ranked.ref
FROM ranked
WHERE o.id = ranked.id;

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := '#VT-' || lpad(nextval('public.orders_order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_assign_order_number ON public.orders;
CREATE TRIGGER orders_assign_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_order_number();

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders (order_number);

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;
