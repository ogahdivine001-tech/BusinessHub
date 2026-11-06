const asyncHandler = require("express-async-handler");
const Receipt = require("../models/Receipt");
const Business = require("../models/Business");
const Subscription = require("../models/Subscription");
const ApiError = require("../utils/apiError");
const { generateReceiptNumber } = require("../utils/generateNumbers");
const { getLimits, getEffectivePlan, getLimitsFor } = require("../services/subscriptionService");
const { renderDocumentPdf } = require("../services/pdfService");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");
const { verifyWithinLimit } = require("../services/usageGuard");
const { cleanItems, sumItems } = require("../utils/documentInput");
const { signDocLink, canAccessSharedDoc } = require("../utils/signedLink");

const PAYMENT_METHODS = ["cash", "transfer", "card", "paystack", "other"];

// Each receipt sent to the owner carries a fresh signed share token, which
// the dashboard uses to build the customer-facing PDF link.
const withToken = (doc) => ({
  ...doc.toObject(),
  shareToken: signDocLink("receipt", doc._id),
});

const getReceipts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [receipts, total] = await Promise.all([
    Receipt.find({ business: req.businessId })
      .populate("customer", "name phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Receipt.countDocuments({ business: req.businessId }),
  ]);
  res.json({
    success: true,
    data: {
      receipts: receipts.map(withToken),
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

const createReceipt = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimitsFor(subscription);
  if (!limits.features.receipts) {
    throw new ApiError(403, "Receipts are available on the Starter and Pro plans. Upgrade to create receipts.");
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const countThisMonth = () =>
    Receipt.countDocuments({
      business: req.businessId,
      createdAt: { $gte: monthStart },
    });
  const limitMessage = `Your plan allows ${limits.receiptsPerMonth} receipts/month. Please upgrade.`;
  if ((await countThisMonth()) >= limits.receiptsPerMonth) {
    throw new ApiError(403, limitMessage);
  }

  const { customer, invoice, paymentMethod = "cash" } = req.body;
  const items = cleanItems(req.body.items);

  // Customer and invoice must belong to THIS business, never just any valid id.
  if (!mongoose.isValidObjectId(customer) || !(await Customer.exists({ _id: customer, business: req.businessId }))) {
    throw new ApiError(400, "Choose a customer from your customer list.");
  }
  if (invoice) {
    if (!mongoose.isValidObjectId(invoice) || !(await Invoice.exists({ _id: invoice, business: req.businessId }))) {
      throw new ApiError(400, "That invoice was not found in your business.");
    }
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, "Choose a valid payment method.");
  }

  const receipt = await Receipt.create({
    business: req.businessId,
    customer,
    invoice: invoice || undefined,
    items,
    total: sumItems(items),
    paymentMethod,
    receiptNumber: generateReceiptNumber(),
  });

  await verifyWithinLimit({
    count: countThisMonth,
    limit: limits.receiptsPerMonth,
    undo: () => Receipt.deleteOne({ _id: receipt._id }),
    message: limitMessage,
  });

  res.status(201).json({ success: true, data: { receipt: withToken(receipt) } });
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    business: req.businessId,
  }).populate("customer");
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  res.json({ success: true, data: { receipt: withToken(receipt) } });
});

const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOneAndDelete({
    _id: req.params.id,
    business: req.businessId,
  });
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  res.json({ success: true, message: "Receipt deleted." });
});

// Public — no login, but a valid signed token is required (same rules as the
// invoice PDF route; see utils/signedLink.js).
const downloadReceiptPdf = asyncHandler(async (req, res) => {
  if (!canAccessSharedDoc("receipt", req.params.id, req.query.token)) {
    throw new ApiError(403, "This link is invalid or has expired. Ask the business to send you a new one.");
  }
  const receipt = await Receipt.findById(req.params.id)
    .populate("customer")
    .populate("invoice", "invoiceNumber");
  if (!receipt) throw new ApiError(404, "Receipt not found.");
  const business = await Business.findById(receipt.business);

  await renderDocumentPdf(res, {
    docType: "Receipt",
    docNumber: receipt.receiptNumber,
    business,
    customer: receipt.customer,
    items: receipt.items,
    total: receipt.total,
    issuedAt: receipt.createdAt,
    paymentMethod: receipt.paymentMethod,
    invoiceNumber: receipt.invoice ? receipt.invoice.invoiceNumber : undefined,
  });
});

module.exports = {
  getReceipts,
  createReceipt,
  getReceipt,
  deleteReceipt,
  downloadReceiptPdf,
};
