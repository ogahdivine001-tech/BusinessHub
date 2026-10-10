const asyncHandler = require("express-async-handler");
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

  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments({ user: req.user._id }),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
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

module.exports = { getNotifications, markAsRead, markAllAsRead };
