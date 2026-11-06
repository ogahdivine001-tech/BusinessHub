const ApiError = require('./apiError');

// Server-side checks for invoice/receipt input. Totals are computed from
// these values, so they must be real, finite numbers before any maths happens.

const MAX_ITEMS = 100;

function money(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new ApiError(400, `${label} must be a valid, non-negative amount.`);
  return Math.round(n * 100) / 100;
}

function cleanItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Add at least one item.');
  if (items.length > MAX_ITEMS) throw new ApiError(400, `A document can have at most ${MAX_ITEMS} items.`);
  return items.map((item, i) => {
    const description = String((item && item.description) ?? '').trim();
    if (!description || description.length > 300) throw new ApiError(400, `Item ${i + 1} needs a description (up to 300 characters).`);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1e6) throw new ApiError(400, `Item ${i + 1} needs a quantity of at least 1.`);
    return { description, quantity, price: money(item.price, `Item ${i + 1} price`) };
  });
}

const sumItems = (items) => Math.round(items.reduce((s, it) => s + it.price * it.quantity, 0) * 100) / 100;

module.exports = { cleanItems, sumItems, money, MAX_ITEMS };
