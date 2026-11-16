import { AdminError, adminFailure, requireUser, serviceAdmin } from "@/lib/admin";
import { assertReturnQty, isReturnReason } from "@/lib/product-health";

interface OrderItem {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

interface ReturnItemInput {
  productId: string;
  size: string;
  qty: number;
  reason: string;
}

export async function GET(request: Request) {
  try {
    const { user, admin } = await requireUser(request);
    const { data, error } = await admin.database
      .from("returns")
      .select("id,order_id,status,notes,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new AdminError("Unable to load returns.", 502);
    const returns = (data as { id: string }[] | null) ?? [];
    const ids = returns.map((r) => r.id);
    let items: unknown[] = [];
    if (ids.length) {
      const { data: itemRows, error: itemError } = await admin.database
        .from("return_items")
        .select("id,return_id,product_id,product_name,size,qty,reason")
        .in("return_id", ids)
        .limit(1000);
      if (itemError) throw new AdminError("Unable to load return items.", 502);
      items = itemRows ?? [];
    }
    return Response.json({ returns, items });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireUser(request);
    const body = (await request.json()) as {
      orderId?: string;
      notes?: string;
      items?: ReturnItemInput[];
    };
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId)) {
      throw new AdminError("Invalid order ID.");
    }
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new AdminError("Select at least one item to return.");

    const { data: order, error: orderError } = await admin.database
      .from("orders")
      .select("id,user_id,payment_status,status,items")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (orderError) throw new AdminError("Unable to load order.", 502);
    if (!order) throw new AdminError("Order not found.", 404);
    const orderRow = order as {
      payment_status: string;
      status: string;
      items: OrderItem[];
    };
    if (orderRow.payment_status !== "paid") {
      throw new AdminError("Only paid orders can be returned.");
    }
    if (orderRow.status === "cancelled" || orderRow.status === "canceled" || orderRow.status === "pending") {
      throw new AdminError("This order is not eligible for returns.");
    }

    const purchased = new Map<string, { qty: number; name: string }>();
    for (const line of orderRow.items ?? []) {
      const key = `${line.id}::${line.size}`;
      const existing = purchased.get(key);
      purchased.set(key, {
        qty: (existing?.qty ?? 0) + Number(line.qty),
        name: line.name,
      });
    }

    const already = await returnedQtyByLine(admin, orderId);
    const normalized: {
      product_id: string;
      product_name: string;
      size: string;
      qty: number;
      reason: string;
    }[] = [];

    for (const item of items) {
      if (!item || typeof item.productId !== "string") throw new AdminError("Invalid return item.");
      const size = typeof item.size === "string" ? item.size : "";
      const key = `${item.productId}::${size}`;
      const purchasedLine = purchased.get(key);
      if (!purchasedLine) throw new AdminError("Item was not on this order.");
      if (!isReturnReason(item.reason)) throw new AdminError("Invalid return reason.");
      const qty = Number(item.qty);
      try {
        assertReturnQty(purchasedLine.qty, already.get(key) ?? 0, qty);
      } catch (error) {
        throw new AdminError(error instanceof Error ? error.message : "Invalid quantity.");
      }
      normalized.push({
        product_id: item.productId,
        product_name: purchasedLine.name,
        size,
        qty,
        reason: item.reason,
      });
      already.set(key, (already.get(key) ?? 0) + qty);
    }

    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const { data: created, error: createError } = await admin.database
      .from("returns")
      .insert([
        {
          order_id: orderId,
          user_id: user.id,
          status: "requested",
          notes: notes || null,
        },
      ])
      .select("id,order_id,status,notes,created_at")
      .single();
    if (createError || !created) throw new AdminError("Unable to create return request.", 502);
    const returnRow = created as { id: string };

    const { error: itemsError } = await admin.database.from("return_items").insert(
      normalized.map((item) => ({
        return_id: returnRow.id,
        ...item,
      })),
    );
    if (itemsError) {
      await admin.database.from("returns").update({ status: "cancelled" }).eq("id", returnRow.id);
      throw new AdminError("Unable to save return items.", 502);
    }

    return Response.json({ return: created, items: normalized }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}

async function returnedQtyByLine(
  admin: ReturnType<typeof serviceAdmin>,
  orderId: string,
): Promise<Map<string, number>> {
  const { data: returns } = await admin.database
    .from("returns")
    .select("id,status")
    .eq("order_id", orderId)
    .limit(200);
  const active = ((returns as { id: string; status: string }[] | null) ?? []).filter(
    (r) => r.status !== "cancelled" && r.status !== "rejected",
  );
  const map = new Map<string, number>();
  if (!active.length) return map;
  const { data: items } = await admin.database
    .from("return_items")
    .select("return_id,product_id,size,qty")
    .in(
      "return_id",
      active.map((r) => r.id),
    )
    .limit(1000);
  for (const item of (items as { product_id: string; size: string; qty: number }[] | null) ?? []) {
    const key = `${item.product_id}::${item.size}`;
    map.set(key, (map.get(key) ?? 0) + Number(item.qty));
  }
  return map;
}
