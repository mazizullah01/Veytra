import { getAssistantProducts, type AssistantProductQuery } from "../api";
import type { Product } from "../data";
import type { AssistantReply, ClassifiedMessage, SearchContext } from "./types";

const subcategories: Record<NonNullable<SearchContext["kind"]>, string[]> = {
  tshirt: ["T-Shirts"], shirt: ["Shirts"], trousers: ["Trousers"], dress: ["Dresses"],
  jacket: ["Outerwear", "Jackets"], coat: ["Outerwear", "Coats"], sweater: ["Knitwear"], blazer: ["Blazers", "Suits"], jeans: ["Jeans", "Denim"],
};
const colors: Record<string, string[]> = { grey: ["grey", "gray"], olive: ["olive", "khaki"] };

/** Only explicit garment-color wording, never colors in styling advice or photos. */
export function hasColorEvidence(product: Product, color: string): boolean {
  return (colors[color] ?? [color]).some(word => {
    const token = `\\b${word}\\b`;
    return new RegExp(token, "i").test(product.name) ||
      new RegExp(`(?:the|a|an)\\s+${word}(?:[ -]toned)?\\s+(?:tee|t-shirt|shirt|coat|dress|sweater|trousers|jacket)\\b`, "i").test(product.description) ||
      new RegExp(`\\bin\\s+(?:a\\s+)?(?:soft\\s+)?${word}\\b`, "i").test(product.description);
  });
}

function card(product: Product) {
  return { id: product.id, name: product.name, price: product.price, image: product.images[0], sizes: product.sizes };
}
export async function searchReply(message: ClassifiedMessage, signal?: AbortSignal): Promise<AssistantReply> {
  const c = message.context;
  const local = message.language === "ur" ? "آپ کی تلاش کے مطابق: " : message.language === "roman" ? "Aap ki talaash ke mutabiq: " : "";
  if (c.currency === "PKR") return {
    text: message.language === "ur" ? "اس اسٹور کی قیمتیں USD میں ہیں۔ تصدیق شدہ شرحِ تبادلہ موجود نہیں، اس لیے میں PKR بجٹ کو ڈالر نہیں سمجھوں گا۔ براہِ کرم بجٹ امریکی ڈالر میں بتائیں، مثلاً under $30۔" : message.language === "roman" ? "Store ki qeematein USD mein hain. Verified exchange rate nahi hai, is liye PKR budget ko dollar nahi samjhoon ga. Apna budget USD mein bata dein, jaise under $30." : "This store prices items in USD. I don’t have a verified exchange rate, so I won’t treat your PKR budget as dollars. Please give a USD budget, for example “under $30”.",
    context: c, quickReplies: ["Under $30", "Under $50", "Clear filters"],
  };
  if ((c.minPrice ?? 0) > (c.maxPrice ?? Infinity)) return { text: "The minimum price is higher than the maximum. Please give a new range, such as “between $20 and $100”, or clear the filters.", context: c, quickReplies: ["Clear filters"] };
  if (c.style === "related" && !c.kind) return { text: "Which item would you like to style? Ask for a product type first, then say “what goes with it?”", context: c, quickReplies: ["Show me shirts", "Show me trousers"] };
  const common: AssistantProductQuery = {
    category: c.category, size: c.size, minPrice: c.minPrice, maxPrice: c.maxPrice, maxExclusive: c.maxExclusive,
    subcategories: c.kind ? subcategories[c.kind] : undefined,
    terms: c.style === "related" ? undefined : c.query?.split(" "), limit: 24,
  };
  let candidates: Product[];
  // A bounded query per role returns real tops AND bottoms rather than four shirts.
  if (!c.kind && (c.style === "casual" || c.style === "formal")) {
    const tops = c.style === "formal" ? ["Shirts", "Blazers", "Suits"] : ["T-Shirts", "Shirts", "Knitwear"];
    const results = await Promise.all([
      getAssistantProducts({ ...common, subcategories: tops, anyTerms: c.color ? (colors[c.color] ?? [c.color]) : undefined }, signal),
      getAssistantProducts({ ...common, subcategories: ["Trousers", "Jeans"], anyTerms: c.color ? (colors[c.color] ?? [c.color]) : undefined }, signal),
    ]);
    const filtered = results.map(list => list.filter(p => !c.color || hasColorEvidence(p, c.color)));
    candidates = [...filtered[0].slice(0, 2), ...filtered[1].slice(0, 2)];
  } else {
    let anyTerms = c.color ? (colors[c.color] ?? [c.color]) : undefined;
    if (c.style === "summer") anyTerms = ["lightweight", "linen", "breathable"];
    if (c.style === "black-jeans") anyTerms = ["white", "neutral", "sand", "beige", "stone"];
    const relatedCategories = c.kind === "trousers" || c.kind === "jeans" ? ["T-Shirts", "Shirts", "Knitwear"] : c.kind === "dress" ? ["Outerwear", "Knitwear"] : ["Trousers", "Jeans"];
    candidates = await getAssistantProducts({ ...common, anyTerms,
      subcategories: c.style === "related" ? relatedCategories : c.style === "black-jeans" ? ["T-Shirts", "Shirts", "Outerwear", "Blazers"] : common.subcategories }, signal);
    if (c.color) candidates = candidates.filter(p => hasColorEvidence(p, c.color!));
  }
  // Additional kind checks where the existing taxonomy combines coats and jackets.
  if (c.style !== "related" && (c.kind === "jacket" || c.kind === "coat" || c.kind === "blazer")) {
    candidates = candidates.filter(p => new RegExp(`\\b${c.kind}\\b`, "i").test(`${p.name} ${p.description}`));
  }
  const products = [...new Map(candidates.map(p => [p.id, p])).values()].slice(0, 4).map(card);
  const summary = [c.category, c.kind, c.color, c.query, c.size ? `size ${c.size}` : "",
    c.minPrice !== undefined ? `from $${c.minPrice}` : "", c.maxPrice !== undefined ? `${c.maxExclusive ? "under" : "up to"} $${c.maxPrice}` : ""].filter(Boolean).join(" · ");
  if (!products.length) return {
    text: local + `I couldn’t find matching catalog items${summary ? ` for ${summary}` : ""}. ${c.color ? "Colors are matched only when explicitly stated in product names or descriptions; I can’t infer them from photos. " : ""}Try another category or clear the filters.`,
    context: c, products: [], quickReplies: ["Clear filters", "Show me T-shirts", "Show me women's clothing"],
  };
  const styleText = c.style === "related" ? `For your ${c.kind}, consider these complementary catalog pieces. This is styling guidance, not a bundle or a fit guarantee.` : c.style === "summer" ? "These descriptions mention linen, lightweight construction or breathability. Check each product for its actual fabric and fit." :
    c.style === "black-jeans" ? "For black jeans, consider these listed neutral pieces. These are styling suggestions, not a packaged outfit." :
    c.style === "casual" || c.style === "formal" ? `Here are ${c.style} outfit suggestions from the catalog. Prices and budgets apply per item; this is not a bundle.` : `Here are matching catalog items${summary ? `: ${summary}` : ""}.`;
  return { text: local + styleText + " Sizes below are catalog options; live stock quantities aren’t tracked. All prices are USD.",
    products, context: c, quickReplies: ["Only black ones", "Medium size", "Under $50", "Clear filters"] };
}
