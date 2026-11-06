const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const Business = require('../models/Business');
const ApiError = require('../utils/apiError');
const { CARD_FIELDS } = require('../services/discovery');

async function findFollowable(businessId) {
  if (!mongoose.isValidObjectId(businessId)) throw new ApiError(404, 'This business could not be found.');
  const business = await Business.findOne({ _id: businessId, isPublished: true }).select('owner');
  if (!business) throw new ApiError(404, 'This business could not be found.');
  return business;
}

// The follower count is always RECOUNTED from the follow records, never
// incremented, so it cannot drift if a request is repeated or half-fails.
async function syncFollowerCount(businessId) {
  const n = await Follow.countDocuments({ business: businessId });
  await Business.updateOne({ _id: businessId }, { $set: { followerCount: n } });
  return n;
}

// @route POST /api/follows/:businessId   (idempotent: following twice is fine)
const follow = asyncHandler(async (req, res) => {
  const business = await findFollowable(req.params.businessId);
  if (String(business.owner) === String(req.user._id)) throw new ApiError(400, "You can't follow your own business.");
  try {
    await Follow.create({ business: business._id, user: req.user._id });
  } catch (err) {
    if (err.code !== 11000) throw err; // already following: the unique index caught the duplicate
  }
  res.json({ success: true, data: { following: true, followerCount: await syncFollowerCount(business._id) } });
});

// @route DELETE /api/follows/:businessId
const unfollow = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.businessId)) throw new ApiError(404, 'This business could not be found.');
  await Follow.deleteOne({ business: req.params.businessId, user: req.user._id });
  res.json({ success: true, data: { following: false, followerCount: await syncFollowerCount(req.params.businessId) } });
});

// @route GET /api/follows/:businessId/status
const status = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.businessId)) throw new ApiError(404, 'This business could not be found.');
  const row = await Follow.exists({ business: req.params.businessId, user: req.user._id });
  res.json({ success: true, data: { following: Boolean(row) } });
});

// @route GET /api/follows/mine?page=
const mine = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 12;
  const [rows, total] = await Promise.all([
    Follow.find({ user: req.user._id }).sort('-createdAt').skip((page - 1) * limit).limit(limit)
      .populate({ path: 'business', select: CARD_FIELDS, match: { isPublished: true } }),
    Follow.countDocuments({ user: req.user._id }),
  ]);
  res.json({
    success: true,
    data: { businesses: rows.map((r) => r.business).filter(Boolean), total, page, pages: Math.ceil(total / limit) },
  });
});

module.exports = { follow, unfollow, status, mine };
