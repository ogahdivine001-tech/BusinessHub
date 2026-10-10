const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Business = require('../models/Business');
const ApiError = require('../utils/apiError');
const { generateOrderNumber } = require('../utils/generateNumbers');
const { notify, maybeNotifyLowStock } = require('../services/notificationService');

const getOrders = asyncHandler(async (req, res) => {
  const { status, customer, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };
  if (status) query.status = status;
  if (customer) query.customer = customer;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(query).populate('customer', 'name phone').sort('-createdAt').skip(skip).limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, data: { orders, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

const createOrder = asyncHandler(async (req, res) => {
  const { customer, items, notes } = req.body;
  if (!items?.length) throw new ApiError(400, 'An order must have at least one item.');

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({
    business: req.businessId,
    customer,
    items,
    total,
    notes,
    orderNumber: generateOrderNumber(),
  });

  await Customer.findByIdAndUpdate(customer, {
    $inc: { totalOrders: 1, totalSpent: total },
  });

  // Reduce stock for each item and warn the owner if anything just crossed
  // into low-stock territory. Never let a stock hiccup fail the order itself.
  const business = await Business.findById(req.businessId);
  for (const item of items) {
    try {
      const product = await Product.findOne({ _id: item.product, business: req.businessId });
      if (!product) continue;
      const previousStock = product.stockQuantity;
      product.stockQuantity = Math.max(0, previousStock - item.quantity);
      await product.save();
      await maybeNotifyLowStock({ ownerId: business.owner, product, previousStock });
    } catch (err) {
      console.error('Stock update failed for item', item.product, err.message);
    }
  }

  await notify(business.owner, {
    title: 'New order received',
    message: `Order ${order.orderNumber} for ₦${total.toLocaleString()} was created.`,
    type: 'order',
    link: '/dashboard/orders',
  });

  res.status(201).json({ success: true, data: { order } });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, business: req.businessId }).populate('customer');
  if (!order) throw new ApiError(404, 'Order not found.');
  res.json({ success: true, data: { order } });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const update = {};
  if (status) update.status = status;
  if (paymentStatus) update.paymentStatus = paymentStatus;

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    update,
    { new: true }
  );
  if (!order) throw new ApiError(404, 'Order not found.');
  res.json({ success: true, data: { order } });
});

const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!order) throw new ApiError(404, 'Order not found.');
  res.json({ success: true, message: 'Order deleted.' });
});

module.exports = { getOrders, createOrder, getOrder, updateOrderStatus, deleteOrder };
