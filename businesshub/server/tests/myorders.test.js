const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-myorders';
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

// ============================================================ optionalAuth
function authWith(users) {
  inject('models/User.js', { findById: async (id) => users.find((u) => String(u._id) === String(id)) || null });
  const file = require.resolve('../middleware/auth');
  delete require.cache[file];
  return require('../middleware/auth');
}
const run = async (mw, req) => { let nextCalled = false, err; const r = { headers: {}, cookies: {}, ...req }; await mw(r, {}, (e) => { nextCalled = true; err = e; }); return { r, nextCalled, err }; };

test('optionalAuth: a valid login identifies the person, by header or by cookie', async () => {
  const { optionalAuth } = authWith([{ _id: 'u1', isActive: true, role: 'buyer' }]);
  const token = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET);
  const a = await run(optionalAuth, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(a.r.user && a.r.user._id, 'u1'); assert.ok(a.nextCalled && !a.err);
  const b = await run(optionalAuth, { cookies: { token } });
  assert.equal(b.r.user && b.r.user._id, 'u1');
});

test('optionalAuth: never blocks - no token, junk token, expired token, wrong secret, deleted or disabled user all mean "anonymous"', async () => {
  const { optionalAuth } = authWith([{ _id: 'u1', isActive: true }, { _id: 'u2', isActive: false }]);
  const cases = {
    none: {},
    junk: { headers: { authorization: 'Bearer not.a.jwt' } },
    expired: { headers: { authorization: `Bearer ${jwt.sign({ id: 'u1' }, process.env.JWT_SECRET, { expiresIn: -10 })}` } },
    wrongSecret: { headers: { authorization: `Bearer ${jwt.sign({ id: 'u1' }, 'other-secret')}` } },
    deleted: { headers: { authorization: `Bearer ${jwt.sign({ id: 'ghost' }, process.env.JWT_SECRET)}` } },
    disabled: { headers: { authorization: `Bearer ${jwt.sign({ id: 'u2' }, process.env.JWT_SECRET)}` } },
  };
  for (const [name, req] of Object.entries(cases)) {
    const out = await run(optionalAuth, req);
    assert.ok(out.nextCalled, `${name}: request continues`);
    assert.equal(out.err, undefined, `${name}: no error raised`);
    assert.equal(out.r.user, undefined, `${name}: treated as anonymous`);
  }
});

test('protect is unchanged: still refuses a missing token', async () => {
  const { protect } = authWith([]);
  const out = await callHandler(protect, { user: undefined, headers: {}, cookies: {} });
  assert.equal(out.error && out.error.statusCode, 401);
});

// ============================================================ placing an order links the account
function storefront() {
  const orders = [];
  const business = { _id: 'b1', owner: 'ownerU', isPublished: true, name: 'Ada Bakes', slug: 'ada-bakes' };
  const product = { _id: 'p1', name: 'Cake', price: 1000, finalPrice: 900, stockQuantity: 5, save: async function () { return this; } };
  inject('models/Business.js', { findOne: async (q) => (q.slug === 'ada-bakes' && q.isPublished ? business : null) });
  inject('models/Product.js', { findOne: async (q) => (String(q._id) === 'p1' && String(q.business) === 'b1' ? { ...product, save: product.save } : null) });
  inject('models/Customer.js', { findOne: async () => null, create: async (d) => ({ _id: 'c1', ...d }), findByIdAndUpdate: async () => ({}) });
  inject('models/Order.js', { create: async (d) => { orders.push(d); return { _id: 'o1', ...d }; } });
  inject('services/notificationService.js', { notify: async () => {}, maybeNotifyLowStock: async () => {} });
  const file = require.resolve('../controllers/businessController');
  delete require.cache[file];
  return { ctrl: require('../controllers/businessController'), orders };
}
const body = (extra = {}) => ({ productId: 'p1', quantity: 2, customerName: 'Chi Okafor', customerPhone: '08031234567', ...extra });

test('a logged-in customer\'s order is saved to their account', async () => {
  const { ctrl, orders } = storefront();
  const out = await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, user: { _id: 'u9', role: 'buyer' }, body: body() });
  assert.equal(out.status, 201);
  assert.equal(String(orders[0].buyer), 'u9');
  assert.equal(out.body.data.savedToAccount, true);
});

test('an anonymous order is created exactly as before, with no buyer', async () => {
  const { ctrl, orders } = storefront();
  const out = await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, user: undefined, body: body() });
  assert.equal(out.status, 201);
  assert.ok(!('buyer' in orders[0]), 'no buyer field at all');
  assert.equal(out.body.data.savedToAccount, false);
  assert.equal(orders[0].total, 1800, 'price and total are still computed on the server');
});

test('nobody can attach an order to someone else\'s account by sending a buyer in the request', async () => {
  const { ctrl, orders } = storefront();
  await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, user: undefined, body: body({ buyer: 'victim', user: 'victim', userId: 'victim' }) });
  assert.ok(!('buyer' in orders[0]));
  const { ctrl: c2, orders: o2 } = storefront();
  await callHandler(c2.createPublicOrder, { params: { slug: 'ada-bakes' }, user: { _id: 'u9', role: 'buyer' }, body: body({ buyer: 'victim' }) });
  assert.equal(String(o2[0].buyer), 'u9', 'always the logged-in account, never the body');
});

test('a business owner ordering from their own storefront is not saved as a customer order', async () => {
  const { ctrl, orders } = storefront();
  await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, user: { _id: 'ownerU', role: 'owner' }, body: body() });
  assert.ok(!('buyer' in orders[0]));
});

test('a seller buying from ANOTHER business is saved to their account like any customer', async () => {
  const { ctrl, orders } = storefront();
  await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, user: { _id: 'otherSeller', role: 'owner' }, body: body() });
  assert.equal(String(orders[0].buyer), 'otherSeller');
});

test('the existing order rules still hold (name and phone required, unknown product refused)', async () => {
  const { ctrl } = storefront();
  assert.equal((await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, body: body({ customerName: '  ' }) })).error.statusCode, 400);
  assert.equal((await callHandler(ctrl.createPublicOrder, { params: { slug: 'ada-bakes' }, body: body({ productId: 'nope' }) })).error.statusCode, 404);
  assert.equal((await callHandler(ctrl.createPublicOrder, { params: { slug: 'missing' }, body: body() })).error.statusCode, 404);
});

// ============================================================ the "My orders" list
function ordersWith(rows) {
  inject('models/Order.js', {
    find: (q) => {
      let data = rows.filter((r) => String(r.buyer) === String(q.buyer));
      const p = { sort: () => p, skip: (n) => { data = data.slice(n); return p; }, limit: (n) => { data = data.slice(0, n); return p; }, populate: () => Promise.resolve(data) };
      return p;
    },
    countDocuments: async (q) => rows.filter((r) => String(r.buyer) === String(q.buyer)).length,
  });
  const file = require.resolve('../controllers/myOrderController');
  delete require.cache[file];
  return require('../controllers/myOrderController');
}
const row = (o) => ({
  _id: `id-${o.orderNumber}`, buyer: 'u1', business: { name: 'Ada Bakes', slug: 'ada-bakes', isPublished: true, logo: { url: 'l.png', publicId: 'secret-pid' }, owner: 'ownerU', bankDetails: { accountNumber: '0123456789' } },
  customer: 'c1', items: [{ product: 'p1', name: 'Cake', price: 900, quantity: 2 }], total: 1800, status: 'pending', paymentStatus: 'unpaid',
  notes: 'PRIVATE seller note', createdAt: new Date('2026-11-01'), ...o,
});

test('My orders returns only the logged-in person\'s own orders', async () => {
  const ctrl = ordersWith([row({ orderNumber: 'A1' }), row({ orderNumber: 'B1', buyer: 'u2' }), row({ orderNumber: 'A2' }), row({ orderNumber: 'ANON', buyer: undefined })]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' } });
  assert.deepEqual(out.body.data.orders.map((o) => o.orderNumber), ['A1', 'A2']);
  assert.equal(out.body.data.total, 2);
  const other = await callHandler(ctrl.listMine, { user: { _id: 'u3' } });
  assert.equal(other.body.data.orders.length, 0, 'someone with no orders sees none');
});

test('a person cannot ask to see another person\'s orders through the query string', async () => {
  const ctrl = ordersWith([row({ orderNumber: 'A1' }), row({ orderNumber: 'B1', buyer: 'u2' })]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' }, query: { buyer: 'u2', user: 'u2', page: '1' } });
  assert.deepEqual(out.body.data.orders.map((o) => o.orderNumber), ['A1']);
});

test('the customer view never leaks seller-private data', async () => {
  const ctrl = ordersWith([row({ orderNumber: 'A1' })]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' } });
  const json = JSON.stringify(out.body);
  for (const secret of ['PRIVATE seller note', 'ownerU', '0123456789', 'secret-pid', 'bankDetails', '"customer"', '"notes"', '"buyer"']) {
    assert.ok(!json.includes(secret), `leaked: ${secret}`);
  }
  const o = out.body.data.orders[0];
  assert.deepEqual(Object.keys(o).sort(), ['business', 'createdAt', 'id', 'items', 'orderNumber', 'paymentStatus', 'status', 'total']);
  assert.deepEqual(o.items, [{ name: 'Cake', price: 900, quantity: 2 }]);
  assert.deepEqual(o.business, { name: 'Ada Bakes', slug: 'ada-bakes', logoUrl: 'l.png' });
});

test('a business that was unpublished or deleted does not break the list or link to a dead page', async () => {
  const ctrl = ordersWith([
    row({ orderNumber: 'HIDDEN', business: { name: 'Gone Soon', slug: 'gone-soon', isPublished: false } }),
    row({ orderNumber: 'DELETED', business: null }),
  ]);
  const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' } });
  const [hidden, deleted] = out.body.data.orders;
  assert.equal(hidden.business.slug, null, 'no link to an unpublished storefront');
  assert.equal(hidden.business.name, 'Gone Soon');
  assert.equal(deleted.business, null);
});

test('paging: 10 per page, and odd page values fall back to page 1', async () => {
  const ctrl = ordersWith(Array.from({ length: 23 }, (_, i) => row({ orderNumber: `N${i + 1}` })));
  const p1 = (await callHandler(ctrl.listMine, { user: { _id: 'u1' } })).body.data;
  assert.equal(p1.orders.length, 10); assert.equal(p1.pages, 3); assert.equal(p1.total, 23);
  const p3 = (await callHandler(ctrl.listMine, { user: { _id: 'u1' }, query: { page: '3' } })).body.data;
  assert.equal(p3.orders.length, 3); assert.equal(p3.page, 3);
  for (const bad of ['abc', '-4', '0', { $gt: '' }, ['2']]) {
    const out = await callHandler(ctrl.listMine, { user: { _id: 'u1' }, query: { page: bad } });
    assert.equal(out.body.data.page, 1, `page=${JSON.stringify(bad)}`);
  }
  const none = (await callHandler(ordersWith([]).listMine, { user: { _id: 'u1' } })).body.data;
  assert.equal(none.pages, 1, 'an empty history still reports one page');
});

// ============================================================ wiring
test('the route is open to any logged-in person, guarded by login, mounted once', () => {
  const r = read('routes', 'myOrderRoutes.js');
  assert.ok(/router\.use\(protect\)/.test(r) && !/requireBusiness/.test(r));
  assert.ok(/app\.use\("\/api\/my-orders", myOrderRoutes\)/.test(read('app.js')));
  const biz = read('routes', 'businessRoutes.js');
  assert.ok(/'\/store\/:slug\/orders', publicOrderLimiter, optionalAuth, ctrl\.createPublicOrder/.test(biz), 'rate limit first, then optional login, then the handler');
  assert.ok(/ref: 'User', index: true/.test(read('models', 'Order.js')), 'buyer is indexed');
});

test('the controller filters by the logged-in account id only', () => {
  const c = read('controllers', 'myOrderController.js');
  assert.ok(/const filter = \{ buyer: req\.user\._id \}/.test(c));
  assert.ok(!/req\.query\.(buyer|user)/.test(c) && !/req\.body/.test(c));
});
