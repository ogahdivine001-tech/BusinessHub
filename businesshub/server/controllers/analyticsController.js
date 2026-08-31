const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { getLimits, getEffectivePlan } = require('../services/subscriptionService');

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

// Free plan only gets "basic analytics" (7d/30d); 90-day and 1-year views
// are Starter/Pro's "advanced analytics". Checked here, not just hidden in
// the UI, so a direct API call with ?range=1y can't bypass it.
async function assertRangeAllowed(businessId, range) {
  const requested = range || '30d';
  const subscription = await Subscription.findOne({ business: businessId });
  const limits = getLimits(getEffectivePlan(subscription));
  if (!limits.analyticsRanges.includes(requested)) {
    throw new ApiError(
      403,
      `The ${requested} view is part of advanced analytics. Upgrade to Starter or Pro to unlock 90-day and 1-year ranges.`
    );
  }
  return requested;
}

const getOverview = asyncHandler(async (req, res) => {
  const requestedRange = await assertRangeAllowed(req.businessId, req.query.range);
  const range = RANGE_DAYS[requestedRange] || 30;
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - range * 24 * 60 * 60 * 1000);

  const [currentOrders, previousOrders, productCount, customerCount] = await Promise.all([
    Order.find({ business: req.businessId, createdAt: { $gte: since } }),
    Order.find({ business: req.businessId, createdAt: { $gte: prevSince, $lt: since } }),
    Product.countDocuments({ business: req.businessId }),
    Customer.countDocuments({ business: req.businessId }),
  ]);

  const sum = (orders) => orders.reduce((s, o) => s + o.total, 0);
  const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));

  const revenue = sum(currentOrders);
  const prevRevenue = sum(previousOrders);

  res.json({
    success: true,
    data: {
      stats: {
        revenue: { value: revenue, change: pctChange(revenue, prevRevenue) },
        orders: { value: currentOrders.length, change: pctChange(currentOrders.length, previousOrders.length) },
        customers: { value: customerCount },
        products: { value: productCount },
      },
    },
  });
});

const getRevenueOverTime = asyncHandler(async (req, res) => {
  const requestedRange = await assertRangeAllowed(req.businessId, req.query.range);
  const range = RANGE_DAYS[requestedRange] || 30;
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

  const data = await Order.aggregate([
    { $match: { business: req.businessId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: { series: data.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })) } });
});

const getSalesByCategory = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { business: req.businessId } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories',
        localField: 'productInfo.category',
        foreignField: '_id',
        as: 'categoryInfo',
      },
    },
    { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
        total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, data: { categories: data.map((d) => ({ name: d._id, total: d.total })) } });
});

const getBestSellers = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { business: req.businessId } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { quantitySold: -1 } },
    { $limit: 5 },
  ]);
  res.json({ success: true, data: { bestSellers: data } });
});

module.exports = { getOverview, getRevenueOverTime, getSalesByCategory, getBestSellers };
