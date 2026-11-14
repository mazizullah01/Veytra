import type { Product } from "./data";
import { getAssistantProducts, getProducts } from "./api";
import {
  COLOR_ALIASES,
  KIND_SUBCATEGORIES,
  RELATED_SUBCATEGORIES,
} from "./ai-search-rank";
import { classifyMessage, validateContext } from "./style-assistant/rules";
import { hasColorEvidence } from "./style-assistant/search";

function dedupe(products: Product[]): Product[] {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

export interface StoreSearchResult {
  matches: Product[];
  related: Product[];
  summary: string;
}

/**
 * Server search: stylist-style understanding + literal name search + related pieces.
 * Example: "blue shirt" → shirts (esp. blue) + related tops/bottoms from the store.
 */
export async function searchStore(query: string): Promise<StoreSearchResult> {
  const q = query.trim();
  if (!q) return { matches: [], related: [], summary: "" };

  const classified = classifyMessage(q, {});
  classified.context = validateContext(classified.context);
  const context = classified.context;

  const literal = await getProducts({ query: q, limit: 24 });

  let smart: Product[] = [];
  try {
    const common = {
      category: context.category,
      size: context.size,
      minPrice: context.minPrice,
      maxPrice: context.maxPrice,
      maxExclusive: context.maxExclusive,
      subcategories: context.kind ? KIND_SUBCATEGORIES[context.kind] : undefined,
      terms: context.query?.split(" "),
      anyTerms: context.color ? (COLOR_ALIASES[context.color] ?? [context.color]) : undefined,
      limit: 24,
    };
    smart = await getAssistantProducts(common);
    if (context.color) smart = smart.filter((product) => hasColorEvidence(product, context.color!));
  } catch {
    smart = [];
  }

  let matches = dedupe([...literal, ...smart]);
  if (context.kind) {
    const preferred = KIND_SUBCATEGORIES[context.kind] ?? [];
    matches = matches.sort((a, b) => {
      const aHit = preferred.some((sub) => a.subcategory === sub) ? 0 : 1;
      const bHit = preferred.some((sub) => b.subcategory === sub) ? 0 : 1;
      return aHit - bHit || a.price - b.price;
    });
  }
  matches = matches.slice(0, 12);

  const matchIds = new Set(matches.map((product) => product.id));
  let related: Product[] = [];

  if (context.kind) {
    const relatedSubs = RELATED_SUBCATEGORIES[context.kind] ?? [];
    try {
      related = await getAssistantProducts({
        category: context.category,
        subcategories: relatedSubs,
        limit: 16,
      });
    } catch {
      related = [];
    }
  } else if (matches.length) {
    const pool = await getProducts({ category: matches[0].category, limit: 24 });
    related = pool;
  }

  related = dedupe(related).filter((product) => !matchIds.has(product.id)).slice(0, 8);

  const bits = [
    context.category,
    context.kind,
    context.color,
    context.size ? `size ${context.size}` : "",
    context.query,
  ].filter(Boolean);
  const summary = bits.length
    ? `Showing matches for ${bits.join(" · ")}${related.length ? ", plus similar pieces from the store" : ""}`
    : related.length
      ? "Showing name matches plus similar pieces from the store"
      : "Showing matches from the store catalogue";

  return { matches, related, summary };
}
