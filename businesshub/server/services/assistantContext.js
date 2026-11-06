const { getEffectivePlan, getLimitsFor, getTrialInfo } = require('./subscriptionService');

// A short summary of the person's OWN plan, given to the assistant so it can
// answer "how many products can I add?" or "when does my plan end?".
//
// Data minimisation: this is deliberately tiny. It contains no names, email
// addresses, phone numbers, customers, orders, invoices or payment details,
// and nothing about any other business.
const nf = (n) => new Intl.NumberFormat('en-NG').format(n);
const date = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const cap = (n, noun) => (n === 0 ? 'not included' : Number.isFinite(n) ? `up to ${nf(n)} ${noun}` : `unlimited ${noun}`);

function buildAccountContext({ subscription, productCount = 0, verificationStatus = 'none', emailVerified = false, deliveryStatus = 'unspecified', now = new Date() }) {
  const plan = getEffectivePlan(subscription, now);
  const limits = getLimitsFor(subscription, now);
  const trial = getTrialInfo(subscription, now);
  const lines = [];

  let planLine = `Plan in force right now: ${plan[0].toUpperCase()}${plan.slice(1)}`;
  if (trial && trial.active) planLine += ` (free trial, ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left)`;
  else if (plan !== 'free' && subscription && subscription.currentPeriodEnd) planLine += ` (paid period ends ${date(subscription.currentPeriodEnd)})`;
  lines.push(planLine);

  if (subscription && ['starter', 'pro'].includes(subscription.plan) && plan === 'free') {
    lines.push(`A ${subscription.plan} plan was paid for before and has ended, so the account is on Free until it is renewed. Nothing was deleted.`);
  }
  lines.push(subscription && subscription.policyVersion === 'v2'
    ? 'Plan terms: the current terms.'
    : 'Plan terms: earlier terms (this account was created before the latest plan changes and keeps them).');

  lines.push(`Products: ${nf(productCount)} used, ${Number.isFinite(limits.products) ? `limit ${nf(limits.products)}` : 'no limit'}.`);
  lines.push(`Invoices: ${cap(limits.invoicesPerMonth, 'per month')}. Receipts: ${cap(limits.receiptsPerMonth, 'per month')}.`);
  const ai = [];
  ai.push(`chat ${limits.features.aiChat ? 'included' : 'not included'}`);
  ai.push(`marketing tools ${limits.features.aiMarketing ? 'included' : 'not included'}`);
  ai.push(`invoice/receipt writing ${limits.features.aiDocuments ? 'included' : 'not included'}`);
  lines.push(`AI: ${ai.join('; ')}.`);
  lines.push(`Verification badge status: ${verificationStatus}.`);
  lines.push(`Email address confirmed: ${emailVerified ? 'yes' : 'no'}.`);
  lines.push(`Delivery setting on the business page: ${deliveryStatus}.`);
  return lines.map((l) => `- ${l}`).join('\n');
}

module.exports = { buildAccountContext };
