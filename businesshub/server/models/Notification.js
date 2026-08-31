const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: String,
    type: { type: String, enum: ['order', 'invoice', 'inventory', 'system', 'ai'], default: 'system' },
    link: String, // e.g. '/dashboard/orders' — where clicking the notification should go
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
