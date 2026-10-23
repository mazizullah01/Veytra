import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readStylistBody } from "@/lib/style-assistant/ai-input";
import { classifyMessage, validateContext } from "@/lib/style-assistant/rules";
import { faqReply } from "@/lib/style-assistant/faq";
import { searchReply } from "@/lib/style-assistant/search";
import { fashionReply } from "@/lib/style-assistant/gemini";
import { acquireStylist, limitStylist, pauseStylist, releaseStylist } from "@/lib/style-assistant/ai-limits";
import { QUICK_REPLIES, type ProductSuggestion } from "@/lib/style-assistant/types";
export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== process.env.NEXT_PUBLIC_APP_URL)
    return NextResponse.json({ error: "Please open the stylist on the store website." }, { status: 403, headers });
  const cookie = request.cookies.get("veytra_style_session")?.value;
  const session = cookie && /^[a-f\d-]{36}$/i.test(cookie) ? cookie : randomUUID();
  const ip = (request.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim().slice(0, 80);
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const respond = (body: unknown, status = 200, retry = 0) => {
    const response = NextResponse.json(body, { status, headers: { ...headers, ...(retry ? { "Retry-After": String(retry) } : {}) } });
    response.cookies.set("veytra_style_session", session, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 3600 });
    return response;
  };
  const retry = limitStylist([`session:${hash(session)}`, `ip:${hash(ip)}`]);
  if (retry) return respond({ error: "The stylist is at its free usage limit. Please wait before trying again." }, 429, retry);
  let body, classified;
  try {
    body = await readStylistBody(request);
    classified = classifyMessage(body.message, validateContext(body.context));
    classified.context = validateContext(classified.context);
  } catch (error) { return respond({ error: error instanceof Error ? error.message : "Invalid message." }, 400); }
  // Account data stays on the account page; neither account data nor credentials go to Gemini.
  const accountQuestion = /\b(my orders?|order (?:status|number|id|history)|track(?:ing)?|parcel|account|password|address|email|phone|payment|card number)\b|آرڈر|پاس ورڈ|پتہ|اکاؤنٹ/i;
  if (accountQuestion.test(body.message)) return respond({ text: classified.language === "ur" ? "اپنے آرڈرز اور ذاتی معلومات کے لیے اکاؤنٹ کا صفحہ کھولیں۔ براہ کرم چیٹ میں ذاتی یا ادائیگی کی معلومات نہ بھیجیں۔" : classified.language === "roman" ? "Apne orders aur zaati maloomat ke liye account page kholein. Chat mein personal ya payment details na bhejein." : "Please open your account page for orders or personal information. Keep addresses, contact details and payment information out of this chat.", context: classified.context, private: true, links: [{ label: "Your account", href: "/profile" }] });
  if (["shipping", "returns", "exchange", "payments", "reset", "greeting", "size-guide"].includes(classified.intent)) return respond(faqReply(classified));
  if (!process.env.GEMINI_API_KEY?.trim()) return respond({ error: "The AI stylist’s API key is missing. The store owner needs to finish setup before chat can work." }, 503);
  if (process.env.GEMINI_FREE_TIER_CONFIRMED !== "true") return respond({ error: "The AI stylist is waiting for the store owner to confirm its Free-tier setup. No billing needs to be enabled." }, 503);
  if (!acquireStylist()) return respond({ error: "The stylist is helping other shoppers. Please try again shortly." }, 429, 10);
  try {
    let products: ProductSuggestion[] = [], catalogState = "not requested";
    if (classified.intent === "search") {
      try { const result = await searchReply(classified, AbortSignal.timeout(4000)); products = result.products ?? []; catalogState = result.text; }
      catch { catalogState = "temporarily unavailable; give general fashion advice and do not claim product availability"; }
    }
    const history = body.history.filter(t => !accountQuestion.test(t.text));
    const text = await fashionReply(body.message, history, products, catalogState);
    return respond({ text, context: classified.context, products, quickReplies: QUICK_REPLIES });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    const timeout = status === 504 || status === 408 || (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name));
    // Only fixed categories and HTTP status: never log prompts, keys or provider messages.
    console.warn("[style-assistant] provider failure", { status: status || null, kind: timeout ? "timeout" : status === 429 ? "quota" : "upstream" });
    if (timeout) return respond({ error: "The AI stylist took too long to respond. Please try again shortly." }, 504);
    if (status === 429) { pauseStylist(); return respond({ error: "Gemini’s free quota is currently exhausted. Please try again later; no paid fallback is used." }, 429, 60); }
    return respond({ error: "The AI stylist is temporarily unavailable. Please try again shortly or browse the shop." }, 503);
  } finally { releaseStylist(); }
}
