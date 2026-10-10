import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });
  if (error || !data?.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "AUTH_UNAUTHORIZED",
        message: error?.message ?? "Sign in failed",
        statusCode: error?.statusCode ?? 401,
      },
      { status: error?.statusCode ?? 401 },
    );
  }
  return NextResponse.json({ user: data.user });
}
