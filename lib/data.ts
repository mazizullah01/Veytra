import { GENERATED_PRODUCTS } from "./generated-products";

/**
 * Domain model for the storefront.
 *
 * NOTE: images is an ordered tuple — index 0 is the primary image, index 1 is
 * the hover image used by ProductCard. A missing second image falls back to the
 * first at render time.
 */
export interface Product {
  id: string;
  name: string;
  category: "women" | "men";
  subcategory: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  sizes: string[];
  images: string[];
  featured?: boolean;
  isNew?: boolean;
  trending?: boolean;
}

export type Category = Product["category"];

/**
 * Curated subcategory order, per category. `subcategoriesFor()` uses this as the
 * preferred ordering but only surfaces subcategories that actually have products
 * in the ACTIVE catalogue (imported listings), so filter pills never lead nowhere.
 */
export const CATEGORIES: Record<Category, string[]> = {
  women: ["Dresses", "Knitwear", "Outerwear", "Tops", "Trousers", "Skirts"],
  men: ["Outerwear", "Shirts", "Knitwear", "T-Shirts", "Trousers", "Suits"],
};

export const SIZES = ["XS", "S", "M", "L", "XL"] as const;

/** The supplied listings are the complete storefront catalogue. */
export const PRODUCTS: Product[] = GENERATED_PRODUCTS;

/**
 * Subcategories for a category, derived from the ACTIVE catalogue:
 * curated CATEGORIES order first, then any extras (e.g. imported) alphabetically.
 * Only subcategories that actually contain products are returned.
 */
export function subcategoriesFor(category: Category): string[] {
  const curated = CATEGORIES[category];
  const present = new Set(
    PRODUCTS.filter((p) => p.category === category).map((p) => p.subcategory),
  );
  const ordered = curated.filter((sub) => present.has(sub));
  const extras = [...present].filter((sub) => !curated.includes(sub)).sort();
  return [...ordered, ...extras];
}
