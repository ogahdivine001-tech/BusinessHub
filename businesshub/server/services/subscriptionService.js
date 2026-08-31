// Single source of truth for what each plan unlocks. Every feature listed
// in the /pricing page must have a matching check here AND an enforcement
// point in a controller — otherwise the limit is just marketing copy.
const PLAN_LIMITS = {
  free: {
    products: 10,
    invoicesPerMonth: 5,
    receiptsPerMonth: 5,
    aiPerMonth: 15,
    analyticsRanges: ['7d', '30d'],       // "Basic analytics"
    premiumThemes: false,                  // 'bold' theme is Pro-only
    customBranding: false,                 // can't hide "Powered by BusinessHub"
  },
  starter: {
    products: Infinity,
    invoicesPerMonth: 100,
    receiptsPerMonth: 100,
    aiPerMonth: 150,
    analyticsRanges: ['7d', '30d', '90d', '1y'], // "Advanced analytics"
    premiumThemes: false,
    customBranding: true,
  },
  pro: {
    products: Infinity,
    invoicesPerMonth: Infinity,
    receiptsPerMonth: Infinity,
    aiPerMonth: Infinity,
    analyticsRanges: ['7d', '30d', '90d', '1y'],
    premiumThemes: true,
    customBranding: true,
  },
};

function getLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

const TRIAL_DAYS = 30;

// Every new business gets full Pro access for TRIAL_DAYS, regardless of
// what they eventually pay for (or don't). `subscription.plan` always
// holds the REAL, paid-for tier (defaulting to 'free'); trialEndsAt is
// checked separately here rather than mutating `plan` directly, so the
// trial expires naturally the moment the date passes — no scheduled job
// has to run to "downgrade" anyone, which matters since this app may run
// on hosts (like Render's free tier) that sleep and can't be trusted to
// fire a cron job on time.
function getEffectivePlan(subscription) {
  if (!subscription) return 'free';
  if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date()) {
    return 'pro';
  }
  return subscription.plan || 'free';
}

function getTrialInfo(subscription) {
  if (!subscription?.trialEndsAt) return { active: false, daysLeft: 0, endsAt: null };
  const msLeft = new Date(subscription.trialEndsAt).getTime() - Date.now();
  return {
    active: msLeft > 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
    endsAt: subscription.trialEndsAt,
  };
}

module.exports = { PLAN_LIMITS, getLimits, getEffectivePlan, getTrialInfo, TRIAL_DAYS };
