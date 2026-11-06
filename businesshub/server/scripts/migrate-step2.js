// Additive, idempotent migration for existing businesses. It ONLY fills in
// fields that are missing; it never overwrites a value and never deletes.
//
//   cd server
//   npm run migrate:step2            # DRY RUN: shows what would change, changes nothing
//   npm run migrate:step2 -- --apply # actually fills in the missing fields
//
// Back up the database before using --apply. Safe to run more than once.
//
// Why it is needed: new fields (delivery, verification, rating/follower
// caches) have defaults for NEW businesses only. Existing documents would
// otherwise be missing them, which makes sorting and filtering inconsistent.
require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../models/Business');

const apply = process.argv.includes('--apply');

// [description, filter for "missing", values to set]
const STEPS = [
  ['delivery.status = "unspecified"', { 'delivery.status': { $exists: false } }, { 'delivery.status': 'unspecified' }],
  ['verification.status = "none"', { 'verification.status': { $exists: false } }, { 'verification.status': 'none' }],
  ['ratingAverage = 0', { ratingAverage: { $exists: false } }, { ratingAverage: 0 }],
  ['ratingCount = 0', { ratingCount: { $exists: false } }, { ratingCount: 0 }],
  ['followerCount = 0', { followerCount: { $exists: false } }, { followerCount: 0 }],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const total = await Business.countDocuments();
  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} — ${total} businesses in the database\n`);
  for (const [label, filter, set] of STEPS) {
    const missing = await Business.countDocuments(filter);
    if (apply && missing) {
      // The filter limits the write to documents that lack the field, so nothing is overwritten.
      const r = await Business.collection.updateMany(filter, { $set: set });
      console.log(`  ${label}: ${missing} missing -> updated ${r.modifiedCount}`);
    } else {
      console.log(`  ${label}: ${missing} missing${apply ? '' : ' (would update)'}`);
    }
  }
  console.log(apply ? '\nDone. Run again any time; it will report 0 missing.' : '\nNothing was changed. Re-run with --apply to update.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
