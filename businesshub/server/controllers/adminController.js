const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Business = require("../models/Business");
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const AdminLog = require("../models/AdminLog");
const ApiError = require("../utils/apiError");
const escapeRegex = require("../utils/escapeRegex");
const { getEffectivePlan, isPaidPlanExpired, CURRENT_POLICY } = require("../services/subscriptionService");
const Review = require("../models/Review");
const VerificationRequest = require("../models/VerificationRequest");
const { notify } = require("../services/notificationService");
const { setBusinessVerification } = require("../services/verificationService");
const { recomputeBusinessRating } = require("../services/ratingService");
const mongoose = require("mongoose");
const AdminMessage = require("../models/AdminMessage");
const { resolveRecipients, deliverMessage, AUDIENCES, MAX_RECIPIENTS } = require("../services/messageService");
const { isConfigured: emailConfigured } = require("../services/emailService");

const PLAN_DURATION_DAYS = 30; // matches the monthly billing model shown on /pricing

// Records a privileged action: who (admin), what, which record, before/after
// values (meta), the stated reason, and the request's IP. The reason is read
// from the request body when the admin supplies one.
const logAction = (req, action, targetType, targetId, meta) => {
  const reason = req.body && typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : undefined;
  return AdminLog.create({
    admin: req.user._id,
    action,
    targetType,
    targetId,
    meta,
    reason: reason || undefined,
    ip: req.ip,
  });
};

// @desc  Admin dashboard overview
// @route GET /api/admin/overview
const getOverview = asyncHandler(async (req, res) => {
  const [totalUsers, totalBusinesses, activeSubs, orders, verifiedBusinesses, pendingVerifications, totalBuyers, totalSellers] = await Promise.all([
    User.countDocuments(),
    Business.countDocuments(),
    // Paid plans whose period is still running (or legacy rows with no end date).
    Subscription.countDocuments({
      status: "active",
      plan: { $ne: "free" },
      $or: [
        { currentPeriodEnd: { $gt: new Date() } },
        { currentPeriodEnd: null },
      ],
    }),
    Order.find({ paymentStatus: "paid" }),
    Business.countDocuments({ "verification.status": "verified" }),
    VerificationRequest.countDocuments({ status: "pending" }),
    User.countDocuments({ role: "buyer" }),
    User.countDocuments({ role: "owner" }),
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
      totalBuyers,
      totalSellers,
      verifiedBusinesses,
      pendingVerifications,
      activeSubscriptions: activeSubs,
      revenue,
      newUsers,
      newBusinesses,
    },
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const query = typeof search === "string" && search
    ? {
        $or: [
          { fullName: new RegExp(escapeRegex(search), "i") },
          { email: new RegExp(escapeRegex(search), "i") },
        ],
      }
    : {};
  if (["owner", "buyer", "admin"].includes(role)) query.role = role; // seller / customer / admin
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
  if (typeof isActive !== "boolean") throw new ApiError(400, "isActive must be true or false.");
  if (!isActive && String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, "You cannot deactivate your own account.");
  }
  const before = await User.findById(req.params.id).select("isActive email role");
  if (!before) throw new ApiError(404, "User not found.");
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true },
  );
  await logAction(
    req,
    isActive ? "activate_user" : "deactivate_user",
    "User",
    user._id,
    { email: before.email, role: before.role, from: before.isActive, to: isActive },
  );
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

// @desc  List businesses, each annotated with its current subscription plan
// @route GET /api/admin/businesses
const getBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search ? { name: new RegExp(escapeRegex(search), "i") } : {};
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
  const subByBusiness = new Map(
    subscriptions.map((s) => [s.business.toString(), s]),
  );
  const businessesWithPlan = businesses.map((b) => {
    const sub = subByBusiness.get(b._id.toString());
    return {
      ...b.toObject(),
      plan: (sub && sub.plan) || "free", // the plan on record
      effectivePlan: getEffectivePlan(sub), // what the business can use right now
      planExpired: isPaidPlanExpired(sub), // paid period has run out
    };
  });

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
  if (typeof isPublished !== "boolean") throw new ApiError(400, "isPublished must be true or false.");
  const before = await Business.findById(req.params.id).select("isPublished name");
  if (!before) throw new ApiError(404, "Business not found.");
  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { isPublished },
    { new: true },
  );
  await logAction(
    req,
    isPublished ? "publish_business" : "unpublish_business",
    "Business",
    business._id,
    { name: before.name, from: before.isPublished, to: isPublished },
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
  const previous = await Subscription.findOne({ business: business._id });

  const currentPeriodEnd =
    plan === "free"
      ? undefined
      : new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const subscription = await Subscription.findOneAndUpdate(
    { business: business._id },
    {
      $set: { plan, status: "active", currentPeriodEnd },
      $setOnInsert: { policyVersion: CURRENT_POLICY }, // existing rows keep their own policy
    },
    { new: true, upsert: true },
  );

  await logAction(
    req,
    "manual_plan_change",
    "Business",
    business._id,
    {
      name: business.name,
      from: previous ? previous.plan : "free",
      to: plan,
      previousPeriodEnd: previous ? previous.currentPeriodEnd : null,
      newPeriodEnd: currentPeriodEnd || null,
    },
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

// ---------------------------------------------------------------------------
// Messaging customers (email and/or in-app notification)
// ---------------------------------------------------------------------------

// @desc  How many people an audience would reach (shown before sending)
// @route GET /api/admin/messages/audience?audience=trial&userEmail=
const countAudience = asyncHandler(async (req, res) => {
  const { audience, userEmail } = req.query;
  if (!AUDIENCES.includes(audience)) throw new ApiError(400, "Choose who to send to.");
  const recipients = await resolveRecipients(audience, { userEmail });
  res.json({
    success: true,
    data: {
      count: recipients.length,
      sample: recipients.slice(0, 3).map((u) => u.fullName),
      emailConfigured: emailConfigured(),
      max: MAX_RECIPIENTS,
    },
  });
});

// @desc  Send a message to customers by email, in-app notification, or both
// @route POST /api/admin/messages
const sendMessage = asyncHandler(async (req, res) => {
  const { audience, userEmail, subject, body, link, channels, confirm } = req.body;

  if (!AUDIENCES.includes(audience)) throw new ApiError(400, "Choose who to send to.");
  const cleanSubject = String(subject || "").trim();
  const cleanBody = String(body || "").trim();
  if (!cleanSubject || cleanSubject.length > 150) throw new ApiError(400, "Add a subject (up to 150 characters).");
  if (!cleanBody || cleanBody.length > 5000) throw new ApiError(400, "Add a message (up to 5000 characters).");
  const useEmail = Boolean(channels && channels.email);
  const useNotification = Boolean(channels && channels.notification);
  if (!useEmail && !useNotification) throw new ApiError(400, "Choose email, notification, or both.");

  // The link must stay inside the app: a path such as /dashboard/invoices.
  let cleanLink;
  if (link && String(link).trim()) {
    cleanLink = String(link).trim();
    if (!/^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/.test(cleanLink)) {
      throw new ApiError(400, "The link must be a page inside BusinessHub, like /dashboard/invoices.");
    }
  }

  const recipients = await resolveRecipients(audience, { userEmail });
  if (!recipients.length) throw new ApiError(400, "No matching active people for that choice.");
  if (recipients.length > MAX_RECIPIENTS) {
    throw new ApiError(400, `That is ${recipients.length} people. The limit per send is ${MAX_RECIPIENTS}; choose a smaller group.`);
  }
  if (recipients.length > 1 && confirm !== true) {
    throw new ApiError(400, `Please confirm that you want to send this to ${recipients.length} people.`);
  }

  const message = await AdminMessage.create({
    admin: req.user._id,
    subject: cleanSubject,
    body: cleanBody,
    link: cleanLink,
    audience,
    audienceLabel: audience === "user" ? String(userEmail).trim().toLowerCase() : undefined,
    channels: { email: useEmail, notification: useNotification },
    recipientCount: recipients.length,
  });
  await logAction(req, "message.send", "AdminMessage", message._id, {
    audience,
    recipients: recipients.length,
    channels: message.channels,
  });

  // Answer right away; delivery continues in the background (emails are
  // spaced out, so a large send takes a while).
  res.status(202).json({ success: true, data: { message } });

  deliverMessage(message, recipients).catch(async (err) => {
    console.error("[admin-message] delivery crashed:", err.message);
    await AdminMessage.updateOne({ _id: message._id }, { $set: { status: "failed", finishedAt: new Date() } }).catch(() => {});
  });
});

// @desc  History of messages sent by admins
// @route GET /api/admin/messages
const getMessages = asyncHandler(async (req, res) => {
  const messages = await AdminMessage.find().sort("-createdAt").limit(30).populate("admin", "fullName");
  res.json({ success: true, data: { messages } });
});

// ------------------------------------------------------------------ verification
const requireReason = (req, min = 3) => {
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (reason.length < min) throw new ApiError(400, "Please give a reason.");
  return reason;
};
const validId = (id) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Not found."); };

// @desc  Verification requests, newest first
// @route GET /api/admin/verifications?status=pending|approved|rejected|revoked&page=
const listVerifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const query = {};
  if (["pending", "approved", "rejected", "revoked"].includes(req.query.status)) query.status = req.query.status;
  const [requests, total] = await Promise.all([
    VerificationRequest.find(query).sort("-createdAt").skip((page - 1) * limit).limit(limit)
      .populate("business", "name slug category verification").populate("requestedBy", "fullName email"),
    VerificationRequest.countDocuments(query),
  ]);
  res.json({ success: true, data: { requests, total, page, pages: Math.ceil(total / limit) } });
});

// @desc  One request with the business it is about and the action history
// @route GET /api/admin/verifications/:id
const getVerification = asyncHandler(async (req, res) => {
  validId(req.params.id);
  const request = await VerificationRequest.findById(req.params.id)
    .populate("business", "name slug category description phone email location verification createdAt")
    .populate("requestedBy", "fullName email phone")
    .populate("decision.by", "fullName email");
  if (!request) throw new ApiError(404, "Verification request not found.");
  const bizId = request.business && request.business._id ? request.business._id : request.business;
  const history = await AdminLog.find({
    $or: [{ targetType: "VerificationRequest", targetId: request._id }, { targetType: "Business", targetId: bizId, action: { $in: ["grant_verification", "revoke_verification"] } }],
  }).sort("-createdAt").limit(50).populate("admin", "fullName email");
  res.json({ success: true, data: { request, history } });
});

// Claims a pending request for a decision. Only one admin action can win, so
// two admins clicking at once cannot both decide it.
async function claimPending(id, status, req, reason) {
  const claimed = await VerificationRequest.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status, "decision.by": req.user._id, "decision.at": new Date(), "decision.reason": reason || undefined } },
    { new: true },
  );
  if (!claimed) {
    const exists = await VerificationRequest.findById(id);
    throw exists ? new ApiError(409, "This request has already been decided.") : new ApiError(404, "Verification request not found.");
  }
  return claimed;
}
const releaseClaim = (id) =>
  VerificationRequest.updateOne({ _id: id }, { $set: { status: "pending" }, $unset: { "decision.by": 1, "decision.at": 1, "decision.reason": 1 } });

// @desc  Approve: the business becomes verified
// @route POST /api/admin/verifications/:id/approve
const approveVerification = asyncHandler(async (req, res) => {
  validId(req.params.id);
  const note = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  const current = await VerificationRequest.findById(req.params.id);
  if (!current) throw new ApiError(404, "Verification request not found.");
  // A fee, when one applies, must be confirmed by Paystack first. Payment never verifies anyone by itself.
  if (current.status === "pending" && !["not_required", "paid"].includes(current.payment && current.payment.status)) {
    throw new ApiError(400, "The verification fee has not been confirmed yet.");
  }
  const request = await claimPending(req.params.id, "approved", req, note);
  try {
    await setBusinessVerification(request.business, "verified");
  } catch (err) {
    await releaseClaim(request._id); // keep the two records consistent: undo and let the admin retry
    throw err;
  }
  await logAction(req, "approve_verification", "VerificationRequest", request._id, { business: request.business, payment: request.payment && request.payment.status });
  await notify(request.requestedBy, { title: "Your business is verified", message: "Your verification request was approved. The badge now shows on your storefront.", type: "system", link: "/dashboard/verification" });
  res.json({ success: true, data: { request } });
});

// @desc  Reject (reason required; the business may apply again)
// @route POST /api/admin/verifications/:id/reject
const rejectVerification = asyncHandler(async (req, res) => {
  validId(req.params.id);
  const reason = requireReason(req);
  const request = await claimPending(req.params.id, "rejected", req, reason);
  try {
    await setBusinessVerification(request.business, "rejected", { onlyIf: { "verification.status": "pending" } });
  } catch (err) {
    await releaseClaim(request._id);
    throw err;
  }
  await logAction(req, "reject_verification", "VerificationRequest", request._id, { business: request.business, payment: request.payment && request.payment.status });
  await notify(request.requestedBy, { title: "Verification not approved", message: `Your verification request was not approved: ${reason}. You can apply again after addressing this.`, type: "system", link: "/dashboard/verification" });
  res.json({ success: true, data: { request } });
});

// @desc  Remove a badge (reason required)
// @route POST /api/admin/businesses/:id/verification/revoke
const revokeVerification = asyncHandler(async (req, res) => {
  validId(req.params.id);
  const reason = requireReason(req);
  const business = await Business.findById(req.params.id).select("name owner verification");
  if (!business) throw new ApiError(404, "Business not found.");
  if (!business.verification || business.verification.status !== "verified") throw new ApiError(409, "This business is not verified.");
  await setBusinessVerification(business._id, "revoked", { onlyIf: { "verification.status": "verified" } });
  await VerificationRequest.findOneAndUpdate(
    { business: business._id, status: "approved" },
    { $set: { status: "revoked", "decision.by": req.user._id, "decision.at": new Date(), "decision.reason": reason } },
    { sort: { createdAt: -1 } },
  );
  await logAction(req, "revoke_verification", "Business", business._id, { name: business.name, from: "verified", to: "revoked" });
  await notify(business.owner, { title: "Verification badge removed", message: `Your verification badge was removed: ${reason}`, type: "system", link: "/dashboard/verification" });
  res.json({ success: true, data: { status: "revoked" } });
});

// @desc  Give a badge directly (reason required), leaving a full record behind
// @route POST /api/admin/businesses/:id/verification/grant
const grantVerification = asyncHandler(async (req, res) => {
  validId(req.params.id);
  const reason = requireReason(req);
  const business = await Business.findById(req.params.id).select("name owner verification");
  if (!business) throw new ApiError(404, "Business not found.");
  if (business.verification && business.verification.status === "verified") throw new ApiError(409, "This business is already verified.");
  if (await VerificationRequest.exists({ business: business._id, status: "pending" })) {
    throw new ApiError(409, "This business has a pending request. Review and approve that request instead.");
  }
  const request = await VerificationRequest.create({
    business: business._id, requestedBy: req.user._id, status: "approved",
    payment: { status: "not_required" },
    decision: { by: req.user._id, at: new Date(), reason },
  });
  try {
    await setBusinessVerification(business._id, "verified");
  } catch (err) {
    await VerificationRequest.deleteOne({ _id: request._id });
    throw err;
  }
  await logAction(req, "grant_verification", "Business", business._id, { name: business.name, from: (business.verification && business.verification.status) || "none", to: "verified", requestId: request._id });
  await notify(business.owner, { title: "Your business is verified", message: "BusinessHub has verified your business. The badge now shows on your storefront.", type: "system", link: "/dashboard/verification" });
  res.json({ success: true, data: { request } });
});

// @desc  List reviews for moderation (newest first)
// @route GET /api/admin/reviews?status=&page=
const getReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const query = {};
  if (["published", "hidden"].includes(req.query.status)) query.status = req.query.status;
  const [reviews, total] = await Promise.all([
    Review.find(query).sort("-createdAt").skip((page - 1) * limit).limit(limit)
      .populate("business", "name slug").populate("user", "fullName email"),
    Review.countDocuments(query),
  ]);
  res.json({ success: true, data: { reviews, total, page, pages: Math.ceil(total / limit) } });
});

// @desc  Hide or restore a review. Hiding needs a reason; both are audited.
// @route PATCH /api/admin/reviews/:id  { status: "hidden"|"published", reason }
const moderateReview = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Review not found.");
  const { status } = req.body;
  if (!["hidden", "published"].includes(status)) throw new ApiError(400, "Status must be hidden or published.");
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (status === "hidden" && reason.length < 3) throw new ApiError(400, "Please give a reason for hiding this review.");

  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found.");
  const from = review.status;
  review.status = status;
  review.moderatedBy = req.user._id;
  review.moderatedAt = new Date();
  review.moderationReason = reason ? reason.slice(0, 500) : undefined;
  await review.save();
  const summary = await recomputeBusinessRating(review.business); // ratings follow moderation
  await logAction(req, status === "hidden" ? "hide_review" : "restore_review", "Review", review._id, {
    business: review.business, from, to: status, ratingAfter: summary,
  });
  res.json({ success: true, data: { review, summary } });
});

// @desc  Read-only history of privileged admin actions (newest first)
// @route GET /api/admin/audit-logs?action=&targetType=&page=&limit=
const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const query = {};
  if (typeof req.query.action === "string" && req.query.action) query.action = req.query.action.slice(0, 60);
  if (typeof req.query.targetType === "string" && req.query.targetType) query.targetType = req.query.targetType.slice(0, 60);
  if (mongoose.isValidObjectId(req.query.targetId)) query.targetId = req.query.targetId;
  const [logs, total] = await Promise.all([
    AdminLog.find(query).sort("-createdAt").skip((page - 1) * limit).limit(limit).populate("admin", "fullName email"),
    AdminLog.countDocuments(query),
  ]);
  res.json({ success: true, data: { logs, total, page, pages: Math.ceil(total / limit) } });
});

module.exports = {
  listVerifications,
  getVerification,
  approveVerification,
  rejectVerification,
  revokeVerification,
  grantVerification,
  getReviews,
  moderateReview,
  getAuditLogs,
  getOverview,
  getUsers,
  setUserActive,
  getBusinesses,
  setBusinessPublished,
  setBusinessPlan,
  getSubscriptions,
  countAudience,
  sendMessage,
  getMessages,
};
