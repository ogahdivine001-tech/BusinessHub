const crypto = require('crypto');

// Signed, expiring share links for invoice/receipt PDFs.
//
// Invoices and receipts contain a customer's name, phone and amounts, so a
// bare database id in a URL is not enough protection. A share token proves
// the link was issued by this server for exactly this document, and stops
// working after DOC_LINK_TTL_DAYS. The owner always gets fresh tokens
// whenever they list or open their documents, so a link never "runs out" for
// the business, only for someone holding an old copy.

const TYPES = ['invoice', 'receipt'];

function secret() {
  const s = process.env.DOC_LINK_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('DOC_LINK_SECRET or JWT_SECRET must be set to sign document links.');
  // Derive a purpose-specific key so a token can never double as anything else.
  return crypto.createHmac('sha256', s).update('businesshub:document-link:v1').digest();
}

function ttlSeconds() {
  const days = Number(process.env.DOC_LINK_TTL_DAYS);
  return Math.round((days > 0 ? days : 90) * 24 * 60 * 60);
}

function mac(type, id, exp) {
  return crypto.createHmac('sha256', secret()).update(`${type}:${String(id)}:${exp}`).digest('base64url');
}

function signDocLink(type, id, now = Date.now()) {
  if (!TYPES.includes(type)) throw new Error('Unknown document type.');
  const exp = Math.floor(now / 1000) + ttlSeconds();
  return `${exp}.${mac(type, id, exp)}`;
}

function verifyDocLink(type, id, token, now = Date.now()) {
  if (!TYPES.includes(type) || typeof token !== 'string' || token.length > 200) return false;
  const [expStr, sig, extra] = token.split('.');
  if (extra !== undefined || !/^\d{1,12}$/.test(expStr || '') || !sig) return false;
  const exp = Number(expStr);
  if (exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(mac(type, id, exp));
  const given = Buffer.from(sig);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Links shared before signed links existed are plain /:id/pdf URLs. Turning
// them off at once would break PDFs customers already received, so they keep
// working until LEGACY_PUBLIC_PDF_LINKS=false is set. Flip it once the
// business has had time to re-share.
function legacyLinksAllowed() {
  return String(process.env.LEGACY_PUBLIC_PDF_LINKS || 'true').toLowerCase() !== 'false';
}

// Decides whether a public PDF request may proceed.
//  - A token, if given, must be valid. A bad token is never excused by the
//    legacy switch.
//  - With no token, access depends on the legacy switch.
function canAccessSharedDoc(type, id, token) {
  if (token !== undefined && token !== '') return verifyDocLink(type, id, token);
  return legacyLinksAllowed();
}

module.exports = { signDocLink, verifyDocLink, canAccessSharedDoc, legacyLinksAllowed };
