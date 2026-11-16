import { cancelOwnedOrder, paymentFailure } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
    const order = await cancelOwnedOrder(request, orderId);
    return Response.json({ order });
  } catch (error) {
    return paymentFailure(error);
  }
}
