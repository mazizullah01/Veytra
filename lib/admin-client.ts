"use client";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1)) || null;
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readCookie("insforge_access_token");
  if (!token) throw Object.assign(new Error("Please sign in to continue."), { statusCode: 401 });
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Request failed.",
    ) as Error & { statusCode?: number };
    error.statusCode = response.status;
    throw error;
  }
  return data as T;
}
