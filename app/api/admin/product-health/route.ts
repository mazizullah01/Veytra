import { AdminError, adminFailure, requireAdmin } from "@/lib/admin";
import {
  aggregateHealthRows,
  loadCompletedReturnItems,
  loadOpenAlertCounts,
  loadPaidOrderItems,
  loadProductsMeta,
  loadReviews,
} from "@/lib/product-health/analytics";

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdmin(request);
    const url = new URL(request.url);
    const category = url.searchParams.get("category")?.trim() ?? "";
    const status = url.searchParams.get("status")?.trim() ?? "";
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const sort = url.searchParams.get("sort") ?? "urgency";

    const [soldLines, returnItems, reviews, products, openAlerts] = await Promise.all([
      loadPaidOrderItems(admin),
      loadCompletedReturnItems(admin),
      loadReviews(admin),
      loadProductsMeta(admin),
      loadOpenAlertCounts(admin),
    ]);

    let rows = aggregateHealthRows({
      soldLines,
      returnItems,
      reviews,
      products,
      openAlerts,
    });

    if (category) rows = rows.filter((row) => row.category === category);
    if (status) rows = rows.filter((row) => row.healthStatus === status);
    if (q) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.productId.toLowerCase().includes(q) ||
          (row.topIssue ?? "").toLowerCase().includes(q),
      );
    }

    if (sort === "rate") {
      rows.sort((a, b) => (b.returnRate ?? -1) - (a.returnRate ?? -1));
    } else if (sort === "returns") {
      rows.sort((a, b) => b.returnedUnits - a.returnedUnits);
    } else if (sort === "score") {
      rows.sort((a, b) => (a.healthScore ?? 101) - (b.healthScore ?? 101));
    } else {
      rows.sort((a, b) => b.urgency - a.urgency);
    }

    return Response.json({ products: rows });
  } catch (error) {
    return adminFailure(error);
  }
}
