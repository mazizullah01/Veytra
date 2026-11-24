"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import { LockIcon } from "./Icons";
import OrderConfirmationCard, { type ConfirmationItem } from "./OrderConfirmationCard";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { insforge, restoreSession } from "@/lib/insforge-client";
import { money, productImageSrc } from "@/lib/format";
import { formatOrderNumber, paymentStatusLabel } from "@/lib/order-number";

interface Order {
  id: string;
  order_number: string | null;
  created_at?: string | null;
  total: number;
  status: string;
  payment_status: string;
  items?: ConfirmationItem[];
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

async function withImages(items: ConfirmationItem[]): Promise<ConfirmationItem[]> {
  const ids = [...new Set(items.map((item) => item.id).filter(Boolean))];
  if (!ids.length) return items;
  const { data } = await insforge.database.from("products").select("id,images").in("id", ids);
  const map = new Map<string, string>();
  for (const row of (data as { id: string; images: unknown }[] | null) ?? []) {
    const images = Array.isArray(row.images) ? row.images : [];
    const first = typeof images[0] === "string" ? productImageSrc(images[0]) : "";
    if (first) map.set(row.id, first);
  }
  return items.map((item) => ({
    ...item,
    image: item.image || map.get(item.id) || "/images/placeholder.jpg",
    qty: Number(item.qty) || 1,
    price: Number(item.price) || 0,
  }));
}

export default function PaymentView({ orderId, cancelled }: { orderId: string; cancelled: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

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
          .select("id,order_number,created_at,total,status,payment_status,items")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Order not found in your account.");
        const row = data as Order;
        const items = Array.isArray(row.items) ? await withImages(row.items) : [];
        if (active) setOrder({ ...row, items });
      } catch (error) {
        if (active) setFailure(errorMessage(error));
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, user, loading, router, revision]);

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
      <div className="order-confirm-page order-confirm-page--loading">
        <div className="loader" />
      </div>
    );
  }

  const paid = order?.payment_status === "paid";

  if (paid && order) {
    return (
      <section className="order-confirm-page" aria-live="polite">
        <OrderConfirmationCard
          orderId={order.id}
          orderNumber={order.order_number}
          createdAt={order.created_at}
          total={Number(order.total)}
          status={order.status}
          paymentStatus={order.payment_status}
          items={order.items ?? []}
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
        <h1 className="order-confirm__title">Complete Your Payment</h1>
        {order && (
          <p className="order-confirm__meta" style={{ marginTop: "0.85rem" }}>
            {formatOrderNumber(order.order_number, order.id)} · {money(Number(order.total))} ·{" "}
            {paymentStatusLabel(order.payment_status)}
          </p>
        )}
        {cancelled && (
          <p className="order-confirm__meta">Checkout was cancelled. Your order remains unpaid.</p>
        )}
        {failure && (
          <p className="field__error" role="alert">
            {failure}
          </p>
        )}
        <div className="order-confirm-page__actions" style={{ marginTop: "1.5rem" }}>
          {order && order.status === "pending" && (
            <button className="btn btn--solid" disabled={busy} onClick={() => void pay()}>
              <LockIcon size={16} />
              <span>{busy ? "Opening Stripe…" : `Pay now • ${money(Number(order.total))}`}</span>
            </button>
          )}
          <AppLink href="/profile" className="btn btn--outline">
            <span>View My Orders</span>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
