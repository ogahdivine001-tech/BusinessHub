const asyncHandler = require("express-async-handler");
const Invoice = require("../models/Invoice");
const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const ApiError = require("../utils/apiError");
const { generateInvoiceNumber } = require("../utils/generateNumbers");
const {
  getLimits,
  getEffectivePlan,
} = require("../services/subscriptionService");
const { renderDocumentPdf } = require("../services/pdfService");
const { notify } = require("../services/notificationService");

const getInvoices = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate("customer", "name phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Invoice.countDocuments(query),
  ]);
  res.json({
    success: true,
    data: {
      invoices,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

const createInvoice = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimits(getEffectivePlan(subscription));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const countThisMonth = await Invoice.countDocuments({
    business: req.businessId,
    createdAt: { $gte: monthStart },
  });
  if (countThisMonth >= limits.invoicesPerMonth) {
    throw new ApiError(
      403,
      `Your plan allows ${limits.invoicesPerMonth} invoices/month. Please upgrade.`,
    );
  }

  const { customer, items, discount = 0, tax = 0, dueDate, notes } = req.body;
  if (!items?.length)
    throw new ApiError(400, "An invoice must have at least one item.");

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = Math.max(0, subtotal - discount + tax);

  const invoice = await Invoice.create({
    business: req.businessId,
    customer,
    items,
    discount,
    tax,
    subtotal,
    total,
    dueDate,
    notes,
    invoiceNumber: generateInvoiceNumber(),
  });

  res.status(201).json({ success: true, data: { invoice } });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    business: req.businessId,
  }).populate("customer");
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, data: { invoice } });
});

const updateInvoice = asyncHandler(async (req, res) => {
  const { items, discount, tax, dueDate, notes } = req.body;
  const update = { dueDate, notes };
  if (items?.length) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    update.items = items;
    update.subtotal = subtotal;
    update.discount = discount || 0;
    update.tax = tax || 0;
    update.total = Math.max(0, subtotal - (discount || 0) + (tax || 0));
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    update,
    { new: true, runValidators: true },
  );
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, data: { invoice } });
});

const setInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'paid' | 'unpaid'
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    { status },
    { new: true },
  );
  if (!invoice) throw new ApiError(404, "Invoice not found.");

  if (status === "paid") {
    await notify(req.user._id, {
      title: "Invoice marked as paid",
      message: `Invoice ${invoice.invoiceNumber} (₦${invoice.total.toLocaleString()}) was marked as paid.`,
      type: "invoice",
      link: "/dashboard/invoices",
    });
  }

  res.json({ success: true, data: { invoice } });
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndDelete({
    _id: req.params.id,
    business: req.businessId,
  });
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, message: "Invoice deleted." });
});

// Public — no auth. Shareable via a plain link, the same way Stripe's
// hosted invoice pages work. Looked up by ID alone since there's no
// logged-in business context on a public request.
const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate("customer");
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  const business = await Business.findById(invoice.business);

  renderDocumentPdf(res, {
    docType: "Invoice",
    docNumber: invoice.invoiceNumber,
    business,
    customer: invoice.customer,
    items: invoice.items,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    tax: invoice.tax,
    total: invoice.total,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    status: invoice.status,
  });
});

module.exports = {
  getInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  setInvoiceStatus,
  deleteInvoice,
  downloadInvoicePdf,
};
