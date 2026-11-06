const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
    plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' }, // the plan actually paid for
    status: { type: String, enum: ['active', 'past_due', 'cancelled'], default: 'active' },
    // Which version of the plan terms this subscription was created under.
    // Deliberately NO default: see services/subscriptionService.js. Missing = 'legacy'.
    policyVersion: { type: String, enum: ['legacy', 'v2'] },
    currentPeriodEnd: Date,
    trialEndsAt: Date, // every new business gets full Pro features until this date
    paystackCustomerCode: String,
    paystackSubscriptionCode: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
