const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: String,
    type: { type: String, enum: ['order', 'invoice', 'inventory', 'system', 'ai'], default: 'system' },
    link: String, // e.g. '/dashboard/orders' — where clicking the notification should go
    key: String, // optional de-duplication key, e.g. one renewal reminder per billing period
    isRead: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false }, // pinned notifications stay at the top and are never bulk-cleared
  },
  { timestamps: true }
);

// Matches the main query: one person's notifications, pinned first, newest first.
notificationSchema.index({ user: 1, isPinned: -1, createdAt: -1 });

notificationSchema.index({ user: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });

module.exports = mongoose.model('Notification', notificationSchema);
