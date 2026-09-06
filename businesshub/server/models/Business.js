const mongoose = require("mongoose");

const businessHoursSchema = new mongoose.Schema(
  {
    day: String,
    open: String,
    close: String,
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "Fashion",
        "Electronics",
        "Food",
        "Beauty",
        "Real Estate",
        "Education",
        "Technology",
        "Graphics & Design",
        "Website Development",
        "Health & Fitness",
        "Services",
        "Other",
      ],
      required: true,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    logo: { url: String, publicId: String },
    coverImage: { url: String, publicId: String },
    phone: String,
    whatsapp: String,
    email: String,
    address: String,
    location: {
      city: String,
      state: String,
      country: { type: String, default: "Nigeria" },
    },
    socials: {
      instagram: String,
      facebook: String,
      twitter: String,
      tiktok: String,
      website: String,
    },
    businessHours: [businessHoursSchema],
    theme: {
      type: String,
      enum: ["classic", "modern", "minimal", "bold"],
      default: "classic",
    },
    hideBranding: { type: Boolean, default: false }, // "custom branding" — Starter/Pro only
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

businessSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Business", businessSchema);
