import "server-only";
import {
  computeHealthScore,
  healthStatusFromScore,
  returnRate,
  urgencyRank,
  type HealthStatus,
  type ReturnReason,
} from "@/lib/product-health";
import type { DiagnosisPayload } from "@/lib/product-health/ai-diagnosis";

export interface OrderItemLine {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface ProductHealthRow {
  productId: string;
  name: string;
  category: string;
  image: string | null;
  soldUnits: number;
  returnedUnits: number;
  returnRate: number | null;
  healthScore: number | null;
  healthStatus: HealthStatus;
  topIssue: string | null;
  urgency: number;
  openAlerts: number;
  avgRating: number | null;
  reviewCount: number;
}

/** Loose admin client shape — InsForge builders are thenable but not typed as Promise. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { database: { from: (table: string) => any } };

async function runQuery(builder: {
  then?: (resolve: (value: { data: unknown; error: unknown }) => void) => void;
}): Promise<{ data: unknown; error: unknown }> {
  return builder as unknown as Promise<{ data: unknown; error: unknown }>;
}

function asLines(items: unknown): OrderItemLine[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : "";
      const qty = typeof row.qty === "number" ? row.qty : Number(row.qty);
      if (!id || !Number.isFinite(qty) || qty <= 0) return null;
      return {
        id,
        name: typeof row.name === "string" ? row.name : id,
        size: typeof row.size === "string" ? row.size : "",
        qty: Math.floor(qty),
        price: typeof row.price === "number" ? row.price : Number(row.price) || 0,
      };
    })
    .filter((line): line is OrderItemLine => Boolean(line));
}

export async function loadPaidOrderItems(admin: AdminDb): Promise<OrderItemLine[]> {
  const { data, error } = await runQuery(
    admin.database.from("orders").select("items,payment_status,status").eq("payment_status", "paid").limit(5000),
  );
  if (error) throw new Error("Unable to load paid orders.");
  const rows = (data as { items: unknown; status: string }[] | null) ?? [];
  const lines: OrderItemLine[] = [];
  for (const row of rows) {
    if (row.status === "cancelled" || row.status === "canceled") continue;
    lines.push(...asLines(row.items));
  }
  return lines;
}

export async function loadCompletedReturnItems(
  admin: AdminDb,
): Promise<{ product_id: string; product_name: string; size: string; qty: number; reason: string; return_id: string }[]> {
  const { data: returns, error } = await runQuery(
    admin.database.from("returns").select("id,status").eq("status", "completed").limit(5000),
  );
  if (error) throw new Error("Unable to load returns.");
  const completed = ((returns as { id: string }[] | null) ?? []).map((r) => r.id);
  if (!completed.length) return [];

  const { data: items, error: itemsError } = await runQuery(
    admin.database.from("return_items").select("product_id,product_name,size,qty,reason,return_id").in("return_id", completed).limit(10000),
  );
  if (itemsError) throw new Error("Unable to load return items.");
  return ((items as {
    product_id: string;
    product_name: string;
    size: string;
    qty: number;
    reason: string;
    return_id: string;
  }[] | null) ?? []);
}

export async function loadReviews(admin: AdminDb, productId?: string) {
  let q = admin.database.from("product_reviews").select("id,product_id,rating,body,user_id,created_at").limit(5000);
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await runQuery(q);
  if (error) throw new Error("Unable to load reviews.");
  return ((data as {
    id: string;
    product_id: string;
    rating: number;
    body: string;
    user_id: string;
    created_at: string;
  }[] | null) ?? []);
}

export async function loadProductsMeta(admin: AdminDb) {
  const { data, error } = await runQuery(
    admin.database.from("products").select("id,name,category,images").limit(5000),
  );
  if (error) throw new Error("Unable to load products.");
  const map = new Map<string, { name: string; category: string; image: string | null }>();
  for (const row of (data as { id: string; name: string; category: string; images: unknown }[] | null) ?? []) {
    const images = Array.isArray(row.images) ? row.images : [];
    const image = typeof images[0] === "string" ? images[0] : null;
    map.set(row.id, { name: row.name, category: row.category, image });
  }
  return map;
}

export async function loadOpenAlertCounts(admin: AdminDb): Promise<Map<string, number>> {
  const { data, error } = await runQuery(
    admin.database.from("product_health_alerts").select("product_id,status").eq("status", "open").limit(5000),
  );
  if (error) return new Map();
  const counts = new Map<string, number>();
  for (const row of (data as { product_id: string }[] | null) ?? []) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  return counts;
}

export function aggregateHealthRows(input: {
  soldLines: OrderItemLine[];
  returnItems: { product_id: string; product_name: string; qty: number; reason: string }[];
  reviews: { product_id: string; rating: number }[];
  products: Map<string, { name: string; category: string; image: string | null }>;
  openAlerts: Map<string, number>;
}): ProductHealthRow[] {
  const sold = new Map<string, number>();
  const names = new Map<string, string>();
  for (const line of input.soldLines) {
    sold.set(line.id, (sold.get(line.id) ?? 0) + line.qty);
    if (!names.has(line.id)) names.set(line.id, line.name);
  }

  const returned = new Map<string, number>();
  const reasonCounts = new Map<string, Map<string, number>>();
  for (const item of input.returnItems) {
    returned.set(item.product_id, (returned.get(item.product_id) ?? 0) + item.qty);
    if (!names.has(item.product_id) && item.product_name) names.set(item.product_id, item.product_name);
    const map = reasonCounts.get(item.product_id) ?? new Map();
    map.set(item.reason, (map.get(item.reason) ?? 0) + item.qty);
    reasonCounts.set(item.product_id, map);
  }

  const reviewStats = new Map<string, { sum: number; count: number; negative: number }>();
  for (const review of input.reviews) {
    const stat = reviewStats.get(review.product_id) ?? { sum: 0, count: 0, negative: 0 };
    stat.sum += review.rating;
    stat.count += 1;
    if (review.rating <= 2) stat.negative += 1;
    reviewStats.set(review.product_id, stat);
  }

  const ids = new Set([...sold.keys(), ...returned.keys()]);
  const rows: ProductHealthRow[] = [];
  for (const productId of ids) {
    const soldUnits = sold.get(productId) ?? 0;
    const returnedUnits = returned.get(productId) ?? 0;
    const meta = input.products.get(productId);
    const reasons = reasonCounts.get(productId);
    let topIssue: string | null = null;
    let topCount = 0;
    let totalReasonQty = 0;
    if (reasons) {
      for (const [reason, count] of reasons) {
        totalReasonQty += count;
        if (count > topCount) {
          topCount = count;
          topIssue = reason;
        }
      }
    }
    const reviews = reviewStats.get(productId);
    const avgRating = reviews && reviews.count ? reviews.sum / reviews.count : null;
    const negativeReviewRate = reviews && reviews.count ? reviews.negative / reviews.count : 0;
    const repeatedIssueWeight = totalReasonQty > 0 ? topCount / totalReasonQty : 0;
    const healthScore = computeHealthScore({
      soldUnits,
      returnedUnits,
      avgRating,
      negativeReviewRate,
      repeatedIssueWeight,
    });
    rows.push({
      productId,
      name: meta?.name ?? names.get(productId) ?? productId,
      category: meta?.category ?? "",
      image: meta?.image ?? null,
      soldUnits,
      returnedUnits,
      returnRate: returnRate(soldUnits, returnedUnits),
      healthScore,
      healthStatus: healthStatusFromScore(healthScore, soldUnits),
      topIssue,
      urgency: urgencyRank(soldUnits, returnedUnits, healthScore),
      openAlerts: input.openAlerts.get(productId) ?? 0,
      avgRating,
      reviewCount: reviews?.count ?? 0,
    });
  }

  rows.sort((a, b) => b.urgency - a.urgency);
  return rows;
}

export function reasonBreakdown(
  returnItems: { reason: string; qty: number }[],
): { reason: ReturnReason; count: number }[] {
  const map = new Map<string, number>();
  for (const item of returnItems) {
    map.set(item.reason, (map.get(item.reason) ?? 0) + item.qty);
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason: reason as ReturnReason, count }))
    .sort((a, b) => b.count - a.count);
}

export type { DiagnosisPayload };
