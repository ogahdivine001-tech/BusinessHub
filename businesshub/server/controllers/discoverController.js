const asyncHandler = require('express-async-handler');
const Business = require('../models/Business');
const Product = require('../models/Product');
const escapeRegex = require('../utils/escapeRegex');
const { getRankingConfig } = require('../config/ranking');
const { getGlobalMean } = require('../services/ratingService');
const { CARD_PROJECTION, parseSearchParams, buildSearchPipeline, rankScoreExpr } = require('../services/discovery');

// @desc  Search/browse published businesses (real database results)
// @route GET /api/discover/businesses?q=&category=&city=&state=&delivery=available&verified=true&minRating=&sort=&page=&limit=
const searchBusinesses = asyncHandler(async (req, res) => {
  const params = parseSearchParams(req.query);
  const { priorWeight, minReviews } = getRankingConfig();

  // Businesses that sell a matching product also count as a match.
  let productBusinessIds = [];
  if (params.q) {
    productBusinessIds = (await Product.distinct('business', {
      isAvailable: true,
      name: new RegExp(escapeRegex(params.q), 'i'),
    })).slice(0, 500);
  }

  const globalMean = await getGlobalMean();
  const [out] = await Business.aggregate(buildSearchPipeline({ ...params, productBusinessIds, globalMean, priorWeight, minReviews }));
  const total = out.total[0] ? out.total[0].n : 0;
  res.json({
    success: true,
    data: { businesses: out.results, total, page: params.page, pages: Math.ceil(total / params.limit) },
  });
});

// @desc  Homepage sections. Empty sections come back empty, never padded with samples.
// @route GET /api/discover/home
const getHome = asyncHandler(async (req, res) => {
  const { minReviews, priorWeight } = getRankingConfig();
  const globalMean = await getGlobalMean();
  const LIMIT = 8;

  const [topRated, popular, newest] = await Promise.all([
    // Real reviews only, fairly weighted, and only above the minimum-review bar.
    Business.aggregate([
      { $match: { isPublished: true, ratingCount: { $gte: minReviews } } },
      { $addFields: { rankScore: rankScoreExpr(globalMean, priorWeight) } },
      { $sort: { rankScore: -1, ratingCount: -1, _id: -1 } },
      { $limit: LIMIT },
      { $project: CARD_PROJECTION },
    ]),
    // "Popular" = most followed. It is NOT "top selling": sales are recorded by
    // the sellers themselves, so they cannot yet be trusted for a public ranking.
    Business.aggregate([
      { $match: { isPublished: true, followerCount: { $gte: 1 } } },
      { $sort: { followerCount: -1, ratingCount: -1, _id: -1 } },
      { $limit: LIMIT },
      { $project: CARD_PROJECTION },
    ]),
    // Newest, but only pages that have at least a description, so empty shells don't headline.
    Business.aggregate([
      { $match: { isPublished: true, description: { $exists: true, $nin: ['', null] } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: LIMIT },
      { $project: CARD_PROJECTION },
    ]),
  ]);

  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: { topRated, popular, newest, minReviews } });
});

module.exports = { searchBusinesses, getHome };
