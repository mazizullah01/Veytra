"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "@/components/AppLink";
import Img, { FALLBACK_IMAGE } from "@/components/Img";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import CancelOrderButton from "@/components/CancelOrderButton";
import ReturnRequestForm from "@/components/ReturnRequestForm";
import {
  BagIcon,
  HeartIcon,
  PackageIcon,
  HomeIcon,
  LogoutIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/Icons";
import { adminFetch } from "@/lib/admin-client";
import { canCancelOrder, canRequestReturn } from "@/lib/order-actions";
import { useAuth, useCart } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { authRequest, insforge } from "@/lib/insforge-client";
import { money, productImageSrc } from "@/lib/format";
import { formatOrderNumber } from "@/lib/order-number";

interface Order {
  id: string;
  order_number: string | null;
  created_at: string;
  total: number;
  status: string;
  payment_status: string;
  items: { id: string; name: string; size: string; qty: number; price: number }[];
}

type Tab = "dashboard" | "orders" | "returns" | "wishlist" | "account";

function placedLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Placed recently";
  return `Placed on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function orderPill(order: Order) {
  if (order.payment_status === "refunded") return { label: "Refunded", tone: "refunded" };
  if (order.status === "cancelled" || order.status === "canceled") return { label: "Cancelled", tone: "cancelled" };
  if (order.payment_status === "unpaid") return { label: "Unpaid", tone: "unpaid" };
  switch (order.status) {
    case "delivered":
      return { label: "Delivered", tone: "delivered" };
    case "shipped":
      return { label: "Shipped", tone: "shipped" };
    case "confirmed":
      return { label: "Confirmed", tone: "confirmed" };
    default:
      return { label: "Pending", tone: "pending" };
  }
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
  const [tab, setTab] = useState<Tab>("orders");
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});

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
    void adminFetch<{ admin: boolean }>("/api/admin/me")
      .then(() => {
        if (active) setIsAdmin(true);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
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

  const imageKey = orders.flatMap((order) => order.items.map((item) => item.id)).join("|");

  useEffect(() => {
    let active = true;
    const ids = [...new Set(imageKey.split("|").filter(Boolean))];
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
  }, [imageKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const ref = formatOrderNumber(order.order_number, order.id).toLowerCase();
      const names = order.items.map((item) => item.name.toLowerCase()).join(" ");
      const placed = placedLabel(order.created_at).toLowerCase();
      const pill = orderPill(order).label.toLowerCase();
      return ref.includes(q) || names.includes(q) || placed.includes(q) || pill.includes(q);
    });
  }, [orders, query]);

  const eligibleReturns = useMemo(() => orders.filter((order) => canRequestReturn(order)), [orders]);
  const focusedReturns = returnOrderId
    ? eligibleReturns.filter((order) => order.id === returnOrderId)
    : eligibleReturns;
  const visibleReturns = focusedReturns.length ? focusedReturns : eligibleReturns;

  const closeReturn = () => {
    setReturnOrderId(null);
    setTab("orders");
  };

  if (loading || !user) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  const profileName = [user.profile?.full_name, user.profile?.name].find((value) => typeof value === "string" && value.trim());
  const displayName = typeof profileName === "string" ? profileName.trim() : user.email?.split("@")[0] || "Customer";

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
            className={tab === "dashboard" ? "is-active" : undefined}
            onClick={() => setTab("dashboard")}
          >
            <HomeIcon size={16} /> Dashboard
          </button>
          <button
            type="button"
            className={tab === "orders" ? "is-active" : undefined}
            onClick={() => setTab("orders")}
          >
            <BagIcon size={16} /> Orders
          </button>
          <button
            type="button"
            className={tab === "returns" ? "is-active" : undefined}
            onClick={() => {
              setReturnOrderId(null);
              setTab("returns");
            }}
          >
            <RefreshIcon size={16} /> Returns & Refunds
          </button>
          {isAdmin && (
            <button type="button" onClick={() => router.push("/admin/returns")}>
              <PackageIcon size={16} /> Returns
            </button>
          )}
          <button
            type="button"
            className={tab === "wishlist" ? "is-active" : undefined}
            onClick={() => setTab("wishlist")}
          >
            <HeartIcon size={16} /> Wishlist
          </button>
          {isAdmin && (
            <button type="button" onClick={() => router.push("/admin/product-health")}>
              <ShieldIcon size={16} /> Product Health
            </button>
          )}
          <button
            type="button"
            className={tab === "account" ? "is-active" : undefined}
            onClick={() => setTab("account")}
          >
            <SettingsIcon size={16} /> Account Settings
          </button>
          <button type="button" className="account-nav__signout" disabled={busy} onClick={() => void signOut()}>
            <LogoutIcon size={16} /> {busy ? "Signing out…" : "Sign Out"}
          </button>
        </nav>
      </aside>

      <div className="account-main">
        {tab === "dashboard" && (
          <section className="orders-page">
            <div className="orders-head">
              <div>
                <h1>Dashboard</h1>
                <p>Track, manage and view your orders.</p>
              </div>
            </div>
            <p className="muted">{pending ? "Loading your orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"}.`}</p>
          </section>
        )}

        {tab === "orders" && (
          <section className="orders-page">
            <div className="orders-head">
              <div>
                <h1>My Orders</h1>
                <p>Track, manage and view your orders.</p>
              </div>
              <label className="orders-search">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by order ID, product or date..."
                  aria-label="Search by order ID, product or date"
                />
                <SearchIcon size={16} />
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
              <div className="order-list">
                {filtered.map((order) => {
                  const open = openOrderId === order.id;
                  const pill = orderPill(order);
                  const ref = formatOrderNumber(order.order_number, order.id);
                  const orderLabel = ref.startsWith("Order ") ? ref : `Order ${ref}`;
                  const thumb = images[order.items[0]?.id] || FALLBACK_IMAGE;
                  return (
                    <article className={`order-row${open ? " is-open" : ""}`} key={order.id}>
                      <button
                        type="button"
                        className="order-row__main"
                        aria-expanded={open}
                        onClick={() => setOpenOrderId(open ? null : order.id)}
                      >
                        <span className="order-row__thumb">
                          <Img src={thumb} alt="" fill sizes="64px" />
                        </span>
                        <span className="order-row__copy">
                          <strong>{orderLabel}</strong>
                          <time dateTime={order.created_at}>{placedLabel(order.created_at)}</time>
                        </span>
                        <span className={`order-pill order-pill--${pill.tone}`}>{pill.label}</span>
                        <span className="order-row__total">{money(Number(order.total))}</span>
                        <span className="order-row__chevron" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </span>
                      </button>
                      {open && (
                        <div className="order-row__detail">
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
                              <button
                                type="button"
                                className="btn btn--outline"
                                onClick={() => {
                                  setReturnOrderId(order.id);
                                  setTab("returns");
                                }}
                              >
                                <span>Request a return</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "returns" && (
          <section className="return-request-page">
            {visibleReturns.length === 0 ? (
              <>
                <h1>Returns & Refunds</h1>
                <p className="muted" style={{ marginTop: "0.75rem" }}>
                  No eligible orders for return right now.
                </p>
              </>
            ) : (
              visibleReturns.map((order) => (
                <ReturnRequestForm
                  key={order.id}
                  orderId={order.id}
                  orderNumber={order.order_number}
                  items={order.items}
                  onCancel={closeReturn}
                  onDone={() => setRevision((value) => value + 1)}
                />
              ))
            )}
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
