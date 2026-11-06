const mongoose = require('mongoose');

// A customer's rating and written feedback for a business. One per account per
// business (enforced by the unique index, not just by the UI). There is
// deliberately NO "verified purchase" field: the platform cannot yet prove a
// reviewer bought anything, so it must not claim so.
const reviewSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5.' },
    },
    comment: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    // Moderation trail: who hid it, when, and why.
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
    moderationReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

reviewSchema.index({ business: 1, user: 1 }, { unique: true }); // no duplicate reviews
reviewSchema.index({ business: 1, status: 1, createdAt: -1 }); // a storefront's review list
reviewSchema.index({ user: 1, createdAt: -1 }); // "my reviews"

module.exports = mongoose.model('Review', reviewSchema);
