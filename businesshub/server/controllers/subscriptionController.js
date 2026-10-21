const crypto = require('crypto');
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

const { PLAN_PRICES_KOBO, REFERENCE_RE, activateFromTransaction } = require('../services/subscriptionActivation');
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
    await activateFromTransaction(result.data, { source: 'webhook' });
  } catch (err) {
    // Temporary trouble (e.g. Paystack unreachable): let Paystack retry later.
    if (!err.statusCode || err.statusCode >= 500) throw err;
    // A payment that fails our checks is logged, never retried forever.
    console.warn(`[paystack-webhook] ignored ${event.data.reference}: ${err.message}`);
  }
  res.sendStatus(200);
});

module.exports = { getMySubscription, startCheckout, verifyCheckout, paystackWebhook };
