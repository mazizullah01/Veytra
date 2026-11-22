"use client";

import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import AppLink from "./AppLink";
import Img from "./Img";
import { BagIcon } from "./Icons";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, useAuth, useCart } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";
import { insforge } from "@/lib/insforge-client";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  zip: string;
  country: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  apartment: "",
  city: "",
  zip: "",
  country: "Pakistan",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.firstName.trim()) errors.firstName = "Required";
  if (!form.lastName.trim()) errors.lastName = "Required";
  if (!form.email.trim()) errors.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!form.address.trim()) errors.address = "Required";
  if (!form.city.trim()) errors.city = "Required";
  if (!form.country.trim()) errors.country = "Required";
  return errors;
}

function fieldError(errors: Errors, key: keyof FormState) {
  return errors[key] ? (
    <span className="shop-field__error" role="alert">
      {errors[key]}
    </span>
  ) : null;
}

export default function CheckoutView() {
  const { items, ready, subtotal, shipping, total, clear, flush, count } = useCart();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [saveInfo, setSaveInfo] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const router = useRouter();
  const orderId = useRef<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    document.body.classList.add("checkout-mode");
    return () => document.body.classList.remove("checkout-mode");
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    setForm((prev) => (prev.email ? prev : { ...prev, email: user.email ?? "" }));
  }, [user?.email]);

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
    setBusy(true);
    setFailure("");
    try {
      await flush();
      orderId.current ??= crypto.randomUUID();
      const existing = await insforge.database
        .from("orders")
        .select("id,total,status,order_number")
        .eq("id", orderId.current)
        .maybeSingle();
      if (existing.error) throw existing.error;
      let saved = existing.data;
      if (!saved) {
        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
        const addressLine = form.apartment.trim()
          ? `${form.address.trim()}, ${form.apartment.trim()}`
          : form.address.trim();
        const { data, error } = await insforge.database
          .from("orders")
          .insert([
            {
              id: orderId.current,
              user_id: user.id,
              items: items.map((line) => ({
                id: line.id,
                name: line.name,
                size: line.size,
                qty: line.qty,
                price: line.price,
              })),
              subtotal,
              shipping,
              total,
              status: "pending",
              payment_status: "unpaid",
              payment_method: "stripe",
              contact: {
                name: fullName,
                email: form.email.trim(),
                phone: form.phone.trim(),
                marketing,
                saveInfo,
              },
              shipping_address: {
                address: addressLine,
                city: form.city.trim(),
                zip: form.zip.trim(),
                country: form.country,
              },
            },
          ])
          .select("id,total,status,order_number")
          .single();
        if (error) throw error;
        saved = data;
      }
      if (!saved) throw new Error("Order could not be confirmed. Please retry.");
      clear();
      router.push(`/payment/${saved.id}`);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading || (user && !ready)) {
    return (
      <div className="shop-checkout">
        <div className="shop-checkout__loading">
          <div className="loader" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shop-checkout shop-checkout--simple">
        <div className="shop-checkout__empty">
          <p className="shop-title">Sign in to place your order</p>
          <p className="shop-muted">Your shopping bag will be ready after you sign in.</p>
          <AppLink href="/login?next=%2Fcheckout" className="shop-pay">
            Sign in / Create account
          </AppLink>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shop-checkout shop-checkout--simple">
        <div className="shop-checkout__empty">
          <p className="shop-title">Nothing to check out</p>
          <p className="shop-muted">Add a few pieces to your cart before proceeding.</p>
          <div className="shop-empty-actions">
            <AppLink href="/women" className="shop-pay">
              Shop Women
            </AppLink>
            <AppLink href="/men" className="shop-pay shop-pay--ghost">
              Shop Men
            </AppLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-checkout">
      <header className="shop-checkout__brand">
        <AppLink href="/" className="shop-logo">
          VEYTRA
        </AppLink>
        <AppLink href="/cart" className="shop-bag" aria-label="Cart">
          <BagIcon size={20} />
          {count > 0 && <span>{count}</span>}
        </AppLink>
      </header>

      <form className="shop-checkout__grid" onSubmit={placeOrder} noValidate>
        <div className="shop-checkout__main">
          <section className="shop-block">
            <div className="shop-block__head">
              <h2 className="shop-title">Contact</h2>
              <AppLink href="/login?next=%2Fcheckout" className="shop-link">
                Sign in
              </AppLink>
            </div>
            <div className="shop-stack">
              <div className={`shop-field${form.email ? " is-filled" : ""}`}>
                <input
                  id="field-email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="email"
                  placeholder="Email"
                  aria-invalid={Boolean(errors.email)}
                />
                {fieldError(errors, "email")}
              </div>
              <label className="shop-check">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
                <span>Email me with news and offers</span>
              </label>
            </div>
          </section>

          <section className="shop-block">
            <div className="shop-block__head">
              <h2 className="shop-title">Delivery</h2>
            </div>
            <div className="shop-stack">
              <div className="shop-field shop-field--select is-filled">
                <span className="shop-field__float">Country/Region</span>
                <select
                  id="field-country"
                  value={form.country}
                  onChange={update("country")}
                  autoComplete="country-name"
                  aria-invalid={Boolean(errors.country)}
                >
                  <option value="">Select a country</option>
                  <option>Pakistan</option>
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
              <div className="shop-row">
                <div className={`shop-field${form.firstName ? " is-filled" : ""}`}>
                  <input
                    id="field-firstName"
                    value={form.firstName}
                    onChange={update("firstName")}
                    autoComplete="given-name"
                    placeholder="First name"
                    aria-invalid={Boolean(errors.firstName)}
                  />
                  {fieldError(errors, "firstName")}
                </div>
                <div className={`shop-field${form.lastName ? " is-filled" : ""}`}>
                  <input
                    id="field-lastName"
                    value={form.lastName}
                    onChange={update("lastName")}
                    autoComplete="family-name"
                    placeholder="Last name"
                    aria-invalid={Boolean(errors.lastName)}
                  />
                  {fieldError(errors, "lastName")}
                </div>
              </div>
              <div className={`shop-field${form.address ? " is-filled" : ""}`}>
                <input
                  id="field-address"
                  value={form.address}
                  onChange={update("address")}
                  autoComplete="street-address"
                  placeholder="Address"
                  aria-invalid={Boolean(errors.address)}
                />
                {fieldError(errors, "address")}
              </div>
              <div className={`shop-field${form.apartment ? " is-filled" : ""}`}>
                <input
                  id="field-apartment"
                  value={form.apartment}
                  onChange={update("apartment")}
                  autoComplete="address-line2"
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>
              <div className="shop-row shop-row--city">
                <div className={`shop-field${form.city ? " is-filled" : ""}`}>
                  <input
                    id="field-city"
                    value={form.city}
                    onChange={update("city")}
                    autoComplete="address-level2"
                    placeholder="City"
                    aria-invalid={Boolean(errors.city)}
                  />
                  {fieldError(errors, "city")}
                </div>
                <div className={`shop-field${form.zip ? " is-filled" : ""}`}>
                  <input
                    id="field-zip"
                    value={form.zip}
                    onChange={update("zip")}
                    autoComplete="postal-code"
                    placeholder="Postal code (optional)"
                  />
                </div>
              </div>
              <div className={`shop-field${form.phone ? " is-filled" : ""}`}>
                <input
                  id="field-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  autoComplete="tel"
                  placeholder="Phone"
                />
              </div>
              <label className="shop-check">
                <input
                  type="checkbox"
                  checked={saveInfo}
                  onChange={(event) => setSaveInfo(event.target.checked)}
                />
                <span>Save this information for next time</span>
              </label>
            </div>
          </section>

          <section className="shop-block">
            <div className="shop-block__head">
              <h2 className="shop-title">Shipping method</h2>
            </div>
            <div className="shop-choice is-selected" aria-current="true">
              <span>Delivery Charges</span>
              <strong>{shipping === 0 ? "Free" : money(shipping)}</strong>
            </div>
          </section>

          <section className="shop-block">
            <div className="shop-block__head">
              <h2 className="shop-title">Payment</h2>
            </div>
            <p className="shop-muted shop-promo">
              Enjoy Free Shipping on Orders Above {money(FREE_SHIPPING_THRESHOLD)} 📦
            </p>
            <div className="shop-paybox">
              <div className="shop-payrow is-selected" role="radio" aria-checked="true">
                <span className="shop-radio" aria-hidden />
                <span className="shop-payrow__label">Card via Stripe</span>
                <span className="shop-logos" aria-hidden>
                  <span>Visa</span>
                  <span>Mastercard</span>
                </span>
              </div>
              <p className="shop-payhint">You&apos;ll be redirected to Stripe to complete your purchase.</p>
            </div>
          </section>

          <section className="shop-block">
            <div className="shop-block__head">
              <h2 className="shop-title">Billing address</h2>
            </div>
            <div className="shop-paybox">
              <label className={`shop-payrow${billingSame ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="billing"
                  checked={billingSame}
                  onChange={() => setBillingSame(true)}
                />
                <span>Same as shipping address</span>
              </label>
              <label className="shop-payrow is-disabled">
                <input type="radio" name="billing" checked={!billingSame} disabled />
                <span>Use a different billing address</span>
              </label>
            </div>
          </section>

          {failure && (
            <p className="shop-field__error" role="alert">
              {failure}
            </p>
          )}

          <button type="submit" disabled={busy} className="shop-pay">
            {busy ? "Placing order…" : "Pay now"}
          </button>
          <p className="shop-policies">
            <AppLink href="/privacy">Terms and policies</AppLink>
          </p>
        </div>

        <aside className="shop-checkout__summary" aria-label="Order summary">
          <div className="shop-summary-inner">
            {items.map((line) => (
              <div className="shop-line" key={`${line.id}-${line.size}`}>
                <div className="shop-line__thumb">
                  <Img src={line.image} alt={line.name} fill sizes="64px" />
                  <span>{line.qty}</span>
                </div>
                <div className="shop-line__meta">
                  <strong>{line.name}</strong>
                  <small>{line.size}</small>
                </div>
                <div className="shop-line__price">{money(line.price * line.qty)}</div>
              </div>
            ))}

            <div className="shop-discount">
              <input
                value={discountCode}
                onChange={(event) => setDiscountCode(event.target.value)}
                placeholder="Discount code"
                autoComplete="off"
              />
              <button type="button" disabled>
                Apply
              </button>
            </div>

            <div className="shop-totals">
              <div>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div>
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : money(shipping)}</span>
              </div>
              <div className="shop-totals__total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
