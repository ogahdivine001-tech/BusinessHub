const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Aggregator } = require('mingo');
try { require('mingo/init/system'); } catch (e) { /* older mingo loads operators by default */ }
const { inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-step3';
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

const { parseSearchParams, buildSearchPipeline, STOREFRONT_FIELDS } = require('../services/discovery');
const { bayesianScore } = require('../services/ratingService');
const { getRankingConfig } = require('../config/ranking');

// ---------------------------------------------------------------- sample data
// Fields beyond the public card (owner, bank details, contact) are included on purpose,
// to prove the card projection never leaks them.
const biz = (o) => ({
  isPublished: true, category: 'Food', description: 'We sell things', ratingAverage: 0, ratingCount: 0, followerCount: 0,
  delivery: { status: 'unspecified' }, verification: { status: 'none' }, location: { city: 'Lagos', state: 'Lagos' },
  createdAt: new Date('2026-01-01'), owner: 'secret-owner', bankDetails: { accountNumber: '0123456789' },
  email: 'private@x.com', phone: '0800', logo: { url: 'l.png', publicId: 'pid' }, ...o,
});
const DATA = [
  biz({ _id: 1, name: 'Lucky One-Review Shop', ratingAverage: 5.0, ratingCount: 1 }),
  biz({ _id: 2, name: 'Established Kitchen', ratingAverage: 4.8, ratingCount: 100, followerCount: 40, delivery: { status: 'available' }, verification: { status: 'verified' } }),
  biz({ _id: 3, name: 'Mid Bakery', category: 'Food', ratingAverage: 4.6, ratingCount: 30, followerCount: 5, location: { city: 'Abuja', state: 'FCT' } }),
  biz({ _id: 4, name: 'Brand New Tailor', category: 'Fashion', createdAt: new Date('2026-06-01') }),
  biz({ _id: 5, name: 'Hidden Gem', isPublished: false, ratingAverage: 5, ratingCount: 500, followerCount: 999 }),
  biz({ _id: 6, name: 'Dot.Star Café', category: 'Services', createdAt: new Date('2026-03-01') }),
  biz({ _id: 7, name: 'Phone Hub', category: 'Electronics', followerCount: 12, createdAt: new Date('2026-02-01') }),
];
const globalMean = (() => { const pub = DATA.filter((d) => d.isPublished && d.ratingCount); return pub.reduce((s, d) => s + d.ratingAverage * d.ratingCount, 0) / pub.reduce((s, d) => s + d.ratingCount, 0); })();
const run = (query, extra = {}) => {
  const params = parseSearchParams(query);
  const [out] = new Aggregator(buildSearchPipeline({ ...params, globalMean, priorWeight: 5, minReviews: 3, ...extra })).run(DATA);
  return { names: out.results.map((r) => r.name), results: out.results, total: out.total[0] ? out.total[0].n : 0, params };
};

// ---------------------------------------------------------------- input handling
test('search input is bounded, and odd input is ignored instead of trusted', () => {
  const p = parseSearchParams({ q: { $ne: 'x' }, category: ['Food', 'Fashion'], sort: 'DROP TABLE', page: '-5', limit: '99999', minRating: '99', delivery: 'yes', verified: '1' });
  assert.equal(p.q, undefined, 'object-valued q ignored');
  assert.equal(p.category, undefined, 'array category ignored');
  assert.equal(p.sort, 'newest', 'unknown sort falls back');
  assert.equal(p.page, 1); assert.equal(p.limit, 24); assert.equal(p.minRating, 5);
  assert.equal(p.delivery, undefined); assert.equal(p.verified, undefined);
  assert.equal(parseSearchParams({ q: 'x'.repeat(500) }).q.length, 80);
  assert.equal(parseSearchParams({ q: '   ' }).q, undefined, 'blank query = browse everything');
  assert.equal(parseSearchParams({ q: 'cake' }).sort, 'relevance');
  assert.equal(parseSearchParams({ category: 'Fashion' }).category, 'Fashion');
  assert.equal(parseSearchParams(undefined).page, 1);
});

// ---------------------------------------------------------------- ranking fairness
test('one 5-star review does not outrank an established business', () => {
  const { names } = run({ sort: 'rating' });
  assert.ok(names.indexOf('Established Kitchen') < names.indexOf('Lucky One-Review Shop'), names.join(' > '));
  assert.ok(names.indexOf('Mid Bakery') < names.indexOf('Lucky One-Review Shop'), 'even a 30-review 4.6 beats one lucky 5.0');
  assert.equal(names[0], 'Established Kitchen');
  // Same rule under search relevance: a name match comes first, then established before lucky.
  const rel = run({ q: 'a' }).names;
  assert.ok(rel.indexOf('Mid Bakery') < rel.indexOf('Lucky One-Review Shop') || !rel.includes('Mid Bakery'));
});

test('unreviewed businesses sort below reviewed ones, never with an invented rating', () => {
  const { names, results } = run({ sort: 'rating' });
  const reviewed = ['Established Kitchen', 'Mid Bakery', 'Lucky One-Review Shop'];
  assert.deepEqual(names.slice(0, 3), reviewed, 'established first, then thinly-reviewed, then unreviewed');
  const tailor = results.find((r) => r.name === 'Brand New Tailor');
  assert.equal(tailor.ratingCount, 0);
  assert.equal(tailor.ratingAverage, 0, 'the real number (0 reviews), shown by the UI as "No reviews yet"');
});

test('with more reviews the same average climbs, with fewer it is held back', () => {
  const few = bayesianScore(4.8, 2, 4.0, 5), many = bayesianScore(4.8, 200, 4.0, 5);
  assert.ok(many > few && many < 4.8 && few > 4.0);
  assert.equal(bayesianScore(5, 0, 4, 5), null, 'no reviews, no score');
});

test('the JavaScript score and the database expression agree', () => {
  // All businesses here share one tier (3+ reviews), so only the score decides the order.
  const set = [
    biz({ _id: 21, name: 'A', ratingAverage: 4.8, ratingCount: 100 }),
    biz({ _id: 22, name: 'B', ratingAverage: 4.6, ratingCount: 30 }),
    biz({ _id: 23, name: 'C', ratingAverage: 4.95, ratingCount: 4 }),
    biz({ _id: 24, name: 'D', ratingAverage: 3.9, ratingCount: 400 }),
  ];
  const mean = set.reduce((s, d) => s + d.ratingAverage * d.ratingCount, 0) / set.reduce((s, d) => s + d.ratingCount, 0);
  const [out] = new Aggregator(buildSearchPipeline({ ...parseSearchParams({ sort: 'rating' }), globalMean: mean, priorWeight: 5, minReviews: 3, limit: 24 })).run(set);
  const expected = set.map((d) => [d.name, bayesianScore(d.ratingAverage, d.ratingCount, mean, 5)]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  assert.deepEqual(out.results.map((r) => r.name), expected);
});

test('ranking settings have safe defaults and sane overrides', () => {
  assert.deepEqual(getRankingConfig({}), { minReviews: 3, priorWeight: 5 });
  assert.deepEqual(getRankingConfig({ RANKING_MIN_REVIEWS: '10', RANKING_PRIOR_WEIGHT: '20' }), { minReviews: 10, priorWeight: 20 });
  assert.deepEqual(getRankingConfig({ RANKING_MIN_REVIEWS: '0', RANKING_PRIOR_WEIGHT: 'abc' }), { minReviews: 3, priorWeight: 5 });
});

// ---------------------------------------------------------------- search & filters
test('unpublished businesses never appear, in any query', () => {
  for (const q of [{}, { sort: 'rating' }, { sort: 'followers' }, { q: 'gem' }, { q: 'Hidden Gem' }]) {
    assert.ok(!run(q).names.includes('Hidden Gem'), JSON.stringify(q));
  }
  assert.equal(run({}).total, 6);
});

test('search matches name, category, city and (separately supplied) product matches', () => {
  assert.deepEqual(run({ q: 'bakery' }).names, ['Mid Bakery']);
  assert.ok(run({ q: 'fashion' }).names.includes('Brand New Tailor'));
  assert.deepEqual(run({ q: 'abuja' }).names, ['Mid Bakery']);
  assert.ok(run({ q: 'BAKERY' }).names.includes('Mid Bakery'), 'case-insensitive');
  assert.deepEqual(run({ q: 'zzz-nothing' }).names, [], 'no match = empty, not an error');
  const viaProduct = run({ q: 'sourdough' }, { productBusinessIds: [3] });
  assert.deepEqual(viaProduct.names, ['Mid Bakery'], 'a business that sells a matching product is found');
});

test('what the visitor types is matched literally, never as a pattern', () => {
  assert.deepEqual(run({ q: '.*' }).names, [], '".*" must not match everything');
  assert.deepEqual(run({ q: 'Dot.Star' }).names, ['Dot.Star Café']);
  assert.deepEqual(run({ q: '(' }).names, [], 'unbalanced bracket is harmless');
  assert.deepEqual(run({ q: '[a-z]+' }).names, []);
  assert.deepEqual(run({ q: 'a|b' }).names, []);
});

test('filters: category, city, delivery, verified, minimum rating', () => {
  assert.deepEqual(run({ category: 'Fashion' }).names, ['Brand New Tailor']);
  assert.deepEqual(run({ city: 'abuja' }).names, ['Mid Bakery']);
  assert.deepEqual(run({ delivery: 'available' }).names, ['Established Kitchen'], 'only businesses that said yes, never "unspecified"');
  assert.deepEqual(run({ verified: 'true' }).names, ['Established Kitchen']);
  assert.deepEqual(run({ minRating: '4' }, {}).names.sort(), ['Established Kitchen', 'Lucky One-Review Shop', 'Mid Bakery']);
  assert.ok(!run({ minRating: '1' }).names.includes('Brand New Tailor'), 'unreviewed businesses never pass a rating filter');
  assert.deepEqual(run({ category: 'Food', verified: 'true', delivery: 'available' }).names, ['Established Kitchen'], 'filters combine');
});

test('sorting by followers, newest and name', () => {
  assert.equal(run({ sort: 'followers' }).names[0], 'Established Kitchen');
  assert.equal(run({ sort: 'newest' }).names[0], 'Brand New Tailor');
  const byName = run({ sort: 'name' }).names; assert.deepEqual(byName, [...byName].sort());
});

test('pagination returns the right slice and the true total', () => {
  const p1 = run({ sort: 'name', limit: '2', page: '1' }), p2 = run({ sort: 'name', limit: '2', page: '2' }), p9 = run({ sort: 'name', limit: '2', page: '9' });
  assert.equal(p1.total, 6); assert.equal(p1.names.length, 2);
  assert.ok(p1.names.every((n) => !p2.names.includes(n)), 'pages do not overlap');
  assert.deepEqual(p9.names, [], 'past the end is empty, not an error');
  assert.equal(p9.total, 6);
});

test('a business card exposes only public fields', () => {
  const [card] = run({ sort: 'rating' }).results;
  for (const leak of ['owner', 'bankDetails', 'email', 'phone', 'isPublished', 'rankScore']) assert.equal(card[leak], undefined, `${leak} must not be on a card`);
  assert.equal(card.logo.publicId, undefined);
  assert.ok(card.name && card.slug !== null);
  assert.ok(!/\bowner\b|bankDetails/.test(STOREFRONT_FIELDS), 'the storefront allow-list excludes owner and bank details');
});

// ---------------------------------------------------------------- follows
function followHarness({ ownerOf = 'owner1', published = true, existing = [] } = {}) {
  const rows = existing.map((e) => ({ ...e }));
  const bizRow = { _id: 'b1', owner: ownerOf, followerCount: 99 /* deliberately wrong */ };
  inject('models/Follow.js', {
    create: async (d) => { if (rows.some((r) => r.business === d.business && r.user === d.user)) { const e = new Error('dup'); e.code = 11000; throw e; } rows.push({ ...d }); },
    deleteOne: async (q) => { const i = rows.findIndex((r) => r.business === q.business && r.user === q.user); if (i > -1) rows.splice(i, 1); },
    countDocuments: async (q) => rows.filter((r) => r.business === q.business || String(r.business) === String(q.business)).length,
    exists: async (q) => rows.find((r) => r.business === q.business && r.user === q.user) || null,
  });
  inject('models/Business.js', {
    findOne: (q) => ({ select: async () => (published && q._id === 'b1' ? bizRow : null) }),
    updateOne: async (_q, upd) => Object.assign(bizRow, upd.$set),
  });
  const id = (n) => n; // ids here are plain strings; real ObjectIds are validated by isValidObjectId
  delete require.cache[require.resolve('../controllers/followController')];
  const mongoose = require('mongoose'); const orig = mongoose.isValidObjectId; mongoose.isValidObjectId = () => true;
  const ctrl = require('../controllers/followController');
  return { ctrl, rows, bizRow, restore: () => { mongoose.isValidObjectId = orig; } };
}

test('following is idempotent and the follower count is recounted, not incremented', async () => {
  const h = followHarness();
  try {
    const req = { params: { businessId: 'b1' }, user: { _id: 'u1' } };
    let out = await callHandler(h.ctrl.follow, req);
    assert.equal(out.body.data.followerCount, 1, 'a wrong cached 99 is corrected from the real records');
    out = await callHandler(h.ctrl.follow, req); // double click / retry
    assert.equal(out.error, undefined);
    assert.equal(h.rows.length, 1, 'no duplicate follow');
    assert.equal(h.bizRow.followerCount, 1);
    await callHandler(h.ctrl.follow, { params: { businessId: 'b1' }, user: { _id: 'u2' } });
    assert.equal(h.bizRow.followerCount, 2);
    out = await callHandler(h.ctrl.unfollow, req);
    assert.equal(out.body.data.followerCount, 1);
    out = await callHandler(h.ctrl.unfollow, req); // unfollow twice is harmless
    assert.equal(out.error, undefined);
    assert.equal(h.bizRow.followerCount, 1);
  } finally { h.restore(); }
});

test('you cannot follow your own business, an unpublished one, or one that does not exist', async () => {
  const own = followHarness({ ownerOf: 'u1' });
  try {
    const out = await callHandler(own.ctrl.follow, { params: { businessId: 'b1' }, user: { _id: 'u1' } });
    assert.equal(out.error.statusCode, 400); assert.equal(own.rows.length, 0);
  } finally { own.restore(); }
  const hidden = followHarness({ published: false });
  try {
    assert.equal((await callHandler(hidden.ctrl.follow, { params: { businessId: 'b1' }, user: { _id: 'u1' } })).error.statusCode, 404);
    assert.equal((await callHandler(hidden.ctrl.follow, { params: { businessId: 'nope' }, user: { _id: 'u1' } })).error.statusCode, 404);
  } finally { hidden.restore(); }
});

// ---------------------------------------------------------------- reviews
function reviewHarness({ owner = 'owner1', published = true } = {}) {
  const rows = []; const recomputed = [];
  inject('models/Review.js', {
    create: async (d) => { if (rows.some((r) => r.business === d.business && r.user === d.user)) { const e = new Error('dup'); e.code = 11000; throw e; } const row = { _id: `r${rows.length + 1}`, status: 'published', ...d }; rows.push(row); return row; },
    findOne: async (q) => { const r = rows.find((x) => x._id === q._id && x.user === q.user); return r ? Object.assign(r, { save: async () => r }) : null; },
    findOneAndDelete: async (q) => { const i = rows.findIndex((x) => x._id === q._id && x.user === q.user); return i > -1 ? rows.splice(i, 1)[0] : null; },
  });
  inject('models/Business.js', { findOne: () => ({ select: async () => (published ? { _id: 'b1', owner } : null) }) });
  inject('services/ratingService.js', { recomputeBusinessRating: async (id) => { recomputed.push(id); return { ratingAverage: 4, ratingCount: rows.length }; } });
  delete require.cache[require.resolve('../controllers/reviewController')];
  const mongoose = require('mongoose'); const orig = mongoose.isValidObjectId; mongoose.isValidObjectId = () => true;
  return { ctrl: require('../controllers/reviewController'), rows, recomputed, restore: () => { mongoose.isValidObjectId = orig; } };
}
const person = (extra = {}) => ({ _id: 'u1', fullName: 'Ada Lovelace', emailVerifiedAt: new Date(), ...extra });
const post = (body, user = person()) => ({ params: { businessId: 'b1' }, body, user });

test('a review needs a confirmed email, a valid rating, and cannot be for your own business', async () => {
  delete process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL;
  const h = reviewHarness();
  try {
    let out = await callHandler(h.ctrl.create, post({ rating: 5 }, person({ emailVerifiedAt: undefined })));
    assert.equal(out.error.statusCode, 403); assert.match(out.error.message, /confirm your email/i);
    process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL = 'false';
    out = await callHandler(h.ctrl.create, post({ rating: 4 }, person({ emailVerifiedAt: undefined })));
    assert.equal(out.status, 201, 'the rule can be relaxed by configuration');
    delete process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL;
    for (const bad of [0, 6, 3.5, -1, 'abc', null, undefined, {}, [5], true, '0x5', '5e0', '5.0', '', ' ', '55']) {
      out = await callHandler(h.ctrl.create, post({ rating: bad }, person({ _id: `x${String(bad)}` })));
      assert.equal(out.error.statusCode, 400, `rating ${JSON.stringify(bad)}`);
    }
    out = await callHandler(h.ctrl.create, post({ rating: ' 3 ' }, person({ _id: 'uspace' })));
    assert.equal(out.status, 201, 'a plain "3" typed into a form is fine');
    out = await callHandler(h.ctrl.create, post({ rating: 5 }, person({ _id: 'owner1' })));
    assert.equal(out.error.statusCode, 403, 'owners cannot review themselves');
  } finally { delete process.env.REVIEWS_REQUIRE_VERIFIED_EMAIL; h.restore(); }
});

test('reviews: one per person, clean text only, ratings recalculated from records', async () => {
  const h = reviewHarness();
  try {
    let out = await callHandler(h.ctrl.create, post({ rating: '5', comment: '  Great\u0000 shop\u0007!  ', total: 9999, ratingAverage: 5, business: 'other', status: 'hidden' }));
    assert.equal(out.status, 201);
    const row = h.rows[0];
    assert.equal(row.comment, 'Great shop!', 'control characters stripped, whitespace trimmed');
    assert.equal(row.rating, 5);
    assert.equal(row.business, 'b1', 'business comes from the URL, not the body');
    assert.equal(row.status, 'published', 'a reviewer cannot set their own moderation status');
    assert.deepEqual(Object.keys(row).filter((k) => ['total', 'ratingAverage'].includes(k)), []);
    assert.equal(h.recomputed.length, 1);

    out = await callHandler(h.ctrl.create, post({ rating: 1 }));
    assert.equal(out.error.statusCode, 409, 'a second review is refused');
    assert.equal(h.rows.length, 1);

    out = await callHandler(h.ctrl.create, post({ rating: 5, comment: 'x'.repeat(1001) }, person({ _id: 'u9' })));
    assert.equal(out.error.statusCode, 400);
    out = await callHandler(h.ctrl.create, post({ rating: 5, comment: { $gt: '' } }, person({ _id: 'u8' })));
    assert.equal(out.error.statusCode, 400);
  } finally { h.restore(); }
});

test('only the author can edit or delete a review, and editing never un-hides it', async () => {
  const h = reviewHarness();
  try {
    await callHandler(h.ctrl.create, post({ rating: 5, comment: 'ok' }));
    const id = h.rows[0]._id;
    let out = await callHandler(h.ctrl.update, { params: { id }, body: { rating: 2 }, user: person({ _id: 'intruder' }) });
    assert.equal(out.error.statusCode, 404, "someone else's review looks like it does not exist");
    assert.equal(h.rows[0].rating, 5);

    h.rows[0].status = 'hidden';
    out = await callHandler(h.ctrl.update, { params: { id }, body: { rating: 3, status: 'published' }, user: person() });
    assert.equal(out.error, undefined);
    assert.equal(h.rows[0].rating, 3);
    assert.equal(h.rows[0].status, 'hidden', 'the author cannot restore a moderated review');

    out = await callHandler(h.ctrl.remove, { params: { id }, user: person({ _id: 'intruder' }) });
    assert.equal(out.error.statusCode, 404); assert.equal(h.rows.length, 1);
    out = await callHandler(h.ctrl.remove, { params: { id }, user: person() });
    assert.equal(out.error, undefined); assert.equal(h.rows.length, 0);
    assert.ok(h.recomputed.length >= 3, 'ratings recomputed after create, edit and delete');
  } finally { h.restore(); }
});

test('reviewer names are shortened for privacy', () => {
  const { displayName } = require('../controllers/reviewController');
  assert.equal(displayName({ fullName: 'Ada Lovelace' }), 'Ada L.');
  assert.equal(displayName({ fullName: 'Ada Augusta King Lovelace' }), 'Ada L.');
  assert.equal(displayName({ fullName: 'Ada' }), 'Ada');
  assert.equal(displayName({}), 'A customer');
  assert.equal(displayName(null), 'A customer');
});

test('rating figures come only from published reviews, rounded, and zero when there are none', async () => {
  const writes = [];
  inject('models/Review.js', { aggregate: async () => [{ avg: 4.3333333, count: 3 }] });
  inject('models/Business.js', { updateOne: async (q, u) => writes.push(u.$set), aggregate: async () => [] });
  delete require.cache[require.resolve('../services/ratingService')];
  let svc = require('../services/ratingService');
  assert.deepEqual(await svc.recomputeBusinessRating('b1'), { ratingAverage: 4.33, ratingCount: 3 });
  inject('models/Review.js', { aggregate: async () => [] });
  delete require.cache[require.resolve('../services/ratingService')];
  svc = require('../services/ratingService');
  assert.deepEqual(await svc.recomputeBusinessRating('b1'), { ratingAverage: 0, ratingCount: 0 }, 'no reviews: zero, never an invented rating');
  const code = read('services', 'ratingService.js');
  assert.ok(/status: 'published'/.test(code), 'hidden reviews are excluded from the average');
});

// ---------------------------------------------------------------- admin moderation
function adminHarness() {
  const logs = []; const recomputed = [];
  const review = { _id: 'r1', business: 'b1', status: 'published', save: async function s() { return this; } };
  inject('models/Review.js', { findById: async (id) => (id === 'r1' ? review : null) });
  inject('models/AdminLog.js', { create: async (d) => { logs.push(d); return d; } });
  inject('services/ratingService.js', { recomputeBusinessRating: async (id) => { recomputed.push(id); return { ratingAverage: 4, ratingCount: 2 }; } });
  delete require.cache[require.resolve('../controllers/adminController')];
  const mongoose = require('mongoose'); const orig = mongoose.isValidObjectId; mongoose.isValidObjectId = () => true;
  return { ctrl: require('../controllers/adminController'), review, logs, recomputed, restore: () => { mongoose.isValidObjectId = orig; } };
}

test('an admin can hide a review only with a reason; ratings update and the action is audited', async () => {
  const h = adminHarness();
  try {
    const admin = { _id: 'admin1' };
    let out = await callHandler(h.ctrl.moderateReview, { params: { id: 'r1' }, body: { status: 'hidden' }, user: admin });
    assert.equal(out.error.statusCode, 400, 'no reason, no hiding');
    assert.equal(h.review.status, 'published');
    out = await callHandler(h.ctrl.moderateReview, { params: { id: 'r1' }, body: { status: 'deleted' }, user: admin });
    assert.equal(out.error.statusCode, 400);

    out = await callHandler(h.ctrl.moderateReview, { params: { id: 'r1' }, body: { status: 'hidden', reason: 'Abusive language' }, user: admin, ip: '9.9.9.9' });
    assert.equal(out.error, undefined);
    assert.equal(h.review.status, 'hidden');
    assert.equal(h.review.moderatedBy, 'admin1');
    assert.equal(h.review.moderationReason, 'Abusive language');
    assert.deepEqual(h.recomputed, ['b1'], "the business's rating was recalculated");
    assert.equal(h.logs.length, 1);
    assert.deepEqual([h.logs[0].action, h.logs[0].admin, h.logs[0].reason, h.logs[0].meta.from, h.logs[0].meta.to], ['hide_review', 'admin1', 'Abusive language', 'published', 'hidden']);

    out = await callHandler(h.ctrl.moderateReview, { params: { id: 'r1' }, body: { status: 'published' }, user: admin });
    assert.equal(h.review.status, 'published'); assert.equal(h.logs[1].action, 'restore_review');
    out = await callHandler(h.ctrl.moderateReview, { params: { id: 'nope' }, body: { status: 'published' }, user: admin });
    assert.equal(out.error.statusCode, 404);
  } finally { h.restore(); }
});

// ---------------------------------------------------------------- wiring
test('route protection: discovery is public; following and writing reviews need login; moderation is admin-only', () => {
  const discover = read('routes', 'discoverRoutes.js');
  assert.ok(!/protect/.test(discover), 'discovery is public and read-only');
  assert.ok(!/router\.(post|put|patch|delete)/.test(discover), 'no writes on public discovery routes');
  const follow = read('routes', 'followRoutes.js');
  assert.ok(/router\.use\(protect\)/.test(follow), 'every follow route needs login');
  const reviews = read('routes', 'reviewRoutes.js');
  for (const line of reviews.split('\n').filter((l) => /router\.(post|put|delete)/.test(l))) assert.ok(/protect/.test(line) && /reviewLimiter/.test(line), `unprotected/unlimited: ${line.trim()}`);
  assert.ok(/router\.use\(protect,\s*requireRole\("admin"\)\)/.test(read('routes', 'adminRoutes.js')));
  assert.ok(/\/api\/discover/.test(read('app.js')) && /\/api\/follows/.test(read('app.js')) && /\/api\/reviews/.test(read('app.js')));
});

test('the public storefront endpoint uses the explicit field allow-list', () => {
  const code = read('controllers', 'businessController.js');
  assert.ok(/\.select\(STOREFRONT_FIELDS\)/.test(code));
  assert.ok(!/select\("-bankDetails"\)/.test(code));
});

test('the homepage never calls the follower ranking "top selling"', () => {
  const code = read('controllers', 'discoverController.js');
  assert.ok(/Popular/.test(code) && /NOT "top selling"/.test(code));
  assert.ok(!/topSelling/i.test(code));
});
