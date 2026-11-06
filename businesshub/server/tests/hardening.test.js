const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-for-hardening-tests';
const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- plan expiry
const { getEffectivePlan, isPaidPlanExpired } = require('../services/subscriptionService');

test('a paid plan drops to Free once its period has ended', () => {
  const now = new Date();
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'active', currentPeriodEnd: new Date(+now + DAY) }), 'pro');
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'active', currentPeriodEnd: new Date(+now - DAY) }), 'free');
  assert.equal(getEffectivePlan({ plan: 'starter', status: 'active', currentPeriodEnd: new Date(+now - 1000) }), 'free');
  assert.equal(isPaidPlanExpired({ plan: 'pro', currentPeriodEnd: new Date(+now - DAY) }), true);
  assert.equal(isPaidPlanExpired({ plan: 'pro', currentPeriodEnd: new Date(+now + DAY) }), false);
  assert.equal(isPaidPlanExpired({ plan: 'free' }), false);
});

test('a cancelled plan keeps access until the paid period ends, not beyond', () => {
  const now = new Date();
  assert.equal(getEffectivePlan({ plan: 'starter', status: 'cancelled', currentPeriodEnd: new Date(+now + DAY) }), 'starter');
  assert.equal(getEffectivePlan({ plan: 'starter', status: 'cancelled', currentPeriodEnd: new Date(+now - DAY) }), 'free');
});

test('legacy paid rows with no period end are not locked out, unless cancelled', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'active' }), 'pro');
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'cancelled' }), 'free');
});

test('the free trial still grants Pro, then ends', () => {
  const now = new Date();
  assert.equal(getEffectivePlan({ plan: 'free', trialEndsAt: new Date(+now + DAY) }), 'pro');
  assert.equal(getEffectivePlan({ plan: 'free', trialEndsAt: new Date(+now - DAY) }), 'free');
  assert.equal(getEffectivePlan(null), 'free');
});

// ---------------------------------------------------------------- signed links
const { signDocLink, verifyDocLink, canAccessSharedDoc } = require('../utils/signedLink');

test('a share token works only for the document it was made for', () => {
  const t = signDocLink('invoice', 'abc123');
  assert.equal(verifyDocLink('invoice', 'abc123', t), true);
  assert.equal(verifyDocLink('invoice', 'other', t), false, 'different document');
  assert.equal(verifyDocLink('receipt', 'abc123', t), false, 'different document type');
});

test('tampered, expired, and malformed tokens are refused', () => {
  const t = signDocLink('invoice', 'abc123');
  const [exp, sig] = t.split('.');
  assert.equal(verifyDocLink('invoice', 'abc123', `${Number(exp) + 999999}.${sig}`), false, 'extended expiry');
  assert.equal(verifyDocLink('invoice', 'abc123', `${exp}.${sig.slice(0, -2)}xx`), false, 'altered signature');
  assert.equal(verifyDocLink('invoice', 'abc123', t, Date.now() + 365 * DAY), false, 'expired');
  for (const bad of ['', 'nodot', '1.2.3', undefined, null, 42, {}, 'x'.repeat(500)]) {
    assert.equal(verifyDocLink('invoice', 'abc123', bad), false);
  }
});

test('a token signed with a different secret is refused', () => {
  const t = signDocLink('invoice', 'abc123');
  const old = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'a-different-secret';
  assert.equal(verifyDocLink('invoice', 'abc123', t), false);
  process.env.JWT_SECRET = old;
});

test('legacy unsigned links work only while the switch allows, and a bad token is never excused', () => {
  const old = process.env.LEGACY_PUBLIC_PDF_LINKS;
  delete process.env.LEGACY_PUBLIC_PDF_LINKS;
  assert.equal(canAccessSharedDoc('invoice', 'abc123', undefined), true, 'default keeps existing links working');
  assert.equal(canAccessSharedDoc('invoice', 'abc123', 'garbage'), false, 'bad token refused even in legacy mode');
  process.env.LEGACY_PUBLIC_PDF_LINKS = 'false';
  assert.equal(canAccessSharedDoc('invoice', 'abc123', undefined), false, 'strict mode: token required');
  assert.equal(canAccessSharedDoc('invoice', 'abc123', signDocLink('invoice', 'abc123')), true);
  if (old === undefined) delete process.env.LEGACY_PUBLIC_PDF_LINKS; else process.env.LEGACY_PUBLIC_PDF_LINKS = old;
});

test('both public PDF handlers check the token before touching the database', () => {
  for (const [file, type] of [['invoiceController.js', 'invoice'], ['receiptController.js', 'receipt']]) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'controllers', file), 'utf8');
    const gate = code.indexOf(`canAccessSharedDoc("${type}"`);
    const lookup = code.indexOf('.findById(req.params.id)');
    assert.ok(gate > -1 && lookup > -1 && gate < lookup, `${file} must verify access before the lookup`);
  }
});

// ---------------------------------------------------------------- document input
const { cleanItems, sumItems } = require('../utils/documentInput');

test('invoice/receipt items must be real numbers and descriptions', () => {
  const ok = cleanItems([{ description: ' Logo design ', quantity: 2, price: '1500.5' }]);
  assert.deepEqual(ok, [{ description: 'Logo design', quantity: 2, price: 1500.5 }]);
  assert.equal(sumItems(ok), 3001);
  const bad = (items) => assert.throws(() => cleanItems(items), (e) => e.statusCode === 400);
  bad(undefined); bad([]); bad('items');
  bad([{ description: '', quantity: 1, price: 1 }]);
  bad([{ description: 'x', quantity: 0, price: 1 }]);
  bad([{ description: 'x', quantity: 1, price: -5 }]);
  bad([{ description: 'x', quantity: 1, price: 'abc' }]);
  bad([{ description: 'x', quantity: 1, price: Infinity }]);
  bad([null]);
  bad(Array.from({ length: 101 }, () => ({ description: 'x', quantity: 1, price: 1 })));
});

// ---------------------------------------------------------------- usage limits
const { verifyWithinLimit } = require('../services/usageGuard');

test('going over a limit removes the new item and refuses the request', async () => {
  const rows = [1, 2, 3];
  let undone = false;
  await assert.rejects(
    () => verifyWithinLimit({ count: async () => rows.length + 1, limit: 3, undo: async () => { undone = true; }, message: 'full' }),
    (e) => e.statusCode === 403 && e.message === 'full'
  );
  assert.ok(undone);
  await verifyWithinLimit({ count: async () => 3, limit: 3, undo: async () => assert.fail('must not undo'), message: 'x' });
  await verifyWithinLimit({ count: async () => 1e9, limit: Infinity, undo: async () => assert.fail('unlimited'), message: 'x' });
});

test('simultaneous requests can never push a business past its limit', async () => {
  const LIMIT = 3;
  const store = [];
  const tick = () => new Promise((r) => setImmediate(r));
  async function createOne(id) {
    store.push(id);                 // record first...
    await tick();                   // ...other requests interleave here
    await verifyWithinLimit({       // ...then verify
      count: async () => store.length,
      limit: LIMIT,
      undo: async () => { store.splice(store.indexOf(id), 1); },
      message: 'limit',
    });
  }
  const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => createOne(i)));
  assert.ok(store.length <= LIMIT, `store ended with ${store.length}, limit is ${LIMIT}`);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, store.length, 'every success is still stored');
});

// (The AI limit/reservation behaviour is tested by running the real handler in step5.test.js.)

// ---------------------------------------------------------------- mass assignment
test('product writes use an explicit allow-list, not the raw request body', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'productController.js'), 'utf8');
  assert.ok(code.includes('EDITABLE_FIELDS'));
  assert.ok(!/\.\.\.\s*(rest|req\.body)\b/.test(code), 'no spreading request data into the record');
});

// ---------------------------------------------------------------- audit log
const AdminLog = require('../models/AdminLog');

test('audit log entries cannot be edited or deleted through the application', async () => {
  const attempts = [
    () => AdminLog.updateOne({}, { action: 'x' }).exec(),
    () => AdminLog.updateMany({}, { action: 'x' }).exec(),
    () => AdminLog.findOneAndUpdate({}, { action: 'x' }).exec(),
    () => AdminLog.findByIdAndUpdate('64b000000000000000000000', { action: 'x' }).exec(),
    () => AdminLog.deleteOne({}).exec(),
    () => AdminLog.deleteMany({}).exec(),
    () => AdminLog.findOneAndDelete({}).exec(),
    () => AdminLog.findByIdAndDelete('64b000000000000000000000').exec(),
  ];
  for (const attempt of attempts) {
    await assert.rejects(attempt, /cannot be modified or deleted/);
  }
  const doc = new AdminLog({ admin: '64b000000000000000000001', action: 'x' });
  doc.isNew = false; // pretend it is already stored
  await assert.rejects(() => doc.save(), /cannot be modified or deleted/);
});

// ---------------------------------------------------------------- admin actions
function loadAdminController({ users = [], logs = [] } = {}) {
  const User = makeModel(users);
  // select() hands back a copy, like a real fetched document
  User.findById = (id) => ({ select: async () => { const r = User.rows.find((u) => String(u._id) === String(id)); return r ? { ...r } : null; } });
  User.findByIdAndUpdate = async (id, upd) => {
    const row = User.rows.find((u) => String(u._id) === String(id));
    if (!row) return null;
    Object.assign(row, upd);
    return { ...row, toSafeObject() { return { _id: row._id, isActive: row.isActive }; } };
  };
  const Log = makeModel(logs);
  inject('models/User.js', User);
  inject('models/AdminLog.js', Log);
  delete require.cache[require.resolve('../controllers/adminController')];
  return { ctrl: require('../controllers/adminController'), Log };
}

test('an admin cannot deactivate their own account', async () => {
  const { ctrl, Log } = loadAdminController({ users: [{ _id: 'admin1', isActive: true, email: 'a@x.com', role: 'admin' }] });
  const out = await callHandler(ctrl.setUserActive, { params: { id: 'admin1' }, body: { isActive: false }, user: { _id: 'admin1' } });
  assert.equal(out.error.statusCode, 400);
  assert.equal(Log.rows.length, 0, 'nothing was changed, so nothing is logged');
});

test('admin actions record who, what, before/after, reason and IP', async () => {
  const { ctrl, Log } = loadAdminController({ users: [{ _id: 'u2', isActive: true, email: 'b@x.com', role: 'owner' }] });
  const out = await callHandler(ctrl.setUserActive, {
    params: { id: 'u2' }, body: { isActive: false, reason: 'Chargeback fraud' }, user: { _id: 'admin1' }, ip: '203.0.113.9',
  });
  assert.equal(out.error, undefined);
  assert.equal(Log.rows.length, 1);
  const [entry] = Log.rows;
  assert.equal(entry.admin, 'admin1');
  assert.equal(entry.action, 'deactivate_user');
  assert.equal(entry.targetId, 'u2');
  assert.equal(entry.reason, 'Chargeback fraud');
  assert.equal(entry.ip, '203.0.113.9');
  assert.deepEqual({ from: entry.meta.from, to: entry.meta.to }, { from: true, to: false });
});

test('admin toggles reject non-boolean input instead of logging a false action', async () => {
  const { ctrl, Log } = loadAdminController({ users: [{ _id: 'u3', isActive: true }] });
  const out = await callHandler(ctrl.setUserActive, { params: { id: 'u3' }, body: { isActive: 'yes' }, user: { _id: 'admin1' } });
  assert.equal(out.error.statusCode, 400);
  assert.equal(Log.rows.length, 0);
});

test('every admin route is behind the admin-only guard', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'routes', 'adminRoutes.js'), 'utf8');
  assert.ok(/router\.use\(protect,\s*requireRole\("admin"\)\)/.test(code));
  assert.ok(code.includes('audit-logs'));
  assert.ok(!/router\.(post|put|patch|delete)\([^)]*audit-logs/.test(code), 'the audit log is read-only');
});

// ---------------------------------------------------------------- CORS
const { buildAllowedOrigins } = require('../config/cors');

test('CORS origins come from configuration and localhost is dev-only', () => {
  const prod = buildAllowedOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com/' });
  assert.ok(prod.includes('https://app.example.com'), 'trailing slash removed');
  assert.ok(!prod.some((o) => o.includes('localhost')), 'no localhost in production');
  assert.ok(prod.includes('https://businesshubng.vercel.app'), 'existing live site keeps working until ALLOWED_ORIGINS is set');

  const custom = buildAllowedOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com', ALLOWED_ORIGINS: 'https://a.com, https://b.com/' });
  assert.deepEqual(custom.sort(), ['https://a.com', 'https://app.example.com', 'https://b.com']);

  const dev = buildAllowedOrigins({ NODE_ENV: 'development', CLIENT_URL: 'http://localhost:5173' });
  assert.ok(dev.includes('http://localhost:3000'));
});
