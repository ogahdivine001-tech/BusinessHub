const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeModel, inject, callHandler } = require('./helpers/fakes');

process.env.JWT_SECRET = 'test-secret-step5';
const DAY = 864e5;
const future = (d) => new Date(Date.now() + d * DAY);
const past = (d) => new Date(Date.now() - d * DAY);

const svc = require('../services/subscriptionService');
const { getLimits, getLimitsFor, getRenewalInfo, aiCategoryOf } = svc;

// ---------------------------------------------------------------- the plan tables
test('legacy terms are exactly what existing customers had before', () => {
  const l = (p) => getLimits(p, 'legacy');
  assert.deepEqual([l('free').products, l('free').invoicesPerMonth, l('free').receiptsPerMonth, l('free').aiSharedCap], [10, 5, 5, 15]);
  assert.deepEqual([l('starter').products, l('starter').invoicesPerMonth, l('starter').receiptsPerMonth, l('starter').aiSharedCap], [150, 100, 100, 150]);
  assert.deepEqual([l('pro').products, l('pro').invoicesPerMonth, l('pro').aiSharedCap], [Infinity, Infinity, Infinity]);
  for (const p of ['free', 'starter', 'pro']) assert.ok(Object.values(l(p).features).every(Boolean), `legacy ${p} keeps every feature`);
});

test('v2 terms: Free has no tools, Starter has 100 products and limited AI, Pro is unlimited', () => {
  const l = (p) => getLimits(p, 'v2');
  assert.equal(l('free').products, 10);
  assert.deepEqual(l('free').features, { invoices: false, receipts: false, aiChat: false, aiMarketing: false, aiDocuments: false });
  assert.equal(l('starter').products, 100);
  assert.deepEqual(l('starter').aiCaps, { chat: Infinity, marketing: 0, documents: 50 });
  assert.deepEqual(l('starter').features, { invoices: true, receipts: true, aiChat: true, aiMarketing: false, aiDocuments: true });
  assert.ok(Object.values(l('pro').features).every(Boolean));
  assert.deepEqual([l('pro').products, l('pro').aiCaps.chat, l('pro').aiCaps.marketing, l('pro').aiCaps.documents], [Infinity, Infinity, Infinity, Infinity]);
});

test('the Starter product limit and AI document quota are configurable', () => {
  const p = svc.buildPolicies({ STARTER_PRODUCT_LIMIT: '120', STARTER_AI_DOCUMENTS_PER_MONTH: '80' });
  assert.equal(p.v2.starter.products, 120); assert.equal(p.v2.starter.aiCaps.documents, 80);
  const bad = svc.buildPolicies({ STARTER_PRODUCT_LIMIT: 'abc', STARTER_AI_DOCUMENTS_PER_MONTH: '-5' });
  assert.equal(bad.v2.starter.products, 100); assert.equal(bad.v2.starter.aiCaps.documents, 50);
  assert.equal(svc.buildPolicies({}).legacy.starter.products, 150, 'legacy never changes with config');
});

test('existing subscriptions are NOT silently moved to the new terms', () => {
  const Subscription = require('../models/Subscription');
  assert.equal(new Subscription({ business: '64b000000000000000000001' }).policyVersion, undefined, 'no schema default');
  // A record loaded from the database that predates the field:
  const old = Subscription.hydrate({ _id: '64b000000000000000000002', business: '64b000000000000000000001', plan: 'starter', status: 'active', currentPeriodEnd: future(5) });
  assert.equal(old.policyVersion, undefined, 'hydrating an old row must not invent a version');
  assert.equal(getLimitsFor(old).products, 150, 'so it keeps the 150-product Starter terms');
  assert.equal(getLimitsFor(null).invoicesPerMonth, 5, 'no subscription row at all: legacy Free');
  assert.equal(getLimits('starter', 'garbage').products, 150, 'unknown version falls back to legacy, never to stricter');
});

test('a new business gets Pro for the trial, then the new Free terms', () => {
  const during = { plan: 'free', policyVersion: 'v2', trialEndsAt: future(3) };
  const after = { plan: 'free', policyVersion: 'v2', trialEndsAt: past(1) };
  assert.equal(getLimitsFor(during).products, Infinity);
  assert.equal(getLimitsFor(during).features.aiMarketing, true);
  assert.equal(getLimitsFor(after).features.invoices, false);
  assert.equal(getLimitsFor({ plan: 'free', trialEndsAt: past(1) }).invoicesPerMonth, 5, 'a legacy business after trial keeps legacy Free');
});

test('an expired paid plan falls to the Free terms of the same policy', () => {
  assert.equal(getLimitsFor({ plan: 'starter', policyVersion: 'v2', currentPeriodEnd: past(1) }).features.invoices, false);
  assert.equal(getLimitsFor({ plan: 'starter', policyVersion: 'legacy', currentPeriodEnd: past(1) }).invoicesPerMonth, 5);
});

test('every AI request type belongs to exactly one category', () => {
  assert.equal(aiCategoryOf('chat'), 'chat');
  for (const t of ['productDescription', 'socialCaption', 'advertisement', 'businessDescription', 'marketingIdeas', 'productName']) assert.equal(aiCategoryOf(t), 'marketing');
  assert.equal(aiCategoryOf('invoiceNotes'), 'documents');
  assert.equal(aiCategoryOf('receiptNotes'), 'documents');
  assert.equal(aiCategoryOf('hack'), null);
  assert.equal(aiCategoryOf(undefined), null);
  const all = Object.values(svc.AI_CATEGORY_TYPES).flat();
  assert.equal(new Set(all).size, all.length, 'no type is in two categories');
  // The server must know a prompt for every type it allows.
  const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'services', 'aiService.js'), 'utf8');
  for (const t of all) assert.ok(new RegExp(`\\b${t}:`).test(aiSrc), `no prompt for ${t}`);
});

// ---------------------------------------------------------------- AI enforcement (real handler, fake data)
function aiHarness({ sub, usage = [], aiFails = false }) {
  const AIUsage = makeModel(usage);
  inject('models/AIUsage.js', AIUsage);
  inject('models/Subscription.js', makeModel(sub ? [{ business: 'b1', ...sub }] : []));
  const calls = [];
  inject('services/aiService.js', {
    generateAIContent: async (type) => { calls.push(type); if (aiFails) throw new Error('provider down'); return 'generated text'; },
    isConfigured: () => true, getProvider: () => ({ label: 'Test' }),
  });
  delete require.cache[require.resolve('../controllers/aiController')];
  const ctrl = require('../controllers/aiController');
  const ask = (type, extra = {}) => callHandler(ctrl.generate, { businessId: 'b1', body: { type, ...extra } });
  return { ask, AIUsage, calls, ctrl };
}
const month = () => new Date().toISOString().slice(0, 7);
const used = (type, n) => Array.from({ length: n }, () => ({ business: 'b1', type, monthKey: month() }));

test('new Free accounts get no AI at all, and the provider is never contacted', async () => {
  const h = aiHarness({ sub: { plan: 'free', policyVersion: 'v2', trialEndsAt: past(1) } });
  for (const t of ['chat', 'productDescription', 'invoiceNotes']) {
    const out = await h.ask(t, { message: 'hi' });
    assert.equal(out.error.statusCode, 403, t);
  }
  assert.deepEqual(h.calls, []);
  assert.equal(h.AIUsage.rows.length, 0, 'nothing reserved or charged');
});

test('new Starter: chat and invoice writing yes, marketing tools no', async () => {
  const h = aiHarness({ sub: { plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) } });
  assert.equal((await h.ask('chat', { message: 'hello' })).error, undefined);
  assert.equal((await h.ask('invoiceNotes', { items: 'Logo' })).error, undefined);
  const out = await h.ask('socialCaption', { product: 'x' });
  assert.equal(out.error.statusCode, 403);
  assert.match(out.error.message, /Pro plan/);
  assert.ok(!h.calls.includes('socialCaption'), 'the marketing request never reached the provider');
});

test('Starter invoice/receipt AI is capped at 50 per month combined, and chat does not eat that quota', async () => {
  const h = aiHarness({ sub: { plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) }, usage: [...used('invoiceNotes', 30), ...used('receiptNotes', 20), ...used('chat', 400)] });
  const blocked = await h.ask('invoiceNotes');
  assert.equal(blocked.error.statusCode, 403, '30 + 20 = 50 combined: the 51st is refused');
  assert.equal((await h.ask('receiptNotes')).error.statusCode, 403, 'receipts share the same pool');
  assert.equal((await h.ask('chat', { message: 'still works' })).error, undefined, 'chat is separate');
  assert.equal(h.AIUsage.rows.filter((r) => r.type === 'invoiceNotes').length, 30, 'a refused request is not recorded');
});

test('Starter at 49 can make exactly one more document request', async () => {
  const h = aiHarness({ sub: { plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) }, usage: used('invoiceNotes', 49) });
  assert.equal((await h.ask('invoiceNotes')).error, undefined);
  assert.equal((await h.ask('invoiceNotes')).error.statusCode, 403);
});

test('Pro has every AI feature with no cap', async () => {
  const h = aiHarness({ sub: { plan: 'pro', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) }, usage: [...used('chat', 5000), ...used('productName', 5000), ...used('invoiceNotes', 5000)] });
  for (const t of ['chat', 'productName', 'invoiceNotes']) assert.equal((await h.ask(t)).error, undefined, t);
});

test('existing (legacy) businesses keep their old single shared AI allowance', async () => {
  const h = aiHarness({ sub: { plan: 'free', status: 'active' }, usage: [...used('chat', 10), ...used('productName', 4)] }); // 14 of 15 used, no policyVersion
  assert.equal((await h.ask('socialCaption', { product: 'x' })).error, undefined, 'marketing still allowed for legacy Free');
  const out = await h.ask('chat', { message: 'one more' });
  assert.equal(out.error.statusCode, 403, 'the 16th shared request is refused');
  assert.match(out.error.message, /15 AI requests/);
});

test('an unknown request type is refused before anything is reserved', async () => {
  const h = aiHarness({ sub: { plan: 'pro', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) } });
  const out = await h.ask('delete-everything');
  assert.equal(out.error.statusCode, 400);
  assert.equal(h.AIUsage.rows.length, 0);
});

test('a provider failure gives the reserved use back', async () => {
  const h = aiHarness({ sub: { plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) }, usage: used('invoiceNotes', 10), aiFails: true });
  const out = await h.ask('invoiceNotes');
  assert.match(out.error.message, /provider down/);
  assert.equal(h.AIUsage.rows.length, 10, 'still 10: a failed answer is not counted');
});

test('usage report: per-category figures and a sensible headline', async () => {
  const h = aiHarness({ sub: { plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) } });
  const mongoose = require('mongoose');
  const bid = new mongoose.Types.ObjectId();
  inject('models/Subscription.js', makeModel([{ business: String(bid), plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(10) }]));
  // The usage report groups rows in the database; stand in for that grouping.
  inject('models/AIUsage.js', { aggregate: async () => [{ _id: 'invoiceNotes', n: 12 }, { _id: 'chat', n: 40 }] });
  delete require.cache[require.resolve('../controllers/aiController')];
  const ctrl = require('../controllers/aiController');
  const out = await callHandler(ctrl.getUsage, { businessId: bid });
  const d = out.body.data;
  assert.deepEqual([d.used, d.limit, d.scope], [12, 50, 'documents'], 'headline = the capped category');
  assert.deepEqual(d.categories.marketing, { used: 0, limit: 0, enabled: false });
  assert.equal(d.categories.chat.enabled, true);
  assert.equal(d.features.aiMarketing, false);
});

// ---------------------------------------------------------------- invoices & receipts gating
function docHarness(sub) {
  inject('models/Subscription.js', makeModel(sub ? [{ business: 'b1', ...sub }] : []));
  inject('models/Invoice.js', { countDocuments: async () => 0, deleteOne: async () => {} });
  inject('models/Receipt.js', { countDocuments: async () => 0, deleteOne: async () => {} });
  inject('models/Customer.js', { exists: async () => null });
  for (const f of ['invoiceController', 'receiptController']) delete require.cache[require.resolve(`../controllers/${f}`)];
  return { inv: require('../controllers/invoiceController'), rec: require('../controllers/receiptController') };
}
const docBody = { customer: 'c1', items: [{ description: 'x', quantity: 1, price: 5 }] };

test('new Free accounts cannot create invoices or receipts (clear message, server-side)', async () => {
  const h = docHarness({ plan: 'free', policyVersion: 'v2', trialEndsAt: past(1) });
  for (const [fn, word] of [[h.inv.createInvoice, /Invoices are available/], [h.rec.createReceipt, /Receipts are available/]]) {
    const out = await callHandler(fn, { businessId: 'b1', body: docBody });
    assert.equal(out.error.statusCode, 403); assert.match(out.error.message, word);
  }
});

test('Starter passes the plan gate (and is then validated like any request); legacy Free is unchanged', async () => {
  const starter = docHarness({ plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(5) });
  let out = await callHandler(starter.inv.createInvoice, { businessId: 'b1', body: docBody });
  assert.equal(out.error.statusCode, 400, 'got past the plan gate; stopped at "choose a real customer"');
  const legacyFree = docHarness({ plan: 'free', status: 'active' });
  out = await callHandler(legacyFree.inv.createInvoice, { businessId: 'b1', body: docBody });
  assert.equal(out.error.statusCode, 400, 'existing Free accounts can still create invoices');
});

test('existing invoices stay viewable after a plan lapses (only creating new ones is gated)', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'invoiceController.js'), 'utf8');
  const gate = code.indexOf('features.invoices');
  const createStart = code.indexOf('const createInvoice');
  const getStart = code.indexOf('const getInvoices');
  assert.ok(gate > createStart && !(gate > getStart && gate < createStart), 'the gate lives inside createInvoice only');
});

// ---------------------------------------------------------------- renewal
const { nextPeriodEnd } = require('../services/subscriptionActivation');
const within = (d, ms, tol = 5000) => Math.abs(d.getTime() - ms) < tol;

test('renewing the same plan early adds 30 days to what is left', () => {
  const end = future(10);
  assert.ok(within(nextPeriodEnd({ plan: 'starter', currentPeriodEnd: end, status: 'active' }, 'starter'), end.getTime() + 30 * DAY), '10 days left + 30');
});
test('renewing after expiry, or switching plans, starts a fresh 30 days from today', () => {
  const fresh = Date.now() + 30 * DAY;
  assert.ok(within(nextPeriodEnd({ plan: 'starter', currentPeriodEnd: past(3), status: 'active' }, 'starter'), fresh));
  assert.ok(within(nextPeriodEnd({ plan: 'starter', currentPeriodEnd: future(10), status: 'active' }, 'pro'), fresh), 'upgrade: new period from today');
  assert.ok(within(nextPeriodEnd(null, 'starter'), fresh));
  assert.ok(within(nextPeriodEnd({ plan: 'pro', status: 'active' }, 'pro'), fresh), 'legacy row with no end date');
  assert.ok(within(nextPeriodEnd({ plan: 'starter', currentPeriodEnd: future(2), status: 'cancelled' }, 'starter'), future(2).getTime() + 30 * DAY), 'a cancelled plan still running can be renewed on top');
});

test('activation stamps new subscriptions with the current policy but never rewrites an existing one', async () => {
  const updates = [];
  const Subscription = makeModel([]);
  const original = Subscription.findOneAndUpdate;
  Subscription.findOneAndUpdate = async (q, u, o) => { updates.push(u); return original(q, u, o); };
  const Payment = makeModel([], { unique: ['reference'] });
  Payment.findOneAndUpdate = async (q, u) => { const r = Payment.rows.find((x) => x._id === q._id && !x.activatedAt); if (!r) return null; Object.assign(r, u.$set); return { ...r }; };
  inject('models/Subscription.js', Subscription); inject('models/Payment.js', Payment);
  delete require.cache[require.resolve('../services/subscriptionActivation')];
  const { activateFromTransaction, PLAN_PRICES_KOBO } = require('../services/subscriptionActivation');
  await activateFromTransaction({ status: 'success', reference: 'ref_000001', currency: 'NGN', amount: PLAN_PRICES_KOBO.starter, metadata: { plan: 'starter', businessId: 'b9' } }, { source: 'callback' });
  assert.equal(updates[0].$setOnInsert.policyVersion, 'v2', 'new subscription gets today’s terms');
  assert.equal(updates[0].$set.policyVersion, undefined, 'an existing subscription’s policy is never overwritten');
  assert.equal(updates[0].$set.plan, 'starter');
});

test('renewal reminders: 3 days before, and after expiry for 60 days', () => {
  const s = (d) => ({ plan: 'starter', currentPeriodEnd: d });
  assert.equal(getRenewalInfo(s(future(10))).state, null);
  assert.equal(getRenewalInfo(s(future(3))).state, 'expiring');
  assert.equal(getRenewalInfo(s(future(0.2))).daysLeft, 1);
  assert.equal(getRenewalInfo(s(past(1))).state, 'expired');
  assert.equal(getRenewalInfo(s(past(61))).state, null, 'stop nagging after 60 days');
  assert.equal(getRenewalInfo({ plan: 'free' }).state, null);
  assert.equal(getRenewalInfo(null).state, null);
  assert.equal(getRenewalInfo({ plan: 'pro' }).state, null, 'legacy row with no end date');
});

test('a reminder notification is created once per period, not once per page load', async () => {
  const rows = [];
  inject('models/Notification.js', {
    exists: async (q) => rows.some((r) => r.user === q.user && r.key === q.key) || null,
    create: async (d) => { if (rows.some((r) => r.user === d.user && r.key === d.key)) { const e = new Error('dup'); e.code = 11000; throw e; } rows.push(d); },
  });
  delete require.cache[require.resolve('../services/notificationService')];
  const { notifyOnce } = require('../services/notificationService');
  assert.equal(await notifyOnce('u1', 'renewal-expiring-2026-11-05', { title: 't' }), true);
  assert.equal(await notifyOnce('u1', 'renewal-expiring-2026-11-05', { title: 't' }), false);
  assert.equal(await notifyOnce('u1', 'renewal-expired-2026-11-05', { title: 't' }), true, 'a different stage is a different reminder');
  assert.equal(rows.length, 2);
});

// ---------------------------------------------------------------- subscription endpoint & checkout
function subHarness(sub) {
  const notified = [];
  const mongoose = require('mongoose');
  const bid = new mongoose.Types.ObjectId();
  inject('models/Subscription.js', makeModel(sub ? [{ business: String(bid), ...sub }] : []));
  inject('models/Product.js', { countDocuments: async () => 7 });
  inject('models/Invoice.js', { countDocuments: async () => 2 });
  inject('models/Receipt.js', { countDocuments: async () => 1 });
  inject('models/AIUsage.js', { aggregate: async () => [{ _id: 'chat', n: 3 }] });
  inject('services/notificationService.js', { notifyOnce: async (...a) => { notified.push(a); }, notify: async () => {} });
  const init = [];
  inject('services/paystackService.js', { initializeTransaction: async (a) => { init.push(a); return { data: { authorization_url: 'https://pay.test' } }; }, verifyTransaction: async () => ({}), isConfigured: () => true });
  delete require.cache[require.resolve('../controllers/subscriptionController')];
  return { ctrl: require('../controllers/subscriptionController'), notified, init, bid };
}

test('the subscription endpoint reports features, policy, renewal state and AI usage by category', async () => {
  const h = subHarness({ plan: 'starter', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(2) });
  const out = await callHandler(h.ctrl.getMySubscription, { businessId: h.bid, user: { _id: 'u1' } });
  const d = out.body.data;
  assert.equal(d.policyVersion, 'v2');
  assert.equal(d.effectivePlan, 'starter');
  assert.equal(d.features.aiMarketing, false);
  assert.equal(d.renewal.state, 'expiring');
  assert.equal(d.usage.products, 7);
  assert.deepEqual(d.usage.ai.chat, { used: 3, limit: Infinity, enabled: true });
  assert.equal(d.usage.ai.documents.limit, 50);
  assert.equal(h.notified.length, 1);
  assert.match(h.notified[0][1], /^renewal-expiring-\d{4}-\d{2}-\d{2}$/);

  const legacy = subHarness({ plan: 'starter', status: 'active', currentPeriodEnd: future(20) });
  const out2 = await callHandler(legacy.ctrl.getMySubscription, { businessId: legacy.bid, user: { _id: 'u1' } });
  assert.equal(out2.body.data.policyVersion, 'legacy');
  assert.equal(out2.body.data.limits.products, 150);
  assert.equal(legacy.notified.length, 0, 'no reminder when there is plenty of time');
});

test('someone with Pro time left cannot accidentally buy Starter over it', async () => {
  const h = subHarness({ plan: 'pro', policyVersion: 'v2', status: 'active', currentPeriodEnd: future(12) });
  const out = await callHandler(h.ctrl.startCheckout, { businessId: h.bid, user: { _id: 'u1', email: 'a@x.com' }, body: { plan: 'starter' } });
  assert.equal(out.error.statusCode, 400);
  assert.match(out.error.message, /after your Pro plan ends/);
  assert.equal(h.init.length, 0, 'no payment was started');
  const ok = await callHandler(h.ctrl.startCheckout, { businessId: h.bid, user: { _id: 'u1', email: 'a@x.com' }, body: { plan: 'pro' } });
  assert.equal(ok.error, undefined, 'renewing Pro is fine');
  assert.equal(h.init.length, 1);

  const expired = subHarness({ plan: 'pro', policyVersion: 'v2', status: 'active', currentPeriodEnd: past(2) });
  const ok2 = await callHandler(expired.ctrl.startCheckout, { businessId: expired.bid, user: { _id: 'u1', email: 'a@x.com' }, body: { plan: 'starter' } });
  assert.equal(ok2.error, undefined, 'once Pro has ended, Starter is allowed');
});

// ---------------------------------------------------------------- products
test('the Starter product limit counts all products, not new ones this month', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'productController.js'), 'utf8');
  assert.ok(/countProducts = \(\) => Product\.countDocuments\(\{ business: req\.businessId \}\)/.test(code), 'a plain total count, no date filter');
});
