import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signUp({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    name: String(body.name ?? ""),
    redirectTo: String(body.redirectTo ?? ""),
  });
  if (error) {
    return NextResponse.json(
      {
        error: error.error ?? "AUTH_ERROR",
        message: error.message ?? "Sign up failed",
        statusCode: error.statusCode ?? 400,
      },
      { status: error.statusCode ?? 400 },
    );
  }
  return NextResponse.json({
    user: data && "user" in data ? data.user : null,
    requireEmailVerification:
      data && "requireEmailVerification" in data
        ? Boolean(data.requireEmailVerification)
        : false,
  });
}
