const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');

const PAGE_SIZE = 10;

// What a customer is allowed to see about their own order. Deliberately a
// whitelist: the seller's private notes, the seller's customer record and the
// business owner's id never leave the server through this endpoint.
function toCustomerView(order) {
  const biz = order.business && typeof order.business === 'object' ? order.business : null;
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    items: (order.items || []).map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
    business: biz
      ? {
          name: biz.name,
          // Only link to a storefront that is still public.
          slug: biz.isPublished ? biz.slug : null,
          logoUrl: biz.logo?.url || null,
        }
      : null,
  };
}

// @desc  Orders the logged-in person placed while signed in
// @route GET /api/my-orders?page=
const listMine = asyncHandler(async (req, res) => {
  // Only a plain number counts: arrays/objects from odd query strings mean page 1.
  const rawPage = typeof req.query.page === 'string' ? req.query.page : '';
  const page = /^\d{1,6}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const filter = { buyer: req.user._id };
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: 'business', select: 'name slug logo isPublished' }),
    Order.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: {
      orders: rows.map(toCustomerView),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  });
});

module.exports = { listMine, toCustomerView, PAGE_SIZE };
