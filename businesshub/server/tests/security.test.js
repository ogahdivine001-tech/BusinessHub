const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const escapeRegex = require('../utils/escapeRegex');
const { assertSafeImage } = require('../services/uploadService');

test('search text is turned into a harmless literal pattern', () => {
  assert.doesNotThrow(() => new RegExp(escapeRegex('(')), 'a lone "(" used to crash the request');
  assert.ok(new RegExp(escapeRegex('a.b'), 'i').test('a.b'));
  assert.ok(!new RegExp(escapeRegex('a.b'), 'i').test('axb'), '"." must not act as a wildcard');
  assert.ok(!new RegExp(escapeRegex('.*'), 'i').test('anything'), '".*" must not match everything');
  const start = Date.now(); new RegExp(escapeRegex('(a+)+$'), 'i').test('a'.repeat(40) + '!');
  assert.ok(Date.now() - start < 50, 'catastrophic patterns are neutralised');
  assert.equal(escapeRegex('x'.repeat(500)).length, 100, 'overlong input is capped');
  assert.equal(escapeRegex(undefined), '');
});

test('no controller builds a pattern straight from what the user typed', () => {
  const dir = path.join(__dirname, '..', 'controllers');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!/new RegExp\(\s*(search|q|query|term|keyword|req\.)/.test(code), `${file} builds a RegExp from raw input`);
  }
});

test('only real, reasonably sized images are accepted for upload', () => {
  const ok = (uri) => assert.doesNotThrow(() => assertSafeImage(uri));
  const bad = (uri, why) => assert.throws(() => assertSafeImage(uri), (e) => e.statusCode === 400, why);
  ok('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  ok('data:image/png;base64,iVBORw0KGgo=');
  ok('data:image/webp;base64,UklGRg==');
  ok('data:image/heic;base64,AAAA');
  bad('data:image/svg+xml;base64,PHN2Zz4=', 'SVG can carry scripts');
  bad('data:text/html;base64,PGgxPg==', 'HTML');
  bad('data:application/pdf;base64,JVBERi0=', 'PDF');
  bad('https://example.com/pic.jpg', 'a link, not an upload');
  bad(undefined, 'nothing');
  bad({ evil: true }, 'an object');
  bad('data:image/png;base64,' + 'A'.repeat(11 * 1024 * 1024), 'over 8 MB');
});

test('the payment webhook is the only public payment route', () => {
  const router = require('../routes/subscriptionRoutes');
  const layers = router.stack;
  const guardAt = layers.findIndex((l) => !l.route); // first plain middleware = the login guard
  const publicRoutes = layers.slice(0, guardAt).filter((l) => l.route).map((l) => l.route.path);
  const guardedRoutes = layers.slice(guardAt).filter((l) => l.route).map((l) => l.route.path);
  assert.deepEqual(publicRoutes, ['/webhook']);
  for (const p of ['/me', '/checkout', '/verify/:reference']) assert.ok(guardedRoutes.includes(p), `${p} must require login`);
});
