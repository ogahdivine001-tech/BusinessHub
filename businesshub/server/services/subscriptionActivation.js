const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');

// Prices in kobo (NGN x 100). Defaults match what the site advertises today
// (Starter N2,000, Pro N5,000); override with env vars, never by editing code.
const PLAN_PRICES_KOBO = {
  starter: Number(process.env.STARTER_PRICE_KOBO) || 200000,
  pro: Number(process.env.PRO_PRICE_KOBO) || 500000,
};
const PERIOD_DAYS = 30;
const REFERENCE_RE = /^[A-Za-z0-9_.-]{6,100}$/;

// Decides whether a Paystack transaction is a genuine, correctly-priced
// BusinessHub plan payment, and (for the browser callback) that it belongs to
// the business asking for it. Never trusts anything but what Paystack returned.
function validateTransaction(txn, expectedBusinessId) {
  if (!txn || txn.status !== 'success') throw new ApiError(400, 'Payment was not successful.');
  const meta = txn.metadata || {};
  const plan = meta.plan;
  if (!PLAN_PRICES_KOBO[plan] || !meta.businessId) throw new ApiError(400, 'This payment is not for a BusinessHub plan.');
  if (!REFERENCE_RE.test(String(txn.reference || ''))) throw new ApiError(400, 'Invalid payment reference.');
  if (txn.currency !== 'NGN') throw new ApiError(400, 'Unexpected payment currency.');
  if (Number(txn.amount) !== PLAN_PRICES_KOBO[plan]) throw new ApiError(400, 'The amount paid does not match the plan price.');
  if (expectedBusinessId && String(meta.businessId) !== String(expectedBusinessId)) {
    throw new ApiError(403, 'This payment belongs to a different business.');
  }
  return { plan, businessId: String(meta.businessId), reference: String(txn.reference) };
}

// Applies a verified payment exactly once, no matter how many times, or through
// how many routes (callback, webhook, replay), it is presented.
async function activateFromTransaction(txn, { source, expectedBusinessId, userId } = {}) {
  const { plan, businessId, reference } = validateTransaction(txn, expectedBusinessId);

  let payment = await Payment.findOne({ reference });
  if (!payment) {
    try {
      payment = await Payment.create({
        business: businessId, user: userId || undefined, reference, plan,
        amountKobo: Number(txn.amount), currency: 'NGN', source,
        paidAt: txn.paid_at ? new Date(txn.paid_at) : new Date(),
      });
    } catch (err) {
      if (err && err.code === 11000) payment = await Payment.findOne({ reference }); // lost a race: fine
      else throw err;
    }
  }

  // Atomic claim: only ONE caller can flip activatedAt from empty to a date.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, activatedAt: null },
    { $set: { activatedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    return { subscription: await Subscription.findOne({ business: businessId }), duplicate: true };
  }

  try {
    const subscription = await Subscription.findOneAndUpdate(
      { business: businessId },
      { plan, status: 'active', currentPeriodEnd: new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000) },
      { new: true, upsert: true }
    );
    return { subscription, duplicate: false, payment: claimed };
  } catch (err) {
    await Payment.updateOne({ _id: payment._id }, { $set: { activatedAt: null } }); // let a retry finish the job
    throw err;
  }
}

module.exports = { PLAN_PRICES_KOBO, REFERENCE_RE, validateTransaction, activateFromTransaction };
