import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { confirmationEmail } from "@/lib/email-templates";

/**
 * Dev-only route to preview the confirmation email.
 * Usage: POST /api/auth/hook/test  { "email": "you@example.com", "name": "Jane" }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, name } = body;
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const html = confirmationEmail(
    name ?? "Test User",
    `${baseUrl}/workspace`
  );

  const { data, error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "FlowDesk <onboarding@resend.dev>",
    to: email,
    subject: "Confirm your FlowDesk account (TEST)",
    html,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
