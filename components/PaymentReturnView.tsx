"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import { BagIcon } from "./Icons";
import PaymentSuccessMark from "./PaymentSuccessMark";
import { paymentRequest } from "./PaymentView";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { money } from "@/lib/format";
import {
  formatOrderNumber,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-number";

interface Result {
  orderId: string;
  orderNumber?: string | null;
  total?: number;
  stripePaid: boolean;
  paymentStatus: string;
  status: string;
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
      <div className="pay-success pay-success--loading">
        <div className="loader" />
        <p className="pay-success__copy">Confirming your payment…</p>
      </div>
    );
  }

  const confirmed = Boolean(result?.stripePaid && result.paymentStatus === "paid");
  const pending = Boolean(result?.stripePaid && result.paymentStatus !== "paid");

  if (confirmed && result) {
    return (
      <section className="pay-success" aria-live="polite">
        <div className="pay-success__decor pay-success__decor--tl" aria-hidden />
        <div className="pay-success__decor pay-success__decor--br" aria-hidden />
        <svg className="pay-success__leaf pay-success__leaf--l" viewBox="0 0 80 160" fill="none" aria-hidden>
          <path d="M40 12c18 28 22 58 8 96-18 8-34-6-40-28 20-8 34-28 32-68Z" fill="#E8DFD2" opacity="0.55" />
          <path d="M36 28c10 18 12 40 4 64" stroke="#D6CBB8" strokeWidth="1.2" opacity="0.7" />
        </svg>
        <svg className="pay-success__leaf pay-success__leaf--r" viewBox="0 0 80 160" fill="none" aria-hidden>
          <path d="M40 12c-18 28-22 58-8 96 18 8 34-6 40-28-20-8-34-28-32-68Z" fill="#E8DFD2" opacity="0.55" />
          <path d="M44 28c-10 18-12 40-4 64" stroke="#D6CBB8" strokeWidth="1.2" opacity="0.7" />
        </svg>

        <div className="pay-success__card">
          <PaymentSuccessMark />
          <h1 className="pay-success__title">Payment Successful!</h1>
          <p className="pay-success__copy">Thank you for your order. Your payment has been received.</p>

          <div className="pay-success__meta">
            <div className="pay-success__meta-item">
              <BagIcon size={16} />
              <span>
                Order <strong>{formatOrderNumber(result.orderNumber, result.orderId)}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>
                Total: <strong>{typeof result.total === "number" ? money(Number(result.total)) : "—"}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>Status:</span>
              <span className="pay-success__badge">{orderStatusLabel(result.status)}</span>
            </div>
          </div>

          <div className="pay-success__actions">
            <AppLink href="/profile" className="btn btn--solid pay-success__btn">
              <span>View Order</span>
            </AppLink>
            <AppLink href="/women" className="btn btn--outline pay-success__btn">
              <span>Continue Shopping</span>
            </AppLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="pay-success pay-success--alt">
      <div className="pay-success__card">
        <h1 className="pay-success__title">
          {failure ? "Unable to check payment" : pending ? "Confirming your payment" : "Payment is not complete"}
        </h1>
        {result && (
          <>
            <p className="pay-success__copy">
              {pending
                ? "Stripe received your payment. We’re confirming your order…"
                : "Your payment has not completed. Your order will stay unpaid until Stripe confirms payment."}
            </p>
            <div className="pay-success__meta">
              <div className="pay-success__meta-item">
                <BagIcon size={16} />
                <span>
                  Order <strong>{formatOrderNumber(result.orderNumber, result.orderId)}</strong>
                </span>
              </div>
              {typeof result.total === "number" && (
                <div className="pay-success__meta-item">
                  <span>
                    Total: <strong>{money(Number(result.total))}</strong>
                  </span>
                </div>
              )}
              <div className="pay-success__meta-item">
                <span>Status:</span>
                <span className="pay-success__badge pay-success__badge--muted">
                  {paymentStatusLabel(result.paymentStatus)}
                </span>
              </div>
            </div>
            <div className="pay-success__actions">
              {!result.stripePaid && (
                <AppLink href={`/payment/${result.orderId}`} className="btn btn--solid pay-success__btn">
                  <span>Return to payment</span>
                </AppLink>
              )}
              <button type="button" className="btn btn--outline pay-success__btn" onClick={() => setRevision((v) => v + 1)}>
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
        <p className="pay-success__foot">
          <AppLink href="/profile" className="link-underline">
            View My Orders
          </AppLink>
        </p>
      </div>
    </div>
  );
}
