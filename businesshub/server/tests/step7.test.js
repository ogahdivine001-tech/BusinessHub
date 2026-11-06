const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-step7';
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

// ============================================================ the buyer -> seller switch
function authWith(users) {
  const User = makeModel(users);
  User.findById = async (id) => { const r = User.rows.find((u) => String(u._id) === String(id)); return r ? { ...r, toSafeObject() { return { _id: r._id, role: r.role, email: r.email }; } } : null; };
  inject('models/User.js', User);
  inject('services/welcomeService.js', { welcomeNewUser: async () => {} });
  inject('services/emailService.js', { sendPasswordResetEmail: async () => ({}), sendVerificationEmail: async () => ({}) });
  inject('utils/generateToken.js', { generateToken: () => 'jwt', sendTokenCookie: () => {} });
  delete require.cache[require.resolve('../controllers/authController')];
  return { ctrl: require('../controllers/authController'), User };
}

test('a customer can become a seller, and keeps their account', async () => {
  const w = authWith([{ _id: 'u1', role: 'buyer', email: 'c@x.com' }]);
  const out = await callHandler(w.ctrl.becomeSeller, { user: { _id: 'u1', role: 'buyer' } });
  assert.equal(out.error, undefined);
  assert.equal(w.User.rows[0].role, 'owner');
  assert.equal(out.body.data.user.role, 'owner');
  assert.equal(out.body.data.user.email, 'c@x.com', 'the same account, not a new one');
});

test('the switch changes nothing for sellers, and is impossible for admins', async () => {
  const w = authWith([{ _id: 'u1', role: 'owner' }, { _id: 'a1', role: 'admin' }]);
  const seller = await callHandler(w.ctrl.becomeSeller, { user: { _id: 'u1', role: 'owner' } });
  assert.equal(seller.error, undefined); assert.equal(w.User.rows[0].role, 'owner', 'harmless if repeated');
  const admin = await callHandler(w.ctrl.becomeSeller, { user: { _id: 'a1', role: 'admin' } });
  assert.equal(admin.error.statusCode, 403);
  assert.equal(w.User.rows[1].role, 'admin', 'an admin account is never rewritten');
});

test('the switch only ever moves buyer -> owner, whatever the request says', async () => {
  const w = authWith([{ _id: 'u1', role: 'buyer' }]);
  await callHandler(w.ctrl.becomeSeller, { user: { _id: 'u1', role: 'buyer' }, body: { role: 'admin', accountType: 'admin' } });
  assert.equal(w.User.rows[0].role, 'owner', 'cannot be talked into admin');
  const code = read('controllers', 'authController.js');
  assert.ok(/updateOne\(\s*\{ _id: req\.user\._id, role: "buyer" \}, \{ \$set: \{ role: "owner" \} \}/.test(code), 'conditional, one-way update');
});

test('after switching, the person can create a business (and a customer still cannot)', async () => {
  const requireBusiness = require('../middleware/requireBusiness');
  let err; await requireBusiness({ user: { role: 'buyer', business: 'b1' } }, {}, (e) => { err = e; });
  assert.equal(err.statusCode, 403);
  delete require.cache[require.resolve('../controllers/businessController')];
  const ctrl = require('../controllers/businessController');
  const asBuyer = await callHandler(ctrl.createBusiness, { user: { _id: 'u1', role: 'buyer' }, body: { name: 'X', category: 'Food' } });
  assert.equal(asBuyer.error.statusCode, 403);
  const asOwner = await callHandler(ctrl.createBusiness, { user: { _id: 'u1', role: 'owner' }, body: { name: '', category: '' } });
  assert.notEqual(asOwner.error && asOwner.error.statusCode, 403, 'a seller is not stopped by the role check');
});

// ============================================================ a person's own reviews
function reviewsWith(rows) {
  const chain = (data) => { const p = Promise.resolve(data); p.sort = () => p; p.skip = () => p; p.limit = () => p; p.populate = () => p; return p; };
  inject('models/Review.js', {
    find: (q) => chain(rows.filter((r) => String(r.user) === String(q.user))),
    countDocuments: async (q) => rows.filter((r) => String(r.user) === String(q.user)).length,
  });
  inject('models/Business.js', {});
  inject('services/ratingService.js', { recomputeBusinessRating: async () => ({}) });
  delete require.cache[require.resolve('../controllers/reviewController')];
  return require('../controllers/reviewController');
}

test('"my reviews" returns only the caller\'s reviews, with business names and status, and nothing private', async () => {
  const ctrl = reviewsWith([
    { _id: 'r1', user: 'u1', rating: 5, comment: 'Great', status: 'published', business: { _id: 'b1', name: 'Shop A', slug: 'shop-a', owner: 'secret-owner', email: 'biz@private.com' }, moderationReason: 'internal note', moderatedBy: 'admin9' },
    { _id: 'r2', user: 'u1', rating: 2, comment: 'Meh', status: 'hidden', business: { _id: 'b2', name: 'Shop B', slug: 'shop-b' } },
    { _id: 'r3', user: 'someone-else', rating: 1, comment: 'Not yours', status: 'published', business: { _id: 'b1', name: 'Shop A', slug: 'shop-a' } },
  ]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' }, query: {} });
  const d = out.body.data;
  assert.deepEqual(d.reviews.map((r) => r._id), ['r1', 'r2']);
  assert.equal(d.total, 2);
  assert.deepEqual(d.reviews[0].business, { _id: 'b1', name: 'Shop A', slug: 'shop-a' });
  assert.equal(d.reviews[1].status, 'hidden', 'they can see their review was hidden');
  const json = JSON.stringify(out.body);
  for (const leak of ['secret-owner', 'biz@private.com', 'internal note', 'admin9', 'Not yours', 'someone-else']) assert.ok(!json.includes(leak), `leaked ${leak}`);
});

test('a review whose business was removed does not break the list', async () => {
  const ctrl = reviewsWith([{ _id: 'r1', user: 'u1', rating: 4, status: 'published', business: null }]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' }, query: {} });
  assert.equal(out.error, undefined); assert.equal(out.body.data.reviews[0].business, null);
});

// ============================================================ admin visibility
function adminWith(users) {
  const User = makeModel(users);
  User.find = (q) => { const p = Promise.resolve(User.rows.filter((u) => Object.entries(q).every(([k, v]) => k === '$or' || String(u[k]) === String(v)))); p.sort = () => p; p.skip = () => p; p.limit = () => p; return p; };
  User.countDocuments = async (q = {}) => User.rows.filter((u) => Object.entries(q).every(([k, v]) => k === '$or' || String(u[k]) === String(v))).length;
  inject('models/User.js', User);
  inject('models/AdminLog.js', makeModel([]));
  delete require.cache[require.resolve('../controllers/adminController')];
  return require('../controllers/adminController');
}
test('admins can filter people by role, and bad role values are ignored', async () => {
  const ctrl = adminWith([{ _id: 1, role: 'owner' }, { _id: 2, role: 'buyer' }, { _id: 3, role: 'buyer' }, { _id: 4, role: 'admin' }]);
  const ids = async (role) => (await callHandler(ctrl.getUsers, { query: { role } })).body.data.users.map((u) => u._id);
  assert.deepEqual(await ids('buyer'), [2, 3]);
  assert.deepEqual(await ids('owner'), [1]);
  assert.equal((await ids('nonsense')).length, 4, 'an unknown role does not filter, and does not reach the database query');
  assert.equal((await callHandler(ctrl.getUsers, { query: { role: { $ne: 'admin' } } })).body.data.users.length, 4, 'an operator object is ignored');
});

// ============================================================ nobody reaches seller tools by accident
test('every seller-only route file is guarded against customers', () => {
  // Route files that are intentionally open to any logged-in or anonymous person.
  const OPEN = new Set(['authRoutes.js', 'followRoutes.js', 'reviewRoutes.js', 'discoverRoutes.js', 'helpRoutes.js', 'planRoutes.js', 'notificationRoutes.js', 'settingsRoutes.js', 'businessRoutes.js', 'adminRoutes.js', 'subscriptionRoutes.js']);
  const unguarded = [];
  for (const f of fs.readdirSync(path.join(root, 'routes'))) {
    if (OPEN.has(f)) continue;
    if (!/requireBusiness/.test(read('routes', f))) unguarded.push(f);
  }
  assert.deepEqual(unguarded, [], 'these route files hold seller tools but do not require a business account');
  // The files marked open must be open for a reason: admin is admin-only, the rest hold no seller data.
  assert.ok(/requireRole\("admin"\)/.test(read('routes', 'adminRoutes.js')));
});

test('the mixed route files guard each seller-only endpoint individually', () => {
  const biz = read('routes', 'businessRoutes.js');
  const lines = biz.split('\n').filter((l) => /^router\.(get|post|put|patch|delete)\(/.test(l.trim()));
  assert.ok(lines.length >= 5);
  for (const line of lines) {
    const publicStorefront = /'\/store\/:slug/.test(line);              // visitors view a storefront and place an order
    const createBusiness = /'\/', protect, ctrl\.createBusiness/.test(line); // the role check is inside the controller (tested above)
    assert.ok(publicStorefront || createBusiness || /protect, requireBusiness/.test(line), `unguarded: ${line.trim()}`);
  }
  const sub = read('routes', 'subscriptionRoutes.js');
  const webhook = sub.indexOf("router.post('/webhook'");
  const guard = sub.indexOf('router.use(protect, requireBusiness)');
  const firstPrivate = sub.indexOf("router.get('/me'");
  assert.ok(webhook > -1 && guard > webhook && firstPrivate > guard, 'only the signed webhook sits before the guard');
});

test('customers can reach exactly what they need: follow, review, notifications, settings', () => {
  assert.ok(/router\.use\(protect\)/.test(read('routes', 'followRoutes.js')) && !/requireBusiness/.test(read('routes', 'followRoutes.js')));
  const rev = read('routes', 'reviewRoutes.js');
  assert.ok(!/requireBusiness/.test(rev) && /'\/mine', protect/.test(rev));
  assert.ok(!/requireBusiness/.test(read('routes', 'notificationRoutes.js')));
  assert.ok(!/requireBusiness/.test(read('routes', 'settingsRoutes.js')));
  assert.ok(/become-seller', protect/.test(read('routes', 'authRoutes.js')));
});

test('customer sign-up needs the same email protections as seller sign-up', () => {
  const routes = read('routes', 'authRoutes.js');
  assert.ok(/'\/register', authLimiter/.test(routes), 'rate limited');
  assert.ok(/become-seller', protect, authLimiter/.test(routes));
  assert.ok(/accountType.*isIn\(\['seller', 'buyer'\]\)/.test(read('validators', 'authValidators.js')), 'account type is a fixed list');
});

// ============================================================ admin messages reach the right people
function recipientsWith(users) {
  const matches = (u, q) => Object.entries(q).every(([k, v]) => (v && v.$in ? v.$in.includes(u[k]) : u[k] === v));
  inject('models/User.js', { find: (q) => { const p = Promise.resolve(users.filter((u) => matches(u, q)).map(({ _id, fullName, email }) => ({ _id, fullName, email }))); p.select = () => p; p.lean = () => p; return p; }, findOne: () => { const p = Promise.resolve(null); p.select = () => p; p.lean = () => p; return p; } });
  for (const m of ['Subscription', 'Notification', 'AdminMessage']) inject(`models/${m}.js`, makeModel([]));
  inject('services/emailService.js', { sendAdminMessageEmail: async () => ({}) });
  delete require.cache[require.resolve('../services/messageService')];
  return require('../services/messageService');
}
const PEOPLE = [
  { _id: 's1', role: 'owner', isActive: true, fullName: 'Seller One', email: 's1@x.com' },
  { _id: 's2', role: 'owner', isActive: false, fullName: 'Inactive Seller', email: 's2@x.com' },
  { _id: 'c1', role: 'buyer', isActive: true, fullName: 'Customer One', email: 'c1@x.com' },
  { _id: 'c2', role: 'buyer', isActive: true, fullName: 'Customer Two', email: 'c2@x.com' },
  { _id: 'c3', role: 'buyer', isActive: false, fullName: 'Suspended Customer', email: 'c3@x.com' },
  { _id: 'a1', role: 'admin', isActive: true, fullName: 'Admin', email: 'a1@x.com' },
];
test('an admin can message all customers, and only active customers receive it', async () => {
  const svc = recipientsWith(PEOPLE);
  assert.ok(svc.AUDIENCES.includes('customers') && svc.AUDIENCES.includes('everyone'));
  const ids = async (a) => (await svc.resolveRecipients(a)).map((r) => r._id).sort();
  assert.deepEqual(await ids('customers'), ['c1', 'c2'], 'no sellers, no admins, no suspended customers');
});
test('"all" still means active sellers only, and "everyone" is sellers plus customers but never admins', async () => {
  const svc = recipientsWith(PEOPLE);
  const ids = async (a) => (await svc.resolveRecipients(a)).map((r) => r._id).sort();
  assert.deepEqual(await ids('all'), ['s1'], 'unchanged behaviour for existing broadcasts');
  assert.deepEqual(await ids('everyone'), ['c1', 'c2', 's1']);
  assert.deepEqual(await svc.resolveRecipients('nonsense'), []);
});
test('messages to customers keep the existing safeguards (confirmation, limit, audit)', () => {
  const code = read('controllers', 'adminController.js');
  assert.ok(/recipients\.length > 1 && confirm !== true/.test(code) && /MAX_RECIPIENTS/.test(code) && /logAction\(req, "message\.send"/.test(code));
  assert.ok(/value: "customers"/.test(fs.readFileSync(path.join(root, '..', 'client', 'src', 'pages', 'admin', 'AdminMessages.jsx'), 'utf8')), 'the admin screen offers the audience');
});
