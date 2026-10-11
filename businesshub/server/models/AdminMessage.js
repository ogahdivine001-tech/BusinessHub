const mongoose = require('mongoose');

// One row per message an admin sends to customers (business owners). Kept as
// a history so the admin can see what was sent, to whom, and how delivery went.
const adminMessageSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 5000 },
    link: String, // optional in-app path, e.g. /dashboard/invoices
    audience: {
      type: String,
      enum: ['all', 'trial', 'free', 'paid', 'not_onboarded', 'user'],
      required: true,
    },
    audienceLabel: String, // the email address when audience is a single user
    channels: {
      email: { type: Boolean, default: false },
      notification: { type: Boolean, default: false },
    },
    recipientCount: { type: Number, default: 0 },
    emailSent: { type: Number, default: 0 },
    emailFailed: { type: Number, default: 0 },
    notificationsCreated: { type: Number, default: 0 },
    status: { type: String, enum: ['sending', 'done', 'failed'], default: 'sending' },
    finishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminMessage', adminMessageSchema);
