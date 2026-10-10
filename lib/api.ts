import { cache } from "react";
import type { Category, Product } from "./data";
import { productImageSrc } from "./format";
import { insforge } from "./insforge";

/** Backend seam: keep page-facing signatures and map database names here. */
export type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

export interface ProductQuery {
  category?: Category;
  subcategory?: string;
  sort?: SortKey;
  query?: string;
  limit?: number;
}

const columns = "id,name,category,subcategory,price,compare_at_price,description,sizes,images,featured,is_new,trending";
interface ProductRow {
  id: string; name: string; category: Category; subcategory: string;
  price: number; compare_at_price: number | null; description: string;
  sizes: string[]; images: string[]; featured: boolean; is_new: boolean; trending: boolean;
}
function product(row: ProductRow): Product {
  return { id: row.id, name: row.name, category: row.category, subcategory: row.subcategory,
    price: Number(row.price), compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    description: row.description, sizes: row.sizes, images: row.images.map(productImageSrc),
    featured: row.featured, isNew: row.is_new, trending: row.trending };
}
export function parseSort(value: unknown): SortKey {
  return value === "price-asc" || value === "price-desc" || value === "newest" ? value : "featured";
}
async function catalogue(params: ProductQuery = {}, flag?: "featured" | "is_new" | "trending"): Promise<Product[]> {
  let request = insforge.database.from("products").select(columns);
  if (params.category) request = request.eq("category", params.category);
  if (params.subcategory) request = request.eq("subcategory", params.subcategory);
  if (flag) request = request.eq(flag, true);
  if (params.sort === "price-asc" || params.sort === "price-desc")
    request = request.order("price", { ascending: params.sort === "price-asc" });
  else if (params.sort === "newest")
    request = request.order("is_new", { ascending: false }).order("created_at", { ascending: false });
  else request = request.order("featured", { ascending: false }).order("trending", { ascending: false }).order("name");
  // Search retains the existing literal, case-insensitive substring behavior.
  const q = params.query?.trim().toLowerCase();
  const { data, error } = await request.limit(q ? 1000 : Math.max(0, Math.min(params.limit ?? 1000, 1000)));
  if (error) throw error;
  let list = (data as ProductRow[] ?? []).map(product);
  if (q) list = list.filter(p => [p.name, p.category, p.subcategory, p.description].some(v => v.toLowerCase().includes(q)));
  return typeof params.limit === "number" ? list.slice(0, Math.max(0, params.limit)) : list;
}
export async function getProducts(params: ProductQuery = {}): Promise<Product[]> { return catalogue(params); }
/** Request-scoped dedupe for PDP metadata + page (and related lookups). */
export const getProductById = cache(async (id: string): Promise<Product | null> => {
  const { data, error } = await insforge.database.from("products").select(columns).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? product(data as ProductRow) : null;
});
export const getFeatured = cache(async (limit = 8): Promise<Product[]> => catalogue({ limit }, "featured"));
export const getNewArrivals = cache(async (limit = 8): Promise<Product[]> => catalogue({ sort: "newest", limit }, "is_new"));
export const getTrending = cache(async (limit = 8): Promise<Product[]> => catalogue({ limit }, "trending"));
export async function getRelated(id: string, limit = 4): Promise<Product[]> {
  const current = await getProductById(id);
  if (!current) return [];
  const pool = (await getProducts({ category: current.category })).filter(p => p.id !== id);
  return [...pool.filter(p => p.subcategory === current.subcategory), ...pool.filter(p => p.subcategory !== current.subcategory)].slice(0, limit);
}
