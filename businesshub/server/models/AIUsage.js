const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    type: { type: String, required: true },
    prompt: String,
    monthKey: { type: String, required: true, index: true }, // e.g. '2026-08'
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIUsage', aiUsageSchema);
