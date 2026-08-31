const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const AdminLog = require('../models/AdminLog');
const ApiError = require('../utils/apiError');

const logAction = (adminId, action, targetType, targetId, meta) =>
  AdminLog.create({ admin: adminId, action, targetType, targetId, meta });

// @desc  Admin dashboard overview
// @route GET /api/admin/overview
const getOverview = asyncHandler(async (req, res) => {
  const [totalUsers, totalBusinesses, activeSubs, orders] = await Promise.all([
    User.countDocuments(),
    Business.countDocuments(),
    Subscription.countDocuments({ status: 'active', plan: { $ne: 'free' } }),
    Order.find({ paymentStatus: 'paid' }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newUsers, newBusinesses] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);

  res.json({
    success: true,
    data: { totalUsers, totalBusinesses, activeSubscriptions: activeSubs, revenue, newUsers, newBusinesses },
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search
    ? { $or: [{ fullName: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
    : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, data: { users, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) throw new ApiError(404, 'User not found.');
  await logAction(req.user._id, isActive ? 'activate_user' : 'deactivate_user', 'User', user._id);
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

const getBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search ? { name: new RegExp(search, 'i') } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [businesses, total] = await Promise.all([
    Business.find(query).populate('owner', 'fullName email').sort('-createdAt').skip(skip).limit(Number(limit)),
    Business.countDocuments(query),
  ]);
  res.json({ success: true, data: { businesses, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

const setBusinessPublished = asyncHandler(async (req, res) => {
  const { isPublished } = req.body;
  const business = await Business.findByIdAndUpdate(req.params.id, { isPublished }, { new: true });
  if (!business) throw new ApiError(404, 'Business not found.');
  await logAction(req.user._id, isPublished ? 'publish_business' : 'unpublish_business', 'Business', business._id);
  res.json({ success: true, data: { business } });
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find().populate('business', 'name slug');
  res.json({ success: true, data: { subscriptions } });
});

module.exports = {
  getOverview, getUsers, setUserActive, getBusinesses, setBusinessPublished, getSubscriptions,
};
