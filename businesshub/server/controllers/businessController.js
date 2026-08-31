const asyncHandler = require('express-async-handler');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { buildUniqueSlug } = require('../utils/slugify');
const { generateOrderNumber } = require('../utils/generateNumbers');
const { uploadImage } = require('../services/uploadService');
const { getLimits, getEffectivePlan, TRIAL_DAYS } = require('../services/subscriptionService');
const { notify, maybeNotifyLowStock } = require('../services/notificationService');

// @desc  Create the logged-in user's business (onboarding)
// @route POST /api/businesses
const createBusiness = asyncHandler(async (req, res) => {
  if (req.user.business) throw new ApiError(400, 'You already have a business.');

  const { name, category, description, phone, whatsapp, location, theme } = req.body;
  const slug = await buildUniqueSlug(Business, name);

  const business = await Business.create({
    owner: req.user._id,
    name,
    slug,
    category,
    description,
    phone,
    whatsapp,
    location,
    theme,
  });

  // Every new business gets a TRIAL_DAYS trial of full Pro features. The
  // underlying paid plan defaults to 'free' — that's what it reverts to
  // automatically once trialEndsAt passes (see getEffectivePlan).
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await Subscription.create({ business: business._id, plan: 'free', trialEndsAt });

  req.user.business = business._id;
  req.user.onboardingComplete = true;
  await req.user.save();

  res.status(201).json({ success: true, data: { business } });
});

// @desc  Get the logged-in user's business
// @route GET /api/businesses/me
const getMyBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, 'Business not found.');
  res.json({ success: true, data: { business } });
});

// @desc  Update the logged-in user's business
// @route PUT /api/businesses/me
const updateMyBusiness = asyncHandler(async (req, res) => {
  const allowed = [
    'name', 'description', 'category', 'phone', 'whatsapp', 'email',
    'address', 'location', 'socials', 'businessHours', 'theme', 'isPublished', 'hideBranding',
  ];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  // Enforce plan-gated fields server-side — the dashboard UI already
  // disables these controls for the wrong plan, but that's just UX; a
  // direct API call must be blocked here too, or the limit isn't real.
  if ('theme' in updates || 'hideBranding' in updates) {
    const subscription = await Subscription.findOne({ business: req.businessId });
    const limits = getLimits(getEffectivePlan(subscription));

    if (updates.theme === 'bold' && !limits.premiumThemes) {
      throw new ApiError(403, 'The "Bold" theme is available on the Pro plan. Upgrade to unlock it.');
    }
    if (updates.hideBranding === true && !limits.customBranding) {
      throw new ApiError(403, 'Removing "Powered by BusinessHub" requires the Starter or Pro plan. Upgrade to enable custom branding.');
    }
  }

  const business = await Business.findByIdAndUpdate(req.businessId, updates, {
    new: true,
    runValidators: true,
  });
  if (!business) throw new ApiError(404, 'Business not found.');
  res.json({ success: true, data: { business } });
});

// @desc  Upload/replace logo or cover image
// @route POST /api/businesses/me/image
const uploadBusinessImage = asyncHandler(async (req, res) => {
  const { image, type } = req.body; // type: 'logo' | 'coverImage', image: base64 data URI
  if (!['logo', 'coverImage'].includes(type)) throw new ApiError(400, 'Invalid image type.');

  const uploaded = await uploadImage(image, `businesses/${req.businessId}`);
  const business = await Business.findByIdAndUpdate(
    req.businessId,
    { [type]: uploaded },
    { new: true }
  );
  res.json({ success: true, data: { business } });
});

// @desc  Public storefront by slug
// @route GET /api/businesses/store/:slug
const getPublicBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug, isPublished: true });
  if (!business) throw new ApiError(404, 'This business page could not be found.');

  const products = await Product.find({ business: business._id, isAvailable: true }).populate('category');

  res.json({ success: true, data: { business, products } });
});

// @desc  Capture a pending order from a customer on the public storefront,
//        before sending them to WhatsApp to confirm with the business.
//        This is the only unauthenticated WRITE endpoint in the app —
//        every value that matters (price, product ownership, availability)
//        is re-verified server-side rather than trusted from the request.
// @route POST /api/businesses/store/:slug/orders
const createPublicOrder = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug, isPublished: true });
  if (!business) throw new ApiError(404, 'This business page could not be found.');

  const { productId, quantity, customerName, customerPhone } = req.body;

  if (!customerName?.trim() || !customerPhone?.trim()) {
    throw new ApiError(400, 'Please provide your name and phone number.');
  }
  if (!productId) throw new ApiError(400, 'No product was selected.');

  // Re-fetch the product from the DB scoped to THIS business — never trust
  // a price or name sent from the browser for something that affects money.
  const product = await Product.findOne({ _id: productId, business: business._id, isAvailable: true });
  if (!product) throw new ApiError(404, 'This product is no longer available.');

  const qty = Math.min(Math.max(Number(quantity) || 1, 1), 20); // sane cap, prevents abuse
  const price = product.finalPrice ?? product.price;
  const total = price * qty;

  // Reuse the customer record if this phone number has ordered before,
  // instead of creating duplicate customer entries for every WhatsApp order.
  let customer = await Customer.findOne({ business: business._id, phone: customerPhone.trim() });
  if (!customer) {
    customer = await Customer.create({
      business: business._id,
      name: customerName.trim(),
      phone: customerPhone.trim(),
    });
  }

  const order = await Order.create({
    business: business._id,
    customer: customer._id,
    orderNumber: generateOrderNumber(),
    items: [{ product: product._id, name: product.name, price, quantity: qty }],
    total,
    status: 'pending',
    paymentStatus: 'unpaid',
    notes: 'Placed via public storefront — awaiting confirmation on WhatsApp.',
  });

  await Customer.findByIdAndUpdate(customer._id, { $inc: { totalOrders: 1, totalSpent: total } });

  // Same stock-decrement + notification behavior as dashboard-created
  // orders, so a WhatsApp order affects inventory exactly like a manual one.
  const previousStock = product.stockQuantity;
  product.stockQuantity = Math.max(0, previousStock - qty);
  await product.save();
  await maybeNotifyLowStock({ ownerId: business.owner, product, previousStock });

  await notify(business.owner, {
    title: 'New order from your storefront',
    message: `${customerName.trim()} ordered ${qty} x ${product.name} (₦${total.toLocaleString()}) via WhatsApp.`,
    type: 'order',
    link: '/dashboard/orders',
  });

  res.status(201).json({
    success: true,
    data: { orderNumber: order.orderNumber, productName: product.name, quantity: qty, total },
  });
});

module.exports = {
  createBusiness,
  getMyBusiness,
  updateMyBusiness,
  uploadBusinessImage,
  getPublicBusiness,
  createPublicOrder,
};
