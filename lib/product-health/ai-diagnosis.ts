import "server-only";
import { createHash } from "crypto";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { RETURN_REASON_LABELS, type ReturnReason } from "@/lib/product-health";

export interface DiagnosisEvidence {
  id: string;
  kind: "return" | "review";
  snippet: string;
}

export interface RankedIssue {
  title: string;
  count: number;
  reasonCodes: string[];
  evidenceIds: string[];
  summary: string;
}

export interface SuggestedAction {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface DiagnosisPayload {
  issues: RankedIssue[];
  actions: SuggestedAction[];
  model: string;
  sourceHash: string;
  generatedAt: string;
  error?: string;
}

export interface FeedbackBundle {
  productId: string;
  productName: string;
  reasons: { reason: ReturnReason; count: number }[];
  returnNotes: { id: string; text: string }[];
  reviews: { id: string; rating: number; body: string }[];
}

const MODEL = "gemini-3.1-flash-lite";

export function feedbackSourceHash(bundle: FeedbackBundle): string {
  const canonical = JSON.stringify({
    reasons: bundle.reasons,
    notes: bundle.returnNotes.map((n) => n.id + ":" + n.text.slice(0, 200)),
    reviews: bundle.reviews.map((r) => r.id + ":" + r.rating + ":" + r.body.slice(0, 200)),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 40);
}

function redact(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[phone]")
    .slice(0, 400);
}

export function emptyDiagnosis(sourceHash: string, error?: string): DiagnosisPayload {
  return {
    issues: [],
    actions: [],
    model: MODEL,
    sourceHash,
    generatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

export function validateDiagnosis(raw: unknown, sourceHash: string): DiagnosisPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.issues) || !Array.isArray(obj.actions)) return null;

  const issues: RankedIssue[] = [];
  for (const item of obj.issues.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.slice(0, 120) : "";
    if (!title) continue;
    issues.push({
      title,
      count: typeof row.count === "number" && Number.isFinite(row.count) ? Math.max(0, Math.round(row.count)) : 0,
      reasonCodes: Array.isArray(row.reasonCodes)
        ? row.reasonCodes.filter((c): c is string => typeof c === "string").slice(0, 6)
        : [],
      evidenceIds: Array.isArray(row.evidenceIds)
        ? row.evidenceIds.filter((c): c is string => typeof c === "string").slice(0, 12)
        : [],
      summary: typeof row.summary === "string" ? row.summary.slice(0, 400) : "",
    });
  }

  const actions: SuggestedAction[] = [];
  for (const item of obj.actions.slice(0, 6)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.slice(0, 120) : "";
    if (!title) continue;
    const priority = row.priority === "high" || row.priority === "low" ? row.priority : "medium";
    actions.push({
      title,
      detail: typeof row.detail === "string" ? row.detail.slice(0, 400) : "",
      priority,
    });
  }

  return {
    issues,
    actions,
    model: MODEL,
    sourceHash,
    generatedAt: new Date().toISOString(),
  };
}

/** Heuristic fallback when AI is unavailable — reason aggregates only, no invented prose. */
export function metricsOnlyDiagnosis(bundle: FeedbackBundle): DiagnosisPayload {
  const sourceHash = feedbackSourceHash(bundle);
  const issues: RankedIssue[] = bundle.reasons
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((r) => ({
      title: RETURN_REASON_LABELS[r.reason],
      count: r.count,
      reasonCodes: [r.reason],
      evidenceIds: [],
      summary: `${r.count} completed return${r.count === 1 ? "" : "s"} cited this reason.`,
    }));
  return {
    issues,
    actions: [],
    model: "metrics-only",
    sourceHash,
    generatedAt: new Date().toISOString(),
  };
}

export async function diagnoseWithGemini(bundle: FeedbackBundle): Promise<DiagnosisPayload> {
  const sourceHash = feedbackSourceHash(bundle);
  if (!process.env.GEMINI_API_KEY) {
    return { ...metricsOnlyDiagnosis(bundle), error: "GEMINI_API_KEY is not configured." };
  }

  const evidence: DiagnosisEvidence[] = [
    ...bundle.returnNotes.map((n) => ({ id: n.id, kind: "return" as const, snippet: redact(n.text) })),
    ...bundle.reviews.map((r) => ({
      id: r.id,
      kind: "review" as const,
      snippet: redact(`Rating ${r.rating}/5: ${r.body}`),
    })),
  ];

  if (bundle.reasons.every((r) => r.count === 0) && evidence.length === 0) {
    return emptyDiagnosis(sourceHash);
  }

  const deadlineMs = 20_000;
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      vertexai: false,
      httpOptions: { timeout: deadlineMs, retryOptions: { attempts: 1 } },
    });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Classify customer feedback for product health. Return ONLY JSON:
{"issues":[{"title":string,"count":number,"reasonCodes":string[],"evidenceIds":string[],"summary":string}],"actions":[{"title":string,"detail":string,"priority":"high"|"medium"|"low"}]}
Rules: use only provided reasons and evidence ids; do not invent counts; suggest owner-review actions only (no refunds, no auto edits); keep under 6 issues and 5 actions.
Product: ${bundle.productName} (${bundle.productId})
Reason counts: ${JSON.stringify(bundle.reasons)}
Evidence: ${JSON.stringify(evidence)}`,
            },
          ],
        },
      ],
      config: {
        abortSignal: AbortSignal.timeout(deadlineMs),
        maxOutputTokens: 900,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
      },
    });
    const text = response.text?.trim();
    if (!text) {
      return { ...metricsOnlyDiagnosis(bundle), error: "Empty model response." };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    const validated = validateDiagnosis(parsed, sourceHash);
    if (!validated) {
      return { ...metricsOnlyDiagnosis(bundle), error: "Model returned invalid JSON." };
    }
    return validated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnosis failed.";
    return { ...metricsOnlyDiagnosis(bundle), error: message.slice(0, 200) };
  }
}
