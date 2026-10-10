const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// This guards the only unauthenticated WRITE endpoint in the whole app —
// capturing a pending order from the public storefront. No login means no
// per-user throttling to fall back on, so this needs to be tight per IP.
const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { success: false, message: 'Too many orders placed from this device. Please try again later or contact the business directly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Invoice/receipt PDFs are shareable via a plain link (like Stripe's
// hosted invoice pages) — no login required to view one, since the
// recipient is often a customer with no BusinessHub account at all. The
// Mongo ObjectId acts as the "bearer token," which isn't perfectly
// unguessable, so this limiter is defense in depth against enumeration.
const publicPdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, aiLimiter, publicOrderLimiter, publicPdfLimiter };
