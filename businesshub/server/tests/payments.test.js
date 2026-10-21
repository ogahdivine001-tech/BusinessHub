const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

const Payment = makeModel([], { unique: ['reference'] });
const Subscription = makeModel([
  { business: 'b1', plan: 'free', status: 'active' },
  { business: 'b2', plan: 'free', status: 'active' },
]);
inject('models/Payment.js', Payment);
inject('models/Subscription.js', Subscription);
process.env.PAYSTACK_SECRET_KEY = 'sk_test_secret';

// Stand-in for Paystack's verify API.
const txns = {}; const apiCalls = [];
globalThis.fetch = async (url) => {
  apiCalls.push(url);
  const t = txns[decodeURIComponent(url.split('/verify/')[1])];
  return t ? { ok: true, status: 200, json: async () => ({ status: true, data: t }) } : { ok: false, status: 404, json: async () => ({}) };
};
const ctrl = require('../controllers/subscriptionController');
const { PLAN_PRICES_KOBO } = require('../services/subscriptionActivation');
const sub = (b) => Subscription.rows.find((s) => s.business === b);
const paymentsFor = (ref) => Payment.rows.filter((p) => p.reference === ref);
const txn = (reference, businessId, plan, extra = {}) => ({ reference, status: 'success', amount: PLAN_PRICES_KOBO[plan], currency: 'NGN', metadata: { businessId, plan }, paid_at: new Date().toISOString(), ...extra });
const verify = (reference, businessId) => callHandler(ctrl.verifyCheckout, { params: { reference }, businessId, user: { _id: 'u-' + businessId } });
const webhook = (body, signature) => {
  const raw = Buffer.from(JSON.stringify(body));
  const sig = signature ?? crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  return callHandler(ctrl.paystackWebhook, { headers: { 'x-paystack-signature': sig }, rawBody: raw, body });
};

test('a genuine payment upgrades the business', async () => {
  txns.ref_good_1 = txn('ref_good_1', 'b1', 'starter');
  const r = await verify('ref_good_1', 'b1');
  assert.equal(r.body.data.subscription.plan, 'starter');
  assert.equal(sub('b1').plan, 'starter');
  assert.ok(new Date(sub('b1').currentPeriodEnd) > Date.now() + 29 * 864e5, 'paid period is about 30 days');
  assert.equal(paymentsFor('ref_good_1').length, 1);
  assert.ok(paymentsFor('ref_good_1')[0].activatedAt, 'payment is marked as applied');
});

test('replaying the same payment changes nothing (an admin downgrade stays)', async () => {
  sub('b1').plan = 'free'; // admin downgrades the business
  const r = await verify('ref_good_1', 'b1');
  assert.equal(r.body.data.alreadyProcessed, true);
  assert.equal(sub('b1').plan, 'free', 'the old receipt must not bring the paid plan back');
  assert.equal(paymentsFor('ref_good_1').length, 1);
});

test("another business cannot use someone else's payment", async () => {
  const r = await verify('ref_good_1', 'b2');
  assert.equal(r.error.statusCode, 403);
  assert.equal(sub('b2').plan, 'free');
});

test('underpaying is refused', async () => {
  txns.ref_cheap = txn('ref_cheap', 'b2', 'pro', { amount: 200000 }); // paid Starter money for Pro
  const r = await verify('ref_cheap', 'b2');
  assert.equal(r.error.statusCode, 400);
  assert.equal(sub('b2').plan, 'free');
  assert.equal(paymentsFor('ref_cheap').length, 0);
});

test('wrong currency, failed payments and non-plan payments are refused', async () => {
  txns.ref_usd = txn('ref_usd', 'b2', 'starter', { currency: 'USD' });
  txns.ref_failed = txn('ref_failed', 'b2', 'starter', { status: 'failed' });
  txns.ref_other = { reference: 'ref_other', status: 'success', amount: 200000, currency: 'NGN', metadata: {} };
  for (const ref of ['ref_usd', 'ref_failed', 'ref_other']) assert.equal((await verify(ref, 'b2')).error.statusCode, 400, ref);
  assert.equal(sub('b2').plan, 'free');
});

test('a malformed reference never reaches Paystack', async () => {
  const before = apiCalls.length;
  assert.equal((await verify('../../x', 'b2')).error.statusCode, 400);
  assert.equal(apiCalls.length, before);
});

test('an unknown reference is a clean error', async () => {
  assert.equal((await verify('ref_unknown_9', 'b2')).error.statusCode, 502);
});

test('webhook: a forged or missing signature is rejected and activates nothing', async () => {
  txns.ref_wh_1 = txn('ref_wh_1', 'b2', 'pro');
  const body = { event: 'charge.success', data: { reference: 'ref_wh_1' } };
  assert.equal((await webhook(body, 'deadbeef')).status, 401);
  assert.equal((await callHandler(ctrl.paystackWebhook, { body })).status, 401);
  assert.equal(paymentsFor('ref_wh_1').length, 0);
  assert.equal(sub('b2').plan, 'free');
});

test('webhook: a correctly signed payment activates the plan once, even if repeated', async () => {
  const body = { event: 'charge.success', data: { reference: 'ref_wh_1' } };
  assert.equal((await webhook(body)).status, 200);
  assert.equal(sub('b2').plan, 'pro');
  assert.equal(paymentsFor('ref_wh_1')[0].source, 'webhook');
  assert.equal((await webhook(body)).status, 200); // Paystack retries are normal
  assert.equal(paymentsFor('ref_wh_1').length, 1);
});

test('the browser callback after the webhook does not apply it a second time', async () => {
  const r = await verify('ref_wh_1', 'b2');
  assert.equal(r.body.data.alreadyProcessed, true);
});

test('webhook: events we do not act on, and payments failing our checks, are acknowledged but ignored', async () => {
  txns.ref_wh_bad = txn('ref_wh_bad', 'b1', 'pro', { amount: 1 });
  assert.equal((await webhook({ event: 'charge.success', data: { reference: 'ref_wh_bad' } })).status, 200);
  assert.equal((await webhook({ event: 'transfer.success', data: { reference: 'ref_wh_bad' } })).status, 200);
  assert.equal(sub('b1').plan, 'free');
  assert.equal(paymentsFor('ref_wh_bad').length, 0);
});

test('webhook: if Paystack cannot be reached we answer with an error so Paystack retries', async () => {
  const r = await webhook({ event: 'charge.success', data: { reference: 'ref_missing_1' } });
  assert.equal(r.error.statusCode, 502);
});

test('callback and webhook arriving at the same moment apply the payment exactly once', async () => {
  txns.ref_race = txn('ref_race', 'b1', 'starter');
  let upgrades = 0; const original = Subscription.findOneAndUpdate;
  Subscription.findOneAndUpdate = async (...a) => { upgrades++; return original(...a); };
  try {
    await Promise.all([verify('ref_race', 'b1'), webhook({ event: 'charge.success', data: { reference: 'ref_race' } })]);
  } finally { Subscription.findOneAndUpdate = original; }
  assert.equal(upgrades, 1);
  assert.equal(paymentsFor('ref_race').length, 1);
  assert.equal(sub('b1').plan, 'starter');
});
