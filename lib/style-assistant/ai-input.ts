export interface Turn { role: "user" | "assistant"; text: string }
export function redactPersonalData(text: string): string {
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi, "[reference removed]")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[number removed]")
    .replace(/\b(?:sk|AIza)[\w-]{20,}\b/g, "[key removed]");
}
export async function readStylistBody(request: Request): Promise<{ message: string; history: Turn[]; context?: unknown }> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw Error("Send a JSON chat message.");
  if (Number(request.headers.get("content-length") ?? 0) > 32768) throw Error("Message is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Message is required.");
  const decoder = new TextDecoder(); let raw = "", bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 32768) { await reader.cancel(); throw Error("Message is too large."); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { throw Error("Invalid JSON message."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["message", "history", "context"].includes(k))) throw Error("Invalid chat request.");
  const clean = (text: unknown, max: number) => {
    if (typeof text !== "string" || !text.trim() || text.length > max) throw Error(`Use a message of 1–${max} characters.`);
    const result = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
    if (!result) throw Error("Message is required."); return result;
  };
  const message = clean(body.message, 600);
  if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 8)) throw Error("Conversation history is too long.");
  const history = ((body.history ?? []) as unknown[]).map(turn => {
    if (!turn || typeof turn !== "object" || Array.isArray(turn)) throw Error("Invalid conversation turn.");
    const t = turn as Record<string, unknown>;
    if (Object.keys(t).some(k => !["role", "text"].includes(k)) || (t.role !== "user" && t.role !== "assistant")) throw Error("Invalid conversation role.");
    return { role: t.role, text: clean(t.text, 1200) } as Turn;
  });
  if (history.reduce((sum, t) => sum + t.text.length, 0) > 6000) throw Error("Conversation history is too long.");
  return { message, history, context: body.context };
}
