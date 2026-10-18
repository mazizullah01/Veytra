const buckets = new Map<string, { until: number; count: number }>();
let active = 0, cooldown = 0;
export function limitStylist(keys: string[], now = Date.now()): number {
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  let retry = Math.max(0, Math.ceil((cooldown - now) / 1000));
  for (const [key, max, window] of [["global:minute", 10, 60000], ["global:day", 100, 86400000], ...keys.map(k => [k, 5, 60000])] as [string, number, number][]) {
    if (!buckets.has(key) && buckets.size >= 2048) return 60;
    const bucket = buckets.get(key) ?? { until: now + window, count: 0 };
    buckets.set(key, bucket); bucket.count++;
    if (bucket.count > max) retry = Math.max(retry, Math.ceil((bucket.until - now) / 1000));
  }
  return retry;
}
export function acquireStylist(): boolean { if (active >= 2) return false; active++; return true; }
export function releaseStylist() { active = Math.max(0, active - 1); }
export function pauseStylist() { cooldown = Date.now() + 60_000; }
