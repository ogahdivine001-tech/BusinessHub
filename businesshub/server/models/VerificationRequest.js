const mongoose = require('mongoose');

// A business's request to earn the verification badge. Payment alone never
// verifies a business: an admin reviews the request and decides.
const verificationRequestSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'revoked'], default: 'pending' },
    // What the business told us. Which fields are REQUIRED is a policy decision
    // still to be confirmed, so all are optional here.
    submittedInfo: {
      legalName: { type: String, trim: true, maxlength: 200 },
      registrationNumber: { type: String, trim: true, maxlength: 100 },
      website: { type: String, trim: true, maxlength: 300 },
      notes: { type: String, trim: true, maxlength: 1000 },
    },
    // Fee state, recorded from the payment provider's own confirmation, never
    // from the browser. Amount/currency come from config/verification.js.
    payment: {
      status: { type: String, enum: ['not_required', 'pending', 'paid', 'failed'], default: 'not_required' },
      reference: { type: String, trim: true },
      amountMinor: Number,
      currency: String,
      paidAt: Date,
    },
    decision: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: Date,
      reason: { type: String, maxlength: 500 }, // required in code for rejections/revocations
    },
  },
  { timestamps: true }
);

// At most ONE open request per business: repeated clicks or retries cannot
// create duplicate pending requests.
verificationRequestSchema.index(
  { business: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
// A payment reference can belong to only one request (prevents double use).
verificationRequestSchema.index(
  { 'payment.reference': 1 },
  { unique: true, partialFilterExpression: { 'payment.reference': { $type: 'string' } } }
);

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
