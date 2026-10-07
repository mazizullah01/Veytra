import Stripe from "stripe";
import { adminClient, orderColumns, PaymentOrder, paymentFailure, stripeClient, verifySession } from "@/lib/stripe-server";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: "Invalid webhook signature." }, { status: 400 }); }
  if (event.livemode) return Response.json({ error: "Only Sandbox events are accepted." }, { status: 400 });
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });
  try {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return Response.json({ received: true });
    const id = session.metadata?.orderId;
    if (!id) return Response.json({ error: "Missing order metadata." }, { status: 400 });
    const admin = adminClient();
    const result = await admin.database.from("orders").select(orderColumns).eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return Response.json({ error: "Order not found." }, { status: 404 });
    const order = result.data as PaymentOrder;
    verifySession(session, order);
    if (order.payment_status !== "paid") {
      const updated = await admin.database.from("orders").update({ payment_status: "paid", status: "confirmed" })
        .eq("id", id).eq("stripe_session_id", session.id).eq("payment_status", "unpaid").eq("status", "pending").select("id").maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) {
        const latest = await admin.database.from("orders").select("payment_status").eq("id", id).single();
        if (latest.error || latest.data?.payment_status !== "paid") return Response.json({ error: "Order confirmation failed." }, { status: 409 });
      }
    }
    return Response.json({ received: true });
  } catch (error) { return paymentFailure(error); }
}
