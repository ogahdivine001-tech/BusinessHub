const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: String,
    type: { type: String, enum: ['order', 'invoice', 'inventory', 'system', 'ai'], default: 'system' },
    link: String, // e.g. '/dashboard/orders' — where clicking the notification should go
    isRead: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false }, // pinned notifications stay at the top and are never bulk-cleared
  },
  { timestamps: true }
);

// Matches the main query: one person's notifications, pinned first, newest first.
notificationSchema.index({ user: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
