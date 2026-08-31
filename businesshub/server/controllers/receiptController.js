const asyncHandler = require('express-async-handler');
const Receipt = require('../models/Receipt');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { generateReceiptNumber } = require('../utils/generateNumbers');
const { getLimits, getEffectivePlan } = require('../services/subscriptionService');
const { renderDocumentPdf } = require('../services/pdfService');

const getReceipts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [receipts, total] = await Promise.all([
    Receipt.find({ business: req.businessId }).populate('customer', 'name phone').sort('-createdAt').skip(skip).limit(Number(limit)),
    Receipt.countDocuments({ business: req.businessId }),
  ]);
  res.json({ success: true, data: { receipts, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

const createReceipt = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimits(getEffectivePlan(subscription));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const countThisMonth = await Receipt.countDocuments({
    business: req.businessId,
    createdAt: { $gte: monthStart },
  });
  if (countThisMonth >= limits.receiptsPerMonth) {
    throw new ApiError(403, `Your plan allows ${limits.receiptsPerMonth} receipts/month. Please upgrade.`);
  }

  const { customer, invoice, items, paymentMethod } = req.body;
  if (!items?.length) throw new ApiError(400, 'A receipt must have at least one item.');

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const receipt = await Receipt.create({
    business: req.businessId,
    customer,
    invoice,
    items,
    total,
    paymentMethod,
    receiptNumber: generateReceiptNumber(),
  });
  res.status(201).json({ success: true, data: { receipt } });
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, business: req.businessId }).populate('customer');
  if (!receipt) throw new ApiError(404, 'Receipt not found.');
  res.json({ success: true, data: { receipt } });
});

const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!receipt) throw new ApiError(404, 'Receipt not found.');
  res.json({ success: true, message: 'Receipt deleted.' });
});

// Public — no auth, same reasoning as the invoice PDF route above.
const downloadReceiptPdf = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id).populate('customer');
  if (!receipt) throw new ApiError(404, 'Receipt not found.');
  const business = await Business.findById(receipt.business);

  renderDocumentPdf(res, {
    docType: 'Receipt',
    docNumber: receipt.receiptNumber,
    business,
    customer: receipt.customer,
    items: receipt.items,
    subtotal: receipt.total,
    discount: 0,
    tax: 0,
    total: receipt.total,
    notes: `Payment method: ${receipt.paymentMethod}`,
  });
});

module.exports = { getReceipts, createReceipt, getReceipt, deleteReceipt, downloadReceiptPdf };
