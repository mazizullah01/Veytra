import {
  PRODUCTS,
  type Category,
  type Product,
} from "./data";

/**
 * ============================================================================
 *  lib/api.ts — THE BACKEND-SWAP SEAM
 * ============================================================================
 *
 * Every page and component reads catalogue data through the functions in this
 * module — never from `lib/data.ts` directly (except presentational helpers).
 *
 * Today each function resolves synchronously from the in-memory demo catalogue
 * behind an `await delay(...)`, which mimics real network latency and keeps the
 * call-sites async. To move to a real backend you ONLY need to change the
 * bodies below to `fetch(...)` calls — no page-level code changes required.
 *
 * Example future implementation:
 *
 *   export async function getProducts(params: ProductQuery = {}) {
 *     const qs = new URLSearchParams(
 *       Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
 *     );
 *     const res = await fetch(`${API_URL}/products?${qs}`, { next: { revalidate: 60 } });
 *     if (!res.ok) throw new Error("Failed to load products");
 *     return (await res.json()) as Product[];
 *   }
 *
 * All functions are typed and return Promises so swapping in fetch is a drop-in.
 * ============================================================================
 */

export type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

export interface ProductQuery {
  category?: Category;
  subcategory?: string;
  sort?: SortKey;
  query?: string;
  limit?: number;
}

/** Tiny artificial latency so the async seam is visible and honest. */
const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/** Safely coerce an untrusted URL value into a valid SortKey. */
export function parseSort(value: unknown): SortKey {
  return value === "price-asc" || value === "price-desc" || value === "newest"
    ? value
    : "featured";
}

function applySort(products: Product[], sort: SortKey = "featured"): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "newest":
      return list.sort(
        (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)),
      );
    case "featured":
    default:
      return list.sort((a, b) => {
        const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featured !== 0) return featured;
        const trend = Number(Boolean(b.trending)) - Number(Boolean(a.trending));
        if (trend !== 0) return trend;
        return a.name.localeCompare(b.name);
      });
  }
}

/** Normalise a free-text search term for loose matching. */
const normalise = (value: string) => value.trim().toLowerCase();

function matchesQuery(product: Product, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return (
    normalise(product.name).includes(q) ||
    normalise(product.subcategory).includes(q) ||
    normalise(product.category).includes(q) ||
    normalise(product.description).includes(q)
  );
}

/**
 * Query the catalogue. All params optional and combinable.
 * `sort` defaults to "featured", `limit` slices after sorting.
 */
export async function getProducts(params: ProductQuery = {}): Promise<Product[]> {
  await delay();
  const { category, subcategory, sort = "featured", query, limit } = params;

  let list = PRODUCTS.filter((product) => {
    if (category && product.category !== category) return false;
    if (subcategory && product.subcategory !== subcategory) return false;
    if (query && !matchesQuery(product, query)) return false;
    return true;
  });

  list = applySort(list, sort);
  if (typeof limit === "number") list = list.slice(0, limit);
  return list;
}

/** Fetch a single product by id, or null when it does not exist. */
export async function getProductById(id: string): Promise<Product | null> {
  await delay();
  return PRODUCTS.find((product) => product.id === id) ?? null;
}

/** Products flagged `featured`, newest-first within the flag. */
export async function getFeatured(limit = 8): Promise<Product[]> {
  return getProducts({ sort: "featured", limit }).then((list) =>
    list.filter((p) => p.featured).slice(0, limit),
  );
}

/** Products flagged `isNew`. */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  return getProducts({ sort: "newest", limit }).then((list) =>
    list.filter((p) => p.isNew).slice(0, limit),
  );
}

/** Products flagged `trending`. */
export async function getTrending(limit = 8): Promise<Product[]> {
  await delay();
  return applySort(
    PRODUCTS.filter((p) => p.trending),
    "featured",
  ).slice(0, limit);
}

/**
 * Related products: same category first, preferring the same subcategory,
 * excluding the current product.
 */
export async function getRelated(id: string, limit = 4): Promise<Product[]> {
  await delay();
  const current = PRODUCTS.find((p) => p.id === id);
  if (!current) return [];
  const pool = PRODUCTS.filter(
    (p) => p.id !== id && p.category === current.category,
  );
  const sameSub = pool.filter((p) => p.subcategory === current.subcategory);
  const rest = pool.filter((p) => p.subcategory !== current.subcategory);
  return [...sameSub, ...rest].slice(0, limit);
}
