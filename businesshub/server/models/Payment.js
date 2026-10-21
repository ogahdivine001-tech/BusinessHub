const mongoose = require('mongoose');

// One row per confirmed Paystack payment. The unique `reference` is what makes
// payment handling safe to repeat: the same payment can arrive through the
// browser callback AND the Paystack webhook (or be replayed by someone), and
// it will only ever upgrade the plan once.
const paymentSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reference: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['starter', 'pro'], required: true },
    amountKobo: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    source: { type: String, enum: ['callback', 'webhook'], required: true },
    paidAt: Date,
    activatedAt: { type: Date, default: null }, // set once, atomically, when the plan is applied
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
