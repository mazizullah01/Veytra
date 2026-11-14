import type { Product } from "./data";
import { classifyMessage, validateContext } from "./style-assistant/rules";
import type { SearchContext } from "./style-assistant/types";

export const COLOR_ALIASES: Record<string, string[]> = {
  grey: ["grey", "gray"],
  olive: ["olive", "khaki"],
};

/** Local color evidence check — keep this file free of server/api imports for Navbar. */
function hasColorEvidence(product: Product, color: string): boolean {
  return (COLOR_ALIASES[color] ?? [color]).some((word) => {
    const token = `\\b${word}\\b`;
    return new RegExp(token, "i").test(product.name) ||
      new RegExp(`(?:the|a|an)\\s+${word}(?:[ -]toned)?\\s+(?:tee|t-shirt|shirt|coat|dress|sweater|trousers|jacket)\\b`, "i").test(product.description) ||
      new RegExp(`\\bin\\s+(?:a\\s+)?(?:soft\\s+)?${word}\\b`, "i").test(product.description);
  });
}

export const KIND_SUBCATEGORIES: Record<NonNullable<SearchContext["kind"]>, string[]> = {
  tshirt: ["T-Shirts"],
  shirt: ["Shirts"],
  trousers: ["Trousers"],
  dress: ["Dresses"],
  jacket: ["Outerwear", "Jackets"],
  coat: ["Outerwear", "Coats"],
  sweater: ["Knitwear"],
  blazer: ["Blazers", "Suits"],
  jeans: ["Jeans", "Denim"],
};

export const RELATED_SUBCATEGORIES: Record<NonNullable<SearchContext["kind"]>, string[]> = {
  tshirt: ["Shirts", "Knitwear", "Trousers"],
  shirt: ["T-Shirts", "Knitwear", "Trousers", "Blazers"],
  trousers: ["T-Shirts", "Shirts", "Knitwear"],
  dress: ["Outerwear", "Knitwear"],
  jacket: ["Trousers", "Shirts", "Knitwear"],
  coat: ["Trousers", "Knitwear", "Shirts"],
  sweater: ["Trousers", "Outerwear", "Shirts"],
  blazer: ["Trousers", "Shirts"],
  jeans: ["T-Shirts", "Shirts", "Outerwear"],
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function productText(product: Product): string {
  return `${product.name} ${product.subcategory} ${product.category} ${product.description}`.toLowerCase();
}

/** Score a catalogue product for overlay suggestions (no network). */
export function scoreCatalogueProduct(product: Product, query: string): number {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return 0;
  const classified = classifyMessage(query, {});
  const context = validateContext(classified.context);
  const hay = productText(product);
  let score = 0;

  for (const token of tokenize(q)) {
    if (product.name.toLowerCase().includes(token)) score += 6;
    else if (product.subcategory.toLowerCase().includes(token)) score += 4;
    else if (hay.includes(token)) score += 2;
  }

  if (context.kind) {
    const subs = KIND_SUBCATEGORIES[context.kind] ?? [];
    if (subs.some((sub) => product.subcategory.toLowerCase() === sub.toLowerCase())) score += 8;
    else if ((RELATED_SUBCATEGORIES[context.kind] ?? []).some((sub) => product.subcategory.toLowerCase() === sub.toLowerCase())) {
      score += 3;
    }
  }

  if (context.color) {
    if (hasColorEvidence(product, context.color)) score += 7;
    else if ((COLOR_ALIASES[context.color] ?? [context.color]).some((word) => hay.includes(word))) score += 3;
  }

  if (context.category && product.category === context.category) score += 2;
  if (context.query && hay.includes(context.query.toLowerCase())) score += 4;

  return score;
}

/** Navbar / overlay suggestions: exact-ish matches first, then related. */
export function rankCatalogueSuggestions(products: Product[], query: string, limit = 6): Product[] {
  const scored = products
    .map((product) => ({ product, score: scoreCatalogueProduct(product, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);
  return scored.slice(0, limit).map((row) => row.product);
}
