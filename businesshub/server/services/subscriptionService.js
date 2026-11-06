// Single source of truth for what each plan unlocks. Every feature advertised
// on the pricing page must have a matching entry here AND an enforcement point
// in a controller, otherwise the limit is just marketing copy.
//
// POLICY VERSIONS. Plan terms changed (Free lost invoices/receipts/AI; Starter
// went from 150 to 100 products and gained separate AI rules). Existing
// customers keep the terms they signed up under ("legacy"); only subscriptions
// created after this change get "v2". The version is stored on each
// subscription and is NEVER given a schema default: a default would be applied
// to old records when they are read and would silently move everyone to v2.
const CURRENT_POLICY = "v2";
const INF = Infinity;

// AI requests are grouped so each group can be allowed or capped separately.
const AI_CATEGORY_TYPES = {
  chat: ["chat"],
  marketing: ["productDescription", "socialCaption", "advertisement", "businessDescription", "marketingIdeas", "productName"],
  documents: ["invoiceNotes", "receiptNotes"],
};
const aiCategoryOf = (type) =>
  Object.keys(AI_CATEGORY_TYPES).find((cat) => AI_CATEGORY_TYPES[cat].includes(type)) || null;

const RANGES_BASIC = ["7d", "30d"];
const RANGES_ALL = ["7d", "30d", "90d", "1y"];
const allAi = (n) => ({ chat: n, marketing: n, documents: n });

// aiCaps: monthly cap per AI category (0 = not included, Infinity = no cap).
// aiSharedCap: one cap across ALL categories together (legacy plans only).
function buildPolicies(env = process.env) {
  const starterProducts = Number.isInteger(Number(env.STARTER_PRODUCT_LIMIT)) && Number(env.STARTER_PRODUCT_LIMIT) > 0
    ? Number(env.STARTER_PRODUCT_LIMIT) : 100; // 100 products in total, active at once
  const starterAiDocs = Number.isInteger(Number(env.STARTER_AI_DOCUMENTS_PER_MONTH)) && Number(env.STARTER_AI_DOCUMENTS_PER_MONTH) > 0
    ? Number(env.STARTER_AI_DOCUMENTS_PER_MONTH) : 50; // combined for invoice + receipt AI writing
  return {
    // Exactly the numbers customers had before the change.
    legacy: {
      free: { products: 10, invoicesPerMonth: 5, receiptsPerMonth: 5, aiSharedCap: 15, aiCaps: allAi(INF), analyticsRanges: RANGES_BASIC, premiumThemes: false, customBranding: false },
      starter: { products: 150, invoicesPerMonth: 100, receiptsPerMonth: 100, aiSharedCap: 150, aiCaps: allAi(INF), analyticsRanges: RANGES_ALL, premiumThemes: false, customBranding: true },
      pro: { products: INF, invoicesPerMonth: INF, receiptsPerMonth: INF, aiSharedCap: INF, aiCaps: allAi(INF), analyticsRanges: RANGES_ALL, premiumThemes: true, customBranding: true },
    },
    v2: {
      free: { products: 10, invoicesPerMonth: 0, receiptsPerMonth: 0, aiSharedCap: INF, aiCaps: allAi(0), analyticsRanges: RANGES_BASIC, premiumThemes: false, customBranding: false },
      // Starter: AI chat, and AI help writing invoices/receipts (capped); no AI marketing tools.
      // Invoice/receipt counts are unchanged from before (the notes do not specify them).
      starter: { products: starterProducts, invoicesPerMonth: 100, receiptsPerMonth: 100, aiSharedCap: INF, aiCaps: { chat: INF, marketing: 0, documents: starterAiDocs }, analyticsRanges: RANGES_ALL, premiumThemes: false, customBranding: true },
      pro: { products: INF, invoicesPerMonth: INF, receiptsPerMonth: INF, aiSharedCap: INF, aiCaps: allAi(INF), analyticsRanges: RANGES_ALL, premiumThemes: true, customBranding: true },
    },
  };
}

// `features` is what the UI uses to show a lock instead of a broken tool.
const withFeatures = (l) => ({
  ...l,
  features: {
    invoices: l.invoicesPerMonth > 0,
    receipts: l.receiptsPerMonth > 0,
    aiChat: l.aiCaps.chat > 0 && l.aiSharedCap > 0,
    aiMarketing: l.aiCaps.marketing > 0 && l.aiSharedCap > 0,
    aiDocuments: l.aiCaps.documents > 0 && l.aiSharedCap > 0,
  },
});

function getLimits(plan, policyVersion) {
  const policies = buildPolicies();
  const policy = policies[policyVersion] || policies.legacy; // unknown/missing = the terms they already had
  return withFeatures(policy[plan] || policy.free);
}

// The one call controllers should use: plan AND policy come from the subscription.
function getLimitsFor(subscription, now = new Date()) {
  return getLimits(getEffectivePlan(subscription, now), subscription && subscription.policyVersion);
}

const TRIAL_DAYS = 7;

// Every new business gets full Pro access for TRIAL_DAYS, regardless of
// what they eventually pay for (or don't). `subscription.plan` always
// holds the REAL, paid-for tier (defaulting to 'free'); trialEndsAt is
// checked separately here rather than mutating `plan` directly, so the
// trial expires naturally the moment the date passes — no scheduled job
// has to run to "downgrade" anyone, which matters since this app may run
// on hosts (like Render's free tier) that sleep and can't be trusted to
// fire a cron job on time.
// Optional breathing room after a paid period ends before access drops to
// Free. Defaults to 0 (access ends when the paid period does); set
// PLAN_GRACE_DAYS to be more lenient.
const GRACE_DAYS = Math.max(0, Number(process.env.PLAN_GRACE_DAYS) || 0);
const PAID_PLANS = ["starter", "pro"];

// Is the paid plan on this subscription actually in force right now?
//  - currentPeriodEnd is the authority: once it has passed (plus any grace),
//    the paid plan is over, whatever `plan` still says.
//  - Records with NO period end are legacy rows from before periods were
//    recorded. Those keep their plan (we must not lock out existing paying
//    customers by surprise) unless they were explicitly cancelled. Run
//    `npm run audit:subscriptions` to list them so they can be reviewed.
function isPaidPeriodCurrent(subscription, now = new Date()) {
  if (!subscription || !PAID_PLANS.includes(subscription.plan)) return false;
  if (subscription.currentPeriodEnd) {
    const end = new Date(subscription.currentPeriodEnd).getTime();
    return now.getTime() <= end + GRACE_DAYS * 24 * 60 * 60 * 1000;
  }
  return subscription.status !== "cancelled";
}

function getEffectivePlan(subscription, now = new Date()) {
  if (!subscription) return "free";
  if (
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt) > now
  ) {
    return "pro";
  }
  return isPaidPeriodCurrent(subscription, now) ? subscription.plan : "free";
}

// True when the business bought a paid plan whose period has run out, so the
// dashboard can say "your plan expired" instead of silently showing Free.
function isPaidPlanExpired(subscription, now = new Date()) {
  return (
    Boolean(subscription) &&
    PAID_PLANS.includes(subscription.plan) &&
    !isPaidPeriodCurrent(subscription, now)
  );
}

// Used for the "renew your plan" banner and reminder notification.
//   expiring: a paid plan with 3 days or fewer left
//   expired:  a paid period that ended within the last 60 days
function getRenewalInfo(subscription, now = new Date()) {
  if (!subscription || !PAID_PLANS.includes(subscription.plan) || !subscription.currentPeriodEnd) return { state: null };
  const end = new Date(subscription.currentPeriodEnd);
  const msLeft = end.getTime() - now.getTime();
  if (msLeft > 0) {
    const daysLeft = Math.ceil(msLeft / 86400000);
    return { state: daysLeft <= 3 ? 'expiring' : null, daysLeft, expiresAt: end };
  }
  return { state: -msLeft <= 60 * 86400000 ? 'expired' : null, daysLeft: 0, expiresAt: end };
}

function getTrialInfo(subscription) {
  if (!subscription?.trialEndsAt)
    return { active: false, daysLeft: 0, endsAt: null };
  const msLeft = new Date(subscription.trialEndsAt).getTime() - Date.now();
  return {
    active: msLeft > 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
    endsAt: subscription.trialEndsAt,
  };
}

module.exports = {
  buildPolicies,
  getLimits,
  getLimitsFor,
  CURRENT_POLICY,
  AI_CATEGORY_TYPES,
  aiCategoryOf,
  getRenewalInfo,
  getEffectivePlan,
  isPaidPeriodCurrent,
  isPaidPlanExpired,
  getTrialInfo,
  TRIAL_DAYS,
};
