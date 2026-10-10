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

module.exports = { sendEmail, sendPasswordResetEmail, isConfigured };
