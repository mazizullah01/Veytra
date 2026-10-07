"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import AppLink from "./AppLink";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { useAuth, useCart } from "@/lib/store";

import { insforge, errorMessage } from "@/lib/insforge";

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zip: "",
  country: "",
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
  const { items, ready, subtotal, shipping, total, clear, flush } = useCart();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const router = useRouter();
  const orderId = useRef<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const update =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !user) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true); setFailure("");
    try {
      await flush();
      orderId.current ??= crypto.randomUUID();
      // An uncertain network response can be retried without placing a second order.
      const existing = await insforge.database.from("orders").select("id,total,status").eq("id", orderId.current).maybeSingle();
      if (existing.error) throw existing.error;
      let saved = existing.data;
      if (!saved) {
        const { data, error } = await insforge.database.from("orders").insert([{
          id: orderId.current, user_id: user.id,
          items: items.map(line => ({ id: line.id, name: line.name, size: line.size, qty: line.qty, price: line.price })),
          subtotal, shipping, total, status: "pending", payment_status: "unpaid", payment_method: "stripe",
          contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          shipping_address: { address: form.address.trim(), city: form.city.trim(), zip: form.zip.trim(), country: form.country },
        }]).select("id,total,status").single();
        if (error) throw error;
        saved = data;
      }
      if (!saved) throw new Error("Order could not be confirmed. Please retry.");
      clear();
      router.push(`/payment/${saved.id}`);
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };

  if (loading || (user && !ready)) {
    return (
      <div className="section container" style={{ paddingBlock: "6rem" }}>
        <div className="loader" />
      </div>
    );
  }

  if (!user) return <section className="container"><div className="empty-state">
    <span className="eyebrow">Checkout</span><h1>Sign in to place your order</h1>
    <p className="muted">Your shopping bag will be ready after you sign in.</p>
    <AppLink href="/login?next=%2Fcheckout" className="btn btn--solid"><span>Sign in / Create account</span></AppLink>
  </div></section>;

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
          {failure && <p className="field__error" role="alert">{failure}</p>}
          <button type="submit" disabled={busy} className="btn btn--solid btn--block">
            <span>{busy ? "Placing order…" : "Place Order"}</span>
          </button>
          <p className="summary__note">
            By placing this order you agree to our terms. Continue to Stripe to complete your payment.
          </p>
        </aside>
      </form>
    </div>
  );
}
