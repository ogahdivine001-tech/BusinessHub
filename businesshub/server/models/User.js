const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    // 'owner' = seller (the original role; existing accounts keep it untouched).
    // 'buyer' is new and sits behind ENABLE_BUYER_SIGNUP until its dashboard ships.
    role: { type: String, enum: ['owner', 'admin', 'buyer'], default: 'owner' },
    avatar: { url: String, publicId: String },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    onboardingComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
    // Email verification is offered, never forced: existing accounts have none of
    // these fields and keep working exactly as before.
    emailVerifiedAt: { type: Date },
    emailVerifyToken: { type: String, select: false }, // sha256 of the emailed token
    emailVerifyExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpires;
  obj.emailVerified = Boolean(obj.emailVerifiedAt);
  return obj;
};

module.exports = mongoose.model('User', userSchema);
