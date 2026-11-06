const Business = require('../models/Business');
const VerificationRequest = require('../models/VerificationRequest');
const ApiError = require('../utils/apiError');
const { getVerificationConfig } = require('../config/verification');

const REFERENCE_RE = /^[A-Za-z0-9_.-]{6,100}$/;

// The ONLY place a business's verification state is written. It is called from
// admin actions and from the owner's own "I have asked to be verified" step
// (which can only ever set 'pending'). Nothing an owner sends can set 'verified'.
// `onlyIf` makes the change conditional, so racing requests cannot overwrite
// each other.
async function setBusinessVerification(businessId, status, { onlyIf } = {}) {
  const set = { 'verification.status': status };
  const update = status === 'verified'
    ? { $set: { ...set, 'verification.verifiedAt': new Date() } }
    : { $set: set, $unset: { 'verification.verifiedAt': 1 } };
  const filter = { _id: businessId, ...(onlyIf || {}) };
  const res = await Business.updateOne(filter, update);
  const matched = res && (res.matchedCount ?? res.n ?? 1);
  return Boolean(matched);
}

// What the business tells us when it asks to be verified. Strings only, bounded;
// the website must be a plain http(s) link because admins will see it as a link.
function cleanSubmittedInfo(body = {}) {
  const text = (v, max, label, required) => {
    if (v === undefined || v === null || v === '') {
      if (required) throw new ApiError(400, `${label} is required.`);
      return undefined;
    }
    if (typeof v !== 'string') throw new ApiError(400, `${label} must be text.`);
    const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (required && t.length < 2) throw new ApiError(400, `${label} is required.`);
    if (t.length > max) throw new ApiError(400, `${label} can be at most ${max} characters.`);
    return t || undefined;
  };
  const info = {
    legalName: text(body.legalName, 200, 'Registered business name', true),
    registrationNumber: text(body.registrationNumber, 100, 'Registration number'),
    website: text(body.website, 300, 'Website'),
    notes: text(body.notes, 1000, 'Notes'),
  };
  if (info.website && !/^https?:\/\/[^\s<>"']+$/i.test(info.website)) {
    throw new ApiError(400, 'Website must start with http:// or https://');
  }
  return info;
}

// Decides whether a Paystack transaction is a genuine, correctly-priced
// verification-fee payment. Trusts only what Paystack itself returned.
function validateVerificationPayment(txn, expectedBusinessId, cfg = getVerificationConfig()) {
  if (!txn || txn.status !== 'success') throw new ApiError(400, 'Payment was not successful.');
  const meta = txn.metadata || {};
  if (meta.type !== 'verification' || !meta.requestId || !meta.businessId) throw new ApiError(400, 'This payment is not a verification fee.');
  if (!REFERENCE_RE.test(String(txn.reference || ''))) throw new ApiError(400, 'Invalid payment reference.');
  if (!cfg.configured) throw new ApiError(400, 'Verification payments are not configured.');
  if (String(txn.currency || '').toUpperCase() !== cfg.currency) throw new ApiError(400, 'Unexpected payment currency.');
  if (Number(txn.amount) !== cfg.amountMinor) throw new ApiError(400, 'The amount paid does not match the verification fee.');
  if (expectedBusinessId && String(meta.businessId) !== String(expectedBusinessId)) {
    throw new ApiError(403, 'This payment belongs to a different business.');
  }
  return { requestId: String(meta.requestId), businessId: String(meta.businessId), reference: String(txn.reference) };
}

// Records a confirmed fee payment on its request, exactly once, however many
// times (callback, webhook, replay) it is presented. Paying NEVER verifies a
// business: it only tells the reviewing admin the fee has been received.
async function applyVerificationPayment(txn, { expectedBusinessId } = {}) {
  const cfg = getVerificationConfig();
  const { requestId, businessId, reference } = validateVerificationPayment(txn, expectedBusinessId, cfg);

  const request = await VerificationRequest.findOne({ _id: requestId, business: businessId });
  if (!request) throw new ApiError(404, 'Verification request not found for this payment.');

  if (request.payment && request.payment.status === 'paid') {
    const same = request.payment.reference === reference;
    if (!same) console.warn(`[verification] extra payment ${reference} for request ${requestId} (already paid with ${request.payment.reference}); needs a manual refund.`);
    return { request, duplicate: true, extraPayment: !same };
  }

  try {
    // Atomic claim: only one caller can move the payment from not-paid to paid.
    const claimed = await VerificationRequest.findOneAndUpdate(
      { _id: requestId, 'payment.status': { $ne: 'paid' } },
      { $set: { 'payment.status': 'paid', 'payment.reference': reference, 'payment.amountMinor': Number(txn.amount), 'payment.currency': cfg.currency, 'payment.paidAt': txn.paid_at ? new Date(txn.paid_at) : new Date() } },
      { new: true }
    );
    if (!claimed) return { request: await VerificationRequest.findOne({ _id: requestId }), duplicate: true };
    return { request: claimed, duplicate: false };
  } catch (err) {
    if (err && err.code === 11000) return { request, duplicate: true }; // this reference is already recorded
    throw err;
  }
}

module.exports = { setBusinessVerification, cleanSubmittedInfo, validateVerificationPayment, applyVerificationPayment, REFERENCE_RE };
