import { adminClient, appUrl, ownedOrder, PaymentError, paymentFailure, stripeClient, usdCents, verifySession } from "@/lib/stripe-server";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== "string") throw new PaymentError("Order ID is required.");
    const { order, user } = await ownedOrder(request, orderId);
    if (order.payment_status === "paid" || order.status !== "pending") throw new PaymentError("This order cannot be paid again.", 409);
    if (order.payment_method !== "stripe") throw new PaymentError("This order does not use Stripe.", 409);
    const stripe = stripeClient();
    if (order.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      verifySession(existing, order);
      if (existing.payment_status === "paid" || existing.status === "complete") throw new PaymentError("Payment is processing. View your orders for confirmation.", 409);
      if (existing.status === "open" && existing.url) return Response.json({ url: existing.url });
    }
    const origin = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment", allowed_payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: usdCents(order.total), product_data: { name: `VELOUR order ${order.id}` } } }],
      metadata: { orderId: order.id, userId: user.id }, client_reference_id: order.id,
      customer_email: user.email,
      success_url: `${origin}/payment/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/${order.id}?cancelled=true`,
    }, { idempotencyKey: `velour:${order.id}:${order.stripe_session_id || "initial"}` });
    if (!session.url) throw new PaymentError("Stripe did not provide a checkout URL.", 502);
    const admin = adminClient();
    let update = admin.database.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id).eq("payment_status", "unpaid").eq("status", "pending");
    update = order.stripe_session_id ? update.eq("stripe_session_id", order.stripe_session_id) : update.is("stripe_session_id", null);
    const saved = await update.select("id").maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data) {
      const latest = await admin.database.from("orders").select("stripe_session_id,payment_status").eq("id", order.id).single();
      if (latest.error || latest.data?.stripe_session_id !== session.id || latest.data?.payment_status === "paid") throw new PaymentError("Order changed. Refresh and try again.", 409);
    }
    return Response.json({ url: session.url });
  } catch (error) { return paymentFailure(error); }
}
