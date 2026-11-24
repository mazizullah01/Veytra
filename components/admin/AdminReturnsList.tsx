"use client";

import { useEffect, useMemo, useState } from "react";
import AppLink from "@/components/AppLink";
import { adminFetch } from "@/lib/admin-client";
import { RETURN_REASON_LABELS, type ReturnReason } from "@/lib/product-health";

interface ReturnRow {
  id: string;
  order_id: string;
  user_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name: string | null;
  size: string;
  qty: number;
  reason: string;
}

function reasonLabel(reason: string) {
  return RETURN_REASON_LABELS[reason as ReturnReason] ?? reason;
}

export default function AdminReturnsList() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [status, setStatus] = useState("requested");
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setPending(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void adminFetch<{ returns: ReturnRow[]; items: ReturnItem[] }>(
      `/api/admin/returns?${params}`,
    )
      .then((data) => {
        if (!active) return;
        setReturns(data.returns);
        setItems(data.items);
        setError("");
        setPending(false);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
        setPending(false);
      });
    return () => {
      active = false;
    };
  }, [status, revision]);

  const itemsByReturn = useMemo(() => {
    const map = new Map<string, ReturnItem[]>();
    for (const item of items) {
      const list = map.get(item.return_id) ?? [];
      list.push(item);
      map.set(item.return_id, list);
    }
    return map;
  }, [items]);

  const updateReturn = async (id: string, next: string) => {
    setBusyId(id);
    setError("");
    try {
      await adminFetch("/api/admin/returns", {
        method: "PATCH",
        body: JSON.stringify({ id, status: next }),
      });
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return update failed.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="container section admin-page">
      <header className="page-head">
        <span className="eyebrow">Operations</span>
        <h1>Returns</h1>
        <p className="muted">
          Review customer return requests. Completing a return updates Product Health Returned / Rate.
        </p>
      </header>

      <div className="admin-filters admin-filters--returns">
        <label className="field">
          <span className="field__label">Status</span>
          <select className="field__input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {pending ? (
        <div className="loader" />
      ) : returns.length === 0 ? (
        <p className="muted">No returns with this status.</p>
      ) : (
        <ul className="admin-returns">
          {returns.map((row) => {
            const lines = itemsByReturn.get(row.id) ?? [];
            const actionable = row.status === "requested" || row.status === "approved";
            return (
              <li key={row.id} className="admin-returns__card">
                <div className="admin-returns__head">
                  <div>
                    <strong className="admin-returns__status">{row.status}</strong>
                    <p className="muted">
                      {new Date(row.created_at).toLocaleString()} · Order{" "}
                      <span className="admin-returns__order">{row.order_id.slice(0, 8)}…</span>
                    </p>
                  </div>
                  {actionable && (
                    <div className="admin-alert-actions">
                      {row.status === "requested" && (
                        <button
                          type="button"
                          className="btn btn--outline"
                          disabled={busyId === row.id}
                          onClick={() => void updateReturn(row.id, "approved")}
                        >
                          <span>Approve</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--solid"
                        disabled={busyId === row.id}
                        onClick={() => void updateReturn(row.id, "completed")}
                      >
                        <span>Complete</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline"
                        disabled={busyId === row.id}
                        onClick={() => void updateReturn(row.id, "rejected")}
                      >
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>

                {row.notes && <p className="admin-returns__notes">{row.notes}</p>}

                <ul className="admin-returns__items">
                  {lines.map((line) => (
                    <li key={line.id}>
                      <AppLink href={`/admin/product-health/${encodeURIComponent(line.product_id)}`}>
                        {line.product_name || "Product"}
                      </AppLink>
                      <p className="muted">
                        Size {line.size} · Qty {line.qty} · {reasonLabel(line.reason)}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
