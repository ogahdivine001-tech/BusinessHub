const asyncHandler = require('express-async-handler');
const Business = require('../models/Business');
const VerificationRequest = require('../models/VerificationRequest');
const ApiError = require('../utils/apiError');
const { getVerificationConfig } = require('../config/verification');
const { initializeTransaction, verifyTransaction, isConfigured } = require('../services/paystackService');
const { getClientOrigin } = require('../utils/clientOrigin');
const { setBusinessVerification, cleanSubmittedInfo, applyVerificationPayment, REFERENCE_RE } = require('../services/verificationService');

// Safe view of a request for its owner (no internal ids beyond its own).
const ownerView = (r) => r && ({
  _id: r._id, status: r.status, submittedInfo: r.submittedInfo, createdAt: r.createdAt,
  payment: r.payment ? { status: r.payment.status, paidAt: r.payment.paidAt } : undefined,
  decision: r.decision ? { at: r.decision.at, reason: r.decision.reason } : undefined,
});

// @route GET /api/verification/mine
const getMine = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId).select('verification');
  const request = await VerificationRequest.findOne({ business: req.businessId }).sort('-createdAt');
  const cfg = getVerificationConfig();
  const status = (business && business.verification && business.verification.status) || 'none';
  const hasOpen = request && request.status === 'pending';
  res.json({
    success: true,
    data: {
      status,
      verifiedAt: business && business.verification ? business.verification.verifiedAt : undefined,
      request: ownerView(request),
      canRequest: status !== 'verified' && !hasOpen,
      fee: { enabled: cfg.paymentEnabled, amountMinor: cfg.paymentEnabled ? cfg.amountMinor : null, currency: cfg.paymentEnabled ? cfg.currency : null },
      paystackConfigured: isConfigured(),
    },
  });
});

// @route POST /api/verification/request
// Asking is open to every business; being verified is not. The request goes
// to an administrator, who decides.
const requestVerification = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId).select('verification');
  if (!business) throw new ApiError(404, 'Business not found.');
  if (business.verification && business.verification.status === 'verified') {
    throw new ApiError(409, 'Your business is already verified.');
  }
  const info = cleanSubmittedInfo(req.body);
  const cfg = getVerificationConfig();

  let request;
  try {
    request = await VerificationRequest.create({
      business: req.businessId,
      requestedBy: req.user._id,
      submittedInfo: info,
      payment: { status: cfg.paymentEnabled ? 'pending' : 'not_required' },
    });
  } catch (err) {
    if (err && err.code === 11000) throw new ApiError(409, 'You already have a verification request under review.');
    throw err;
  }

  // 'pending' is the only state an owner's action can ever cause.
  const ok = await setBusinessVerification(req.businessId, 'pending', { onlyIf: { 'verification.status': { $ne: 'verified' } } });
  if (!ok) {
    await VerificationRequest.deleteOne({ _id: request._id });
    throw new ApiError(409, 'Your business is already verified.');
  }
  res.status(201).json({ success: true, data: { request: ownerView(request) } });
});

// @route POST /api/verification/pay   (only when the fee is switched on)
const startPayment = asyncHandler(async (req, res) => {
  const cfg = getVerificationConfig();
  if (!cfg.paymentEnabled) throw new ApiError(400, 'There is no verification fee to pay right now.');
  const request = await VerificationRequest.findOne({ business: req.businessId, status: 'pending' });
  if (!request) throw new ApiError(404, 'Submit a verification request first.');
  if (request.payment && request.payment.status === 'paid') throw new ApiError(409, 'The verification fee has already been paid.');

  const callbackUrl = `${getClientOrigin(req)}/dashboard/verification/callback`;
  const result = await initializeTransaction({
    email: req.user.email,
    amountKobo: cfg.amountMinor, // amount in the currency's smallest unit
    currency: cfg.currency,
    metadata: { type: 'verification', requestId: String(request._id), businessId: String(req.businessId) },
    callbackUrl,
  });
  res.json({ success: true, data: result.data });
});

// @route GET /api/verification/verify/:reference
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!REFERENCE_RE.test(reference)) throw new ApiError(400, 'Invalid payment reference.');
  const result = await verifyTransaction(reference);
  const { request, duplicate } = await applyVerificationPayment(result.data, { expectedBusinessId: req.businessId });
  res.json({ success: true, data: { request: ownerView(request), alreadyProcessed: duplicate } });
});

module.exports = { getMine, requestVerification, startPayment, verifyPayment };
