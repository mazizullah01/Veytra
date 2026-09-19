/**
 * Formats a number as USD currency, e.g. 128 -> "$128.00".
 * Kept as a tiny pure helper so it can be unit-tested and reused
 * by both server and client components.
 */
export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
