import { productImageSrc } from "@/lib/format";
import {
  authenticatedClient,
  confirmPaidOrder,
  ownedOrder,
  PaymentError,
  paymentFailure,
  stripeClient,
} from "@/lib/stripe-server";

export const runtime = "nodejs";

type OrderLine = { id: string; name: string; size: string; qty: number; price: number; image?: string };

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("session_id");
    if (!id || !/^cs_test_[a-zA-Z0-9]+$/.test(id)) {
      throw new PaymentError("Invalid checkout session.");
    }
    const { client } = await authenticatedClient(request);
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (!session.metadata?.orderId) throw new PaymentError("Order not found.", 404);
    const { order } = await ownedOrder(request, session.metadata.orderId);
    // Verify with Stripe, then confirm the order if payment is paid
    // (covers delayed/misconfigured webhooks without trusting the browser).
    const confirmed =
      session.payment_status === "paid"
        ? await confirmPaidOrder(session, order)
        : order;

    const detail = await client.database
      .from("orders")
      .select("id,order_number,created_at,total,status,payment_status,items")
      .eq("id", confirmed.id)
      .single();
    if (detail.error || !detail.data) throw new PaymentError("Unable to load order details.", 502);

    const rawItems = Array.isArray(detail.data.items) ? (detail.data.items as OrderLine[]) : [];
    const productIds = [...new Set(rawItems.map((item) => item.id).filter(Boolean))];
    const imageById = new Map<string, string>();
    if (productIds.length) {
      const products = await client.database.from("products").select("id,images").in("id", productIds);
      for (const row of (products.data as { id: string; images: unknown }[] | null) ?? []) {
        const images = Array.isArray(row.images) ? row.images : [];
        const first = typeof images[0] === "string" ? productImageSrc(images[0]) : "";
        if (first) imageById.set(row.id, first);
      }
    }

    const items = rawItems.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
      image: item.image || imageById.get(item.id) || "/images/placeholder.jpg",
    }));

    return Response.json(
      {
        orderId: detail.data.id,
        orderNumber: detail.data.order_number,
        createdAt: detail.data.created_at,
        total: detail.data.total,
        stripePaid: session.payment_status === "paid",
        paymentStatus: detail.data.payment_status,
        status: detail.data.status,
        items,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return paymentFailure(error);
  }
}
