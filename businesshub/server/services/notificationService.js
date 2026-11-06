const Notification = require('../models/Notification');

const LOW_STOCK_THRESHOLD = 3;

// Fire-and-forget style helper: creates a notification for a user. Never
// throws into the caller's request — a failed notification shouldn't ever
// block the actual order/invoice/etc. from succeeding.
async function notify(userId, { title, message, type = 'system', link }) {
  try {
    await Notification.create({ user: userId, title, message, type, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// Creates a notification only the first time a given key is seen for a user
// (the unique index makes this safe even if two requests race).
async function notifyOnce(userId, key, payload) {
  try {
    if (await Notification.exists({ user: userId, key })) return false;
    await Notification.create({ user: userId, key, type: 'system', ...payload });
    return true;
  } catch (err) {
    if (err.code !== 11000) console.error('Failed to create notification:', err.message);
    return false;
  }
}

// Checks whether a product just crossed into low-stock territory and, if
// so, notifies the business owner. Only fires once per crossing (i.e. not
// on every order once it's already low) by checking the stock level
// BEFORE this decrement against the threshold.
async function maybeNotifyLowStock({ ownerId, product, previousStock, businessSlug }) {
  if (previousStock > LOW_STOCK_THRESHOLD && product.stockQuantity <= LOW_STOCK_THRESHOLD) {
    await notify(ownerId, {
      title: product.stockQuantity === 0 ? 'Product out of stock' : 'Low stock alert',
      message: `"${product.name}" is down to ${product.stockQuantity} unit${product.stockQuantity === 1 ? '' : 's'}.`,
      type: 'inventory',
      link: '/dashboard/products',
    });
  }
}

module.exports = { notifyOnce, notify, maybeNotifyLowStock, LOW_STOCK_THRESHOLD };
