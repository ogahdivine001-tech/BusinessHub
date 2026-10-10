const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    receiptNumber: { type: String, required: true, unique: true },
    items: [receiptItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'transfer', 'card', 'paystack', 'other'], default: 'cash' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
