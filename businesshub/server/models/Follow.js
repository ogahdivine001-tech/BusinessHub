const mongoose = require('mongoose');

// One row per (account, business) follow. The unique index is what makes a
// duplicate follow impossible, however many times the request is repeated.
const followSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followSchema.index({ business: 1, user: 1 }, { unique: true });
followSchema.index({ user: 1, createdAt: -1 }); // "businesses I follow"

module.exports = mongoose.model('Follow', followSchema);
