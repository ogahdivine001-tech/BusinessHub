const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-step4';
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const FEE_ENV = { VERIFICATION_FEE_MINOR: '500000', VERIFICATION_CURRENCY: 'NGN', VERIFICATION_PAYMENT_ENABLED: 'true' };
const setFee = (on) => { for (const [k, v] of Object.entries(FEE_ENV)) { if (on) process.env[k] = v; else delete process.env[k]; } };

// ---- tiny dotted-path helpers so the fakes behave like MongoDB's "a.b" keys
const getp = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const setp = (o, p, v) => { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach((k) => { x[k] = x[k] || {}; x = x[k]; }); x[ks.at(-1)] = v; };
const delp = (o, p) => { const ks = p.split('.'); let x = o; for (const k of ks.slice(0, -1)) { x = x && x[k]; } if (x) delete x[ks.at(-1)]; };
const match = (row, q) => Object.entries(q).every(([k, v]) => {
  const val = getp(row, k);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('$ne' in v) return String(val) !== String(v.$ne);
    if ('$in' in v) return v.$in.map(String).includes(String(val));
  }
  return String(val) === String(v);
});
const applyUpdate = (row, u) => { Object.entries(u.$set || {}).forEach(([k, v]) => setp(row, k, v)); Object.keys(u.$unset || {}).forEach((k) => delp(row, k)); return row; };
const clone = (r) => (r ? JSON.parse(JSON.stringify(r)) : r);
const thenable = (value) => { const p = Promise.resolve(value); p.sort = () => p; p.select = () => p; return p; };

function world({ fee = false, businesses } = {}) {
  setFee(fee);
  const notified = []; const logs = []; const initCalls = [];
  const bizRows = businesses || [{ _id: 'b1', owner: 'owner1', name: 'Shop One', verification: { status: 'none' } }, { _id: 'b2', owner: 'owner2', name: 'Shop Two', verification: { status: 'none' } }];
  const Business = {
    rows: bizRows,
    findById: (id) => thenable(clone(bizRows.find((b) => String(b._id) === String(id)) || null)),
    updateOne: async (filter, update) => { const r = bizRows.find((b) => match(b, filter)); if (!r) return { matchedCount: 0 }; applyUpdate(r, update); return { matchedCount: 1 }; },
  };
  const reqRows = []; let seq = 0;
  const VR = {
    rows: reqRows,
    create: async (d) => {
      if ((d.status || 'pending') === 'pending' && reqRows.some((r) => String(r.business) === String(d.business) && r.status === 'pending')) { const e = new Error('dup'); e.code = 11000; throw e; }
      const row = clone({ _id: `vr${++seq}`, status: 'pending', createdAt: new Date(Date.now() + seq), payment: { status: 'not_required' }, ...d }); reqRows.push(row); return clone(row);
    },
    findOne: (q) => { const hits = reqRows.filter((r) => match(r, q)); return thenable(clone(hits.at(-1) || null)); },
    findById: (id) => thenable(clone(reqRows.find((r) => r._id === id) || null)),
    findOneAndUpdate: async (q, u, opts = {}) => { const hits = reqRows.filter((r) => match(r, q)); const row = opts.sort ? hits.at(-1) : hits[0]; if (!row) return null; applyUpdate(row, u); return clone(row); },
    updateOne: async (q, u) => { const r = reqRows.find((x) => match(x, q)); if (r) applyUpdate(r, u); },
    deleteOne: async (q) => { const i = reqRows.findIndex((x) => match(x, q)); if (i > -1) reqRows.splice(i, 1); },
    exists: async (q) => (reqRows.find((x) => match(x, q)) ? { _id: 1 } : null),
  };
  inject('models/Business.js', Business);
  inject('models/VerificationRequest.js', VR);
  inject('models/AdminLog.js', { create: async (d) => { logs.push(d); return d; }, find: () => thenable([]) });
  inject('services/notificationService.js', { notify: async (to, p) => { notified.push({ to, ...p }); }, notifyOnce: async () => {} });
  inject('services/paystackService.js', {
    isConfigured: () => true,
    initializeTransaction: async (a) => { initCalls.push(a); return { data: { authorization_url: 'https://pay.test/x', reference: 'ref_init_1' } }; },
    verifyTransaction: async (ref) => ({ data: world.nextTxn }),
  });
  for (const f of ['services/verificationService', 'controllers/verificationController', 'controllers/adminController', 'controllers/subscriptionController']) delete require.cache[require.resolve(`../${f}`)];
  const orig = mongoose.isValidObjectId; mongoose.isValidObjectId = () => true;
  return {
    Business, VR, logs, notified, initCalls,
    owner: require('../controllers/verificationController'),
    admin: require('../controllers/adminController'),
    service: require('../services/verificationService'),
    sub: require('../controllers/subscriptionController'),
    restore: () => { mongoose.isValidObjectId = orig; setFee(false); },
  };
}
const ownerReq = (extra = {}) => ({ businessId: 'b1', user: { _id: 'owner1', email: 'o@x.com' }, ...extra });
const adminReq = (extra = {}) => ({ user: { _id: 'admin1' }, ip: '5.5.5.5', ...extra });
const info = { legalName: 'Shop One Ltd', registrationNumber: 'RC123456', website: 'https://shopone.example', notes: 'See our CAC certificate' };
const bizStatus = (w, id = 'b1') => w.Business.rows.find((b) => b.id === id || b._id === id).verification.status;

// ---------------------------------------------------------------- the owner side
test('asking for verification creates a pending request, and an owner can never set their own badge', async () => {
  const w = world();
  try {
    const out = await callHandler(w.owner.requestVerification, ownerReq({
      body: { ...info, status: 'approved', verification: { status: 'verified' }, 'verification.status': 'verified', payment: { status: 'paid' }, decision: { by: 'me' }, business: 'b2', requestedBy: 'someone' },
    }));
    assert.equal(out.status, 201);
    const row = w.VR.rows[0];
    assert.equal(row.status, 'pending', 'only an admin can decide');
    assert.equal(row.payment.status, 'not_required', 'client cannot claim to have paid');
    assert.equal(row.business, 'b1', 'for the logged-in business, not one named in the body');
    assert.equal(row.requestedBy, 'owner1');
    assert.equal(row.decision, undefined);
    assert.equal(bizStatus(w), 'pending', 'the business shows "pending", never "verified"');
    assert.equal(w.logs.length, 0);
  } finally { w.restore(); }
});

test('only one open request per business, and verified businesses cannot re-apply', async () => {
  const w = world();
  try {
    assert.equal((await callHandler(w.owner.requestVerification, ownerReq({ body: info }))).status, 201);
    const again = await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    assert.equal(again.error.statusCode, 409);
    assert.equal(w.VR.rows.length, 1, 'no duplicate request');
    w.Business.rows[0].verification.status = 'verified';
    w.VR.rows[0].status = 'approved';
    const verified = await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    assert.equal(verified.error.statusCode, 409);
  } finally { w.restore(); }
});

test('submitted information is validated and bounded', async () => {
  const w = world();
  try {
    const bad = async (body) => assert.equal((await callHandler(w.owner.requestVerification, ownerReq({ body }))).error.statusCode, 400, JSON.stringify(body).slice(0, 80));
    await bad({}); await bad({ legalName: '' }); await bad({ legalName: 'x' }); await bad({ legalName: { $gt: '' } });
    await bad({ ...info, website: 'javascript:alert(1)' }); await bad({ ...info, website: 'ftp://x.com' }); await bad({ ...info, website: 'https://a.com/<script>' });
    await bad({ ...info, notes: 'x'.repeat(1001) }); await bad({ ...info, registrationNumber: 5 });
    assert.equal(w.VR.rows.length, 0, 'nothing was stored');
    assert.equal(bizStatus(w), 'none');
    const ok = await callHandler(w.owner.requestVerification, ownerReq({ body: { legalName: ' Shop One Ltd \u0000' } }));
    assert.equal(ok.status, 201);
    assert.equal(w.VR.rows[0].submittedInfo.legalName, 'Shop One Ltd');
  } finally { w.restore(); }
});

test('the owner view never exposes payment references or the deciding admin', async () => {
  const w = world();
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    Object.assign(w.VR.rows[0], { status: 'rejected', decision: { by: 'admin1', at: new Date(), reason: 'Documents unclear' } });
    w.VR.rows[0].payment = { status: 'paid', reference: 'secret_ref_123', amountMinor: 500000, currency: 'NGN' };
    const out = await callHandler(w.owner.getMine, ownerReq());
    const json = JSON.stringify(out.body);
    assert.ok(!json.includes('secret_ref_123') && !json.includes('admin1'), 'no payment reference or admin id anywhere');
    const req = out.body.data.request;
    assert.ok(Object.keys(req.payment).every((k) => ['status', 'paidAt'].includes(k)), `payment shows only its status and paid date, got ${Object.keys(req.payment)}`);
    assert.deepEqual(Object.keys(req.decision).sort(), ['at', 'reason'], 'decision shows only when and why');
    assert.deepEqual(out.body.data.fee, { enabled: false, amountMinor: null, currency: null }, 'fee details stay hidden while the fee is off');
    assert.equal(out.body.data.request.decision.reason, 'Documents unclear', 'but they do see why');
    assert.equal(out.body.data.canRequest, true, 'a rejected business may apply again');
  } finally { w.restore(); }
});

// ---------------------------------------------------------------- the fee
test('with no fee configured, requests are free and the fee is not shown or chargeable', async () => {
  const w = world({ fee: false });
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    assert.equal(w.VR.rows[0].payment.status, 'not_required');
    const mine = await callHandler(w.owner.getMine, ownerReq());
    assert.deepEqual(mine.body.data.fee, { enabled: false, amountMinor: null, currency: null });
    const pay = await callHandler(w.owner.startPayment, ownerReq());
    assert.equal(pay.error.statusCode, 400);
    assert.equal(w.initCalls.length, 0, 'Paystack was never contacted');
  } finally { w.restore(); }
});

test('with the fee on, the amount and currency come from configuration, never from the browser', async () => {
  const w = world({ fee: true });
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    assert.equal(w.VR.rows[0].payment.status, 'pending');
    const out = await callHandler(w.owner.startPayment, ownerReq({ body: { amount: 1, amountKobo: 1, currency: 'USD' } }));
    assert.equal(out.error, undefined);
    const call = w.initCalls[0];
    assert.equal(call.amountKobo, 500000); assert.equal(call.currency, 'NGN');
    assert.deepEqual(call.metadata, { type: 'verification', requestId: w.VR.rows[0]._id, businessId: 'b1' });
  } finally { w.restore(); }
});

test('payment checks: only a genuine, correctly priced fee for the right request counts', () => {
  const w = world({ fee: true });
  try {
    const good = { status: 'success', reference: 'ref_good_01', currency: 'NGN', amount: 500000, metadata: { type: 'verification', requestId: 'vr1', businessId: 'b1' } };
    assert.equal(w.service.validateVerificationPayment(good, 'b1').requestId, 'vr1');
    const refused = (txn, biz = 'b1') => assert.throws(() => w.service.validateVerificationPayment(txn, biz), (e) => [400, 403].includes(e.statusCode));
    refused({ ...good, status: 'failed' }); refused({ ...good, status: 'abandoned' }); refused(null);
    refused({ ...good, amount: 100 }); refused({ ...good, amount: 500001 });
    refused({ ...good, currency: 'USD' }); refused({ ...good, currency: undefined });
    refused({ ...good, metadata: { ...good.metadata, type: 'plan' } }); refused({ ...good, metadata: { type: 'verification' } });
    refused({ ...good, reference: 'x' }); refused({ ...good, reference: 'bad ref!!' });
    refused(good, 'b2'); // belongs to someone else's business
  } finally { w.restore(); }
});

test('with no fee configured, no payment is ever accepted', () => {
  const w = world({ fee: false });
  try {
    const txn = { status: 'success', reference: 'ref_good_01', currency: 'NGN', amount: 500000, metadata: { type: 'verification', requestId: 'vr1', businessId: 'b1' } };
    assert.throws(() => w.service.validateVerificationPayment(txn, 'b1'), (e) => e.statusCode === 400);
  } finally { w.restore(); }
});

test('a payment is recorded once, extras are flagged, and paying never verifies the business', async () => {
  const w = world({ fee: true });
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    const id = w.VR.rows[0]._id;
    const txn = (ref) => ({ status: 'success', reference: ref, currency: 'NGN', amount: 500000, paid_at: new Date().toISOString(), metadata: { type: 'verification', requestId: id, businessId: 'b1' } });
    const first = await w.service.applyVerificationPayment(txn('ref_first_01'), { expectedBusinessId: 'b1' });
    assert.equal(first.duplicate, false);
    assert.deepEqual([w.VR.rows[0].payment.status, w.VR.rows[0].payment.reference, w.VR.rows[0].payment.amountMinor, w.VR.rows[0].payment.currency], ['paid', 'ref_first_01', 500000, 'NGN']);
    const replay = await w.service.applyVerificationPayment(txn('ref_first_01'));
    assert.deepEqual([replay.duplicate, replay.extraPayment], [true, false], 'replaying the same payment is harmless');
    const extra = await w.service.applyVerificationPayment(txn('ref_second_01'));
    assert.deepEqual([extra.duplicate, extra.extraPayment], [true, true], 'a second, different payment is flagged for refund');
    assert.equal(w.VR.rows[0].payment.reference, 'ref_first_01', 'the first payment stays on record');
    assert.equal(w.VR.rows[0].status, 'pending', 'paying does not approve');
    assert.equal(bizStatus(w), 'pending', 'and does not verify');
    const again = await callHandler(w.owner.startPayment, ownerReq());
    assert.equal(again.error.statusCode, 409, 'cannot be asked to pay twice');
  } finally { w.restore(); }
});

test('a callback cannot record someone else’s payment against your request', async () => {
  const w = world({ fee: true });
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    world.nextTxn = { status: 'success', reference: 'ref_other_01', currency: 'NGN', amount: 500000, metadata: { type: 'verification', requestId: w.VR.rows[0]._id, businessId: 'b2' } };
    const out = await callHandler(w.owner.verifyPayment, ownerReq({ params: { reference: 'ref_other_01' } }));
    assert.equal(out.error.statusCode, 403);
    assert.equal(w.VR.rows[0].payment.status, 'pending');
  } finally { w.restore(); }
});

test('the Paystack webhook sends fee payments to the verification handler, not the plan handler', async () => {
  const w = world({ fee: true });
  const oldKey = process.env.PAYSTACK_SECRET_KEY; process.env.PAYSTACK_SECRET_KEY = 'sk_test_hook';
  try {
    await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    const id = w.VR.rows[0]._id;
    world.nextTxn = { status: 'success', reference: 'ref_hook_001', currency: 'NGN', amount: 500000, metadata: { type: 'verification', requestId: id, businessId: 'b1' } };
    const raw = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref_hook_001' } }));
    const sign = (b) => crypto.createHmac('sha512', 'sk_test_hook').update(b).digest('hex');
    const bad = await callHandler(w.sub.paystackWebhook, { rawBody: raw, headers: { 'x-paystack-signature': 'forged' }, body: JSON.parse(raw) });
    assert.equal(bad.status, 401); assert.equal(w.VR.rows[0].payment.status, 'pending', 'a forged webhook does nothing');
    const ok = await callHandler(w.sub.paystackWebhook, { rawBody: raw, headers: { 'x-paystack-signature': sign(raw) }, body: JSON.parse(raw) });
    assert.equal(ok.status, 200);
    assert.equal(w.VR.rows[0].payment.status, 'paid');
    assert.equal(w.VR.rows[0].status, 'pending');
  } finally { process.env.PAYSTACK_SECRET_KEY = oldKey; if (oldKey === undefined) delete process.env.PAYSTACK_SECRET_KEY; w.restore(); }
});

// ---------------------------------------------------------------- admin decisions
async function pendingRequest(w) { await callHandler(w.owner.requestVerification, ownerReq({ body: info })); return w.VR.rows.at(-1)._id; }

test('an admin can approve: the badge is set, the decision is audited, and the owner is told', async () => {
  const w = world();
  try {
    const id = await pendingRequest(w);
    const out = await callHandler(w.admin.approveVerification, adminReq({ params: { id }, body: { reason: 'Documents checked' } }));
    assert.equal(out.error, undefined);
    assert.equal(bizStatus(w), 'verified');
    assert.ok(w.Business.rows[0].verification.verifiedAt, 'the date is recorded');
    assert.deepEqual([w.VR.rows[0].status, w.VR.rows[0].decision.by, w.VR.rows[0].decision.reason], ['approved', 'admin1', 'Documents checked']);
    assert.deepEqual([w.logs[0].action, w.logs[0].admin, w.logs[0].targetId, w.logs[0].ip], ['approve_verification', 'admin1', id, '5.5.5.5']);
    assert.equal(w.notified[0].to, 'owner1'); assert.match(w.notified[0].title, /verified/i);
  } finally { w.restore(); }
});

test('approving twice, or two admins at once, decides the request exactly once', async () => {
  const w = world();
  try {
    const id = await pendingRequest(w);
    const [a, b] = await Promise.all([
      callHandler(w.admin.approveVerification, adminReq({ params: { id }, body: {} })),
      callHandler(w.admin.approveVerification, adminReq({ user: { _id: 'admin2' }, params: { id }, body: {} })),
    ]);
    assert.equal([a, b].filter((x) => !x.error).length, 1, 'one winner');
    assert.equal([a, b].filter((x) => x.error && x.error.statusCode === 409).length, 1, 'one told it was already decided');
    assert.equal(w.logs.length, 1); assert.equal(w.notified.length, 1);
    const late = await callHandler(w.admin.rejectVerification, adminReq({ params: { id }, body: { reason: 'too late' } }));
    assert.equal(late.error.statusCode, 409, 'a decided request cannot be flipped by reject');
    assert.equal(bizStatus(w), 'verified');
  } finally { w.restore(); }
});

test('with a fee, approval waits for a confirmed payment', async () => {
  const w = world({ fee: true });
  try {
    const id = await pendingRequest(w);
    const early = await callHandler(w.admin.approveVerification, adminReq({ params: { id }, body: {} }));
    assert.equal(early.error.statusCode, 400); assert.match(early.error.message, /fee/i);
    assert.equal(bizStatus(w), 'pending'); assert.equal(w.VR.rows[0].status, 'pending');
    w.VR.rows[0].payment = { status: 'paid', reference: 'ref_ok_0001', amountMinor: 500000, currency: 'NGN' };
    assert.equal((await callHandler(w.admin.approveVerification, adminReq({ params: { id }, body: {} }))).error, undefined);
    assert.equal(bizStatus(w), 'verified');
  } finally { w.restore(); }
});

test('rejecting needs a reason, tells the owner why, and lets them apply again', async () => {
  const w = world();
  try {
    const id = await pendingRequest(w);
    const none = await callHandler(w.admin.rejectVerification, adminReq({ params: { id }, body: {} }));
    assert.equal(none.error.statusCode, 400);
    assert.equal(w.VR.rows[0].status, 'pending', 'nothing changed without a reason');
    const out = await callHandler(w.admin.rejectVerification, adminReq({ params: { id }, body: { reason: 'Registration number does not match' } }));
    assert.equal(out.error, undefined);
    assert.equal(bizStatus(w), 'rejected');
    assert.match(w.notified[0].message, /Registration number does not match/);
    assert.equal(w.logs[0].reason, 'Registration number does not match');
    const again = await callHandler(w.owner.requestVerification, ownerReq({ body: info }));
    assert.equal(again.status, 201, 'a rejected business may apply again');
    assert.equal(bizStatus(w), 'pending');
  } finally { w.restore(); }
});

test('revoking needs a reason and a verified business, and is recorded', async () => {
  const w = world();
  try {
    const id = await pendingRequest(w);
    await callHandler(w.admin.approveVerification, adminReq({ params: { id }, body: {} }));
    const noReason = await callHandler(w.admin.revokeVerification, adminReq({ params: { id: 'b1' }, body: {} }));
    assert.equal(noReason.error.statusCode, 400); assert.equal(bizStatus(w), 'verified');
    const out = await callHandler(w.admin.revokeVerification, adminReq({ params: { id: 'b1' }, body: { reason: 'Fake documents' } }));
    assert.equal(out.error, undefined);
    assert.equal(bizStatus(w), 'revoked');
    assert.equal(w.Business.rows[0].verification.verifiedAt, undefined, 'the verified date is cleared');
    assert.equal(w.VR.rows[0].status, 'revoked');
    assert.equal(w.logs.at(-1).action, 'revoke_verification');
    assert.match(w.notified.at(-1).message, /Fake documents/);
    const twice = await callHandler(w.admin.revokeVerification, adminReq({ params: { id: 'b1' }, body: { reason: 'again' } }));
    assert.equal(twice.error.statusCode, 409, 'nothing to revoke any more');
    const never = await callHandler(w.admin.revokeVerification, adminReq({ params: { id: 'b2' }, body: { reason: 'x y z' } }));
    assert.equal(never.error.statusCode, 409, 'a business that was never verified cannot be "revoked"');
  } finally { w.restore(); }
});

test('an admin can grant a badge directly, with a reason and a full record', async () => {
  const w = world();
  try {
    const noReason = await callHandler(w.admin.grantVerification, adminReq({ params: { id: 'b2' }, body: {} }));
    assert.equal(noReason.error.statusCode, 400); assert.equal(bizStatus(w, 'b2'), 'none');
    const out = await callHandler(w.admin.grantVerification, adminReq({ params: { id: 'b2' }, body: { reason: 'Known national brand, checked in person' } }));
    assert.equal(out.error, undefined);
    assert.equal(bizStatus(w, 'b2'), 'verified');
    assert.equal(w.VR.rows[0].status, 'approved'); assert.equal(w.VR.rows[0].decision.by, 'admin1');
    assert.equal(w.logs[0].action, 'grant_verification');
    assert.equal((await callHandler(w.admin.grantVerification, adminReq({ params: { id: 'b2' }, body: { reason: 'again please' } }))).error.statusCode, 409, 'already verified');
    await callHandler(w.owner.requestVerification, ownerReq({ body: info })); // b1 now has a pending request
    const blocked = await callHandler(w.admin.grantVerification, adminReq({ params: { id: 'b1' }, body: { reason: 'skip the queue' } }));
    assert.equal(blocked.error.statusCode, 409, 'a pending request must go through review instead');
  } finally { w.restore(); }
});

// ---------------------------------------------------------------- who can reach what
test('only admin-guarded code can ever set "verified"', () => {
  const offenders = [];
  for (const dir of ['controllers', 'services', 'routes', 'models', 'middleware', 'utils']) {
    for (const f of fs.readdirSync(path.join(__dirname, '..', dir))) {
      const code = read(dir, f);
      // a call whose new status (2nd argument) is 'verified'; a guard like { $ne: 'verified' } is not a grant
      if (/setBusinessVerification\(\s*[^,()]+,\s*['"]verified['"]/.test(code) && !['adminController.js'].includes(f)) offenders.push(`${dir}/${f}`);
      if (/['"]verification\.status['"]\s*:\s*['"]verified['"]/.test(code) && f !== 'verificationService.js' && f !== 'adminController.js' && dir !== 'models') offenders.push(`${dir}/${f} (direct write)`);
    }
  }
  assert.deepEqual(offenders, [], 'no other code may grant the badge');
  assert.ok(!/(status|verification\.status)['"]?\s*[:=]\s*['"]verified['"]/.test(read('controllers', 'verificationController.js')), 'the owner controller never assigns "verified"');
});

test('route protection: owners can ask and pay; every decision route is admin-only', () => {
  const admin = read('routes', 'adminRoutes.js');
  assert.ok(/router\.use\(protect,\s*requireRole\("admin"\)\)/.test(admin));
  for (const r of ['/verifications', '/verifications/:id/approve', '/verifications/:id/reject', '/businesses/:id/verification/grant', '/businesses/:id/verification/revoke']) assert.ok(admin.includes(r), r);
  const owner = read('routes', 'verificationRoutes.js');
  assert.ok(/router\.use\(protect,\s*requireBusiness\)/.test(owner));
  assert.ok(!/approve|reject|grant|revoke/.test(owner), 'no decision routes for owners');
  assert.ok(/verificationRoutes/.test(read('app.js')));
  assert.ok(/metadata\.type === 'verification'/.test(read('controllers', 'subscriptionController.js')), 'the webhook dispatches by payment type');
});

test('the audit log can be filtered to one record', () => {
  assert.ok(/query\.targetId = req\.query\.targetId/.test(read('controllers', 'adminController.js')));
});
