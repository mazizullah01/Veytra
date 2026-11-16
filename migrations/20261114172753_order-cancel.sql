-- Customers can cancel an order that has not shipped.
-- Paid cancellations are marked refunded after the Stripe refund succeeds.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'refunded'::text]));
