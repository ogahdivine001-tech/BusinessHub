require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const { generateOrderNumber, generateInvoiceNumber } = require('../utils/generateNumbers');

async function seed() {
  await connectDB();
  console.log('Clearing existing demo data...');
  await Promise.all([
    User.deleteMany({ email: 'demo@businesshub.app' }),
  ]);

  const existing = await User.findOne({ email: 'demo@businesshub.app' });
  if (existing) {
    await Business.deleteOne({ owner: existing._id });
  }

  console.log('Creating demo user...');
  const user = await User.create({
    fullName: 'Chidinma Okafor',
    email: 'demo@businesshub.app',
    phone: '08012345678',
    password: 'Demo1234!',
  });

  console.log('Creating demo business...');
  const business = await Business.create({
    owner: user._id,
    name: 'Divine Fashion',
    slug: 'divine-fashion',
    category: 'Fashion',
    description: 'Trendy, affordable fashion for the modern Nigerian. Sneakers, streetwear and accessories.',
    phone: '08012345678',
    whatsapp: '2348012345678',
    email: 'hello@divinefashion.ng',
    address: '14 Allen Avenue, Ikeja',
    location: { city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
    theme: 'modern',
  });

  user.business = business._id;
  user.onboardingComplete = true;
  await user.save();

  await Subscription.create({ business: business._id, plan: 'starter', status: 'active' });

  console.log('Creating categories...');
  const [sneakers, streetwear, accessories] = await Category.create([
    { business: business._id, name: 'Sneakers' },
    { business: business._id, name: 'Streetwear' },
    { business: business._id, name: 'Accessories' },
  ]);

  console.log('Creating products...');
  const products = await Product.create([
    { business: business._id, name: 'Classic White Sneakers', description: 'Clean, versatile everyday sneakers.', price: 25000, discount: 10, category: sneakers._id, stockQuantity: 40, sku: 'DF-SNK-001', images: [] },
    { business: business._id, name: 'Retro Runner Sneakers', description: 'Bold retro-style running sneakers.', price: 32000, category: sneakers._id, stockQuantity: 18, sku: 'DF-SNK-002', images: [] },
    { business: business._id, name: 'Oversized Graphic Hoodie', description: 'Premium heavyweight cotton hoodie.', price: 18500, discount: 5, category: streetwear._id, stockQuantity: 60, sku: 'DF-STW-001', images: [] },
    { business: business._id, name: 'Cargo Joggers', description: 'Comfortable streetwear cargo joggers.', price: 15000, category: streetwear._id, stockQuantity: 35, sku: 'DF-STW-002', images: [] },
    { business: business._id, name: 'Leather Wrist Watch', description: 'Minimalist leather-strap wristwatch.', price: 12000, category: accessories._id, stockQuantity: 22, sku: 'DF-ACC-001', images: [] },
    { business: business._id, name: 'Canvas Tote Bag', description: 'Durable everyday canvas tote.', price: 8000, category: accessories._id, stockQuantity: 0, sku: 'DF-ACC-002', images: [], isAvailable: false },
  ]);

  console.log('Creating customers...');
  const customers = await Customer.create([
    { business: business._id, name: 'Tunde Bakare', phone: '08023456789', email: 'tunde@example.com', address: 'Surulere, Lagos' },
    { business: business._id, name: 'Amaka Eze', phone: '08034567890', email: 'amaka@example.com', address: 'Yaba, Lagos' },
    { business: business._id, name: 'Femi Adeyemi', phone: '08045678901', email: 'femi@example.com', address: 'Lekki, Lagos' },
  ]);

  console.log('Creating orders...');
  const statuses = ['completed', 'processing', 'pending', 'completed', 'cancelled'];
  for (let i = 0; i < 8; i += 1) {
    const customer = customers[i % customers.length];
    const product = products[i % products.length];
    const quantity = 1 + (i % 3);
    const total = product.finalPrice ? product.finalPrice * quantity : product.price * quantity;

    // eslint-disable-next-line no-await-in-loop
    const order = await Order.create({
      business: business._id,
      customer: customer._id,
      orderNumber: generateOrderNumber(),
      items: [{ product: product._id, name: product.name, price: product.price, quantity }],
      total,
      status: statuses[i % statuses.length],
      paymentStatus: i % 2 === 0 ? 'paid' : 'unpaid',
      createdAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
    });

    // eslint-disable-next-line no-await-in-loop
    await Customer.findByIdAndUpdate(customer._id, { $inc: { totalOrders: 1, totalSpent: total } });
  }

  console.log('Creating a sample invoice...');
  const subtotal = products[0].price * 2;
  await Invoice.create({
    business: business._id,
    customer: customers[0]._id,
    invoiceNumber: generateInvoiceNumber(),
    items: [{ description: products[0].name, quantity: 2, price: products[0].price }],
    discount: 2000,
    tax: 0,
    subtotal,
    total: subtotal - 2000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'unpaid',
  });

  console.log('\nSeed complete!');
  console.log('Login with: demo@businesshub.app / Demo1234!');
  console.log(`Public store: /store/${business.slug}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
