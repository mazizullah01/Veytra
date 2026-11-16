"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import { adminFetch } from "@/lib/admin-client";
import type { DiagnosisPayload } from "@/lib/product-health/ai-diagnosis";

interface Detail {
  product: {
    id: string;
    name: string;
    category: string;
    image: string | null;
    soldUnits: number;
    returnedUnits: number;
    returnRate: number | null;
    healthScore: number | null;
    healthStatus: string;
    avgRating: number | null;
    reviewCount: number;
    topIssue: string | null;
  };
  reasons: { reason: string; label: string; count: number }[];
  diagnosis: DiagnosisPayload;
  reviews: { id: string; rating: number; body: string; created_at: string }[];
  returnHistory: { id: string; order_id: string; status: string; notes: string | null; created_at: string }[];
  alerts: { id: string; kind: string; status: string; reason: string; created_at: string }[];
  monthlyTrend: { month: string; qty: number }[];
}

export default function ProductHealthDetail({ productId }: { productId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [openIssue, setOpenIssue] = useState<number | null>(0);
  const [busyAlert, setBusyAlert] = useState("");

  const load = () => {
    setPending(true);
    void adminFetch<Detail>(`/api/admin/product-health/${encodeURIComponent(productId)}`)
      .then((payload) => {
        setData(payload);
        setError("");
        setPending(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setPending(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when product changes
  }, [productId]);

  const updateAlert = async (alertId: string, status: "acknowledged" | "dismissed") => {
    setBusyAlert(alertId);
    try {
      await adminFetch(`/api/admin/product-health/${encodeURIComponent(productId)}/alerts`, {
        method: "PATCH",
        body: JSON.stringify({ alertId, status, reason: status }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Alert update failed.");
    } finally {
      setBusyAlert("");
    }
  };

  const updateReturn = async (id: string, status: string) => {
    setBusyAlert(id);
    try {
      await adminFetch("/api/admin/returns", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return update failed.");
    } finally {
      setBusyAlert("");
    }
  };

  if (pending && !data) {
    return (
      <div className="container section">
        <div className="loader" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="container section">
        <p className="field__error">{error}</p>
        <AppLink href="/admin/product-health">Back to list</AppLink>
      </div>
    );
  }
  if (!data) return null;
  const { product, diagnosis } = data;
  const rate = product.returnRate ?? 0;
  const maxTrend = Math.max(1, ...data.monthlyTrend.map((t) => t.qty));

  return (
    <div className="container section admin-page">
      <p>
        <AppLink href="/admin/product-health" className="link-underline">
          ← Product Health
        </AppLink>
      </p>

      <header className="admin-detail__header">
        {product.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" className="admin-detail__image" width={96} height={120} />
        )}
        <div>
          <span className="eyebrow">{product.category || "Product"}</span>
          <h1>{product.name}</h1>
          <p className="muted" style={{ overflowWrap: "anywhere" }}>
            {product.id}
          </p>
          <span className={`health-badge health-badge--${slug(product.healthStatus)}`}>
            {product.healthScore == null
              ? product.healthStatus
              : `${product.healthScore} · ${product.healthStatus}`}
          </span>
        </div>
      </header>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-panel">
        <h2>Performance</h2>
        <div className="admin-metrics">
          <div>
            <span className="muted">Sold</span>
            <strong>{product.soldUnits}</strong>
          </div>
          <div>
            <span className="muted">Returned</span>
            <strong>{product.returnedUnits}</strong>
          </div>
          <div>
            <span className="muted">Return rate</span>
            <strong>{product.returnRate == null ? "—" : `${product.returnRate.toFixed(1)}%`}</strong>
          </div>
          <div>
            <span className="muted">Avg rating</span>
            <strong>
              {product.avgRating == null ? "—" : `${product.avgRating.toFixed(1)} (${product.reviewCount})`}
            </strong>
          </div>
        </div>
        <div className="admin-rate-bar" aria-hidden>
          <div className="admin-rate-bar__fill" style={{ width: `${Math.min(100, rate)}%` }} />
        </div>
        <p className="muted">Top issue: {product.topIssue ?? "—"}</p>
      </section>

      <section className="admin-panel">
        <h2>AI Issue Diagnosis</h2>
        {diagnosis.error && (
          <p className="muted">AI unavailable — showing reason aggregates. ({diagnosis.error})</p>
        )}
        {!diagnosis.issues.length ? (
          <p className="muted">No diagnosis yet. Completed returns and reviews will feed this section.</p>
        ) : (
          <ul className="admin-issue-list">
            {diagnosis.issues.map((issue, index) => (
              <li key={`${issue.title}-${index}`}>
                <button
                  type="button"
                  className="admin-issue-list__toggle"
                  onClick={() => setOpenIssue(openIssue === index ? null : index)}
                  aria-expanded={openIssue === index}
                >
                  <strong>
                    {issue.title} · {issue.count}
                  </strong>
                  <span>{openIssue === index ? "−" : "+"}</span>
                </button>
                {openIssue === index && (
                  <div className="admin-issue-list__body">
                    <p>{issue.summary || "No summary."}</p>
                    {issue.reasonCodes.length > 0 && (
                      <p className="muted">Reasons: {issue.reasonCodes.join(", ")}</p>
                    )}
                    {issue.evidenceIds.length > 0 && (
                      <p className="muted">Evidence: {issue.evidenceIds.join(", ")}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h2>Suggested Next Actions</h2>
        {!diagnosis.actions.length ? (
          <p className="muted">No suggested actions. Owner review only — nothing auto-applies.</p>
        ) : (
          <ul className="admin-actions">
            {diagnosis.actions.map((action, index) => (
              <li key={`${action.title}-${index}`}>
                <span className={`admin-priority admin-priority--${action.priority}`}>{action.priority}</span>
                <div>
                  <strong>{action.title}</strong>
                  <p className="muted">{action.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h2>Customer Voice</h2>
        <h3>Reviews</h3>
        {!data.reviews.length ? (
          <p className="muted">No reviews yet.</p>
        ) : (
          data.reviews.map((review) => (
            <blockquote key={review.id} className="admin-voice">
              <p>
                ★ {review.rating}/5 — {review.body || "(no text)"}
              </p>
            </blockquote>
          ))
        )}
        <h3>Return notes</h3>
        {data.returnHistory.filter((r) => r.notes).length === 0 ? (
          <p className="muted">No return notes.</p>
        ) : (
          data.returnHistory
            .filter((r) => r.notes)
            .map((row) => (
              <blockquote key={row.id} className="admin-voice">
                <p>{row.notes}</p>
                <p className="muted">{row.status}</p>
              </blockquote>
            ))
        )}
      </section>

      <section className="admin-panel">
        <h2>Return history</h2>
        {!data.returnHistory.length ? (
          <p className="muted">No returns for this product.</p>
        ) : (
          <ul className="admin-history">
            {data.returnHistory.map((row) => (
              <li key={row.id}>
                <span>{new Date(row.created_at).toLocaleDateString()}</span>
                <span>{row.status}</span>
                <span style={{ overflowWrap: "anywhere" }}>Order {row.order_id}</span>
                {(row.status === "requested" || row.status === "approved") && (
                  <span className="admin-alert-actions">
                    {row.status === "requested" && (
                      <button
                        type="button"
                        className="btn btn--outline"
                        disabled={busyAlert === row.id}
                        onClick={() => void updateReturn(row.id, "approved")}
                      >
                        <span>Approve</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busyAlert === row.id}
                      onClick={() => void updateReturn(row.id, "completed")}
                    >
                      <span>Complete</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busyAlert === row.id}
                      onClick={() => void updateReturn(row.id, "rejected")}
                    >
                      <span>Reject</span>
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.reasons.length > 0 && (
          <p className="muted">
            Reason mix:{" "}
            {data.reasons.map((r) => `${r.label} (${r.count})`).join(" · ")}
          </p>
        )}
      </section>

      <section className="admin-panel">
        <h2>Completed returns by month</h2>
        {!data.monthlyTrend.length ? (
          <p className="muted">Not enough completed return history for a trend.</p>
        ) : (
          <div className="admin-trend" role="img" aria-label="Monthly completed return quantities">
            {data.monthlyTrend.map((bucket) => (
              <div key={bucket.month} className="admin-trend__col">
                <div
                  className="admin-trend__bar"
                  style={{ height: `${(bucket.qty / maxTrend) * 100}%` }}
                  title={`${bucket.month}: ${bucket.qty}`}
                />
                <span>{bucket.month.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Alerts</h2>
        {!data.alerts.length ? (
          <p className="muted">No alerts.</p>
        ) : (
          <ul className="admin-history">
            {data.alerts.map((alert) => (
              <li key={alert.id}>
                <span>{alert.kind}</span>
                <span>{alert.status}</span>
                <span>{alert.reason}</span>
                {alert.status === "open" && (
                  <span className="admin-alert-actions">
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busyAlert === alert.id}
                      onClick={() => void updateAlert(alert.id, "acknowledged")}
                    >
                      <span>Ack</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busyAlert === alert.id}
                      onClick={() => void updateAlert(alert.id, "dismissed")}
                    >
                      <span>Dismiss</span>
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h2>Owner actions</h2>
        <p className="muted">
          No auto-refunds or catalog edits. Use store tools separately after reviewing diagnosis.
        </p>
        <div className="admin-owner-actions">
          <AppLink href={`/product/${product.id}`} className="btn btn--outline">
            <span>View PDP</span>
          </AppLink>
        </div>
      </section>
    </div>
  );
}

function slug(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}
