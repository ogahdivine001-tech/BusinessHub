const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { getLimits, getEffectivePlan } = require('../services/subscriptionService');
const { uploadImage, deleteImage } = require('../services/uploadService');

// @desc  List products for the logged-in business (search/filter/sort/paginate)
// @route GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, sort = '-createdAt', page = 1, limit = 20 } = req.query;
  const query = { business: req.businessId };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (status === 'available') query.isAvailable = true;
  if (status === 'unavailable') query.isAvailable = false;
  if (status === 'out_of_stock') query.stockQuantity = 0;

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).populate('category').sort(sort).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: { products, total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// @desc  Create a product
// @route POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ business: req.businessId });
  const limits = getLimits(getEffectivePlan(subscription));
  const count = await Product.countDocuments({ business: req.businessId });
  if (count >= limits.products) {
    throw new ApiError(403, `Your plan allows up to ${limits.products} products. Please upgrade to add more.`);
  }

  const { images = [], ...rest } = req.body; // images: array of base64 data URIs (optional)
  const uploadedImages = [];
  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('data:')) {
      // eslint-disable-next-line no-await-in-loop
      uploadedImages.push(await uploadImage(img, `products/${req.businessId}`));
    } else if (img?.url) {
      uploadedImages.push(img);
    }
  }

  const product = await Product.create({ ...rest, business: req.businessId, images: uploadedImages });
  res.status(201).json({ success: true, data: { product } });
});

// @desc  Get a single product
// @route GET /api/products/:id
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.businessId }).populate('category');
  if (!product) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, data: { product } });
});

// @desc  Update a product
// @route PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const { images, ...rest } = req.body;
  const update = { ...rest };

  if (Array.isArray(images)) {
    const uploadedImages = [];
    for (const img of images) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        // eslint-disable-next-line no-await-in-loop
        uploadedImages.push(await uploadImage(img, `products/${req.businessId}`));
      } else if (img?.url) {
        uploadedImages.push(img);
      }
    }
    update.images = uploadedImages;
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.businessId },
    update,
    { new: true, runValidators: true }
  );
  if (!product) throw new ApiError(404, 'Product not found.');
  res.json({ success: true, data: { product } });
});

// @desc  Delete a product
// @route DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, business: req.businessId });
  if (!product) throw new ApiError(404, 'Product not found.');
  await Promise.all((product.images || []).map((img) => deleteImage(img.publicId)));
  res.json({ success: true, message: 'Product deleted.' });
});

module.exports = { getProducts, createProduct, getProduct, updateProduct, deleteProduct };
