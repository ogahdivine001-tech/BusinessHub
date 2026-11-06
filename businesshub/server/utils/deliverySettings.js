const ApiError = require('./apiError');

const STATUSES = ['unspecified', 'available', 'unavailable'];

// Turns whatever the client sent into a clean delivery object. The business
// supplies every detail; nothing (fees, times, areas) is ever invented here.
// Details are only kept while delivery is "available", so stale terms never
// show up on a business that stopped delivering.
function sanitizeDelivery(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Delivery settings are not valid.');
  }
  const status = input.status;
  if (!STATUSES.includes(status)) {
    throw new ApiError(400, 'Choose whether delivery is available or not available.');
  }
  const text = (v, max, label) => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') throw new ApiError(400, `${label} must be text.`);
    const t = v.trim();
    if (t.length > max) throw new ApiError(400, `${label} can be at most ${max} characters.`);
    return t;
  };
  if (status !== 'available') return { status, areas: '', terms: '', contact: '' };
  return {
    status,
    areas: text(input.areas, 300, 'Delivery areas'),
    terms: text(input.terms, 500, 'Delivery terms'),
    contact: text(input.contact, 300, 'Delivery contact instructions'),
  };
}

module.exports = { sanitizeDelivery, STATUSES };
