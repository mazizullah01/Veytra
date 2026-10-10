"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import { useAuth, useCart } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { authRequest, insforge } from "@/lib/insforge-client";
import { money } from "@/lib/format";

const stages = ["pending", "confirmed", "shipped", "delivered"];
interface Order {
  id: string; created_at: string; total: number; status: string; payment_status: string;
  items: { id: string; name: string; size: string; qty: number; price: number }[];
}
export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { flush } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=%2Fprofile");
    if (!user) return;
    let active = true;
    void insforge.database.from("orders").select("id,created_at,total,status,payment_status,items")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(errorMessage(error));
        else { setOrders((data ?? []) as Order[]); setError(""); }
        setPending(false);
      });
    return () => { active = false; };
  }, [user, loading, router, revision]);
  const signOut = async () => {
    setBusy(true);
    try { await flush(); } catch (error) { setError(errorMessage(error)); setBusy(false); return; }
    try {
      await authRequest("/api/auth/sign-out");
      // Full reload clears client auth state after httpOnly cookies are cleared.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation after sign-out
      window.location.assign("/");
    } catch (signOutError) {
      setError(errorMessage(signOutError));
      setBusy(false);
    }
  };
  if (loading || !user) return <div className="section container" style={{ paddingBlock: "6rem" }}><div className="loader" /></div>;
  return <div className="container section">
    <header className="page-head"><span className="eyebrow">My account</span><h1>Your profile</h1>
      <p className="muted">{user.email}</p>
      <button className="btn btn--outline" disabled={busy} onClick={signOut}><span>{busy ? "Signing out…" : "Sign out"}</span></button>
    </header>
    <section className="checkout-block"><div className="checkout-block__head"><h2>Order history</h2>
      <button className="link-underline" onClick={() => setRevision(value => value + 1)}>Refresh orders</button></div>
      {error && <p className="field__error" role="alert">{error}</p>}
      {pending ? <div className="loader" /> : orders.length === 0 ? <div className="empty-state"><p className="muted">You haven’t placed any orders yet.</p><AppLink href="/women" className="btn btn--solid"><span>Start shopping</span></AppLink></div> :
        orders.map(order => <article className="checkout-block" key={order.id}>
          <h3 style={{ overflowWrap: "anywhere" }}>Order {order.id}</h3>
          <p className="muted"><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleDateString()}</time> · {money(Number(order.total))}</p>
          <p><span style={{ display: "inline-block", padding: "0.35rem 0.75rem", border: "1px solid var(--line, #ddd)" }}>{order.payment_status === "paid" ? "Paid" : "Unpaid"}</span></p>
          {order.payment_status !== "paid" && <AppLink href={`/payment/${order.id}`} className="link-underline">Continue to payment</AppLink>}
          {order.items.map((item, index) => <div className="summary__row" key={`${item.id}-${item.size}-${index}`}><span>{item.name} · Size {item.size} × {item.qty}</span><span>{money(Number(item.price) * item.qty)}</span></div>)}
          <ol aria-label={`Status: ${order.status}`} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
            {stages.map((stage, index) => <li key={stage} aria-current={stage === order.status ? "step" : undefined} style={{ padding: "0.6rem 1rem", border: "1px solid var(--line, #ddd)", background: stage === order.status ? "var(--ink, #222)" : "transparent", color: stage === order.status ? "var(--paper, #fff)" : "inherit", opacity: index > stages.indexOf(order.status) ? 0.5 : 1, textTransform: "capitalize" }}>{stage}</li>)}
          </ol>
        </article>)}
    </section>
  </div>;
}
