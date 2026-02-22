import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const ALLOWED_TYPES = new Set([
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/workspace";

  if (!tokenHash || !rawType || !ALLOWED_TYPES.has(rawType)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const type = rawType as "signup" | "magiclink" | "recovery" | "invite" | "email_change";

  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "confirmation_failed");
    return NextResponse.redirect(loginUrl);
  }

  const redirectUrl = new URL(next, req.url);
  if (redirectUrl.origin !== req.nextUrl.origin) {
    return NextResponse.redirect(new URL("/workspace", req.url));
  }

  return NextResponse.redirect(redirectUrl);
}
