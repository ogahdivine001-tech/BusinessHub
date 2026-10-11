const nodemailer = require("nodemailer");

// Configured via env vars — defaults are set for Zoho Mail since that's
// what BusinessHub uses, but any SMTP provider works by overriding
// SMTP_HOST/SMTP_PORT. Gracefully degrades (logs instead of throwing) when
// not configured, same pattern as every other optional integration in
// this app (Cloudinary, AI, Paystack) — a missing email config should
// never break the actual password-reset flow, just skip the email step.
const isConfigured = () =>
  Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_USER && process.env.SMTP_PASS),
  );

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.zoho.com",
      port,
      secure: port === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Without explicit timeouts, a blocked or slow SMTP connection can
      // hang the underlying socket indefinitely — which in turn hangs
      // whatever HTTP request triggered it. These force a fast, clear
      // failure instead, so problems show up in logs within 10s rather
      // than leaving the request pending forever.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  if (!isConfigured()) {
    console.log(
      `[email] SMTP not configured — would have sent "${subject}" to ${to}`,
    );
    return { sent: false };
  }
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "BusinessHub <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend returned ${response.status}: ${details}`);
    }
    const result = await response.json();
    console.log(`[email] Sent "${subject}" to ${to} via Resend — id: ${result.id}`);
    return { sent: true };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const info = await getTransporter().sendMail({
      from: `"BusinessHub" <${from}>`,
      to,
      subject,
      html,
    });
    // Zoho accepting the message doesn't guarantee inbox delivery (could
    // still land in spam, or be silently dropped by the receiving
    // server) — but this at least confirms OUR side succeeded, which is
    // the piece we couldn't previously distinguish from a silent failure.
    console.log(
      `[email] Sent "${subject}" to ${to} — messageId: ${info.messageId}`,
    );
    return { sent: true };
  } catch (err) {
    console.error(`[email] FAILED to send "${subject}" to ${to}:`, err.message);
    throw err;
  }
}

async function sendPasswordResetEmail(to, resetUrl) {
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #16211c;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: bold; color:#16211c; margin: 0 0 4px;">BusinessHub</p>
      <div style="height:3px; width:48px; background:#e8a33d; margin: 0 0 24px;"></div>
      <h2 style="color:#16211c; margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
      <p style="line-height:1.6; color:#413d34; margin: 0;">We received a request to reset your BusinessHub password. Tap the button below to choose a new one. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block; background:#1f6647; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; margin:24px 0;">Reset password</a>
      <p style="color:#5b5548; font-size:13px; line-height:1.5; margin-top: 8px;">If you didn't request this, you can safely ignore this email. Your password will stay the same.</p>
      <p style="color:#5b5548; font-size:12px; word-break: break-all; margin-top: 20px;">Button not working? Copy this link into your browser:<br />${resetUrl}</p>
    </div>
  `;
  return sendEmail({ to, subject: "Reset your BusinessHub password", html });
}

// ---------- shared branded layout for friendly (non-security) emails ----------
const siteOrigin = () => (process.env.CLIENT_URL || "https://businesshubng.vercel.app").replace(/\/+$/, "");
const escapeHtml = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Admin-written plain text -> safe HTML paragraphs (blank line = new paragraph).
const textToHtml = (text) =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="line-height:1.65; color:#413d34; margin: 0 0 14px;">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");

function brandedEmail({ heading, bodyHtml, buttonLabel, buttonUrl, footer }) {
  const button = buttonUrl
    ? `<a href="${escapeHtml(buttonUrl)}" style="display:inline-block; background:#1f6647; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; margin:10px 0 24px;">${escapeHtml(buttonLabel || "Open BusinessHub")}</a>`
    : "";
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #16211c;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: bold; color:#16211c; margin: 0 0 4px;">BusinessHub</p>
      <div style="height:3px; width:48px; background:#e8a33d; margin: 0 0 24px;"></div>
      <h2 style="color:#16211c; margin: 0 0 14px; font-size: 21px;">${escapeHtml(heading)}</h2>
      ${bodyHtml}
      ${button}
      <p style="color:#5b5548; font-size:12px; line-height:1.5; border-top:1px solid #e6e1d6; padding-top:14px; margin-top:8px;">${escapeHtml(footer || "You are receiving this because you have a BusinessHub account.")}</p>
    </div>
  `;
}

// Welcome email for every new customer. The free Pro trial starts when they
// create their business page, so that is what the email asks them to do first.
async function sendWelcomeEmail(user, { trialDays = 7 } = {}) {
  const first = escapeHtml(String(user.fullName || "").trim().split(/\s+/)[0] || "there");
  const step = (n, text) =>
    `<p style="line-height:1.55; color:#413d34; margin: 0 0 10px;"><strong style="color:#1f6647;">${n}.</strong> ${text}</p>`;
  const bodyHtml =
    `<p style="line-height:1.65; color:#413d34; margin: 0 0 16px;">Hi ${first}, thanks for joining BusinessHub. You now have a simple way to run your whole business from one link: your shop page, your invoices and your customers, all in one place.</p>` +
    `<p style="color:#16211c; font-weight:600; margin: 0 0 10px;">Here is how to get started:</p>` +
    step(1, `Set up your business page (it takes about 30 seconds). Your <strong>${Number(trialDays)}-day free Pro trial</strong> starts then.`) +
    step(2, "Add the products or services you sell, with photos and prices.") +
    step(3, "Share your link on your WhatsApp status and Instagram bio.") +
    `<p style="line-height:1.6; color:#413d34; margin: 16px 0 6px;">Need help at any point? Use the help button inside your dashboard.</p>`;
  const html = brandedEmail({
    heading: `Welcome to BusinessHub, ${String(user.fullName || "").trim().split(/\s+/)[0] || "there"}`,
    bodyHtml,
    buttonLabel: "Set up my business page",
    buttonUrl: `${siteOrigin()}/onboarding`,
    footer: "You are receiving this because you just created a BusinessHub account.",
  });
  return sendEmail({ to: user.email, subject: "Welcome to BusinessHub", html });
}

// Message written by a platform admin. `link` is an optional in-app path.
async function sendAdminMessageEmail(to, { subject, body, link }) {
  const html = brandedEmail({
    heading: subject,
    bodyHtml: textToHtml(body),
    buttonLabel: "Open BusinessHub",
    buttonUrl: link ? `${siteOrigin()}${link}` : null,
    footer: "This message was sent by the BusinessHub team to your account.",
  });
  return sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendPasswordResetEmail, sendWelcomeEmail, sendAdminMessageEmail, isConfigured };
