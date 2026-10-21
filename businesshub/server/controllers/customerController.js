const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const ApiError = require('../utils/apiError');
const escapeRegex = require('../utils/escapeRegex');

const getCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(query).sort('-createdAt').skip(skip).limit(Number(limit)),
    Customer.countDocuments(query),
  ]);

  res.json({ success: true, data: { customers, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...req.body, business: req.businessId });
  res.status(201).json({ success: true, data: { customer } });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, business: req.businessId });
  if (!customer) throw new ApiError(404, 'Customer not found.');
  res.json({ success: true, data: { customer } });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found.');
  res.json({ success: true, data: { customer } });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!customer) throw new ApiError(404, 'Customer not found.');
  res.json({ success: true, message: 'Customer deleted.' });
});

module.exports = { getCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer };
