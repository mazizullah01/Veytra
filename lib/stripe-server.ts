import "server-only";
import Stripe from "stripe";
import { createAdminClient, createClient } from "@insforge/sdk";

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const orderColumns = "id,user_id,total,status,payment_status,payment_method,stripe_session_id";
export interface PaymentOrder {
  id: string; user_id: string; total: number | string; status: string;
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

export function paymentFailure(error: unknown) {
  if (error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Stripe payment request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: "Payment service is temporarily unavailable. Please try again." }, { status: 502 });
}
