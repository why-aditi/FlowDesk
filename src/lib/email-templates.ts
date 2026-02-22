const BRAND_COLOR = "#18181b";
const BRAND_COLOR_LIGHT = "#f4f4f5";
const TEXT_COLOR = "#18181b";
const TEXT_MUTED = "#71717a";
const BORDER_COLOR = "#e4e4e7";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>FlowDesk</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_COLOR_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_COLOR_LIGHT};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:20px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.5px;">FlowDesk</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;border:1px solid ${BORDER_COLOR};overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">
                FlowDesk &mdash; Give your time back.
              </p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.5;">
                You received this email because an account was created with this address.<br />
                If you didn&rsquo;t request this, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, href: string) {
  const safeHref = escapeHtml(encodeURI(href));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
  <tr>
    <td align="center">
      <a href="${safeHref}" target="_blank" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;line-height:1.4;">
        ${escapeHtml(text)}
      </a>
    </td>
  </tr>
</table>`;
}

export function confirmationEmail(name: string, confirmUrl: string) {
  const safeName = escapeHtml(name);
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">
      Welcome to FlowDesk${safeName ? `, ${safeName}` : ""}!
    </h1>
    <p style="margin:0 0 4px;font-size:15px;color:${TEXT_MUTED};line-height:1.6;">
      You&rsquo;re one step away from reclaiming your time.
    </p>
    <p style="margin:0;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
      Please confirm your email address to get started with your workspace.
    </p>
    ${ctaButton("Confirm Email Address", confirmUrl)}
  `);
}

export function magicLinkEmail(email: string, magicLinkUrl: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">
      Sign in to FlowDesk
    </h1>
    <p style="margin:0;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
      Click the button below to sign in as <strong>${escapeHtml(email)}</strong>. This link expires in 10 minutes.
    </p>
    ${ctaButton("Sign In", magicLinkUrl)}
  `);
}

export function passwordResetEmail(resetUrl: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">
      Reset your password
    </h1>
    <p style="margin:0;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
      We received a request to reset the password for your FlowDesk account. Click the button below to choose a new password.
    </p>
    ${ctaButton("Reset Password", resetUrl)}
  `);
}

export function emailChangeEmail(newEmail: string, confirmUrl: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">
      Confirm your new email
    </h1>
    <p style="margin:0;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
      Please confirm that you&rsquo;d like to change your FlowDesk email to <strong>${escapeHtml(newEmail)}</strong>.
    </p>
    ${ctaButton("Confirm New Email", confirmUrl)}
  `);
}

export function inviteEmail(inviterName: string, inviteUrl: string) {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">
      You&rsquo;ve been invited to FlowDesk
    </h1>
    <p style="margin:0;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">
      ${inviterName ? `<strong>${escapeHtml(inviterName)}</strong> invited you` : "You&rsquo;ve been invited"} to join FlowDesk. Click below to accept and create your account.
    </p>
    ${ctaButton("Accept Invitation", inviteUrl)}
  `);
}
