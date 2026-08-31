const asyncHandler = require('express-async-handler');
const AIUsage = require('../models/AIUsage');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { generateAIContent, isConfigured, getProvider } = require('../services/aiService');
const { getLimits, getEffectivePlan } = require('../services/subscriptionService');

const monthKey = () => new Date().toISOString().slice(0, 7);

// @desc  Generate AI content (product descriptions, captions, ads, etc.)
// @route POST /api/ai/generate
const generate = asyncHandler(async (req, res) => {
  const { type, ...params } = req.body;
  if (!type) throw new ApiError(400, 'AI request type is required.');

  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimits(getEffectivePlan(subscription));
  const usedThisMonth = await AIUsage.countDocuments({ business: req.businessId, monthKey: monthKey() });

  if (usedThisMonth >= limits.aiPerMonth) {
    throw new ApiError(403, `Your plan allows ${limits.aiPerMonth} AI requests/month. Please upgrade for more.`);
  }

  const content = await generateAIContent(type, params);

  await AIUsage.create({
    business: req.businessId,
    type,
    prompt: JSON.stringify(params).slice(0, 500),
    monthKey: monthKey(),
  });

  res.json({ success: true, data: { content } });
});

// @desc  Get AI usage stats for the current billing month
// @route GET /api/ai/usage
const getUsage = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimits(getEffectivePlan(subscription));
  const used = await AIUsage.countDocuments({ business: req.businessId, monthKey: monthKey() });

  res.json({
    success: true,
    data: { used, limit: limits.aiPerMonth, configured: isConfigured(), provider: getProvider().label },
  });
});

module.exports = { generate, getUsage };
