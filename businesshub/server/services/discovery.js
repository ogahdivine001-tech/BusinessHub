const Business = require('../models/Business');
const escapeRegex = require('../utils/escapeRegex');

// ---- What a visitor may see on a business card (an allow-list, never the raw record)
const CARD_PROJECTION = {
  name: 1, slug: 1, category: 1,
  description: { $substrCP: [{ $ifNull: ['$description', ''] }, 0, 160] },
  'logo.url': 1, 'coverImage.url': 1,
  'location.city': 1, 'location.state': 1,
  'delivery.status': 1, 'verification.status': 1,
  ratingAverage: 1, ratingCount: 1, followerCount: 1, createdAt: 1,
};
const CARD_FIELDS = 'name slug category description logo.url coverImage.url location.city location.state delivery.status verification.status ratingAverage ratingCount followerCount createdAt';

// ---- Everything on the public storefront page. Notably absent: owner, bankDetails.
const STOREFRONT_FIELDS = [
  'name', 'slug', 'category', 'description', 'logo', 'coverImage', 'phone', 'whatsapp', 'email',
  'address', 'location', 'socials', 'businessHours', 'theme', 'hideBranding', 'delivery',
  'verification.status', 'verification.verifiedAt', 'ratingAverage', 'ratingCount', 'followerCount', 'createdAt',
].join(' ');

const SORTS = ['relevance', 'rating', 'followers', 'newest', 'name'];
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const intIn = (v, min, max, d) => {
  const n = Number.parseInt(typeof v === 'string' ? v : '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

// Turns the raw query string into a clean, bounded set of search options.
// Anything unexpected (arrays, objects like ?q[$ne]=x, junk values) is
// ignored rather than trusted, so odd input can never reach the database.
function parseSearchParams(query = {}) {
  const categories = Business.schema.path('category').enumValues;
  const q = str(query.q, 80);
  const category = categories.includes(query.category) ? query.category : undefined;
  const minRating = intIn(query.minRating, 1, 5, undefined);
  const sort = SORTS.includes(query.sort) ? query.sort : q ? 'relevance' : 'newest';
  return {
    q,
    category,
    city: str(query.city, 60),
    state: str(query.state, 60),
    delivery: query.delivery === 'available' ? 'available' : undefined,
    verified: query.verified === 'true' ? true : undefined,
    minRating,
    sort,
    page: intIn(query.page, 1, 1000, 1),
    limit: intIn(query.limit, 1, 24, 12),
  };
}

// Bayesian score as an aggregation expression: (v*R + m*C) / (v + m).
const bayesExpr = (globalMean, priorWeight) => ({
  $divide: [
    { $add: [{ $multiply: ['$ratingCount', '$ratingAverage'] }, priorWeight * globalMean] },
    { $add: ['$ratingCount', priorWeight] },
  ],
});
// Which group a business falls in when sorting by rating:
//   2 = has at least `minReviews` reviews (an established track record)
//   1 = has some reviews, but fewer than that
//   0 = no reviews yet
// Higher groups always rank above lower ones. Inside a group, the Bayesian
// score decides. So one lucky 5-star review can never beat an established
// business, however the numbers fall.
const rankTierExpr = (minReviews) => ({
  $switch: {
    branches: [
      { case: { $gte: ['$ratingCount', minReviews] }, then: 2 },
      { case: { $gt: ['$ratingCount', 0] }, then: 1 },
    ],
    default: 0,
  },
});
// Unreviewed businesses get -1 so they always sort below any reviewed one.
const rankScoreExpr = (globalMean, priorWeight) => ({
  $cond: [{ $gt: ['$ratingCount', 0] }, bayesExpr(globalMean, priorWeight), -1],
});

function buildSearchPipeline(opts) {
  const { q, category, city, state, delivery, verified, minRating, sort, page, limit, productBusinessIds = [], globalMean, priorWeight, minReviews = 3 } = opts;
  const match = { isPublished: true };
  if (category) match.category = category;
  if (city) match['location.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (state) match['location.state'] = new RegExp(`^${escapeRegex(state)}$`, 'i');
  if (delivery) match['delivery.status'] = 'available';
  if (verified) match['verification.status'] = 'verified';
  if (minRating) { match.ratingCount = { $gt: 0 }; match.ratingAverage = { $gte: minRating }; }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i'); // escaped: user text is never a pattern
    match.$or = [
      { name: rx }, { category: rx }, { description: rx }, { 'location.city': rx }, { 'location.state': rx },
      ...(productBusinessIds.length ? [{ _id: { $in: productBusinessIds } }] : []), // sells a matching product
    ];
  }

  const addFields = { rankScore: rankScoreExpr(globalMean, priorWeight), rankTier: rankTierExpr(minReviews) };
  if (q) addFields.nameMatch = { $cond: [{ $regexMatch: { input: '$name', regex: escapeRegex(q), options: 'i' } }, 1, 0] };

  const sortSpec = {
    relevance: { nameMatch: -1, rankTier: -1, rankScore: -1, followerCount: -1, _id: -1 },
    rating: { rankTier: -1, rankScore: -1, ratingCount: -1, followerCount: -1, _id: -1 },
    followers: { followerCount: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    name: { name: 1, _id: 1 },
  }[sort === 'relevance' && !q ? 'newest' : sort];

  return [
    { $match: match },
    { $addFields: addFields },
    { $sort: sortSpec },
    {
      $facet: {
        results: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: CARD_PROJECTION }],
        total: [{ $count: 'n' }],
      },
    },
  ];
}

module.exports = { rankTierExpr, CARD_PROJECTION, CARD_FIELDS, STOREFRONT_FIELDS, parseSearchParams, buildSearchPipeline, rankScoreExpr };
