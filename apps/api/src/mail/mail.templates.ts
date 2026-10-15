const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

function render(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footer: string;
}): MailContent {
  const { subject, heading, paragraphs, button, footer } = opts;
  const text = [
    heading,
    "",
    ...paragraphs,
    ...(button ? ["", `${button.label}: ${button.url}`] : []),
    "",
    footer,
    "",
    "Invitation-card.com",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#eef3f0;font-family:Arial,Helvetica,sans-serif;color:#17211f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px">
<tr><td style="padding:28px 28px 8px;font-size:22px;font-weight:bold;color:#0b3a33">${esc(heading)}</td></tr>
<tr><td style="padding:0 28px;font-size:16px;line-height:1.55">${paragraphs.map((p) => `<p style="margin:12px 0">${esc(p)}</p>`).join("")}</td></tr>
${
  button
    ? `<tr><td style="padding:12px 28px 8px"><a href="${esc(button.url)}" style="display:inline-block;background:#f2a33a;color:#072622;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></td></tr>
<tr><td style="padding:4px 28px;font-size:13px;color:#4b5a56;word-break:break-all">Or paste this link into your browser:<br>${esc(button.url)}</td></tr>`
    : ""
}
<tr><td style="padding:20px 28px 28px;font-size:13px;color:#4b5a56">${esc(footer)}</td></tr>
</table>
<p style="font-size:12px;color:#4b5a56;margin:14px 0 0">Invitation-card.com</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}

const greeting = (name?: string | null) => (name ? `Hi ${name},` : "Hi,");

export function verifyEmailMail(name: string | null | undefined, url: string): MailContent {
  return render({
    subject: "Confirm your email address",
    heading: "Confirm your email",
    paragraphs: [
      greeting(name),
      "Please confirm this email address so you can publish invitations and get replies in your inbox.",
      "The link works for 24 hours.",
    ],
    button: { label: "Confirm email", url },
    footer: "If you didn't create an account on Invitation-card.com, you can ignore this email.",
  });
}

export function resetPasswordMail(name: string | null | undefined, url: string): MailContent {
  return render({
    subject: "Reset your password",
    heading: "Reset your password",
    paragraphs: [
      greeting(name),
      "Someone asked to set a new password for your account. Use the button below to choose one. The link works for 1 hour and only once.",
    ],
    button: { label: "Choose a new password", url },
    footer: "If this wasn't you, ignore this email. Your password stays the same.",
  });
}

export function passwordChangedMail(name: string | null | undefined): MailContent {
  return render({
    subject: "Your password was changed",
    heading: "Your password was changed",
    paragraphs: [
      greeting(name),
      "The password for your account was just changed, and you were signed out on your other devices.",
    ],
    footer: "If this wasn't you, reset your password right away using “Forgot password” on the sign-in page.",
  });
}
