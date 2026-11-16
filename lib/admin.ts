import "server-only";
import { createAdminClient, createClient } from "@insforge/sdk";

export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = adminEmails();
  if (!allow.length) return false;
  return allow.includes(email.trim().toLowerCase());
}

export function serviceAdmin() {
  if (!process.env.INSFORGE_API_KEY) throw new AdminError("Admin backend is not configured.", 503);
  return createAdminClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    apiKey: process.env.INSFORGE_API_KEY,
  });
}

/** Authenticate the caller and require ADMIN_EMAILS membership. */
export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new AdminError("Please sign in to continue.", 401);
  const client = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    accessToken: authorization.slice(7),
  });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) throw new AdminError("Please sign in to continue.", 401);
  if (!isAdminEmail(data.user.email)) throw new AdminError("Not found.", 404);
  return { client, user: data.user, admin: serviceAdmin() };
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new AdminError("Please sign in to continue.", 401);
  const client = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    accessToken: authorization.slice(7),
  });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) throw new AdminError("Please sign in to continue.", 401);
  return { client, user: data.user, admin: serviceAdmin() };
}

export function adminFailure(error: unknown) {
  if (error instanceof AdminError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Admin request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 502 });
}
