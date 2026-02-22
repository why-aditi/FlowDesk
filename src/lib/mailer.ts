import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set");
    }

    _transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return _transporter;
}

const SEND_FROM =
  process.env.SMTP_FROM ?? "FlowDesk <onboarding@resend.dev>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: SEND_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
