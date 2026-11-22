import "server-only";
import Stripe from "stripe";
import { createAdminClient, createClient } from "@insforge/sdk";
import { canCancelOrder } from "@/lib/order-actions";

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const orderColumns = "id,order_number,user_id,total,status,payment_status,payment_method,stripe_session_id";
export interface PaymentOrder {
  id: string; order_number: string; user_id: string; total: number | string; status: string;
  payment_status: string; payment_method: string; stripe_session_id: string | null;
}
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new PaymentError("Stripe Sandbox is not configured.", 503);
  return new Stripe(key);
}
export function adminClient() {
  if (!process.env.INSFORGE_API_KEY) throw new PaymentError("Payment backend is not configured.", 503);
  return createAdminClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!, apiKey: process.env.INSFORGE_API_KEY });
}
export async function authenticatedClient(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new PaymentError("Please sign in to continue.", 401);
  const client = createClient({ baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!, anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!, accessToken: authorization.slice(7) });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) throw new PaymentError("Please sign in to continue.", 401);
  return { client, user: data.user };
}
export async function ownedOrder(request: Request, id: string) {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) throw new PaymentError("Invalid order ID.");
  const { client, user } = await authenticatedClient(request);
  const { data, error } = await client.database.from("orders").select(orderColumns).eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw new PaymentError("Unable to load your order.", 502);
  if (!data) throw new PaymentError("Order not found in your account.", 404);
  return { order: data as PaymentOrder, user };
}
export function usdCents(total: number | string) {
  const value = String(total);
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new PaymentError("Invalid order total.");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 50 || cents > 99999999) throw new PaymentError("Invalid order total.");
  return cents;
}
export function appUrl() {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) throw new PaymentError("Store URL is not configured.", 503);
  const url = new URL(configured);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new PaymentError("Invalid store URL.", 503);
  return url.origin;
}

/** Prefer the browser origin for localhost so Stripe returns to local UI during development. */
export function checkoutReturnOrigin(request: Request) {
  const raw = request.headers.get("origin") || request.headers.get("referer");
  if (raw) {
    try {
      const url = new URL(raw);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        return url.origin;
      }
    } catch {
      /* fall through */
    }
  }
  return appUrl();
}
export function verifySession(session: Stripe.Checkout.Session, order: PaymentOrder) {
  if (session.livemode || session.mode !== "payment" || session.metadata?.orderId !== order.id || session.client_reference_id !== order.id || session.metadata?.userId !== order.user_id || session.currency !== "usd" || session.amount_total !== usdCents(order.total) || order.payment_method !== "stripe" || order.stripe_session_id !== session.id)
    throw new PaymentError("Payment session does not match this order.", 409);
}

/**
 * Confirm an order after Stripe reports the Checkout Session as paid.
 * Used by the webhook and as a verified fallback on the payment-status route
 * when the webhook is delayed or misconfigured. Never trusts the browser alone.
 */
export async function confirmPaidOrder(
  session: Stripe.Checkout.Session,
  order: PaymentOrder,
): Promise<PaymentOrder> {
  verifySession(session, order);
  if (session.payment_status !== "paid") return order;
  if (order.payment_status === "paid") return order;

  const admin = adminClient();
  const updated = await admin.database
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", order.id)
    .eq("stripe_session_id", session.id)
    .eq("payment_status", "unpaid")
    .eq("status", "pending")
    .select(orderColumns)
    .maybeSingle();
  if (updated.error) {
    console.error("Order confirmation update failed", updated.error);
    throw new PaymentError("Unable to confirm your order.", 502);
  }
  if (updated.data) return updated.data as PaymentOrder;

  const latest = await admin.database
    .from("orders")
    .select(orderColumns)
    .eq("id", order.id)
    .single();
  if (latest.error) {
    console.error("Order confirmation re-read failed", latest.error);
    throw new PaymentError("Unable to confirm your order.", 502);
  }
  if (!latest.data || latest.data.payment_status !== "paid") {
    throw new PaymentError("Order confirmation failed.", 409);
  }
  return latest.data as PaymentOrder;
}

/**
 * Cancel an order the caller owns.
 * Unpaid pending orders are closed and any open Checkout session is expired.
 * Paid confirmed orders are refunded in full, then marked cancelled.
 * Shipped and delivered orders must use a return request instead.
 */
export async function cancelOwnedOrder(request: Request, id: string): Promise<PaymentOrder> {
  const { order } = await ownedOrder(request, id);
  if (!canCancelOrder(order)) {
    if (order.status === "shipped" || order.status === "delivered") {
      throw new PaymentError("This order has already shipped. Request a return from your profile.", 409);
    }
    throw new PaymentError("This order cannot be cancelled.", 409);
  }

  const admin = adminClient();
  const { data: returnRows, error: returnError } = await admin.database
    .from("returns")
    .select("id,status")
    .eq("order_id", order.id)
    .limit(50);
  if (returnError) throw new PaymentError("Unable to check return requests.", 502);
  const activeReturn = ((returnRows as { status: string }[] | null) ?? []).some(
    (row) => row.status === "requested" || row.status === "approved" || row.status === "completed",
  );
  if (activeReturn) {
    throw new PaymentError("This order already has a return request, so it can’t be cancelled.", 409);
  }

  if (order.payment_status === "unpaid") {
    await expireOpenCheckout(order);
    const updated = await admin.database
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("user_id", order.user_id)
      .eq("status", "pending")
      .eq("payment_status", "unpaid")
      .select(orderColumns)
      .maybeSingle();
    if (updated.error) throw new PaymentError("Unable to cancel your order.", 502);
    if (updated.data) return updated.data as PaymentOrder;
    return readCancelledOrConflict(order.id);
  }

  await refundCheckout(order);
  const updated = await admin.database
    .from("orders")
    .update({ status: "cancelled", payment_status: "refunded" })
    .eq("id", order.id)
    .eq("user_id", order.user_id)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .select(orderColumns)
    .maybeSingle();
  if (updated.error) throw new PaymentError("The refund was sent, but the order could not be updated. Refresh and try again.", 502);
  if (updated.data) return updated.data as PaymentOrder;
  return readCancelledOrConflict(order.id);
}

async function expireOpenCheckout(order: PaymentOrder) {
  if (!order.stripe_session_id) return;
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
  if (session.payment_status === "paid") {
    throw new PaymentError("Payment is processing. Refresh your orders before cancelling.", 409);
  }
  if (session.status !== "open") return;
  try {
    await stripe.checkout.sessions.expire(order.stripe_session_id);
  } catch (error) {
    const latest = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (latest.payment_status === "paid") {
      throw new PaymentError("Payment is processing. Refresh your orders before cancelling.", 409);
    }
    throw error;
  }
}

async function refundCheckout(order: PaymentOrder) {
  if (!order.stripe_session_id) throw new PaymentError("This paid order has no payment to refund.", 409);
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
  verifySession(session, order);
  const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!intentId) throw new PaymentError("Payment is not ready to refund yet.", 409);
  const existing = await stripe.refunds.list({ payment_intent: intentId, limit: 10 });
  const alreadyRefunded = existing.data.some((refund) => refund.status === "succeeded" || refund.status === "pending");
  if (alreadyRefunded) return;
  await stripe.refunds.create(
    { payment_intent: intentId, reason: "requested_by_customer" },
    { idempotencyKey: `cancel:${order.id}` },
  );
}

async function readCancelledOrConflict(id: string): Promise<PaymentOrder> {
  const latest = await adminClient().database.from("orders").select(orderColumns).eq("id", id).single();
  if (!latest.error && latest.data?.status === "cancelled") return latest.data as PaymentOrder;
  throw new PaymentError("This order changed. Refresh and try again.", 409);
}

export function paymentFailure(error: unknown) {
  if (error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Stripe payment request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: "Payment service is temporarily unavailable. Please try again." }, { status: 502 });
}
