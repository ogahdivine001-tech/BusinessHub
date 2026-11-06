const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Business = require('../models/Business');
const ApiError = require('../utils/apiError');
const { recomputeBusinessRating } = require('../services/ratingService');

// Reviews need a confirmed email by default: it is the cheapest brake on fake
// or throw-away accounts. Set REVIEWS_REQUIRE_VERIFIED_EMAIL=false to relax it.
const requireVerified = () => String(process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL || 'true').toLowerCase() !== 'false';

function cleanRating(v) {
  // Only a real number, or a string that is exactly one of 1-5. JavaScript's
  // Number() would also accept [5], true, '0x5' and '5e0', so it is not used here.
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*[1-5]\s*$/.test(v) ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new ApiError(400, 'Choose a rating from 1 to 5 stars.');
  return n;
}
function cleanComment(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string') throw new ApiError(400, 'Your review must be text.');
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 1000) throw new ApiError(400, 'Reviews can be at most 1000 characters.');
  return t;
}
function assertId(id, msg = 'This business could not be found.') {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, msg);
}
// Shown publicly instead of the full name: "Ada L."
function displayName(user) {
  const parts = String((user && user.fullName) || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A customer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
const publicShape = (r) => ({
  _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt,
  edited: Boolean(r.updatedAt && r.createdAt && new Date(r.updatedAt) - new Date(r.createdAt) > 60 * 1000),
  authorName: displayName(r.user),
});

// @route GET /api/reviews/business/:businessId?page=   (public: published reviews only)
const listForBusiness = asyncHandler(async (req, res) => {
  assertId(req.params.businessId);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const match = { business: new mongoose.Types.ObjectId(req.params.businessId), status: 'published' };
  const [reviews, total, dist] = await Promise.all([
    Review.find(match).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('user', 'fullName'),
    Review.countDocuments(match),
    Review.aggregate([{ $match: match }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.forEach((d) => { distribution[d._id] = d.n; });
  res.json({ success: true, data: { reviews: reviews.map(publicShape), total, page, pages: Math.ceil(total / limit), distribution } });
});

// @route GET /api/reviews/business/:businessId/mine   (the logged-in person's own review, if any)
const getMine = asyncHandler(async (req, res) => {
  assertId(req.params.businessId);
  const review = await Review.findOne({ business: req.params.businessId, user: req.user._id });
  res.json({ success: true, data: { review: review ? { _id: review._id, rating: review.rating, comment: review.comment, status: review.status } : null } });
});

// @route GET /api/reviews/mine?page=   (everything the logged-in person has written)
const listMine = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const [reviews, total] = await Promise.all([
    Review.find({ user: req.user._id }).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('business', 'name slug'),
    Review.countDocuments({ user: req.user._id }),
  ]);
  res.json({
    success: true,
    data: {
      reviews: reviews.map((r) => ({
        _id: r._id, rating: r.rating, comment: r.comment, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
        business: r.business ? { _id: r.business._id, name: r.business.name, slug: r.business.slug } : null,
      })),
      total, page, pages: Math.ceil(total / limit),
    },
  });
});

// @route POST /api/reviews/business/:businessId
const create = asyncHandler(async (req, res) => {
  assertId(req.params.businessId);
  const business = await Business.findOne({ _id: req.params.businessId, isPublished: true }).select('owner');
  if (!business) throw new ApiError(404, 'This business could not be found.');
  if (String(business.owner) === String(req.user._id)) throw new ApiError(403, "You can't review your own business.");
  if (requireVerified() && !req.user.emailVerifiedAt) {
    throw new ApiError(403, 'Please confirm your email address before leaving a review. You can do this in Settings → Profile.');
  }
  // Only these two fields are read from the request; rating totals are never client-supplied.
  const rating = cleanRating(req.body.rating);
  const comment = cleanComment(req.body.comment);
  try {
    await Review.create({ business: business._id, user: req.user._id, rating, comment: comment || undefined });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You have already reviewed this business. You can edit your review instead.');
    throw err;
  }
  const summary = await recomputeBusinessRating(business._id);
  res.status(201).json({ success: true, data: summary });
});

// @route PUT /api/reviews/:id   (author only)
const update = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'Review not found.');
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError(404, 'Review not found.');
  if (req.body.rating !== undefined) review.rating = cleanRating(req.body.rating);
  if (req.body.comment !== undefined) review.comment = cleanComment(req.body.comment) || undefined;
  await review.save(); // a hidden review stays hidden: only an admin can restore it
  const summary = await recomputeBusinessRating(review.business);
  res.json({ success: true, data: summary });
});

// @route DELETE /api/reviews/:id   (author only)
const remove = asyncHandler(async (req, res) => {
  assertId(req.params.id, 'Review not found.');
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError(404, 'Review not found.');
  const summary = await recomputeBusinessRating(review.business);
  res.json({ success: true, data: summary });
});

module.exports = { listMine, listForBusiness, getMine, create, update, remove, displayName };
