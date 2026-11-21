const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const KEYS = ['BREVO_API_KEY', 'BREVO_FROM', 'BREVO_FROM_NAME', 'BREVO_REPLY_TO', 'RESEND_API_KEY', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_TIMEOUT_MS'];
const realFetch = global.fetch;
const realLog = console.log, realWarn = console.warn, realError = console.error;

// Fresh module + clean env + captured fetch for every test.
function setup(env = {}, reply = { ok: true, status: 201, json: async () => ({ messageId: '<abc@brevo>' }) }) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null }); return typeof reply === 'function' ? reply(url) : reply; };
  const logs = [];
  console.log = (...a) => logs.push(a.join(' '));
  console.warn = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
  const file = path.join(__dirname, '..', 'services', 'emailService.js');
  delete require.cache[require.resolve(file)];
  return { svc: require(file), calls, logs };
}
test.afterEach(() => { global.fetch = realFetch; console.log = realLog; console.warn = realWarn; console.error = realError; for (const k of KEYS) delete process.env[k]; });

const ENV = { BREVO_API_KEY: 'xkeysib-SECRET', BREVO_FROM: 'hello@businesshub.ng' };

test('Brevo: sends to the v3 transactional endpoint with the right shape', async () => {
  const { svc, calls } = setup(ENV);
  const r = await svc.sendEmail({ to: 'ada@example.com', subject: 'Hi', html: '<p>x</p>' });
  assert.deepEqual(r, { sent: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['api-key'], 'xkeysib-SECRET');
  assert.deepEqual(calls[0].body.sender, { email: 'hello@businesshub.ng', name: 'BusinessHub' });
  assert.deepEqual(calls[0].body.to, [{ email: 'ada@example.com' }]);
  assert.equal(calls[0].body.subject, 'Hi');
  assert.equal(calls[0].body.htmlContent, '<p>x</p>');
  assert.equal(calls[0].body.replyTo, undefined);
  assert.ok(calls[0].init.signal, 'has a timeout signal');
});

test('Brevo: sender name and reply-to are configurable; a bad reply-to is ignored', async () => {
  let t = setup({ ...ENV, BREVO_FROM_NAME: 'BusinessHub NG', BREVO_REPLY_TO: 'support@x.com' });
  await t.svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' });
  assert.equal(t.calls[0].body.sender.name, 'BusinessHub NG');
  assert.deepEqual(t.calls[0].body.replyTo, { email: 'support@x.com' });
  t = setup({ ...ENV, BREVO_REPLY_TO: 'not-an-email' });
  await t.svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' });
  assert.equal(t.calls[0].body.replyTo, undefined);
});

test('Brevo wins over Resend and SMTP when all are configured', async () => {
  const { svc, calls } = setup({ ...ENV, RESEND_API_KEY: 're_x', SMTP_USER: 'u', SMTP_PASS: 'p' });
  assert.equal(svc.activeProvider(), 'brevo');
  await svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.brevo\.com/);
});

test('API key without a valid BREVO_FROM does not use Brevo, and says why', async () => {
  for (const from of [undefined, '', 'not-an-email']) {
    const { svc, calls, logs } = setup({ BREVO_API_KEY: 'k', ...(from === undefined ? {} : { BREVO_FROM: from }) });
    assert.equal(svc.activeProvider(), null);
    assert.equal(svc.isConfigured(), false);
    const r = await svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' });
    assert.deepEqual(r, { sent: false });
    assert.equal(calls.length, 0, 'no network call');
    assert.ok(logs.some((l) => /BREVO_FROM/.test(l)), 'logs the reason');
  }
});

test('falls back to Resend when Brevo is not set up (existing deployments keep working)', async () => {
  const { svc, calls } = setup({ RESEND_API_KEY: 're_x' }, { ok: true, status: 200, json: async () => ({ id: 'r1' }) });
  assert.equal(svc.activeProvider(), 'resend');
  await svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' });
  assert.match(calls[0].url, /api\.resend\.com/);
});

test('nothing configured: skips quietly instead of throwing', async () => {
  const { svc, calls } = setup({});
  assert.equal(svc.isConfigured(), false);
  assert.deepEqual(await svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' }), { sent: false });
  assert.equal(calls.length, 0);
});

test('Brevo errors throw a useful message and never leak the API key', async () => {
  const { svc, logs } = setup(ENV, { ok: false, status: 400, json: async () => ({ code: 'invalid_parameter', message: 'Sender is not valid' }) });
  await assert.rejects(() => svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' }), (e) => {
    assert.match(e.message, /Brevo returned 400: Sender is not valid/);
    assert.ok(!e.message.includes('xkeysib-SECRET'));
    return true;
  });
  assert.ok(logs.every((l) => !l.includes('xkeysib-SECRET')), 'key not in logs');
});

test('Brevo errors with a non-JSON body still throw cleanly', async () => {
  const { svc } = setup(ENV, { ok: false, status: 502, json: async () => { throw new Error('not json'); } });
  await assert.rejects(() => svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' }), /Brevo returned 502$/);
});

test('a Brevo success without a JSON body is still a success', async () => {
  const { svc } = setup(ENV, { ok: true, status: 201, json: async () => { throw new Error('empty'); } });
  assert.deepEqual(await svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' }), { sent: true });
});

test('network failure or timeout surfaces as an error (callers decide whether to ignore it)', async () => {
  const { svc } = setup(ENV, () => { throw new Error('connect ETIMEDOUT'); });
  await assert.rejects(() => svc.sendEmail({ to: 'a@b.co', subject: 's', html: 'h' }), /ETIMEDOUT/);
});

test('the real templates go out through Brevo (password reset, welcome)', async () => {
  const { svc, calls } = setup(ENV);
  await svc.sendPasswordResetEmail('a@b.co', 'https://app.example/reset/abc');
  assert.match(calls[0].body.subject, /reset/i);
  assert.ok(calls[0].body.htmlContent.includes('https://app.example/reset/abc'));
  await svc.sendWelcomeEmail({ fullName: 'Ada Lovelace', email: 'a@b.co' }, { trialDays: 7 });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.body.sender.email === 'hello@businesshub.ng' && c.body.to[0].email === 'a@b.co'));
});
