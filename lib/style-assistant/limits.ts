/** Per-instance abuse limits with a global backstop, even if a caller rotates IDs.
 * Multi-instance deployments should also configure their host's shared rate limit. */
const buckets = new Map<string, { start: number; count: number }>();
const WINDOW = 60_000;
function increment(key: string, max: number, now: number): number {
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW) {
    bucket = { start: now, count: 0 }; buckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count > max ? Math.max(1, Math.ceil((WINDOW - now + bucket.start) / 1000)) : 0;
}
export function chatRateLimit(identity: string, now = Date.now()): number {
  for (const [key, bucket] of buckets) if (now - bucket.start >= WINDOW) buckets.delete(key);
  const global = increment("global", 120, now);
  if (global) return global;
  if (buckets.size >= 1024 && !buckets.has(identity)) return 60;
  return increment(identity, 20, now);
}

export async function readChatBody(request: Request): Promise<{ message: string; context?: unknown }> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new Error("Send a JSON chat message.");
  if (Number(request.headers.get("content-length") ?? 0) > 8192) throw new Error("Message is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Message is required.");
  const decoder = new TextDecoder();
  let length = 0, body = "";
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new Error("Message is too large."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { throw new Error("Invalid JSON message."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid chat request.");
  const object = parsed as Record<string, unknown>;
  if (Object.keys(object).some(key => key !== "message" && key !== "context")) throw new Error("Unexpected chat request field.");
  if (typeof object.message !== "string" || !object.message.trim() || object.message.length > 600) throw new Error("Please use a message of 1–600 characters.");
  return { message: object.message.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""), context: object.context };
}
