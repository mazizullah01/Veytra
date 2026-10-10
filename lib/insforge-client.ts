"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";
import type { StoreUser } from "./insforge";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;

/** Browser SDK client; refreshes through `/api/auth/refresh` when needed. */
export const insforge = createBrowserClient();

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1)) || null;
}

async function userFromAccessToken(token: string): Promise<StoreUser | null> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/sessions/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { user?: StoreUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Restore the signed-in user after a page refresh.
 * Uses the readable access-token cookie when present; otherwise refreshes
 * via the server route that can read the httpOnly refresh cookie.
 */
export async function restoreSession(): Promise<StoreUser | null> {
  try {
    const accessToken = readCookie("insforge_access_token");
    if (accessToken) {
      insforge.setAccessToken(accessToken);
      const user = await userFromAccessToken(accessToken);
      if (user) return user;
    }

    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!refreshed.ok) return null;
    const body = (await refreshed.json()) as {
      accessToken?: string;
      user?: StoreUser | null;
    };
    if (body.accessToken) insforge.setAccessToken(body.accessToken);
    return body.user ?? null;
  } catch {
    return null;
  }
}

export async function authRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  method = "POST",
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof data.message === "string" ? data.message : "Authentication request failed.",
    ) as Error & { statusCode?: number };
    error.statusCode = typeof data.statusCode === "number" ? data.statusCode : response.status;
    throw error;
  }
  return data as T;
}
