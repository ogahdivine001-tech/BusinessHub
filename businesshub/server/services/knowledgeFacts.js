const { getLimits } = require('./subscriptionService');
const { getRankingConfig } = require('../config/ranking');
const { getVerificationConfig } = require('../config/verification');
const { PLAN_PRICES_KOBO, PERIOD_DAYS } = require('./subscriptionActivation');
const { naira, nf, amount, TRIAL_DAYS } = require('./planCatalog');

// The numbers and rules that help articles quote. Articles write {{path.to.fact}}
// and this module supplies the current value, so help text can never drift away
// from what the platform actually does. Anything that is just a fixed rule of
// the product (not configurable) lives at the bottom, next to the code it
// mirrors; tests check each of those against the source.

const unit = (n, singular, plural = `${singular}s`) => `${nf(n)} ${n === 1 ? singular : plural}`;

function describePlan(plan, policy) {
  const l = getLimits(plan, policy);
  const perMonth = (n) => (n === 0 ? 'not included' : Number.isFinite(n) ? `up to ${nf(n)} per month` : 'unlimited');
  const ai = (cap) => (cap === 0 ? 'not included' : Number.isFinite(cap) ? `up to ${nf(cap)} per month` : 'included, no monthly cap');
  const hasSharedCap = Number.isFinite(l.aiSharedCap);
  return {
    products: Number.isFinite(l.products) ? nf(l.products) : 'unlimited',
    invoices: perMonth(l.invoicesPerMonth),
    receipts: perMonth(l.receiptsPerMonth),
    aiChat: hasSharedCap ? `included, shared ${nf(l.aiSharedCap)} AI requests per month` : ai(l.aiCaps.chat),
    aiMarketing: hasSharedCap ? 'included (shared allowance)' : ai(l.aiCaps.marketing),
    aiDocuments: hasSharedCap ? 'included (shared allowance)' : ai(l.aiCaps.documents),
    aiShared: hasSharedCap ? `${nf(l.aiSharedCap)} AI requests per month, shared across all AI tools` : 'no shared cap',
    analytics: l.analyticsRanges.map((r) => ({ '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year' }[r] || r)).join(', '),
    brandingRemoval: l.customBranding ? 'available' : 'not included',
    premiumThemes: l.premiumThemes ? 'included' : 'not included',
  };
}

function verificationFee(cfg = getVerificationConfig()) {
  if (!cfg.paymentEnabled) return 'There is currently no verification fee.';
  const amountText = cfg.currency === 'NGN' ? naira(cfg.amountMinor) : `${nf(cfg.amountMinor / 100)} ${cfg.currency}`;
  return `There is a verification fee of ${amountText}. Paying it only lets us review your request; it does not guarantee approval.`;
}

function buildFacts() {
  const ranking = getRankingConfig();
  const requireEmail = String(process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL || 'true').toLowerCase() !== 'false';
  const linkDays = Number(process.env.DOC_LINK_TTL_DAYS) > 0 ? Number(process.env.DOC_LINK_TTL_DAYS) : 90;
  return {
    brand: { name: 'BusinessHub' },
    trial: { days: String(TRIAL_DAYS) },
    billing: {
      periodDays: String(PERIOD_DAYS),
      starterPrice: naira(PLAN_PRICES_KOBO.starter),
      proPrice: naira(PLAN_PRICES_KOBO.pro),
    },
    // Terms for new subscriptions
    plans: { free: describePlan('free', 'v2'), starter: describePlan('starter', 'v2'), pro: describePlan('pro', 'v2') },
    // Terms that older accounts keep
    legacy: { free: describePlan('free', 'legacy'), starter: describePlan('starter', 'legacy'), pro: describePlan('pro', 'legacy') },
    links: { pdfDays: String(linkDays) },
    reviews: {
      minForTopRated: String(ranking.minReviews),
      emailRule: requireEmail ? 'You need a confirmed email address to write a review.' : 'Any logged-in account can write a review.',
    },
    verification: { fee: verificationFee() },
    // ---- Fixed rules of the product (each is checked against its source file by a test) ----
    limits: {
      imageMb: '8',                 // services/uploadService.js  MAX_IMAGE_BYTES
      orderMaxQuantity: '20',       // controllers/businessController.js  createPublicOrder
      resetLinkMinutes: '60',       // controllers/authController.js  resetPasswordExpires
      sessionDays: '7',             // utils/generateToken.js  expiresIn / cookie maxAge
      verifyEmailHours: '24',       // controllers/authController.js  VERIFY_TTL_MS
      reviewMaxChars: '1000',       // controllers/reviewController.js  cleanComment
      productDescriptionChars: '2000', // models/Product.js  description maxlength
      aiPerMinute: '10',            // middleware/rateLimiter.js  aiLimiter
      passwordMinChars: '8',        // validators/authValidators.js
      verifyRequestsPerHour: '5',   // middleware/rateLimiter.js  verifyEmailLimiter
    },
  };
}

// Looks up "a.b.c" in the facts object.
function lookup(facts, path) {
  return path.split('.').reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), facts);
}

// Replaces {{a.b}} with the fact's value. Unknown names are reported (not
// hidden): the caller decides whether that is fatal (tests) or logged (server).
function resolveFacts(text, facts) {
  const missing = [];
  const out = String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (m, key) => {
    const v = lookup(facts, key);
    if (v === undefined || typeof v === 'object') { missing.push(key); return '[unavailable]'; }
    return String(v);
  });
  return { text: out, missing };
}

module.exports = { buildFacts, resolveFacts, lookup, verificationFee, unit };
