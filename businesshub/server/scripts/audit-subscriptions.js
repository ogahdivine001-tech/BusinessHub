// READ-ONLY report. Run this against production BEFORE deploying the plan-expiry
// fix, so nobody is surprised by who drops to Free. It changes nothing.
//
//   cd server && npm run audit:subscriptions
//
// It lists paid subscriptions that would lose access immediately (period already
// ended) and paid subscriptions with no period end recorded (legacy rows that
// keep access until someone reviews them).
require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Business = require('../models/Business');
const { getEffectivePlan, isPaidPlanExpired } = require('../services/subscriptionService');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const subs = await Subscription.find({ plan: { $in: ['starter', 'pro'] } }).lean();
  const names = new Map(
    (await Business.find({ _id: { $in: subs.map((s) => s.business) } }).select('name').lean()).map((b) => [String(b._id), b.name])
  );

  const rows = { 'WILL DROP TO FREE (period ended)': [], 'LEGACY (no period end recorded; keeps access)': [], 'ACTIVE (period still running)': [] };
  for (const s of subs) {
    const label = names.get(String(s.business)) || String(s.business);
    const line = `${label} | plan=${s.plan} status=${s.status} periodEnd=${s.currentPeriodEnd ? s.currentPeriodEnd.toISOString().slice(0, 10) : 'none'}`;
    if (isPaidPlanExpired(s) && getEffectivePlan(s) === 'free') rows['WILL DROP TO FREE (period ended)'].push(line);
    else if (!s.currentPeriodEnd) rows['LEGACY (no period end recorded; keeps access)'].push(line);
    else rows['ACTIVE (period still running)'].push(line);
  }
  for (const [title, list] of Object.entries(rows)) {
    console.log(`\n== ${title}: ${list.length}`);
    list.forEach((l) => console.log('  ' + l));
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
