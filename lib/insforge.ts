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

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
