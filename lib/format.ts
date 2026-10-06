/**
 * Formats a number as USD currency, e.g. 128 -> "$128.00".
 * Kept as a tiny pure helper so it can be unit-tested and reused
 * by both server and client components.
 */
/** Product photos live in /images/products. Storage CDN links currently return 403. */
export function productImageSrc(src: string): string {
  if (src.startsWith("/images/products/")) return src;
  let path = src;
  try {
    path = src.startsWith("/") ? src : new URL(src).pathname;
  } catch {
    return src;
  }
  if (!path.includes("/product-images/")) return src;
  const name = decodeURIComponent(path.split("/").pop() || "");
  return /^[a-z0-9-]+\.(jpe?g|png|webp)$/i.test(name) ? `/images/products/${name}` : src;
}

export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
