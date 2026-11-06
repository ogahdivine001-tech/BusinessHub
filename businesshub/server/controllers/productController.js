const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/apiError');
const { getLimits, getEffectivePlan, getLimitsFor } = require('../services/subscriptionService');
const { uploadImage, deleteImage } = require('../services/uploadService');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { verifyWithinLimit } = require('../services/usageGuard');

// Only these fields can be set from a request. Anything else in the body
// (business, _id, timestamps...) is ignored rather than written to the record.
const EDITABLE_FIELDS = ['name', 'description', 'price', 'discount', 'category', 'stockQuantity', 'sku', 'isAvailable'];
const pickEditable = (body) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// A product may only point at a category that belongs to the same business.
async function assertOwnCategory(categoryId, businessId) {
  if (!categoryId) return;
  if (!mongoose.isValidObjectId(categoryId) || !(await Category.exists({ _id: categoryId, business: businessId }))) {
    throw new ApiError(400, 'That category was not found in your business.');
  }
}

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
  const limits = getLimitsFor(subscription);
  const countProducts = () => Product.countDocuments({ business: req.businessId });
  const limitMessage = `Your plan allows up to ${limits.products} products. Please upgrade to add more.`;
  // Early exit before any image is uploaded. Existing businesses that are
  // already over a limit keep every product; they just cannot add more.
  if ((await countProducts()) >= limits.products) {
    throw new ApiError(403, limitMessage);
  }

  const fields = pickEditable(req.body);
  await assertOwnCategory(fields.category, req.businessId);

  const { images = [] } = req.body; // images: array of base64 data URIs (optional)
  const uploadedImages = [];
  for (const img of Array.isArray(images) ? images : []) {
    if (typeof img === 'string' && img.startsWith('data:')) {
      // eslint-disable-next-line no-await-in-loop
      uploadedImages.push(await uploadImage(img, `products/${req.businessId}`));
    } else if (img?.url) {
      uploadedImages.push({ url: img.url, publicId: img.publicId });
    }
  }

  const product = await Product.create({ ...fields, business: req.businessId, images: uploadedImages });

  await verifyWithinLimit({
    count: countProducts,
    limit: limits.products,
    undo: async () => {
      await Product.deleteOne({ _id: product._id });
      for (const img of uploadedImages) {
        // eslint-disable-next-line no-await-in-loop
        if (img.publicId) await deleteImage(img.publicId).catch(() => {});
      }
    },
    message: limitMessage,
  });

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
  const { images } = req.body;
  const update = pickEditable(req.body);
  await assertOwnCategory(update.category, req.businessId);

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
