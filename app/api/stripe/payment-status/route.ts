import {
  authenticatedClient,
  confirmPaidOrder,
  ownedOrder,
  PaymentError,
  paymentFailure,
  stripeClient,
} from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("session_id");
    if (!id || !/^cs_test_[a-zA-Z0-9]+$/.test(id)) {
      throw new PaymentError("Invalid checkout session.");
    }
    await authenticatedClient(request);
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (!session.metadata?.orderId) throw new PaymentError("Order not found.", 404);
    const { order } = await ownedOrder(request, session.metadata.orderId);
    // Verify with Stripe, then confirm the order if payment is paid
    // (covers delayed/misconfigured webhooks without trusting the browser).
    const confirmed =
      session.payment_status === "paid"
        ? await confirmPaidOrder(session, order)
        : order;
    return Response.json(
      {
        orderId: confirmed.id,
        stripePaid: session.payment_status === "paid",
        paymentStatus: confirmed.payment_status,
        status: confirmed.status,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return paymentFailure(error);
  }
}
