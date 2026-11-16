import { AdminError, adminFailure, requireAdmin } from "@/lib/admin";
import {
  alertFingerprint,
  computeHealthScore,
  healthStatusFromScore,
  RETURN_REASON_LABELS,
  returnRate,
  type ReturnReason,
} from "@/lib/product-health";
import {
  diagnoseWithGemini,
  feedbackSourceHash,
  type DiagnosisPayload,
} from "@/lib/product-health/ai-diagnosis";
import {
  loadCompletedReturnItems,
  loadPaidOrderItems,
  loadProductsMeta,
  loadReviews,
  reasonBreakdown,
} from "@/lib/product-health/analytics";

export async function GET(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const { admin } = await requireAdmin(request);
    const { productId } = await context.params;
    if (!productId) throw new AdminError("Product id required.", 404);

    const [soldLines, allReturnItems, reviews, products] = await Promise.all([
      loadPaidOrderItems(admin),
      loadCompletedReturnItems(admin),
      loadReviews(admin, productId),
      loadProductsMeta(admin),
    ]);

    const meta = products.get(productId);
    const soldUnits = soldLines.filter((l) => l.id === productId).reduce((sum, l) => sum + l.qty, 0);
    const returnItems = allReturnItems.filter((i) => i.product_id === productId);
    const returnedUnits = returnItems.reduce((sum, i) => sum + i.qty, 0);
    const reasons = reasonBreakdown(returnItems);
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    const negativeReviewRate = reviews.length
      ? reviews.filter((r) => r.rating <= 2).length / reviews.length
      : 0;
    const topCount = reasons[0]?.count ?? 0;
    const totalReasonQty = reasons.reduce((sum, r) => sum + r.count, 0);
    const healthScore = computeHealthScore({
      soldUnits,
      returnedUnits,
      avgRating,
      negativeReviewRate,
      repeatedIssueWeight: totalReasonQty > 0 ? topCount / totalReasonQty : 0,
    });
    const healthStatus = healthStatusFromScore(healthScore, soldUnits);

    const { data: returnsForProduct } = await admin.database
      .from("return_items")
      .select("return_id,product_id,qty,reason,size,product_name")
      .eq("product_id", productId)
      .limit(500);
    const returnIds = [
      ...new Set(
        ((returnsForProduct as { return_id: string }[] | null) ?? []).map((r) => r.return_id),
      ),
    ];
    let returnHistory: unknown[] = [];
    let returnNotes: { id: string; text: string }[] = [];
    if (returnIds.length) {
      const { data: returnRows } = await admin.database
        .from("returns")
        .select("id,order_id,status,notes,created_at,updated_at")
        .in("id", returnIds)
        .order("created_at", { ascending: false })
        .limit(200);
      returnHistory = returnRows ?? [];
      returnNotes = ((returnRows as { id: string; notes: string | null }[] | null) ?? [])
        .filter((r) => r.notes)
        .map((r) => ({ id: r.id, text: r.notes as string }));
    }

    const name =
      meta?.name ??
      soldLines.find((l) => l.id === productId)?.name ??
      returnItems[0]?.product_name ??
      productId;

    const bundle = {
      productId,
      productName: name,
      reasons,
      returnNotes,
      reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, body: r.body })),
    };
    const sourceHash = feedbackSourceHash(bundle);

    let diagnosis: DiagnosisPayload;
    const { data: cached } = await admin.database
      .from("product_health_insights")
      .select("payload,model,source_hash,updated_at")
      .eq("product_id", productId)
      .maybeSingle();
    const cacheRow = cached as
      | { payload: DiagnosisPayload; model: string; source_hash: string; updated_at: string }
      | null;

    if (cacheRow && cacheRow.source_hash === sourceHash && cacheRow.payload) {
      diagnosis = { ...cacheRow.payload, model: cacheRow.model || cacheRow.payload.model };
    } else {
      diagnosis = await diagnoseWithGemini(bundle);
      const insightRow = {
        product_id: productId,
        payload: diagnosis,
        model: diagnosis.model,
        source_hash: sourceHash,
        updated_at: new Date().toISOString(),
      };
      if (cacheRow) {
        await admin.database
          .from("product_health_insights")
          .update(insightRow)
          .eq("product_id", productId);
      } else {
        await admin.database.from("product_health_insights").insert([insightRow]);
      }
    }

    // Ensure alerts for critical / high return rate
    const rate = returnRate(soldUnits, returnedUnits);
    if (healthStatus === "Critical" || (rate != null && rate >= 25 && soldUnits >= 5)) {
      const kind = healthStatus === "Critical" ? "critical_health" : "high_return_rate";
      const fingerprint = alertFingerprint(kind, productId);
      const { data: existingAlert } = await admin.database
        .from("product_health_alerts")
        .select("id")
        .eq("product_id", productId)
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (!existingAlert) {
        await admin.database.from("product_health_alerts").insert([
          {
            product_id: productId,
            kind,
            fingerprint,
            status: "open",
            reason:
              healthStatus === "Critical"
                ? `Health score ${healthScore} (Critical)`
                : `Return rate ${rate?.toFixed(1)}%`,
          },
        ]);
      }
    }

    const { data: alerts } = await admin.database
      .from("product_health_alerts")
      .select("id,kind,fingerprint,status,reason,created_at,updated_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);

    const monthly = monthlyReturnTrend(
      returnHistory as { id: string; created_at: string; status: string }[],
      returnItems,
    );

    return Response.json({
      product: {
        id: productId,
        name,
        category: meta?.category ?? "",
        image: meta?.image ?? null,
        soldUnits,
        returnedUnits,
        returnRate: rate,
        healthScore,
        healthStatus,
        avgRating,
        reviewCount: reviews.length,
        topIssue: reasons[0]
          ? (RETURN_REASON_LABELS[reasons[0].reason as ReturnReason] ?? reasons[0].reason)
          : null,
      },
      reasons: reasons.map((r) => ({
        reason: r.reason,
        label: RETURN_REASON_LABELS[r.reason] ?? r.reason,
        count: r.count,
      })),
      diagnosis,
      reviews,
      returnHistory,
      returnItems: returnsForProduct ?? [],
      alerts: alerts ?? [],
      monthlyTrend: monthly,
    });
  } catch (error) {
    return adminFailure(error);
  }
}

function monthlyReturnTrend(
  returns: { id: string; created_at: string; status: string }[],
  items: { return_id: string; qty: number }[],
) {
  const qtyByReturn = new Map<string, number>();
  for (const item of items) {
    qtyByReturn.set(item.return_id, (qtyByReturn.get(item.return_id) ?? 0) + item.qty);
  }
  const buckets = new Map<string, number>();
  for (const row of returns) {
    if (row.status !== "completed") continue;
    const key = row.created_at.slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 0) + (qtyByReturn.get(row.id) ?? 0));
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, qty]) => ({ month, qty }));
}
