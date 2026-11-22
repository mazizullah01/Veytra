"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import CancelOrderButton from "@/components/CancelOrderButton";
import ReturnRequestForm from "@/components/ReturnRequestForm";
import {
  HeartIcon,
  OrdersIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
} from "@/components/Icons";
import { canCancelOrder, canRequestReturn } from "@/lib/order-actions";
import { useAuth, useCart } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { authRequest, insforge } from "@/lib/insforge-client";
import { money } from "@/lib/format";
import {
  formatOrderNumber,
  orderStatusClass,
  orderStatusLabel,
  paymentStatusClass,
  paymentStatusLabel,
} from "@/lib/order-number";

interface Order {
  id: string;
  order_number: string | null;
  created_at: string;
  total: number;
  status: string;
  payment_status: string;
  items: { id: string; name: string; size: string; qty: number; price: number }[];
}

type Tab = "orders" | "returns" | "wishlist" | "account";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { flush } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<Tab>("orders");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=%2Fprofile");
    if (!user) return;
    let active = true;
    void insforge.database
      .from("orders")
      .select("id,order_number,created_at,total,status,payment_status,items")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(errorMessage(error));
        else {
          setOrders((data ?? []) as Order[]);
          setError("");
        }
        setPending(false);
      });
    return () => {
      active = false;
    };
  }, [user, loading, router, revision]);

  const signOut = async () => {
    setBusy(true);
    try {
      await flush();
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    try {
      await authRequest("/api/auth/sign-out");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation after sign-out
      window.location.assign("/");
    } catch (signOutError) {
      setError(errorMessage(signOutError));
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const ref = formatOrderNumber(order.order_number, order.id).toLowerCase();
      const names = order.items.map((item) => item.name.toLowerCase()).join(" ");
      return ref.includes(q) || names.includes(q) || order.status.toLowerCase().includes(q);
    });
  }, [orders, query]);

  if (loading || !user) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  const displayName = user.email?.split("@")[0] || "Customer";

  return (
    <div className="container section account-layout">
      <aside className="account-nav" aria-label="Account">
        <div className="account-nav__user">
          <span className="account-nav__avatar" aria-hidden>
            <UserIcon size={18} />
          </span>
          <div>
            <strong>{displayName}</strong>
            <p className="muted">{user.email}</p>
          </div>
        </div>
        <nav className="account-nav__list">
          <button
            type="button"
            className={tab === "orders" ? "is-active" : undefined}
            onClick={() => setTab("orders")}
          >
            <OrdersIcon size={16} /> Orders
          </button>
          <button
            type="button"
            className={tab === "returns" ? "is-active" : undefined}
            onClick={() => setTab("returns")}
          >
            <TrashIcon size={16} /> Returns & Refunds
          </button>
          <button
            type="button"
            className={tab === "wishlist" ? "is-active" : undefined}
            onClick={() => setTab("wishlist")}
          >
            <HeartIcon size={16} /> Wishlist
          </button>
          <button
            type="button"
            className={tab === "account" ? "is-active" : undefined}
            onClick={() => setTab("account")}
          >
            <SettingsIcon size={16} /> Account Settings
          </button>
        </nav>
        <button type="button" className="account-nav__signout" disabled={busy} onClick={() => void signOut()}>
          {busy ? "Signing out…" : "Sign Out"}
        </button>
      </aside>

      <div className="account-main">
        {tab === "orders" && (
          <section>
            <div className="account-main__head">
              <h1>My Orders</h1>
              <label className="account-search">
                <SearchIcon size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search orders"
                  aria-label="Search orders"
                />
              </label>
            </div>
            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}
            {pending ? (
              <div className="loader" />
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <p className="muted">You haven’t placed any orders yet.</p>
                <AppLink href="/women" className="btn btn--solid">
                  <span>Start shopping</span>
                </AppLink>
              </div>
            ) : (
              filtered.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card__head">
                    <div>
                      <h3>{formatOrderNumber(order.order_number, order.id)}</h3>
                      <div className="order-card__meta">
                        <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleDateString()}</time>
                        <span>{money(Number(order.total))}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span className={paymentStatusClass(order.payment_status)}>
                        {paymentStatusLabel(order.payment_status)}
                      </span>
                      <span className={orderStatusClass(order.status)}>{orderStatusLabel(order.status)}</span>
                    </div>
                  </div>

                  {order.items.map((item, index) => (
                    <div className="order-card__line" key={`${item.id}-${item.size}-${index}`}>
                      <span>
                        {item.name}
                        <br />
                        <small className="muted">
                          Size {item.size} · Qty {item.qty}
                        </small>
                      </span>
                      <span>{money(Number(item.price) * item.qty)}</span>
                    </div>
                  ))}

                  <OrderStatusTracker status={order.status} />

                  <div className="order-actions">
                    {order.payment_status === "unpaid" && order.status === "pending" && (
                      <AppLink href={`/payment/${order.id}`} className="btn btn--solid btn--sm">
                        <span>Continue to payment</span>
                      </AppLink>
                    )}
                    {canCancelOrder(order) && (
                      <CancelOrderButton
                        orderId={order.id}
                        orderNumber={order.order_number}
                        refund={order.payment_status === "paid"}
                        refundAmount={Number(order.total)}
                        onDone={() => setRevision((value) => value + 1)}
                      />
                    )}
                    {canRequestReturn(order) && (
                      <ReturnRequestForm
                        orderId={order.id}
                        orderNumber={order.order_number}
                        items={order.items}
                        onDone={() => setRevision((value) => value + 1)}
                      />
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {tab === "returns" && (
          <section>
            <h1>Returns & Refunds</h1>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Open an eligible delivered order below to submit a return request.
            </p>
            <div style={{ marginTop: "1.5rem" }}>
              {orders.filter((order) => canRequestReturn(order)).length === 0 ? (
                <p className="muted">No eligible orders for return right now.</p>
              ) : (
                orders
                  .filter((order) => canRequestReturn(order))
                  .map((order) => (
                    <article className="order-card" key={order.id}>
                      <div className="order-card__head">
                        <h3>{formatOrderNumber(order.order_number, order.id)}</h3>
                        <span className={orderStatusClass(order.status)}>{orderStatusLabel(order.status)}</span>
                      </div>
                      <ReturnRequestForm
                        orderId={order.id}
                        orderNumber={order.order_number}
                        items={order.items}
                        onDone={() => setRevision((value) => value + 1)}
                      />
                    </article>
                  ))
              )}
            </div>
          </section>
        )}

        {tab === "wishlist" && (
          <section>
            <h1>Wishlist</h1>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Wishlist is coming soon. Save favorites from product pages in a future update.
            </p>
          </section>
        )}

        {tab === "account" && (
          <section>
            <h1>Account Settings</h1>
            <div className="account-panel" style={{ marginTop: "1.25rem" }}>
              <div className="account-panel__name">{displayName}</div>
              <p className="muted" style={{ margin: 0 }}>
                {user.email}
              </p>
              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn--outline btn--sm" disabled={busy} onClick={() => void signOut()}>
                  <span>{busy ? "Signing out…" : "Sign out"}</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
