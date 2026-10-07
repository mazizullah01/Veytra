import { authenticatedClient, ownedOrder, PaymentError, paymentFailure, stripeClient, verifySession } from "@/lib/stripe-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("session_id");
    if (!id || !/^cs_test_[a-zA-Z0-9]+$/.test(id)) throw new PaymentError("Invalid checkout session.");
    await authenticatedClient(request);
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (!session.metadata?.orderId) throw new PaymentError("Order not found.", 404);
    const { order } = await ownedOrder(request, session.metadata.orderId);
    verifySession(session, order);
    return Response.json({ orderId: order.id, stripePaid: session.payment_status === "paid", paymentStatus: order.payment_status, status: order.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return paymentFailure(error); }
}
