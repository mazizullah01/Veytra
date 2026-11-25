"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Img, { FALLBACK_IMAGE } from "./Img";
import { SendIcon } from "./Icons";
import { adminFetch } from "@/lib/admin-client";
import { formatOrderNumber } from "@/lib/order-number";
import { money, productImageSrc } from "@/lib/format";
import { insforge } from "@/lib/insforge-client";
import { RETURN_REASON_LABELS, RETURN_REASONS, type ReturnReason } from "@/lib/product-health";

interface Line {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

function CrumbChevron() {
  return (
    <svg className="return-request__chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReturnSubmittedDialog({ onContinue }: { onContinue: () => void }) {
  const titleId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    continueRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="return-success">
      <div
        className="return-success__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="return-success__mark" aria-hidden="true">
          <span className="return-success__badge">
            <svg viewBox="0 0 52 52">
              <path
                className="return-success__check"
                d="M14 27.5 22.5 36 38 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <h2 id={titleId}>Return Request Submitted!</h2>
        <p className="return-success__lead">Your return request has been successfully submitted.</p>
        <p className="return-success__refund">
          Your refund will be credited to your original payment method after the return is approved.
        </p>
        <p className="return-success__thanks">Thank you for shopping with VEYTRA.</p>
        <button ref={continueRef} type="button" className="return-success__continue" onClick={onContinue}>
          Continue Shopping <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function ReturnRequestForm({
  orderId,
  orderNumber,
  items,
  onDone,
  onCancel,
}: {
  orderId: string;
  orderNumber?: string | null;
  items: Line[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of items) initial[`${item.id}::${item.size}`] = true;
    return initial;
  });

  const itemKey = items.map((item) => item.id).join("|");

  useEffect(() => {
    let active = true;
    const ids = [...new Set(items.map((item) => item.id).filter(Boolean))];
    if (!ids.length) return;
    void insforge.database
      .from("products")
      .select("id,images")
      .in("id", ids)
      .then(({ data }) => {
        if (!active) return;
        const next: Record<string, string> = {};
        for (const row of (data as { id: string; images: unknown }[] | null) ?? []) {
          const photos = Array.isArray(row.images) ? row.images : [];
          const first = typeof photos[0] === "string" ? productImageSrc(photos[0]) : "";
          if (first) next[row.id] = first;
        }
        setImages(next);
      });
    return () => {
      active = false;
    };
  }, [itemKey, items]);

  const orderRef = formatOrderNumber(orderNumber, orderId);
  const orderLabel = orderRef.startsWith("Order ") ? orderRef : `Order ${orderRef}`;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!reason) throw new Error("Select a reason for this return.");
      const payloadItems = items
        .map((item) => {
          const key = `${item.id}::${item.size}`;
          if (!included[key]) return null;
          return {
            productId: item.id,
            size: item.size,
            qty: item.qty,
            reason,
          };
        })
        .filter(Boolean);
      if (!payloadItems.length) throw new Error("Select at least one item.");
      await adminFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({ orderId, notes, items: payloadItems }),
      });
      setSubmitted(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit return.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="return-request" aria-labelledby={`return-title-${orderId}`}>
      <nav className="return-request__crumb" aria-label="Breadcrumb">
        <button type="button" onClick={onCancel}>
          My Orders
        </button>
        <CrumbChevron />
        <button type="button" onClick={onCancel}>
          {orderLabel}
        </button>
        <CrumbChevron />
        <span aria-current="page">Request a Return</span>
      </nav>

      <h2 className="return-request__title" id={`return-title-${orderId}`}>
        Request a Return
      </h2>
      <p className="return-request__lead">Let us know which item you want to return and the reason.</p>

      {items.map((item) => {
        const key = `${item.id}::${item.size}`;
        return (
          <label className="return-request__item" key={key}>
            <span className="return-request__check">
              <input
                type="checkbox"
                checked={Boolean(included[key])}
                onChange={(event) =>
                  setIncluded((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
              <span aria-hidden="true" />
            </span>
            <span className="return-request__thumb">
              <Img src={images[item.id] || FALLBACK_IMAGE} alt="" fill sizes="56px" />
            </span>
            <span className="return-request__copy">
              <strong>{item.name}</strong>
              <span className="return-request__meta">
                <span>Size: {item.size}</span>
                <span>Qty: {item.qty}</span>
              </span>
            </span>
            <span className="return-request__price">{money(Number(item.price))}</span>
          </label>
        );
      })}

      <div className="return-request__grid">
        <label className="return-request__field">
          <span className="return-request__label">
            Reason for Return <abbr title="required">*</abbr>
          </span>
          <span className="return-request__select">
            <select
              className={reason ? undefined : "is-placeholder"}
              value={reason}
              onChange={(event) => setReason(event.target.value as ReturnReason | "")}
            >
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((value) => (
                <option key={value} value={value}>
                  {RETURN_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="return-request__field">
          <span className="return-request__label">Notes (Optional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            placeholder="Add any additional details..."
            rows={4}
          />
        </label>
      </div>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="return-request__actions">
        <button type="button" className="return-request__submit" disabled={busy || submitted} onClick={() => void submit()}>
          <SendIcon size={16} />
          <span>{busy ? "Submitting…" : "Submit Return Request"}</span>
        </button>
        <button type="button" className="return-request__cancel" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {submitted && (
        <ReturnSubmittedDialog
          onContinue={() => {
            setSubmitted(false);
            router.push("/women");
          }}
        />
      )}
    </section>
  );
}
