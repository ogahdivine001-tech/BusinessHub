const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    images: [{ url: String, publicId: String }],
    stockQuantity: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.virtual('finalPrice').get(function getFinalPrice() {
  return Math.round(this.price * (1 - (this.discount || 0) / 100));
});
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
