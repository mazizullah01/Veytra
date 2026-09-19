"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import AppLink from "./AppLink";
import { CheckIcon, ShieldIcon } from "./Icons";
import { money } from "@/lib/format";
import { useCart } from "@/lib/store";

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  card: string;
  expiry: string;
  cvc: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zip: "",
  country: "",
  card: "",
  expiry: "",
  cvc: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Required";
  if (!form.email.trim()) errors.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Enter a valid email";
  if (!form.address.trim()) errors.address = "Required";
  if (!form.city.trim()) errors.city = "Required";
  if (!form.zip.trim()) errors.zip = "Required";
  if (!form.country.trim()) errors.country = "Required";
  if (form.card.replace(/\s/g, "").length < 12)
    errors.card = "Enter a valid (dummy) card number";
  if (!/^\d{2}\s?\/\s?\d{2}$/.test(form.expiry)) errors.expiry = "MM/YY";
  if (!/^\d{3,4}$/.test(form.cvc)) errors.cvc = "3–4 digits";
  return errors;
}

function fieldError(errors: Errors, key: keyof FormState) {
  return errors[key] ? (
    <span className="field__error" role="alert">
      {errors[key]}
    </span>
  ) : null;
}

export default function CheckoutView() {
  const { items, ready, subtotal, shipping, total, clear } = useCart();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [order, setOrder] = useState<{ number: string; total: number } | null>(
    null,
  );

  const update =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const placeOrder = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0];
      document.getElementById(`field-${firstKey}`)?.focus();
      return;
    }
    const number = `VLR-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    setOrder({ number, total });
    clear();
  };

  if (!ready) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  if (order) {
    return (
      <div className="confirmation">
        <span className="confirmation__mark">
          <CheckIcon size={30} />
        </span>
        <span className="eyebrow">Order confirmed</span>
        <h1>Thank you — your order is on its way.</h1>
        <p className="confirmation__order">Order {order.number}</p>
        <p>
          A confirmation has been sent to {form.email || "your inbox"}. This is a
          demonstration store — no payment was taken and no order will be
          dispatched.
        </p>
        <p className="muted">Order total {money(order.total)}</p>
        <AppLink href="/women" className="btn btn--solid">
          <span>Continue shopping</span>
        </AppLink>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="container">
        <div className="empty-state">
          <span className="eyebrow">Checkout</span>
          <h1 style={{ marginTop: "0.75rem" }}>Nothing to check out</h1>
          <p className="muted">
            Add a few pieces to your cart before proceeding to checkout.
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

  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Secure checkout</span>
        <h1>Checkout</h1>
      </header>

      <form className="checkout-layout" onSubmit={placeOrder} noValidate>
        <div>
          <section className="checkout-block">
            <h2>Contact</h2>
            <div className="stack">
              <div className="field">
                <label htmlFor="field-name">Full name *</label>
                <input
                  id="field-name"
                  value={form.name}
                  onChange={update("name")}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
                {fieldError(errors, "name")}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="field-email">Email *</label>
                  <input
                    id="field-email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {fieldError(errors, "email")}
                </div>
                <div className="field">
                  <label htmlFor="field-phone">Phone</label>
                  <input
                    id="field-phone"
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="checkout-block">
            <h2>Shipping address</h2>
            <div className="stack">
              <div className="field">
                <label htmlFor="field-address">Address *</label>
                <input
                  id="field-address"
                  value={form.address}
                  onChange={update("address")}
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.address)}
                />
                {fieldError(errors, "address")}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="field-city">City *</label>
                  <input
                    id="field-city"
                    value={form.city}
                    onChange={update("city")}
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.city)}
                  />
                  {fieldError(errors, "city")}
                </div>
                <div className="field">
                  <label htmlFor="field-zip">ZIP / Postal code *</label>
                  <input
                    id="field-zip"
                    value={form.zip}
                    onChange={update("zip")}
                    autoComplete="postal-code"
                    aria-invalid={Boolean(errors.zip)}
                  />
                  {fieldError(errors, "zip")}
                </div>
              </div>
              <div className="field">
                <label htmlFor="field-country">Country *</label>
                <select
                  id="field-country"
                  value={form.country}
                  onChange={update("country")}
                  autoComplete="country-name"
                  aria-invalid={Boolean(errors.country)}
                >
                  <option value="">Select a country</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Japan</option>
                </select>
                {fieldError(errors, "country")}
              </div>
            </div>
          </section>

          <section className="checkout-block">
            <div className="checkout-block__head">
              <h2>Payment</h2>
              <span className="eyebrow" style={{ color: "var(--sale)" }}>
                Dummy
              </span>
            </div>
            <p className="dummy-note" style={{ marginBottom: "1.25rem" }}>
              <ShieldIcon size={16} />
              Demo only — do not enter real card details. No payment is processed.
            </p>
            <div className="stack">
              <div className="field">
                <label htmlFor="field-card">Card number *</label>
                <input
                  id="field-card"
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  value={form.card}
                  onChange={update("card")}
                  aria-invalid={Boolean(errors.card)}
                />
                {fieldError(errors, "card")}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="field-expiry">Expiry *</label>
                  <input
                    id="field-expiry"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={update("expiry")}
                    aria-invalid={Boolean(errors.expiry)}
                  />
                  {fieldError(errors, "expiry")}
                </div>
                <div className="field">
                  <label htmlFor="field-cvc">CVC *</label>
                  <input
                    id="field-cvc"
                    inputMode="numeric"
                    placeholder="123"
                    value={form.cvc}
                    onChange={update("cvc")}
                    aria-invalid={Boolean(errors.cvc)}
                  />
                  {fieldError(errors, "cvc")}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="summary" aria-label="Order summary">
          <h2>Order summary</h2>
          {items.map((line) => (
            <div
              className="summary__row summary__row--muted"
              key={`${line.id}-${line.size}`}
            >
              <span>
                {line.name} × {line.qty}
                <br />
                <small>Size {line.size}</small>
              </span>
              <span>{money(line.price * line.qty)}</span>
            </div>
          ))}
          <div className="summary__row" style={{ marginTop: "0.5rem" }}>
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
          <button type="submit" className="btn btn--solid btn--block">
            <span>Place Order</span>
          </button>
          <p className="summary__note">
            By placing this order you agree to our terms. This is a demo store.
          </p>
        </aside>
      </form>
    </div>
  );
}
