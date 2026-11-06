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

// Bulk messaging is powerful, so even admins get a tight cap (10 sends / 15 min).
const adminMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many messages sent. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sending a verification email costs real email quota, so cap it tightly.
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many verification emails requested. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Follow/unfollow clicks: generous for people, tight for scripts.
const engageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many actions. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Writing reviews is limited per hour to blunt review-bombing.
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many review actions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// The public Help Center search is open to everyone, so it is rate limited per IP.
const helpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many searches. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { helpLimiter, engageLimiter, reviewLimiter, verifyEmailLimiter, authLimiter, apiLimiter, aiLimiter, publicOrderLimiter, publicPdfLimiter, adminMessageLimiter };
