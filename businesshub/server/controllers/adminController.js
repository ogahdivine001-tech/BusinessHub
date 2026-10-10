const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Business = require("../models/Business");
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const AdminLog = require("../models/AdminLog");
const ApiError = require("../utils/apiError");

const PLAN_DURATION_DAYS = 30; // matches the monthly billing model shown on /pricing

const logAction = (adminId, action, targetType, targetId, meta) =>
  AdminLog.create({ admin: adminId, action, targetType, targetId, meta });

// @desc  Admin dashboard overview
// @route GET /api/admin/overview
const getOverview = asyncHandler(async (req, res) => {
  const [totalUsers, totalBusinesses, activeSubs, orders] = await Promise.all([
    User.countDocuments(),
    Business.countDocuments(),
    Subscription.countDocuments({ status: "active", plan: { $ne: "free" } }),
    Order.find({ paymentStatus: "paid" }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newUsers, newBusinesses] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalBusinesses,
      activeSubscriptions: activeSubs,
      revenue,
      newUsers,
      newBusinesses,
    },
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search
    ? {
        $or: [
          { fullName: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      }
    : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort("-createdAt").skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);
  res.json({
    success: true,
    data: { users, total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true },
  );
  if (!user) throw new ApiError(404, "User not found.");
  await logAction(
    req.user._id,
    isActive ? "activate_user" : "deactivate_user",
    "User",
    user._id,
  );
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

// @desc  List businesses, each annotated with its current subscription plan
// @route GET /api/admin/businesses
const getBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search ? { name: new RegExp(search, "i") } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [businesses, total] = await Promise.all([
    Business.find(query)
      .populate("owner", "fullName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Business.countDocuments(query),
  ]);

  // Attach each business's current plan so admins can see + change it
  // from the same list, without a separate lookup per row.
  const subscriptions = await Subscription.find({
    business: { $in: businesses.map((b) => b._id) },
  });
  const planByBusiness = new Map(
    subscriptions.map((s) => [s.business.toString(), s.plan]),
  );
  const businessesWithPlan = businesses.map((b) => ({
    ...b.toObject(),
    plan: planByBusiness.get(b._id.toString()) || "free",
  }));

  res.json({
    success: true,
    data: {
      businesses: businessesWithPlan,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

const setBusinessPublished = asyncHandler(async (req, res) => {
  const { isPublished } = req.body;
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { isPublished },
    { new: true },
  );
  if (!business) throw new ApiError(404, "Business not found.");
  await logAction(
    req.user._id,
    isPublished ? "publish_business" : "unpublish_business",
    "Business",
    business._id,
  );
  res.json({ success: true, data: { business } });
});

// @desc  Manually set a business's subscription plan — e.g. after
//        confirming a bank transfer while Paystack is still in test mode
//        or awaiting verification. Sets a normal 30-day period, same as
//        an automatic Paystack-driven upgrade would.
// @route PATCH /api/admin/businesses/:id/plan
const setBusinessPlan = asyncHandler(async (req, res) => {
  const { plan } = req.body; // 'free' | 'starter' | 'pro'
  if (!["free", "starter", "pro"].includes(plan)) {
    throw new ApiError(400, "Plan must be free, starter, or pro.");
  }

  const business = await Business.findById(req.params.id);
  if (!business) throw new ApiError(404, "Business not found.");

  const currentPeriodEnd =
    plan === "free"
      ? undefined
      : new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const subscription = await Subscription.findOneAndUpdate(
    { business: business._id },
    { plan, status: "active", currentPeriodEnd },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await logAction(
    req.user._id,
    "manual_plan_change",
    "Business",
    business._id,
    { plan },
  );

  res.json({ success: true, data: { subscription } });
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find().populate(
    "business",
    "name slug",
  );
  res.json({ success: true, data: { subscriptions } });
});

module.exports = {
  getOverview,
  getUsers,
  setUserActive,
  getBusinesses,
  setBusinessPublished,
  setBusinessPlan,
  getSubscriptions,
};
