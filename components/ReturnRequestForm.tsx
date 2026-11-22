"use client";

import { useState } from "react";
import { SendIcon } from "./Icons";
import { adminFetch } from "@/lib/admin-client";
import { formatOrderNumber } from "@/lib/order-number";
import { money } from "@/lib/format";
import { RETURN_REASON_LABELS, RETURN_REASONS, type ReturnReason } from "@/lib/product-health";

interface Line {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

export default function ReturnRequestForm({
  orderId,
  orderNumber,
  items,
  onDone,
}: {
  orderId: string;
  orderNumber?: string | null;
  items: Line[];
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<
    Record<string, { qty: number; reason: ReturnReason; include: boolean }>
  >(() => {
    const initial: Record<string, { qty: number; reason: ReturnReason; include: boolean }> = {};
    for (const item of items) {
      const key = `${item.id}::${item.size}`;
      initial[key] = { qty: 1, reason: "wrong_fit", include: items.length === 1 };
    }
    return initial;
  });

  const submit = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payloadItems = items
        .map((item) => {
          const key = `${item.id}::${item.size}`;
          const row = selected[key];
          if (!row?.include) return null;
          return {
            productId: item.id,
            size: item.size,
            qty: row.qty,
            reason: row.reason,
          };
        })
        .filter(Boolean);
      if (!payloadItems.length) throw new Error("Select at least one item.");
      await adminFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({ orderId, notes, items: payloadItems }),
      });
      setSuccess("Return request submitted.");
      setOpen(false);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit return.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn--outline" onClick={() => setOpen(true)}>
          <span>Request a return</span>
        </button>
        {success && <p className="muted">{success}</p>}
      </div>
    );
  }

  return (
    <div className="return-form">
      <h4>Request a Return</h4>
      <p className="muted">
        Let us know why you would like to return an item from {formatOrderNumber(orderNumber, orderId)}.
      </p>

      {items.map((item) => {
        const key = `${item.id}::${item.size}`;
        const row = selected[key];
        return (
          <div key={key}>
            <div className="return-form__product">
              <label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], include: e.target.checked },
                    }))
                  }
                />
                <span>
                  <strong>{item.name}</strong>
                  <br />
                  <span className="muted">
                    Size {item.size} · Qty available {item.qty} · {money(Number(item.price))}
                  </span>
                </span>
              </label>
            </div>
            {row.include && (
              <div className="return-form__fields">
                <label className="field">
                  <span className="field__label">Qty</span>
                  <input
                    className="field__input"
                    type="number"
                    min={1}
                    max={item.qty}
                    value={row.qty}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], qty: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span className="field__label">Reason *</span>
                  <select
                    className="field__input"
                    value={row.reason}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], reason: e.target.value as ReturnReason },
                      }))
                    }
                  >
                    {RETURN_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {RETURN_REASON_LABELS[reason]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        );
      })}

      <label className="field">
        <span className="field__label">Notes (optional)</span>
        <textarea
          className="field__input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          placeholder="Anything else we should know?"
        />
      </label>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="return-form__actions">
        <button type="button" className="btn btn--solid" disabled={busy} onClick={() => void submit()}>
          <SendIcon size={16} />
          <span>{busy ? "Submitting…" : "Submit Return Request"}</span>
        </button>
        <button type="button" className="btn btn--outline" disabled={busy} onClick={() => setOpen(false)}>
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
