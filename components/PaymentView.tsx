"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { insforge, restoreSession } from "@/lib/insforge-client";
import { money } from "@/lib/format";

interface Order { id: string; total: number; status: string; payment_status: string }
export async function paymentRequest(path: string, options: RequestInit = {}) {
  let token = await insforge.getHttpClient().getValidAccessToken();
  if (!token) {
    await restoreSession();
    token = await insforge.getHttpClient().getValidAccessToken();
  }
  if (!token) throw new Error("Please sign in to continue.");
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` }, cache: "no-store" });
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
    if (!user) { router.replace(`/login?next=${encodeURIComponent(`/payment/${orderId}`)}`); return; }
    let active = true;
    void (async () => {
      try {
        if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId)) throw new Error("Invalid order ID.");
        const { data, error } = await insforge.database.from("orders").select("id,total,status,payment_status").eq("id", orderId).eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Order not found in your account.");
        if (active) setOrder(data as Order);
      } catch (error) { if (active) setFailure(errorMessage(error)); }
    })();
    return () => { active = false; };
  }, [orderId, user, loading, router]);
  async function pay() {
    if (busy) return;
    setBusy(true); setFailure("");
    try {
      const data = await paymentRequest("/api/stripe/create-checkout-session", { method: "POST", body: JSON.stringify({ orderId }) });
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid Stripe checkout URL.");
      window.location.assign(url.href);
    } catch (error) { setFailure(errorMessage(error)); setBusy(false); }
  }
  if (loading || (!order && !failure)) return <div className="section container" style={{ paddingBlock: "6rem" }}><div className="loader" /></div>;
  return <div className="confirmation">
    <span className="eyebrow">Secure checkout</span><h1>{order?.payment_status === "paid" ? "Your payment is complete" : "Complete your payment"}</h1>
    {order && <><p className="confirmation__order" style={{ overflowWrap: "anywhere" }}>Order {order.id}</p><p>Order total {money(Number(order.total))}</p><p>Payment status: {order.payment_status === "paid" ? "Paid" : "Unpaid"}</p></>}
    {cancelled && order?.payment_status !== "paid" && <p role="status">Checkout was cancelled. Your order remains unpaid. You can try again below.</p>}
    {failure && <p className="field__error" role="alert">{failure}</p>}
    {order && order.payment_status !== "paid" && order.status === "pending" && <button className="btn btn--solid" disabled={busy} onClick={pay}><span>{busy ? "Opening Stripe…" : "Pay with Stripe"}</span></button>}
    <AppLink href="/profile" className="link-underline">View My Orders</AppLink>
  </div>;
}
