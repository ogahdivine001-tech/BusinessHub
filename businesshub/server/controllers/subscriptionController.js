const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const AIUsage = require('../models/AIUsage');
const ApiError = require('../utils/apiError');
const { getLimits, getEffectivePlan, getTrialInfo } = require('../services/subscriptionService');
const { initializeTransaction, verifyTransaction, isConfigured } = require('../services/paystackService');

const PLAN_PRICES_KOBO = { starter: 200000, pro: 500000 }; // NGN 2,000 / 5,000
const monthKey = () => new Date().toISOString().slice(0, 7);

const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const effectivePlan = getEffectivePlan(subscription);
  const limits = getLimits(effectivePlan);
  const trial = getTrialInfo(subscription);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, invoicesThisMonth, receiptsThisMonth, aiThisMonth] = await Promise.all([
    Product.countDocuments({ business: req.businessId }),
    Invoice.countDocuments({ business: req.businessId, createdAt: { $gte: monthStart } }),
    Receipt.countDocuments({ business: req.businessId, createdAt: { $gte: monthStart } }),
    AIUsage.countDocuments({ business: req.businessId, monthKey: monthKey() }),
  ]);

  res.json({
    success: true,
    data: {
      subscription,
      effectivePlan,
      trial,
      limits,
      usage: { products, invoicesThisMonth, receiptsThisMonth, aiThisMonth },
      paystackConfigured: isConfigured(),
    },
  });
});

// @desc  Start a Paystack transaction to upgrade plan
// @route POST /api/subscriptions/checkout
const startCheckout = asyncHandler(async (req, res) => {
  const { plan } = req.body; // 'starter' | 'pro'
  if (!PLAN_PRICES_KOBO[plan]) throw new ApiError(400, 'Invalid plan selected.');

  // CLIENT_URL should always be set in production, but if it's missing or
  // mistyped we fall back to the request's own Origin header rather than
  // silently building a broken "undefined/..." URL — that would leave
  // Paystack with nowhere valid to redirect the customer back to.
  let clientOrigin = process.env.CLIENT_URL;
  if (!clientOrigin) {
    clientOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    console.warn(
      `[subscriptions] CLIENT_URL is not set in server/.env — falling back to request origin "${clientOrigin}" for the Paystack callback URL. Set CLIENT_URL explicitly for reliable redirects.`
    );
  }
  const callbackUrl = `${clientOrigin.replace(/\/+$/, '')}/dashboard/settings/subscription/callback`;
  console.log(`[subscriptions] Starting Paystack checkout for plan "${plan}" with callback_url: ${callbackUrl}`);

  const result = await initializeTransaction({
    email: req.user.email,
    amountKobo: PLAN_PRICES_KOBO[plan],
    metadata: { businessId: req.businessId.toString(), plan },
    callbackUrl,
  });

  res.json({ success: true, data: result.data });
});

// @desc  Verify payment and activate the plan
// @route GET /api/subscriptions/verify/:reference
const verifyCheckout = asyncHandler(async (req, res) => {
  const result = await verifyTransaction(req.params.reference);
  if (result.data?.status !== 'success') {
    throw new ApiError(400, 'Payment was not successful.');
  }

  const { plan } = result.data.metadata || {};
  const subscription = await Subscription.findOneAndUpdate(
    { business: req.businessId },
    {
      plan,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: { subscription } });
});

module.exports = { getMySubscription, startCheckout, verifyCheckout };
