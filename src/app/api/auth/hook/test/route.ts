import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { confirmationEmail } from "@/lib/email-templates";

/**
 * Dev-only route to preview the confirmation email.
 * Usage: POST /api/auth/hook/test  { "email": "you@example.com", "name": "Jane" }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { email, name } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const html = confirmationEmail(
    name ?? "Test User",
    "https://flow-desk-iota.vercel.app/workspace"
  );

  const { data, error } = await resend.emails.send({
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
