-- App confirms paid Stripe orders with status = 'confirmed', but the live
-- check constraint still only allowed pending|paid|shipped|delivered.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE public.orders SET status = 'confirmed' WHERE status = 'paid';
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text]));
