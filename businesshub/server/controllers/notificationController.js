const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Invoice = require("../models/Invoice");
const ApiError = require("../utils/apiError");
const { notify } = require("../services/notificationService");

// There's no reliable background cron in this app (deliberately — see the
// trial system's reasoning: free-tier hosts like Render sleep and can't be
// trusted to fire scheduled jobs on time). So instead, overdue invoices are
// checked opportunistically every time someone actually loads their
// notifications — which happens automatically every 60s while the
// dashboard is open. overdueNotifiedAt prevents the same invoice from
// generating duplicate alerts across repeated checks.
async function checkOverdueInvoices(user) {
  if (!user.business) return;
  const overdue = await Invoice.find({
    business: user.business,
    status: "unpaid",
    dueDate: { $lt: new Date() },
    overdueNotifiedAt: { $exists: false },
  }).limit(20);

  for (const invoice of overdue) {
    // eslint-disable-next-line no-await-in-loop
    await notify(user._id, {
      title: "Invoice overdue",
      message: `Invoice ${invoice.invoiceNumber} (₦${invoice.total.toLocaleString()}) was due ${new Date(invoice.dueDate).toLocaleDateString()} and is still unpaid.`,
      type: "invoice",
      link: "/dashboard/invoices",
    });
    invoice.overdueNotifiedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await invoice.save();
  }
}

const getNotifications = asyncHandler(async (req, res) => {
  await checkOverdueInvoices(req.user).catch((err) =>
    console.error("Overdue invoice check failed:", err.message),
  );

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = req.query.filter || "all";
  if (!["all", "unread", "pinned"].includes(filter)) {
    throw new ApiError(400, "Filter must be all, unread or pinned.");
  }

  const query = { user: req.user._id };
  if (filter === "unread") query.isRead = false;
  if (filter === "pinned") query.isPinned = true;

  const [notifications, total, unreadCount, pinnedCount] = await Promise.all([
    // Pinned first, then newest first.
    Notification.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Notification.countDocuments({ user: req.user._id, isPinned: true }),
  ]);

  res.json({
    success: true,
    data: { notifications, total, unreadCount, pinnedCount, page, pages: Math.ceil(total / limit) },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true },
  );
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json({ success: true, data: { notification } });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true },
  );
  res.json({ success: true, message: "All notifications marked as read." });
});

const MAX_PINNED = 25;
const validId = (id) => mongoose.isValidObjectId(id);

// Pin or unpin one notification: PATCH /api/notifications/:id/pin  { isPinned: true|false }
const setPinned = asyncHandler(async (req, res) => {
  const { isPinned } = req.body;
  if (typeof isPinned !== "boolean") throw new ApiError(400, "isPinned must be true or false.");
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found.");

  if (isPinned) {
    const pinned = await Notification.countDocuments({ user: req.user._id, isPinned: true });
    if (pinned >= MAX_PINNED) {
      throw new ApiError(400, `You can pin up to ${MAX_PINNED} notifications. Unpin one first.`);
    }
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isPinned },
    { new: true },
  );
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json({ success: true, data: { notification } });
});

// Delete one notification: DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found.");
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json({ success: true, message: "Notification deleted." });
});

// Delete every READ notification that is not pinned: DELETE /api/notifications?scope=read
const clearRead = asyncHandler(async (req, res) => {
  if (req.query.scope !== "read") throw new ApiError(400, "Specify scope=read to clear read notifications.");
  const result = await Notification.deleteMany({
    user: req.user._id,
    isRead: true,
    isPinned: { $ne: true },
  });
  res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, setPinned, deleteNotification, clearRead };
