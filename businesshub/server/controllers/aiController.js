const asyncHandler = require('express-async-handler');
const AIUsage = require('../models/AIUsage');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { generateAIContent, isConfigured, getProvider } = require('../services/aiService');
const { getLimitsFor, aiCategoryOf, AI_CATEGORY_TYPES } = require('../services/subscriptionService');
const { runWithAiQuota, monthKey } = require('../services/aiQuota');

// @desc  Generate AI content (marketing copy, invoice/receipt wording, plain chat)
// @route POST /api/ai/generate
//
// What a plan may use is decided on the server (services/aiQuota.js), whatever
// the browser shows: a request for a feature the plan does not include is
// refused before any AI provider is contacted.
const generate = asyncHandler(async (req, res) => {
  const { type, ...params } = req.body;
  if (!type) throw new ApiError(400, 'AI request type is required.');
  if (!aiCategoryOf(type)) throw new ApiError(400, 'Unknown AI request type.');

  const content = await runWithAiQuota({
    businessId: req.businessId,
    type,
    params,
    execute: () => generateAIContent(type, params),
  });
  res.json({ success: true, data: { content } });
});

// @desc  Get AI usage and what the plan includes, for the current month
// @route GET /api/ai/usage
const getUsage = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimitsFor(subscription);
  const rows = await AIUsage.aggregate([
    { $match: { business: req.businessId, monthKey: monthKey() } },
    { $group: { _id: '$type', n: { $sum: 1 } } },
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const categories = {};
  let total = 0;
  for (const [cat, types] of Object.entries(AI_CATEGORY_TYPES)) {
    const used = types.reduce((n, t) => n + (byType[t] || 0), 0);
    total += used;
    categories[cat] = { used, limit: limits.aiCaps[cat], enabled: limits.aiCaps[cat] > 0 && limits.aiSharedCap > 0 };
  }
  // `used`/`limit` is the headline number for the page's usage bar: the shared
  // cap on older plans, otherwise the capped category (invoice/receipt writing).
  // `scope` tells the page what the bar means: 'shared' (one pool for every AI
  // tool), 'documents' (invoice/receipt writing only), or 'none' (no cap).
  const capped = Object.values(categories).find((c) => c.enabled && Number.isFinite(c.limit));
  const headline = Number.isFinite(limits.aiSharedCap)
    ? { used: total, limit: limits.aiSharedCap, scope: 'shared' }
    : capped ? { used: capped.used, limit: capped.limit, scope: 'documents' }
    : { used: total, limit: Infinity, scope: 'none' };

  res.json({
    success: true,
    data: { ...headline, categories, features: limits.features, configured: isConfigured(), provider: getProvider().label },
  });
});

module.exports = { generate, getUsage };
