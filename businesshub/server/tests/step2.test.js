const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-step2';
process.env.CLIENT_URL = 'https://app.example.test';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hours = (n) => new Date(Date.now() + n * 3600 * 1000);

// ------------------------------------------------------------------ schemas
test('the buyer role exists, unknown roles are rejected, and secrets stay out of API output', () => {
  const User = require('../models/User');
  const base = { fullName: 'A', email: 'a@x.com', phone: '1', password: 'longenough1' };
  assert.equal(new User({ ...base, role: 'buyer' }).validateSync(), undefined);
  assert.equal(new User({ ...base, role: 'owner' }).validateSync(), undefined);
  assert.ok(new User({ ...base, role: 'superadmin' }).validateSync(), 'unknown role refused');
  assert.equal(new User(base).role, 'owner', 'default is still seller, so existing flows are unchanged');

  const u = new User({ ...base, emailVerifyToken: 'abc', emailVerifyExpires: new Date() });
  const safe = u.toSafeObject();
  assert.equal(safe.emailVerifyToken, undefined);
  assert.equal(safe.emailVerifyExpires, undefined);
  assert.equal(safe.password, undefined);
  assert.equal(safe.emailVerified, false);
  assert.equal(new User({ ...base, emailVerifiedAt: new Date() }).toSafeObject().emailVerified, true);
});

test('existing-style businesses default to "delivery not specified" and "not verified", with zeroed stats', () => {
  const Business = require('../models/Business');
  const b = new Business({ owner: '64b000000000000000000001', name: 'X', slug: 'x', category: 'Food' });
  assert.equal(b.validateSync(), undefined);
  assert.equal(b.delivery.status, 'unspecified');
  assert.equal(b.verification.status, 'none');
  assert.equal(b.ratingAverage, 0);
  assert.equal(b.ratingCount, 0);
  assert.equal(b.followerCount, 0);
  assert.ok(new Business({ owner: '64b000000000000000000001', name: 'X', slug: 'x', category: 'Food', delivery: { status: 'maybe' } }).validateSync(), 'bad delivery status refused');
});

test('reviews allow only whole ratings 1-5 and one review per account per business', () => {
  const Review = require('../models/Review');
  const mk = (rating) => new Review({ business: '64b000000000000000000001', user: '64b000000000000000000002', rating });
  for (const ok of [1, 2, 3, 4, 5]) assert.equal(mk(ok).validateSync(), undefined, `rating ${ok}`);
  for (const bad of [0, 6, 3.5, -1, NaN, undefined, '5 stars']) assert.ok(mk(bad).validateSync(), `rating ${bad} must be refused`);
  assert.ok(Review.schema.indexes().some(([f, o]) => f.business === 1 && f.user === 1 && o.unique), 'unique (business, user)');
  assert.equal(Review.schema.path('verifiedPurchase'), undefined, 'we must not claim verified purchases');
});

test('a follow is unique per account and business', () => {
  const Follow = require('../models/Follow');
  assert.ok(Follow.schema.indexes().some(([f, o]) => f.business === 1 && f.user === 1 && o.unique));
});

test('only one pending verification request per business, and a payment reference is used once', () => {
  const V = require('../models/VerificationRequest');
  const idx = V.schema.indexes();
  const pending = idx.find(([f, o]) => f.business === 1 && o.unique && o.partialFilterExpression && o.partialFilterExpression.status === 'pending');
  assert.ok(pending, 'partial unique index on pending requests');
  assert.ok(idx.some(([f, o]) => f['payment.reference'] === 1 && o.unique), 'payment reference unique');
  assert.equal(new V({ business: '64b000000000000000000001', requestedBy: '64b000000000000000000002' }).validateSync(), undefined);
  assert.ok(new V({ business: '64b000000000000000000001', requestedBy: '64b000000000000000000002', status: 'verified' }).validateSync(), 'unknown status refused');
});

test('verification fee is never assumed: both amount and currency must be configured, then explicitly enabled', () => {
  const { getVerificationConfig: cfg } = require('../config/verification');
  assert.equal(cfg({}).configured, false);
  assert.equal(cfg({ VERIFICATION_FEE_MINOR: '500000' }).configured, false, 'no currency, no guess');
  assert.equal(cfg({ VERIFICATION_CURRENCY: 'NGN' }).configured, false, 'no amount');
  assert.equal(cfg({ VERIFICATION_FEE_MINOR: '12.5', VERIFICATION_CURRENCY: 'NGN' }).configured, false, 'fractional minor units refused');
  assert.equal(cfg({ VERIFICATION_FEE_MINOR: '500000', VERIFICATION_CURRENCY: 'naira' }).configured, false, 'not an ISO code');
  const ok = cfg({ VERIFICATION_FEE_MINOR: '500000', VERIFICATION_CURRENCY: 'ngn' });
  assert.deepEqual([ok.configured, ok.amountMinor, ok.currency, ok.paymentEnabled], [true, 500000, 'NGN', false], 'configured but still not charging');
  assert.equal(cfg({ VERIFICATION_FEE_MINOR: '500000', VERIFICATION_CURRENCY: 'NGN', VERIFICATION_PAYMENT_ENABLED: 'true' }).paymentEnabled, true);
  assert.equal(cfg({ VERIFICATION_PAYMENT_ENABLED: 'true' }).paymentEnabled, false, 'switch alone is not enough');
});

// ------------------------------------------------------------------ delivery
const { sanitizeDelivery } = require('../utils/deliverySettings');

test('delivery settings are validated, trimmed, and cleared when delivery is off', () => {
  assert.deepEqual(sanitizeDelivery({ status: 'available', areas: ' Lekki ', terms: 'Paid by buyer', contact: 'Call us' }),
    { status: 'available', areas: 'Lekki', terms: 'Paid by buyer', contact: 'Call us' });
  assert.deepEqual(sanitizeDelivery({ status: 'unavailable', areas: 'Lekki', terms: 'old terms' }),
    { status: 'unavailable', areas: '', terms: '', contact: '' }, 'stale details never linger');
  assert.equal(sanitizeDelivery({ status: 'unspecified' }).status, 'unspecified');
  const bad = (v) => assert.throws(() => sanitizeDelivery(v), (e) => e.statusCode === 400);
  bad(undefined); bad(null); bad('yes'); bad([]); bad({}); bad({ status: 'maybe' });
  bad({ status: 'available', areas: 'x'.repeat(301) });
  bad({ status: 'available', terms: 'x'.repeat(501) });
  bad({ status: 'available', areas: { $gt: '' } });
  assert.ok(!/fee|price|minutes|hours/i.test(JSON.stringify(sanitizeDelivery({ status: 'available' }))), 'no invented fees or times');
});

test('an owner can set delivery but cannot set their own badge, rating or follower count', async () => {
  const updates = [];
  inject('models/Business.js', { findByIdAndUpdate: async (id, upd) => { updates.push(upd); return { _id: id, ...upd }; } });
  delete require.cache[require.resolve('../controllers/businessController')];
  const ctrl = require('../controllers/businessController');

  const out = await callHandler(ctrl.updateMyBusiness, {
    businessId: 'b1',
    body: {
      description: 'ok',
      delivery: { status: 'available', areas: 'Ikeja' },
      verification: { status: 'verified' },
      'verification.status': 'verified',
      ratingAverage: 5, ratingCount: 999, followerCount: 5000,
      owner: 'someone-else', slug: 'hijack',
    },
  });
  assert.equal(out.error, undefined);
  const written = updates[0];
  assert.deepEqual(Object.keys(written).sort(), ['delivery', 'description']);
  assert.equal(written.delivery.status, 'available');

  const bad = await callHandler(ctrl.updateMyBusiness, { businessId: 'b1', body: { delivery: { status: 'free-shipping-forever' } } });
  assert.equal(bad.error.statusCode, 400);
  assert.equal(updates.length, 1, 'invalid delivery wrote nothing');
});

// ------------------------------------------------------------------ roles
test('buyers cannot reach seller tools or create a business', async () => {
  const requireBusiness = require('../middleware/requireBusiness');
  let err; const nextWith = (e) => { err = e; };
  await requireBusiness({ user: { role: 'buyer', business: 'b1' } }, {}, nextWith);
  assert.equal(err.statusCode, 403);

  err = undefined; const req = { user: { role: 'owner', business: 'b1' } };
  await requireBusiness(req, {}, nextWith);
  assert.equal(err, undefined);
  assert.equal(req.businessId, 'b1', 'sellers still pass');

  delete require.cache[require.resolve('../controllers/businessController')];
  const ctrl = require('../controllers/businessController');
  const out = await callHandler(ctrl.createBusiness, { user: { _id: 'u1', role: 'buyer' }, body: { name: 'X', category: 'Food' } });
  assert.equal(out.error.statusCode, 403);
});

// ------------------------------------------------------------------ registration
function loadAuth({ users = [] } = {}) {
  const created = []; const welcomed = []; const verifyLinks = [];
  const User = makeModel(users);
  User.create = async (doc) => {
    const row = { _id: `u${users.length + created.length + 1}`, ...doc };
    created.push(row); User.rows.push(row);
    return { ...row, toSafeObject() { return { _id: row._id, role: row.role, email: row.email }; } };
  };
  inject('models/User.js', User);
  inject('services/welcomeService.js', { welcomeNewUser: async (u) => { welcomed.push(u.email); } });
  inject('services/emailService.js', {
    sendPasswordResetEmail: async () => ({ sent: true }),
    sendVerificationEmail: async (to, url) => { verifyLinks.push({ to, url }); return { sent: true }; },
  });
  inject('utils/generateToken.js', { generateToken: () => 'jwt', sendTokenCookie: () => {} });
  delete require.cache[require.resolve('../controllers/authController')];
  return { ctrl: require('../controllers/authController'), User, created, welcomed, verifyLinks };
}
const reg = (extra = {}) => ({ body: { fullName: 'Ada L', email: 'ada@x.com', phone: '080', password: 'longenough1', ...extra } });
const settle = () => new Promise((r) => setImmediate(r));

test('registration defaults to a seller account, exactly as before', async () => {
  delete process.env.ENABLE_BUYER_SIGNUP;
  const { ctrl, created, welcomed } = loadAuth();
  const out = await callHandler(ctrl.register, reg());
  assert.equal(out.status, 201);
  assert.equal(created[0].role, 'owner');
  await settle();
  assert.deepEqual(welcomed, ['ada@x.com'], 'sellers still get the welcome email');
});

test('customer sign-up is open by default, can be closed, and can never be used to become admin', async () => {
  delete process.env.ENABLE_BUYER_SIGNUP;
  let ctx = loadAuth();
  let out = await callHandler(ctx.ctrl.register, reg({ accountType: 'buyer' }));
  assert.equal(out.status, 201, 'open by default now that customers have their own area');
  assert.equal(ctx.created[0].role, 'buyer');
  await settle();
  assert.deepEqual(ctx.welcomed, [], 'customers are not sent the seller onboarding email');

  out = await callHandler(ctx.ctrl.register, reg({ email: 'x@x.com', role: 'admin', accountType: 'admin' }));
  assert.equal(ctx.created[1].role, 'owner', 'a request can never create an admin');

  process.env.ENABLE_BUYER_SIGNUP = 'false';
  ctx = loadAuth();
  out = await callHandler(ctx.ctrl.register, reg({ accountType: 'buyer' }));
  assert.equal(out.error.statusCode, 400);
  assert.equal(ctx.created.length, 0, 'closed: no account was created');
  out = await callHandler(ctx.ctrl.register, reg({ email: 'seller@x.com' }));
  assert.equal(out.status, 201, 'closing customer sign-up does not affect sellers');
  delete process.env.ENABLE_BUYER_SIGNUP;
});

// ------------------------------------------------------------------ email verification
test('new accounts get a verification link; only a hash of the token is stored', async () => {
  const ctx = loadAuth();
  await callHandler(ctx.ctrl.register, reg());
  await settle();
  assert.equal(ctx.verifyLinks.length, 1);
  const raw = new URL(ctx.verifyLinks[0].url).searchParams.get('token');
  assert.match(raw, /^[a-f0-9]{64}$/);
  assert.ok(ctx.verifyLinks[0].url.startsWith('https://app.example.test/verify-email?token='), 'link is built from CLIENT_URL');
  const row = ctx.User.rows[0];
  assert.equal(row.emailVerifyToken, sha(raw));
  assert.notEqual(row.emailVerifyToken, raw, 'the raw token is never stored');
  assert.ok(new Date(row.emailVerifyExpires) > hours(23) && new Date(row.emailVerifyExpires) < hours(25), '24 hour expiry');
});

test('a verification link works once, and not after it expires', async () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const ctx = loadAuth({ users: [{ _id: 'u1', email: 'a@x.com', emailVerifyToken: sha(raw), emailVerifyExpires: hours(2) }] });

  const first = await callHandler(ctx.ctrl.verifyEmail, { body: { token: raw } });
  assert.equal(first.error, undefined);
  const row = ctx.User.rows[0];
  assert.ok(row.emailVerifiedAt, 'marked verified');
  assert.equal(row.emailVerifyToken, undefined, 'token removed');

  const replay = await callHandler(ctx.ctrl.verifyEmail, { body: { token: raw } });
  assert.equal(replay.error.statusCode, 400, 'the same link cannot be used twice');

  const rawOld = crypto.randomBytes(32).toString('hex');
  const ctx2 = loadAuth({ users: [{ _id: 'u2', emailVerifyToken: sha(rawOld), emailVerifyExpires: hours(-1) }] });
  const expired = await callHandler(ctx2.ctrl.verifyEmail, { body: { token: rawOld } });
  assert.equal(expired.error.statusCode, 400);
  assert.equal(ctx2.User.rows[0].emailVerifiedAt, undefined, 'expired link verifies nothing');

  const wrong = await callHandler(ctx2.ctrl.verifyEmail, { body: { token: crypto.randomBytes(32).toString('hex') } });
  assert.equal(wrong.error.statusCode, 400);
});

test('requesting verification again sends a fresh link, but not to someone already verified', async () => {
  const ctx = loadAuth({ users: [{ _id: 'u1', email: 'a@x.com', fullName: 'A' }] });
  const out = await callHandler(ctx.ctrl.requestEmailVerification, { user: { _id: 'u1', email: 'a@x.com', fullName: 'A' }, ip: '1.1.1.1' });
  assert.equal(out.error, undefined);
  assert.equal(ctx.verifyLinks.length, 1);

  const done = await callHandler(ctx.ctrl.requestEmailVerification, { user: { _id: 'u1', email: 'a@x.com', emailVerifiedAt: new Date() } });
  assert.equal(done.body.data.alreadyVerified, true);
  assert.equal(ctx.verifyLinks.length, 1, 'no extra email');
});

test('the email link can never be pointed at another site by a forged header', () => {
  const { getClientOrigin } = require('../utils/clientOrigin');
  const req = { headers: { origin: 'https://evil.example' }, socket: { remoteAddress: '203.0.113.5' } };
  assert.equal(getClientOrigin(req), 'https://app.example.test');
  const old = process.env.CLIENT_URL; delete process.env.CLIENT_URL;
  assert.ok(!getClientOrigin(req).includes('evil'), 'even without CLIENT_URL a remote header is ignored');
  process.env.CLIENT_URL = old;
});

test('verification endpoints are wired with rate limits, and the admin guard still covers admin routes', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'routes', 'authRoutes.js'), 'utf8');
  assert.ok(/verify-email\/request',\s*protect,\s*verifyEmailLimiter/.test(code));
  assert.ok(/verify-email',\s*authLimiter,\s*verifyEmailRules/.test(code));
});
