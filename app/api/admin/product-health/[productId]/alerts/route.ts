import { AdminError, adminFailure, requireAdmin } from "@/lib/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const { admin } = await requireAdmin(request);
    const { productId } = await context.params;
    const body = (await request.json()) as {
      alertId?: string;
      status?: string;
      reason?: string;
    };
    const alertId = typeof body.alertId === "string" ? body.alertId : "";
    const status = body.status === "acknowledged" || body.status === "dismissed" ? body.status : "";
    if (!alertId || !status) throw new AdminError("alertId and status (acknowledged|dismissed) required.");
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    const { data, error } = await admin.database
      .from("product_health_alerts")
      .update({
        status,
        reason: reason || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("product_id", productId)
      .select("id,product_id,kind,fingerprint,status,reason,updated_at")
      .single();
    if (error || !data) throw new AdminError("Unable to update alert.", 502);
    return Response.json({ alert: data });
  } catch (error) {
    return adminFailure(error);
  }
}
