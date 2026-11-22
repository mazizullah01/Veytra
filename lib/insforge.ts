import { createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
if (!baseUrl || !anonKey) throw new Error("Missing InsForge environment variables");

/** Public/server reads that do not need a user session. */
export const publicInsforge = createClient({ baseUrl, anonKey });

export type StoreUser = {
  id: string;
  email: string;
  profile?: Record<string, unknown> | null;
};

export const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message || "Something went wrong. Please try again.";
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; details?: unknown; error?: unknown };
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.details === "string" && record.details.trim()) return record.details.split("\n")[0]!;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return "Something went wrong. Please try again.";
};

/** Turn SDK/PostgREST error objects into real Error instances for Next.js overlays. */
export function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(errorMessage(error));
}
