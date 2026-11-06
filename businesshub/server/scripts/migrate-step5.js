// Stamps every EXISTING subscription as "legacy" so those customers keep the
// plan terms they signed up under. Safe to run more than once; it only fills
// in a missing policyVersion and never overwrites one.
//
//   npm run migrate:step5            # DRY RUN
//   npm run migrate:step5 -- --apply
//
// Why: code treats a missing policyVersion as "legacy" already, so this is a
// belt-and-braces step that makes the choice explicit in the data. Run it
// BEFORE (or right when) you deploy Step 5, and back up first.
require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');

const apply = process.argv.includes('--apply');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const filter = { policyVersion: { $exists: false } };
  const total = await Subscription.countDocuments();
  const missing = await Subscription.countDocuments(filter);
  console.log(`${apply ? 'APPLYING' : 'DRY RUN'}: ${total} subscriptions, ${missing} without a policy version`);
  if (apply && missing) {
    const r = await Subscription.collection.updateMany(filter, { $set: { policyVersion: 'legacy' } });
    console.log(`Stamped ${r.modifiedCount} as "legacy".`);
  } else if (!apply) {
    console.log('Nothing changed. Re-run with --apply to stamp them.');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
