const mongoose = require('mongoose');
const Review = require('../models/Review');
const Business = require('../models/Business');

const toId = (id) => (mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id);
const round2 = (n) => Math.round(n * 100) / 100;

// Bayesian average: (v*R + m*C) / (v + m)
//   R = the business's average, v = its review count,
//   C = the platform-wide average, m = prior weight.
// With few reviews the score stays near C; with many it approaches R.
function bayesianScore(average, count, globalMean, priorWeight) {
  if (!count) return null;
  return (count * average + priorWeight * globalMean) / (count + priorWeight);
}

// The single place that writes a business's rating numbers. It always
// recalculates from the real published reviews (never "+1"), so the cached
// figures cannot drift from the records, and nobody can set them directly.
async function recomputeBusinessRating(businessId) {
  const [agg] = await Review.aggregate([
    { $match: { business: toId(businessId), status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingAverage = agg ? round2(agg.avg) : 0;
  const ratingCount = agg ? agg.count : 0;
  await Business.updateOne({ _id: businessId }, { $set: { ratingAverage, ratingCount } });
  return { ratingAverage, ratingCount };
}

// Review-weighted platform average across published, reviewed businesses.
// Cached for a few minutes: it changes slowly and is read on every ranked query.
let cache = { value: null, at: 0 };
async function getGlobalMean(now = Date.now()) {
  if (cache.value !== null && now - cache.at < 5 * 60 * 1000) return cache.value;
  const [agg] = await Business.aggregate([
    { $match: { isPublished: true, ratingCount: { $gt: 0 } } },
    { $group: { _id: null, weighted: { $sum: { $multiply: ['$ratingAverage', '$ratingCount'] } }, n: { $sum: '$ratingCount' } } },
  ]);
  const value = agg && agg.n ? agg.weighted / agg.n : 3.5; // fallback only matters when nothing is rated yet
  cache = { value, at: now };
  return value;
}
const resetGlobalMeanCache = () => { cache = { value: null, at: 0 }; };

module.exports = { bayesianScore, recomputeBusinessRating, getGlobalMean, resetGlobalMeanCache };
