import { createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
if (!baseUrl || !anonKey) throw new Error("Missing InsForge environment variables");

// Browser sessions use the SDK's refresh cookie; public server queries use the anon key.
export const insforge = createClient({ baseUrl, anonKey });
export type StoreUser = NonNullable<Awaited<ReturnType<typeof insforge.auth.getCurrentUser>>["data"]["user"]>;
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
