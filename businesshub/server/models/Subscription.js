const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
    plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' }, // the plan actually paid for
    status: { type: String, enum: ['active', 'past_due', 'cancelled'], default: 'active' },
    currentPeriodEnd: Date,
    trialEndsAt: Date, // every new business gets full Pro features until this date
    paystackCustomerCode: String,
    paystackSubscriptionCode: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
