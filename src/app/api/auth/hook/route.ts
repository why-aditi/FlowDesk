import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { resend } from "@/lib/resend";
import {
  confirmationEmail,
  magicLinkEmail,
  passwordResetEmail,
  emailChangeEmail,
  inviteEmail,
} from "@/lib/email-templates";

const SEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "FlowDesk <onboarding@resend.dev>";

const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET;

interface HookPayload {
  user: {
    id: string;
    email: string;
    email_new?: string;
    user_metadata?: { full_name?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "magiclink"
      | "recovery"
      | "invite"
      | "email_change";
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
}

function buildConfirmUrl(
  tokenHash: string,
  actionType: string,
  redirectTo: string,
  siteUrl: string
): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    siteUrl ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const url = new URL(`${base}/auth/confirm`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", actionType);
  if (redirectTo) url.searchParams.set("next", redirectTo);
  return url.toString();
}

function resolveSubjectAndHtml(payload: HookPayload, confirmUrl: string) {
  const { email_action_type } = payload.email_data;
  const name = payload.user.user_metadata?.full_name ?? "";
  const email = payload.user.email;

  switch (email_action_type) {
    case "signup":
      return {
        subject: "Confirm your FlowDesk account",
        html: confirmationEmail(name, confirmUrl),
      };
    case "magiclink":
      return {
        subject: "Your FlowDesk sign-in link",
        html: magicLinkEmail(email, confirmUrl),
      };
    case "recovery":
      return {
        subject: "Reset your FlowDesk password",
        html: passwordResetEmail(confirmUrl),
      };
    case "email_change":
      return {
        subject: "Confirm your new email address",
        html: emailChangeEmail(email, confirmUrl),
      };
    case "invite":
      return {
        subject: "You've been invited to FlowDesk",
        html: inviteEmail(name, confirmUrl),
      };
    default:
      return {
        subject: "FlowDesk",
        html: confirmationEmail(name, confirmUrl),
      };
  }
}

export async function POST(req: NextRequest) {
  if (!hookSecret) {
    return NextResponse.json(
      { error: "SEND_EMAIL_HOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));

  let data: HookPayload;
  try {
    data = wh.verify(payload, headers) as HookPayload;
  } catch {
    return NextResponse.json(
      { error: { http_code: 401, message: "Invalid signature" } },
      { status: 401 }
    );
  }

  const { email_data, user } = data;
  const confirmUrl = buildConfirmUrl(
    email_data.token_hash,
    email_data.email_action_type,
    email_data.redirect_to,
    email_data.site_url
  );

  const { subject, html } = resolveSubjectAndHtml(data, confirmUrl);

  const { error } = await resend.emails.send({
    from: SEND_FROM,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json(
      { error: { http_code: 500, message: "Failed to send email" } },
      { status: 500 }
    );
  }

  return NextResponse.json({}, { status: 200 });
}
