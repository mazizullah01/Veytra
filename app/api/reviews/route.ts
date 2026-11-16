import { AdminError, adminFailure, requireUser, serviceAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId")?.trim();
    if (!productId) throw new AdminError("productId is required.");
    const admin = serviceAdmin();
    const { data, error } = await admin.database
      .from("product_reviews")
      .select("id,product_id,rating,body,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new AdminError("Unable to load reviews.", 502);
    return Response.json({ reviews: data ?? [] });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireUser(request);
    const body = (await request.json()) as {
      productId?: string;
      orderId?: string;
      rating?: number;
      body?: string;
    };
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) throw new AdminError("productId is required.");
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AdminError("Rating must be an integer from 1 to 5.");
    }
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
    const orderId =
      typeof body.orderId === "string" &&
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(body.orderId)
        ? body.orderId
        : null;

    if (orderId) {
      const { data: order } = await admin.database
        .from("orders")
        .select("id,user_id,payment_status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!order || (order as { payment_status: string }).payment_status !== "paid") {
        throw new AdminError("Order is not eligible for a review.");
      }
    }

    const { data: existing } = await admin.database
      .from("product_reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await admin.database
        .from("product_reviews")
        .update({ rating, body: text, order_id: orderId })
        .eq("id", (existing as { id: string }).id)
        .select("id,product_id,rating,body,created_at")
        .single();
      if (error || !data) throw new AdminError("Unable to update review.", 502);
      return Response.json({ review: data });
    }

    const { data, error } = await admin.database
      .from("product_reviews")
      .insert([
        {
          product_id: productId,
          user_id: user.id,
          order_id: orderId,
          rating,
          body: text,
        },
      ])
      .select("id,product_id,rating,body,created_at")
      .single();
    if (error || !data) throw new AdminError("Unable to save review.", 502);
    return Response.json({ review: data }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
