const asyncHandler = require("express-async-handler");
const Invoice = require("../models/Invoice");
const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const ApiError = require("../utils/apiError");
const { generateInvoiceNumber } = require("../utils/generateNumbers");
const { getLimits, getEffectivePlan, getLimitsFor } = require("../services/subscriptionService");
const { renderDocumentPdf } = require("../services/pdfService");
const { notify } = require("../services/notificationService");
const { verifyWithinLimit } = require("../services/usageGuard");
const { cleanItems, sumItems, money } = require("../utils/documentInput");
const { signDocLink, canAccessSharedDoc } = require("../utils/signedLink");
const mongoose = require("mongoose");

// Every invoice sent to the owner carries a fresh signed share token, which
// the dashboard uses to build the customer-facing PDF link.
const withToken = (doc) => ({
  ...doc.toObject(),
  shareToken: signDocLink("invoice", doc._id),
});

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
      invoices: invoices.map(withToken),
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

const createInvoice = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimitsFor(subscription);
  if (!limits.features.invoices) {
    throw new ApiError(403, "Invoices are available on the Starter and Pro plans. Upgrade to create invoices.");
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const countThisMonth = () =>
    Invoice.countDocuments({
      business: req.businessId,
      createdAt: { $gte: monthStart },
    });
  const limitMessage = `Your plan allows ${limits.invoicesPerMonth} invoices/month. Please upgrade.`;
  if ((await countThisMonth()) >= limits.invoicesPerMonth) {
    throw new ApiError(403, limitMessage);
  }

  const { customer, discount = 0, tax = 0, dueDate, notes } = req.body;
  const items = cleanItems(req.body.items);

  // The customer must belong to THIS business, never just any valid id.
  if (!mongoose.isValidObjectId(customer) || !(await Customer.exists({ _id: customer, business: req.businessId }))) {
    throw new ApiError(400, "Choose a customer from your customer list.");
  }
  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
    throw new ApiError(400, "The due date is not a valid date.");
  }

  const subtotal = sumItems(items);
  const total = Math.max(0, subtotal - money(discount, "Discount") + money(tax, "Tax"));

  const invoice = await Invoice.create({
    business: req.businessId,
    customer,
    items,
    discount: money(discount, "Discount"),
    tax: money(tax, "Tax"),
    subtotal,
    total,
    dueDate: dueDate || undefined,
    notes: notes ? String(notes).slice(0, 2000) : undefined,
    invoiceNumber: generateInvoiceNumber(),
  });

  await verifyWithinLimit({
    count: countThisMonth,
    limit: limits.invoicesPerMonth,
    undo: () => Invoice.deleteOne({ _id: invoice._id }),
    message: limitMessage,
  });

  res.status(201).json({ success: true, data: { invoice: withToken(invoice) } });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    business: req.businessId,
  }).populate("customer");
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, data: { invoice: withToken(invoice) } });
});

const updateInvoice = asyncHandler(async (req, res) => {
  const { discount, tax, dueDate, notes } = req.body;
  const update = {};
  if (dueDate !== undefined) {
    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
      throw new ApiError(400, "The due date is not a valid date.");
    }
    update.dueDate = dueDate || null;
  }
  if (notes !== undefined) update.notes = String(notes || "").slice(0, 2000);
  if (req.body.items?.length) {
    const items = cleanItems(req.body.items);
    const subtotal = sumItems(items);
    update.items = items;
    update.subtotal = subtotal;
    update.discount = money(discount || 0, "Discount");
    update.tax = money(tax || 0, "Tax");
    update.total = Math.max(0, subtotal - update.discount + update.tax);
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    update,
    { new: true, runValidators: true },
  );
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, data: { invoice: withToken(invoice) } });
});

const setInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'paid' | 'unpaid'
  if (!["paid", "unpaid"].includes(status)) {
    throw new ApiError(400, "Status must be paid or unpaid.");
  }
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    { status },
    { new: true, runValidators: true },
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

  res.json({ success: true, data: { invoice: withToken(invoice) } });
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndDelete({
    _id: req.params.id,
    business: req.businessId,
  });
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  res.json({ success: true, message: "Invoice deleted." });
});

// Public — no login, so the customer can open it, but only with a valid
// signed token (see utils/signedLink.js). Old unsigned links keep working
// only while LEGACY_PUBLIC_PDF_LINKS is not "false".
const downloadInvoicePdf = asyncHandler(async (req, res) => {
  if (!canAccessSharedDoc("invoice", req.params.id, req.query.token)) {
    throw new ApiError(403, "This link is invalid or has expired. Ask the business to send you a new one.");
  }
  const invoice = await Invoice.findById(req.params.id).populate("customer");
  if (!invoice) throw new ApiError(404, "Invoice not found.");
  const business = await Business.findById(invoice.business);

  await renderDocumentPdf(res, {
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
    issuedAt: invoice.createdAt,
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
