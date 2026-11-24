"use client";

import AppLink from "./AppLink";
import CancelOrderButton from "./CancelOrderButton";
import Img from "./Img";
import OrderStatusTracker from "./OrderStatusTracker";
import { canCancelOrder } from "@/lib/order-actions";
import { money } from "@/lib/format";
import { formatOrderNumber, orderStatusLabel } from "@/lib/order-number";

export interface ConfirmationItem {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  image?: string;
}

export default function OrderConfirmationCard({
  orderId,
  orderNumber,
  createdAt,
  total,
  status,
  paymentStatus,
  items,
  onCancelled,
}: {
  orderId: string;
  orderNumber?: string | null;
  createdAt?: string | null;
  total: number;
  status: string;
  paymentStatus: string;
  items: ConfirmationItem[];
  onCancelled?: () => void;
}) {
  const ref = formatOrderNumber(orderNumber, orderId);
  const orderLabel = ref.startsWith("Order") ? ref : `Order ${ref}`;
  const placed = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const placedShort = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : undefined;
  const cancellable = canCancelOrder({ status, payment_status: paymentStatus });
  const statusClass =
    status === "confirmed" || status === "delivered"
      ? "order-confirm__badge order-confirm__badge--ok"
      : status === "cancelled" || status === "canceled"
        ? "order-confirm__badge order-confirm__badge--bad"
        : "order-confirm__badge";

  return (
    <article className="order-confirm">
      <nav className="order-confirm__crumbs" aria-label="Breadcrumb">
        <AppLink href="/profile">My Orders</AppLink>
        <span aria-hidden>›</span>
        <span>{orderLabel}</span>
      </nav>

      <header className="order-confirm__head">
        <div className="order-confirm__heading">
          <div className="order-confirm__title-row">
            <h1 className="order-confirm__title">{orderLabel}</h1>
            <span className={statusClass}>{orderStatusLabel(status)}</span>
          </div>
          <p className="order-confirm__meta">
            {placed ? `Placed on ${placed}` : "Placed recently"}
            <span aria-hidden> | </span>
            Total: {money(Number(total))}
          </p>
        </div>
        {cancellable && (
          <CancelOrderButton
            orderId={orderId}
            orderNumber={orderNumber}
            refund={paymentStatus === "paid"}
            refundAmount={Number(total)}
            onDone={onCancelled}
          />
        )}
      </header>

      <OrderStatusTracker status={status} placedLabel={placedShort} variant="confirm" />

      <section className="order-confirm__items" aria-label="Order items">
        <h2 className="order-confirm__items-title">Items ({items.length})</h2>
        {items.map((item, index) => (
          <div className="order-confirm__line" key={`${item.id}-${item.size}-${index}`}>
            <div className="order-confirm__thumb">
              <Img
                src={item.image || "/images/placeholder.jpg"}
                alt={item.name}
                fill
                sizes="72px"
              />
            </div>
            <div className="order-confirm__line-info">
              <strong>{item.name}</strong>
              <span>Size: {item.size}</span>
            </div>
            <div className="order-confirm__line-price">
              <span>{money(Number(item.price))}</span>
              <small>Qty: {item.qty}</small>
            </div>
            <div className="order-confirm__line-sub">{money(Number(item.price) * Number(item.qty))}</div>
          </div>
        ))}
      </section>
    </article>
  );
}
