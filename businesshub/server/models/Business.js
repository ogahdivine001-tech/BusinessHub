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
    // Delivery. 'unspecified' is what every existing business starts as, so we
    // never claim delivery is (or is not) offered until the owner says so.
    delivery: {
      status: { type: String, enum: ["unspecified", "available", "unavailable"], default: "unspecified" },
      areas: { type: String, trim: true, maxlength: 300 }, // e.g. "Lagos Island, Lekki"
      terms: { type: String, trim: true, maxlength: 500 }, // supplied by the business; we never invent fees or times
      contact: { type: String, trim: true, maxlength: 300 }, // how to arrange delivery
    },
    // Verification badge state. Written ONLY by the admin/verification service,
    // never from an owner's request (it is not in the update allow-list).
    verification: {
      status: { type: String, enum: ["none", "pending", "verified", "rejected", "revoked"], default: "none" },
      verifiedAt: Date,
    },
    // Cached numbers for fast ranking/search, maintained by the review and
    // follow services from the real records. Never settable from a request.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    followerCount: { type: Number, default: 0, min: 0 },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true, match: /^\d{10}$/ },
    },
  },
  { timestamps: true },
);

businessSchema.index({ name: "text", description: "text" });
// Browse/sort paths used by public discovery.
businessSchema.index({ isPublished: 1, createdAt: -1 });
businessSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
businessSchema.index({ isPublished: 1, followerCount: -1 });
businessSchema.index({ isPublished: 1, ratingCount: -1, ratingAverage: -1 });

module.exports = mongoose.model("Business", businessSchema);
