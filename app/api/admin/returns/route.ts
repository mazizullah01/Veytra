import { AdminError, adminFailure, requireAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdmin(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let query = admin.database
      .from("returns")
      .select("id,order_id,user_id,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new AdminError("Unable to load returns.", 502);
    const returns = (data as { id: string }[] | null) ?? [];
    const ids = returns.map((r) => r.id);
    let items: unknown[] = [];
    if (ids.length) {
      const { data: itemRows, error: itemError } = await admin.database
        .from("return_items")
        .select("id,return_id,product_id,product_name,size,qty,reason")
        .in("return_id", ids)
        .limit(2000);
      if (itemError) throw new AdminError("Unable to load return items.", 502);
      items = itemRows ?? [];
    }
    return Response.json({ returns, items });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin } = await requireAdmin(request);
    const body = (await request.json()) as { id?: string; status?: string };
    const id = typeof body.id === "string" ? body.id : "";
    const status = typeof body.status === "string" ? body.status : "";
    const allowed = new Set(["requested", "approved", "rejected", "completed", "cancelled"]);
    if (!id || !allowed.has(status)) throw new AdminError("Invalid return update.");
    const { data, error } = await admin.database
      .from("returns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,order_id,status,updated_at")
      .single();
    if (error || !data) throw new AdminError("Unable to update return.", 502);
    return Response.json({ return: data });
  } catch (error) {
    return adminFailure(error);
  }
}
