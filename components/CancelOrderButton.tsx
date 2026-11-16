"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";

export default function CancelOrderButton({
  orderId,
  refund,
  onDone,
}: {
  orderId: string;
  refund: boolean;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = async () => {
    const confirmed = window.confirm(
      refund
        ? "Cancel this order and refund the full payment?"
        : "Cancel this unpaid order?",
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await adminFetch(`/api/orders/${orderId}/cancel`, { method: "POST", body: "{}" });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void cancel()}>
        <span>{busy ? "Cancelling…" : refund ? "Cancel and refund" : "Cancel order"}</span>
      </button>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
