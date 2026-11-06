const { getLimits, TRIAL_DAYS } = require('./subscriptionService');
const { PLAN_PRICES_KOBO, PERIOD_DAYS } = require('./subscriptionActivation');

// What each plan offers, written from the SAME limits the server enforces
// (services/subscriptionService.js) and the SAME prices used at checkout.
// The pricing page, the Settings plan cards and the help assistant all read
// this, so a change to a limit or price shows up everywhere at once.

const nf = (n) => new Intl.NumberFormat('en-NG').format(n);
const naira = (kobo) => `₦${nf(kobo / 100)}`;

// 'not included' | 'unlimited' | 'up to 100 per month'
const amount = (n, unit = '') => (n === 0 ? 'not included' : Number.isFinite(n) ? `up to ${nf(n)}${unit}` : 'unlimited');

function getPublicPlans() {
  const l = (plan) => getLimits(plan, 'v2');
  const free = l('free'); const starter = l('starter'); const pro = l('pro');
  return [
    {
      id: 'free', name: 'Free', priceKobo: 0,
      features: [
        `Up to ${nf(free.products)} products`,
        'Your own business page',
        'Basic analytics',
        'Search and discovery listing',
        'Customer reviews and followers',
      ],
    },
    {
      id: 'starter', name: 'Starter', priceKobo: PLAN_PRICES_KOBO.starter,
      features: [
        `Up to ${nf(starter.products)} products`,
        'Invoices and receipts',
        'AI business chat',
        `AI help writing invoices and receipts (${nf(starter.aiCaps.documents)} per month)`,
        'Advanced analytics and custom branding',
      ],
    },
    {
      id: 'pro', name: 'Pro', priceKobo: PLAN_PRICES_KOBO.pro,
      features: [
        'Unlimited products',
        'Everything in Starter',
        'AI marketing tools',
        'Unlimited AI chat and writing (fair use)',
        'Premium themes',
      ],
    },
  ].map((p) => ({ ...p, priceLabel: p.priceKobo ? naira(p.priceKobo) : '₦0', periodDays: p.priceKobo ? PERIOD_DAYS : null }));
}

module.exports = { getPublicPlans, naira, nf, amount, TRIAL_DAYS, PERIOD_DAYS };
