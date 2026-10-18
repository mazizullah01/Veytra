import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import type { AssistantReply, ClassifiedMessage } from "./types";

/** Never accepts a user ID, uses admin access, or writes to orders/payments. */
export async function orderReply(message: ClassifiedMessage): Promise<AssistantReply> {
  const store = await cookies();
  const signIn: AssistantReply = {
    text: message.language === "ur" ? "اپنے آرڈر کی معلومات دیکھنے کے لیے سائن اِن کریں۔ میں صرف آپ کے اپنے آرڈر دکھا سکتا ہوں۔" : message.language === "roman" ? "Apne order ki maloomat ke liye sign in karein. Main sirf aap ke apne orders dikha sakta hoon." : "Please sign in to view your orders. I can only look up orders belonging to your verified account.",
    context: message.context, private: true,
    links: [{ label: "Sign in to view orders", href: "/login?next=%2Fprofile" }],
  };
  if (!store.has("insforge_access_token")) return signIn;
  const client = createServerClient({ cookies: store });
  const { data: identity, error: authError } = await client.auth.getCurrentUser();
  if (authError || !identity?.user) return signIn;
  let query = client.database.from("orders").select("id,created_at,status").eq("user_id", identity.user.id);
  if (message.orderId) query = query.eq("id", message.orderId);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id").limit(3)
    .abortSignal(AbortSignal.timeout(7000));
  if (error) throw new Error("Order lookup is unavailable.");
  const orders = data as { id: string; created_at: string; status: string }[] | null;
  return {
    text: !orders?.length ? "I couldn’t find that order in your account. Open your order history to check the order reference." :
      "Your latest matching order records:\n" + orders.map(order => {
        const placed = new Date(order.created_at);
        return `Order ${order.id} · ${String(order.status).slice(0, 40)}${Number.isNaN(placed.getTime()) ? "" : ` · placed ${placed.toISOString().slice(0, 10)}`}`;
      }).join("\n") + "\nThese are recorded statuses, not a courier delivery estimate.",
    context: message.context, private: true, links: [{ label: "Open your order history", href: "/profile" }],
  };
}
