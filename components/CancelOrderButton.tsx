"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, TrashIcon } from "./Icons";
import { adminFetch } from "@/lib/admin-client";
import { formatOrderNumber } from "@/lib/order-number";
import { money } from "@/lib/format";

export default function CancelOrderButton({
  orderId,
  orderNumber,
  refund,
  refundAmount,
  onDone,
}: {
  orderId: string;
  orderNumber?: string | null;
  refund: boolean;
  refundAmount?: number;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const refLabel = formatOrderNumber(orderNumber, orderId);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, busy]);

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await adminFetch(`/api/orders/${orderId}/cancel`, { method: "POST", body: "{}" });
      setOpen(false);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" className="btn btn--outline" disabled={busy} onClick={() => setOpen(true)}>
        <TrashIcon size={16} />
        <span>{refund ? "Cancel and refund" : "Cancel Order"}</span>
      </button>
      {error && !open && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button
              ref={closeRef}
              type="button"
              className="modal__close"
              aria-label="Close"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              <CloseIcon size={18} />
            </button>
            <div className="modal__icon" aria-hidden>
              <TrashIcon size={22} />
            </div>
            <h2 id={titleId}>Cancel this order?</h2>
            <p>
              Are you sure you want to cancel order {refLabel}?
              {refund
                ? ` This will cancel your order and request a refund${
                    typeof refundAmount === "number" ? ` of ${money(refundAmount)}` : ""
                  } through Stripe.`
                : " This will cancel your unpaid order."}
            </p>
            <p className="muted">
              If payment has already been received, the refund follows the existing Stripe refund workflow and is
              confirmed by the payment provider.
            </p>
            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}
            <div className="modal__actions">
              <button type="button" className="btn btn--outline" disabled={busy} onClick={() => setOpen(false)}>
                <span>Keep Order</span>
              </button>
              <button type="button" className="btn btn--solid btn--danger" disabled={busy} onClick={() => void cancel()}>
                <span>{busy ? "Cancelling…" : "Yes, Cancel Order"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
