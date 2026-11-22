"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import { BagIcon, LockIcon } from "./Icons";
import PaymentSuccessMark from "./PaymentSuccessMark";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { insforge, restoreSession } from "@/lib/insforge-client";
import { money } from "@/lib/format";
import {
  formatOrderNumber,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-number";

interface Order {
  id: string;
  order_number: string | null;
  total: number;
  status: string;
  payment_status: string;
}

export async function paymentRequest(path: string, options: RequestInit = {}) {
  let token = await insforge.getHttpClient().getValidAccessToken();
  if (!token) {
    await restoreSession();
    token = await insforge.getHttpClient().getValidAccessToken();
  }
  if (!token) throw new Error("Please sign in to continue.");
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Payment request failed. Please try again.");
  return data;
}

export default function PaymentView({ orderId, cancelled }: { orderId: string; cancelled: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/payment/${orderId}`)}`);
      return;
    }
    let active = true;
    void (async () => {
      try {
        if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId)) {
          throw new Error("Invalid order ID.");
        }
        const { data, error } = await insforge.database
          .from("orders")
          .select("id,order_number,total,status,payment_status")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Order not found in your account.");
        if (active) setOrder(data as Order);
      } catch (error) {
        if (active) setFailure(errorMessage(error));
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, user, loading, router]);

  async function pay() {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const data = await paymentRequest("/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
        throw new Error("Invalid Stripe checkout URL.");
      }
      window.location.assign(url.href);
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  }

  if (loading || (!order && !failure)) {
    return (
      <div className="pay-success pay-success--loading">
        <div className="loader" />
      </div>
    );
  }

  const paid = order?.payment_status === "paid";

  if (paid && order) {
    return (
      <section className="pay-success" aria-live="polite">
        <div className="pay-success__decor pay-success__decor--tl" aria-hidden />
        <div className="pay-success__decor pay-success__decor--br" aria-hidden />
        <div className="pay-success__card">
          <PaymentSuccessMark />
          <h1 className="pay-success__title">Payment Successful!</h1>
          <p className="pay-success__copy">Thank you for your order. Your payment has been received.</p>
          <div className="pay-success__meta">
            <div className="pay-success__meta-item">
              <BagIcon size={16} />
              <span>
                Order <strong>{formatOrderNumber(order.order_number, order.id)}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>
                Total: <strong>{money(Number(order.total))}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>Status:</span>
              <span className="pay-success__badge">{orderStatusLabel(order.status)}</span>
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
        <h1 className="pay-success__title">Complete Your Payment</h1>
        {order && (
          <div className="pay-success__meta" style={{ marginTop: "1.25rem" }}>
            <div className="pay-success__meta-item">
              <BagIcon size={16} />
              <span>
                Order <strong>{formatOrderNumber(order.order_number, order.id)}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>
                Total: <strong>{money(Number(order.total))}</strong>
              </span>
            </div>
            <div className="pay-success__meta-item">
              <span>Status:</span>
              <span className="pay-success__badge pay-success__badge--muted">
                {paymentStatusLabel(order.payment_status)}
              </span>
            </div>
          </div>
        )}
        {cancelled && (
          <p className="pay-success__copy">Checkout was cancelled. Your order remains unpaid. You can try again below.</p>
        )}
        {failure && (
          <p className="field__error" role="alert">
            {failure}
          </p>
        )}
        <div className="pay-success__actions">
          {order && order.status === "pending" && (
            <button className="btn btn--solid pay-success__btn" disabled={busy} onClick={() => void pay()}>
              <LockIcon size={16} />
              <span>{busy ? "Opening Stripe…" : `Pay now • ${money(Number(order.total))}`}</span>
            </button>
          )}
          <AppLink href="/profile" className="btn btn--outline pay-success__btn">
            <span>View My Orders</span>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
