const nodemailer = require("nodemailer");

// Configured via env vars — defaults are set for Zoho Mail since that's
// what BusinessHub uses, but any SMTP provider works by overriding
// SMTP_HOST/SMTP_PORT. Gracefully degrades (logs instead of throwing) when
// not configured, same pattern as every other optional integration in
// this app (Cloudinary, AI, Paystack) — a missing email config should
// never break the actual password-reset flow, just skip the email step.
const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY);
const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const isConfigured = () => isResendConfigured() || isSmtpConfigured();

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
      `[email] Resend/SMTP not configured — would have sent "${subject}" to ${to}`,
    );
    return { sent: false };
  }

  if (isResendConfigured()) {
    try {
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
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.message || `Resend API returned HTTP ${response.status}`,
        );
      }
      console.log(
        `[email] Sent "${subject}" to ${to} via Resend — messageId: ${result.id}`,
      );
      return { sent: true };
    } catch (err) {
      console.error(`[email] FAILED to send "${subject}" via Resend:`, err.message);
      throw err;
    }
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
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
      <h2 style="color:#16211c; margin-bottom: 12px;">Reset your BusinessHub password</h2>
      <p style="line-height:1.6; color:#4b5563;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block; background:#1f6647; color:#ffffff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; margin:20px 0;">Reset Password</a>
      <p style="color:#9ca3af; font-size:13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
      <p style="color:#9ca3af; font-size:12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
    </div>
  `;
  return sendEmail({ to, subject: "Reset your BusinessHub password", html });
}

module.exports = { sendEmail, sendPasswordResetEmail, isConfigured };
