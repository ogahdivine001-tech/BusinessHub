const asyncHandler = require('express-async-handler');
const { getPublicPlans, TRIAL_DAYS, PERIOD_DAYS } = require('../services/planCatalog');

// @desc  Public plan list for the pricing page and Settings. Generated from the
//        limits and prices the server actually enforces, never typed in by hand.
// @route GET /api/plans
const getPlans = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { plans: getPublicPlans(), trialDays: TRIAL_DAYS, periodDays: PERIOD_DAYS } });
});

module.exports = { getPlans };
