/** Deterministic product health scoring — never AI-invented. */

export const HEALTH_CONFIG = {
  minSample: 5 as number,
  thresholds: {
    healthy: 90,
    monitor: 70,
    needsAttention: 50,
  },
  /** Weights for composite score (must sum conceptually to volume-aware blend). */
  weights: {
    returnRate: 0.45,
    volume: 0.15,
    negativeReviewRate: 0.2,
    avgRating: 0.15,
    repeatedIssue: 0.05,
  },
};

export type HealthStatus = "Healthy" | "Monitor" | "Needs Attention" | "Critical" | "Insufficient Data";

export const RETURN_REASONS = [
  "too_small",
  "too_large",
  "wrong_fit",
  "quality",
  "damaged",
  "wrong_item",
  "description",
  "color",
  "value",
  "changed_mind",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  too_small: "Too small",
  too_large: "Too large",
  wrong_fit: "Wrong fit / sizing",
  quality: "Quality issue",
  damaged: "Damaged / defective",
  wrong_item: "Wrong item received",
  description: "Not as described",
  color: "Color mismatch",
  value: "Not worth the price",
  changed_mind: "Changed mind",
  other: "Other",
};

export function isReturnReason(value: string): value is ReturnReason {
  return (RETURN_REASONS as readonly string[]).includes(value);
}

/** Return rate percentage; null when sold is 0. */
export function returnRate(soldUnits: number, returnedUnits: number): number | null {
  if (soldUnits <= 0) return null;
  const safeReturned = Math.max(0, Math.min(returnedUnits, soldUnits));
  return (safeReturned / soldUnits) * 100;
}

export function hasSufficientSample(soldUnits: number, minSample = HEALTH_CONFIG.minSample): boolean {
  return soldUnits >= minSample;
}

export function healthStatusFromScore(score: number | null, soldUnits: number, minSample = HEALTH_CONFIG.minSample): HealthStatus {
  if (!hasSufficientSample(soldUnits, minSample) || score === null) return "Insufficient Data";
  if (score >= HEALTH_CONFIG.thresholds.healthy) return "Healthy";
  if (score >= HEALTH_CONFIG.thresholds.monitor) return "Monitor";
  if (score >= HEALTH_CONFIG.thresholds.needsAttention) return "Needs Attention";
  return "Critical";
}

export interface HealthInputs {
  soldUnits: number;
  returnedUnits: number;
  /** 0–1 share of reviews with rating ≤ 2 */
  negativeReviewRate?: number;
  /** 1–5; omit when no reviews */
  avgRating?: number | null;
  /** 0–1 share of returns sharing the top reason */
  repeatedIssueWeight?: number;
  minSample?: number;
}

/**
 * Score 0–100. Higher is healthier.
 * Return rate dominates; low volume reduces confidence via volume factor.
 */
export function computeHealthScore(input: HealthInputs): number | null {
  const minSample = input.minSample ?? HEALTH_CONFIG.minSample;
  if (!hasSufficientSample(input.soldUnits, minSample)) return null;

  const rate = returnRate(input.soldUnits, input.returnedUnits) ?? 0;
  // 0% returns → 100, 40%+ returns → ~0
  const returnScore = Math.max(0, 100 - rate * 2.5);

  // Volume confidence: approaches 1 as sold grows past minSample
  const volumeScore = Math.min(100, (input.soldUnits / Math.max(minSample * 4, 20)) * 100);

  const neg = clamp01(input.negativeReviewRate ?? 0);
  const negativeScore = (1 - neg) * 100;

  const rating = input.avgRating;
  const ratingScore =
    rating == null || Number.isNaN(rating) ? 75 : Math.max(0, Math.min(100, ((rating - 1) / 4) * 100));

  const repeat = clamp01(input.repeatedIssueWeight ?? 0);
  const repeatedScore = (1 - repeat) * 100;

  const w = HEALTH_CONFIG.weights;
  const score =
    returnScore * w.returnRate +
    volumeScore * w.volume +
    negativeScore * w.negativeReviewRate +
    ratingScore * w.avgRating +
    repeatedScore * w.repeatedIssue;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Urgency: higher means more urgent. Favors volume × bad rate over tiny samples. */
export function urgencyRank(soldUnits: number, returnedUnits: number, score: number | null): number {
  if (soldUnits <= 0) return 0;
  const rate = returnRate(soldUnits, returnedUnits) ?? 0;
  const volumeFactor = Math.log10(soldUnits + 1);
  const scorePenalty = score == null ? 40 : 100 - score;
  return rate * volumeFactor + scorePenalty * 0.25 * volumeFactor;
}

export function remainingReturnableQty(purchased: number, alreadyReturned: number): number {
  return Math.max(0, purchased - Math.max(0, alreadyReturned));
}

export function assertReturnQty(purchased: number, alreadyReturned: number, requested: number): void {
  if (!Number.isInteger(requested) || requested < 1) {
    throw new Error("Return quantity must be a positive integer.");
  }
  const remaining = remainingReturnableQty(purchased, alreadyReturned);
  if (requested > remaining) {
    throw new Error(`Cannot return ${requested}; only ${remaining} remaining.`);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function alertFingerprint(kind: string, detail: string): string {
  return `${kind}:${detail}`.toLowerCase().replace(/\s+/g, "_").slice(0, 180);
}
