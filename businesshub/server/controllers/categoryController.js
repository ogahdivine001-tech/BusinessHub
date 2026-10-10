const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const ApiError = require('../utils/apiError');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ business: req.businessId }).sort('name');
  res.json({ success: true, data: { categories } });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ name: req.body.name, business: req.businessId });
  res.status(201).json({ success: true, data: { category } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!category) throw new ApiError(404, 'Category not found.');
  res.json({ success: true, message: 'Category deleted.' });
});

module.exports = { getCategories, createCategory, deleteCategory };
