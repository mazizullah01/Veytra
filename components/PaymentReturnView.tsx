"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import OrderConfirmationCard, { type ConfirmationItem } from "./OrderConfirmationCard";
import { paymentRequest } from "./PaymentView";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { money } from "@/lib/format";
import { formatOrderNumber, paymentStatusLabel } from "@/lib/order-number";

interface Result {
  orderId: string;
  orderNumber?: string | null;
  createdAt?: string | null;
  total?: number;
  stripePaid: boolean;
  paymentStatus: string;
  status: string;
  items?: ConfirmationItem[];
}

export default function PaymentReturnView({ sessionId }: { sessionId: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/payment/return?session_id=${encodeURIComponent(sessionId)}`)}`,
      );
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function read(attempt = 0) {
      try {
        if (!sessionId) throw new Error("No checkout session was provided. View your orders to continue payment.");
        const data: Result = await paymentRequest(
          `/api/stripe/payment-status?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (!active) return;
        setResult(data);
        setFailure("");
        if (data.stripePaid && data.paymentStatus !== "paid" && attempt < 8) {
          timer = setTimeout(() => void read(attempt + 1), 1500);
        }
      } catch (error) {
        if (active) setFailure(errorMessage(error));
      }
    }
    void read();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, user, loading, router, revision]);

  if (!result && !failure) {
    return (
      <div className="order-confirm-page order-confirm-page--loading">
        <div className="loader" />
        <p>Confirming your payment…</p>
      </div>
    );
  }

  const confirmed = Boolean(result?.stripePaid && result.paymentStatus === "paid");
  const pending = Boolean(result?.stripePaid && result.paymentStatus !== "paid");

  if (confirmed && result) {
    return (
      <section className="order-confirm-page" aria-live="polite">
        <OrderConfirmationCard
          orderId={result.orderId}
          orderNumber={result.orderNumber}
          createdAt={result.createdAt}
          total={Number(result.total ?? 0)}
          status={result.status}
          paymentStatus={result.paymentStatus}
          items={result.items ?? []}
          onCancelled={() => setRevision((value) => value + 1)}
        />
        <div className="order-confirm-page__actions">
          <AppLink href="/profile" className="btn btn--solid">
            <span>View My Orders</span>
          </AppLink>
          <AppLink href="/women" className="btn btn--outline">
            <span>Continue Shopping</span>
          </AppLink>
        </div>
      </section>
    );
  }

  return (
    <div className="order-confirm-page order-confirm-page--alt">
      <div className="order-confirm">
        <h1 className="order-confirm__title">
          {failure ? "Unable to check payment" : pending ? "Confirming your payment" : "Payment is not complete"}
        </h1>
        {result && (
          <>
            <p className="order-confirm__meta" style={{ marginTop: "0.85rem" }}>
              {pending
                ? "Stripe received your payment. We’re confirming your order…"
                : "Your payment has not completed. Your order will stay unpaid until Stripe confirms payment."}
            </p>
            <p className="order-confirm__meta">
              {formatOrderNumber(result.orderNumber, result.orderId)}
              {typeof result.total === "number" ? ` · ${money(Number(result.total))}` : ""}
              {` · ${paymentStatusLabel(result.paymentStatus)}`}
            </p>
            <div className="order-confirm-page__actions" style={{ marginTop: "1.5rem" }}>
              {!result.stripePaid && (
                <AppLink href={`/payment/${result.orderId}`} className="btn btn--solid">
                  <span>Return to payment</span>
                </AppLink>
              )}
              <button type="button" className="btn btn--outline" onClick={() => setRevision((value) => value + 1)}>
                <span>Check payment again</span>
              </button>
            </div>
          </>
        )}
        {failure && (
          <p className="field__error" role="alert">
            {failure}
          </p>
        )}
        <p style={{ marginTop: "1.25rem" }}>
          <AppLink href="/profile" className="link-underline">
            View My Orders
          </AppLink>
        </p>
      </div>
    </div>
  );
}
