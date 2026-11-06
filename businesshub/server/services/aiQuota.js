const ApiError = require('../utils/apiError');
const { getLimitsFor, aiCategoryOf, AI_CATEGORY_TYPES } = require('./subscriptionService');
const { verifyWithinLimit } = require('./usageGuard');

// The single place that decides whether a business may make an AI request and
// counts it. Used by every AI endpoint (marketing/writing tools and the
// BusinessHub assistant), so a plan rule can never be enforced in one place and
// forgotten in another. Models are required inside the functions so they can be
// swapped in tests.

const monthKey = () => new Date().toISOString().slice(0, 7);

const CATEGORY_LABEL = { chat: 'AI business chat', marketing: 'AI marketing tools', documents: 'AI invoice and receipt writing' };
const LOCKED_MESSAGE = {
  chat: 'AI business chat is available on the Starter and Pro plans. Upgrade to use it.',
  marketing: 'AI marketing tools are available on the Pro plan. Upgrade to use them.',
  documents: 'AI invoice and receipt writing is available on the Starter and Pro plans. Upgrade to use it.',
};

// Refuses (403) if the plan does not include this kind of AI, or the monthly
// cap is already used up. Does not record anything.
async function checkAiAccess(businessId, type) {
  const AIUsage = require('../models/AIUsage');
  const Subscription = require('../models/Subscription');
  const category = aiCategoryOf(type);
  if (!category) throw new ApiError(400, 'Unknown AI request type.');

  const subscription = await Subscription.findOne({ business: businessId });
  const limits = getLimitsFor(subscription);
  const categoryCap = limits.aiCaps[category];
  const sharedCap = limits.aiSharedCap;
  if (categoryCap === 0 || sharedCap === 0) throw new ApiError(403, LOCKED_MESSAGE[category]);

  const month = monthKey();
  const countCategory = () => AIUsage.countDocuments({ business: businessId, monthKey: month, type: { $in: AI_CATEGORY_TYPES[category] } });
  const countAll = () => AIUsage.countDocuments({ business: businessId, monthKey: month });
  const categoryMessage = `You have used all ${categoryCap} ${CATEGORY_LABEL[category]} uses for this month. They reset next month, or upgrade for more.`;
  const sharedMessage = `Your plan allows ${sharedCap} AI requests/month. Please upgrade for more.`;

  if (Number.isFinite(categoryCap) && (await countCategory()) >= categoryCap) throw new ApiError(403, categoryMessage);
  if (Number.isFinite(sharedCap) && (await countAll()) >= sharedCap) throw new ApiError(403, sharedMessage);

  return { category, limits, categoryCap, sharedCap, countCategory, countAll, categoryMessage, sharedMessage, month };
}

// Checks access, reserves one use BEFORE calling the provider (so simultaneous
// requests cannot all slip under the cap), runs the request, and gives the use
// back if it fails: nobody is charged for an answer they did not get.
async function runWithAiQuota({ businessId, type, params, execute }) {
  const AIUsage = require('../models/AIUsage');
  const ctx = await checkAiAccess(businessId, type);
  const reservation = await AIUsage.create({
    business: businessId,
    type,
    prompt: JSON.stringify(params || {}).slice(0, 500),
    monthKey: ctx.month,
  });
  const undo = () => AIUsage.deleteOne({ _id: reservation._id });
  await verifyWithinLimit({ count: ctx.countCategory, limit: ctx.categoryCap, undo, message: ctx.categoryMessage });
  await verifyWithinLimit({ count: ctx.countAll, limit: ctx.sharedCap, undo, message: ctx.sharedMessage });
  try {
    return await execute();
  } catch (err) {
    await undo().catch(() => {});
    throw err;
  }
}

module.exports = { checkAiAccess, runWithAiQuota, monthKey };
