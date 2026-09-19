"use client";

import AppLink from "./AppLink";
import Img from "./Img";
import { MinusIcon, PlusIcon, TrashIcon } from "./Icons";
import { money } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, useCart } from "@/lib/store";

export default function CartView() {
  const {
    items,
    ready,
    count,
    subtotal,
    shipping,
    total,
    updateQty,
    remove,
  } = useCart();

  if (!ready) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="container">
        <div className="empty-state">
          <span className="eyebrow">Your bag</span>
          <h1 style={{ marginTop: "0.75rem" }}>Your cart is empty</h1>
          <p className="muted">
            Nothing here yet — discover the collection and add your first piece.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <AppLink href="/women" className="btn btn--solid">
              <span>Shop Women</span>
            </AppLink>
            <AppLink href="/men" className="btn btn--outline">
              <span>Shop Men</span>
            </AppLink>
          </div>
        </div>
      </section>
    );
  }

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Your bag</span>
        <h1>Cart</h1>
        <p>
          {count} item{count === 1 ? "" : "s"}
        </p>
      </header>

      <div className="cart-layout">
        <div>
          {items.map((line) => (
            <div className="cart-line" key={`${line.id}-${line.size}`}>
              <AppLink
                href={`/product/${line.id}`}
                className="cart-line__media"
                aria-label={line.name}
              >
                <Img src={line.image} alt={line.name} fill sizes="100px" />
              </AppLink>

              <div>
                <AppLink href={`/product/${line.id}`}>
                  <span className="cart-line__name">{line.name}</span>
                </AppLink>
                <p className="cart-line__meta">Size {line.size}</p>
                <div className="cart-line__controls">
                  <div className="qty">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        updateQty(line.id, line.size, line.qty - 1)
                      }
                    >
                      <MinusIcon size={15} />
                    </button>
                    <span className="qty__value">{line.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() =>
                        updateQty(line.id, line.size, line.qty + 1)
                      }
                    >
                      <PlusIcon size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="remove-link"
                    onClick={() => remove(line.id, line.size)}
                  >
                    <TrashIcon
                      size={13}
                      style={{ display: "inline", marginRight: 6 }}
                    />
                    Remove
                  </button>
                </div>
              </div>

              <div className="cart-line__price">
                {money(line.price * line.qty)}
              </div>
            </div>
          ))}
        </div>

        <aside className="summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <div className="summary__row">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="summary__row summary__row--muted">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : money(shipping)}</span>
          </div>
          <div className="summary__total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <div className="ship-meter">
            <div className="ship-meter__bar">
              <div
                className="ship-meter__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            {remaining > 0 ? (
              <span>
                Add {money(remaining)} more for complimentary shipping.
              </span>
            ) : (
              <span>You&apos;ve unlocked free shipping.</span>
            )}
          </div>

          <AppLink href="/checkout" className="btn btn--solid btn--block">
            <span>Proceed to Checkout</span>
          </AppLink>
          <p className="summary__note">
            Taxes calculated at checkout. Secure dummy checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
