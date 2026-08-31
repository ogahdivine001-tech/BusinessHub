const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    items: [invoiceItemSchema],
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    dueDate: Date,
    notes: String,
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    overdueNotifiedAt: Date, // set once an overdue notification has fired, so it only fires once per invoice
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invoice", invoiceSchema);
