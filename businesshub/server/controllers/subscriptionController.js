const crypto = require('crypto');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const AIUsage = require('../models/AIUsage');
const ApiError = require('../utils/apiError');
const { getEffectivePlan, getTrialInfo, isPaidPlanExpired, getLimitsFor, getRenewalInfo, AI_CATEGORY_TYPES, isPaidPeriodCurrent } = require('../services/subscriptionService');
const { notifyOnce } = require('../services/notificationService');
const { applyVerificationPayment } = require('../services/verificationService');
const { initializeTransaction, verifyTransaction, isConfigured } = require('../services/paystackService');

const { PLAN_PRICES_KOBO, REFERENCE_RE, activateFromTransaction } = require('../services/subscriptionActivation');
const monthKey = () => new Date().toISOString().slice(0, 7);

const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const effectivePlan = getEffectivePlan(subscription);
  const limits = getLimitsFor(subscription);
  const trial = getTrialInfo(subscription);
  const renewal = getRenewalInfo(subscription);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, invoicesThisMonth, receiptsThisMonth, aiRows] = await Promise.all([
    Product.countDocuments({ business: req.businessId }),
    Invoice.countDocuments({ business: req.businessId, createdAt: { $gte: monthStart } }),
    Receipt.countDocuments({ business: req.businessId, createdAt: { $gte: monthStart } }),
    AIUsage.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(String(req.businessId)), monthKey: monthKey() } },
      { $group: { _id: '$type', n: { $sum: 1 } } },
    ]),
  ]);
  const aiByType = Object.fromEntries(aiRows.map((r) => [r._id, r.n]));
  const ai = {};
  for (const [cat, types] of Object.entries(AI_CATEGORY_TYPES)) {
    ai[cat] = { used: types.reduce((n, t) => n + (aiByType[t] || 0), 0), limit: limits.aiCaps[cat], enabled: limits.aiCaps[cat] > 0 && limits.aiSharedCap > 0 };
  }
  const aiThisMonth = Object.values(ai).reduce((n, c) => n + c.used, 0);

  // One in-app reminder per billing period (not one per page load).
  if (renewal.state) {
    const day = renewal.expiresAt.toISOString().slice(0, 10);
    notifyOnce(req.user._id, `renewal-${renewal.state}-${day}`, renewal.state === 'expiring'
      ? { title: 'Your plan ends soon', message: `Your ${subscription.plan} plan ends in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? '' : 's'}. Renew to keep your tools.`, link: '/dashboard/settings?tab=Subscription' }
      : { title: 'Your plan has ended', message: `Your ${subscription.plan} plan ended. Your data is safe. Renew to get your tools back.`, link: '/dashboard/settings?tab=Subscription' });
  }

  res.json({
    success: true,
    data: {
      subscription,
      effectivePlan,
      policyVersion: (subscription && subscription.policyVersion) || 'legacy',
      planExpired: isPaidPlanExpired(subscription),
      renewal,
      trial,
      limits,
      features: limits.features,
      usage: { products, invoicesThisMonth, receiptsThisMonth, aiThisMonth, ai },
      paystackConfigured: isConfigured(),
    },
  });
});

const startCheckout = asyncHandler(async (req, res) => {
  const { plan } = req.body; // 'starter' | 'pro'
  if (!PLAN_PRICES_KOBO[plan]) throw new ApiError(400, 'Invalid plan selected.');

  // Someone with Pro time remaining must not pay for Starter: it would replace
  // the Pro days they already paid for. They can choose Starter after Pro ends.
  const current = await Subscription.findOne({ business: req.businessId });
  if (plan === 'starter' && current && current.plan === 'pro' && isPaidPeriodCurrent(current)) {
    const until = current.currentPeriodEnd ? ` until ${new Date(current.currentPeriodEnd).toLocaleDateString('en-GB')}` : '';
    throw new ApiError(400, `You are on Pro${until}. You can switch to Starter after your Pro plan ends.`);
  }

  // CLIENT_URL should always be set in production, but if it's missing or
  // mistyped we fall back to the request's own Origin header rather than
  // silently building a broken "undefined/..." URL — that would leave
  // Paystack with nowhere valid to redirect the customer back to.
  // Never take the return address from request headers on a live server: a
  // forged Origin would send the customer to another site after paying.
  let clientOrigin = process.env.CLIENT_URL;
  if (!clientOrigin) {
    clientOrigin = process.env.NODE_ENV === 'production'
      ? 'https://businesshubng.vercel.app'
      : req.headers.origin || 'http://localhost:5173';
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
  const { reference } = req.params;
  if (!REFERENCE_RE.test(reference)) throw new ApiError(400, 'Invalid payment reference.');

  // Paystack is the only source of truth. The transaction must be successful,
  // correctly priced, in NGN, and belong to THIS business; and it can only
  // ever upgrade the plan once (replays change nothing).
  const result = await verifyTransaction(reference);
  const { subscription, duplicate } = await activateFromTransaction(result.data, {
    source: 'callback',
    expectedBusinessId: req.businessId,
    userId: req.user._id,
  });

  res.json({ success: true, data: { subscription, alreadyProcessed: duplicate } });
});

// @desc  Paystack calls this itself when a payment succeeds, so a plan is
//        activated even if the customer closes the browser before returning.
//        Public (no login), so it is protected by Paystack's signature instead.
// @route POST /api/subscriptions/webhook
const paystackWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];
  const raw = req.rawBody; // exact bytes Paystack sent (captured in app.js)
  if (!secret || !signature || !raw) return res.status(401).json({ success: false, message: 'Invalid signature.' });

  const expected = Buffer.from(crypto.createHmac('sha512', secret).update(raw).digest('hex'));
  const received = Buffer.from(String(signature));
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ success: false, message: 'Invalid signature.' });
  }

  const event = req.body || {};
  if (event.event !== 'charge.success' || !event.data || !REFERENCE_RE.test(String(event.data.reference))) {
    return res.sendStatus(200); // an event we do not act on
  }

  try {
    // Re-confirm with Paystack's API rather than trusting the webhook body alone.
    const result = await verifyTransaction(event.data.reference);
    // Verification fees and plan payments arrive on the same webhook; each goes
    // to its own handler (a fee must never be treated as, or dropped as, a plan payment).
    if (result.data && result.data.metadata && result.data.metadata.type === 'verification') {
      await applyVerificationPayment(result.data);
    } else {
      await activateFromTransaction(result.data, { source: 'webhook' });
    }
  } catch (err) {
    // Temporary trouble (e.g. Paystack unreachable): let Paystack retry later.
    if (!err.statusCode || err.statusCode >= 500) throw err;
    // A payment that fails our checks is logged, never retried forever.
    console.warn(`[paystack-webhook] ignored ${event.data.reference}: ${err.message}`);
  }
  res.sendStatus(200);
});

module.exports = { getMySubscription, startCheckout, verifyCheckout, paystackWebhook };
