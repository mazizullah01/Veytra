import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.verifyEmail({
    email: String(body.email ?? ""),
    otp: String(body.otp ?? ""),
  });
  if (error) {
    return NextResponse.json(
      { message: error.message ?? "Verification failed", statusCode: error.statusCode ?? 400 },
      { status: error.statusCode ?? 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const client = createServerClient();
  const { error } = await client.auth.resendVerificationEmail({
    email: String(body.email ?? ""),
    redirectTo: String(body.redirectTo ?? ""),
  });
  if (error) {
    return NextResponse.json(
      { message: error.message ?? "Could not resend code", statusCode: error.statusCode ?? 400 },
      { status: error.statusCode ?? 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
