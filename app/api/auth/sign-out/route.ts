import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function POST() {
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signOut();
  if (error) {
    return NextResponse.json(
      { message: error.message ?? "Sign out failed", statusCode: error.statusCode ?? 400 },
      { status: error.statusCode ?? 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
