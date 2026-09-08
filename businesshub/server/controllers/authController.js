const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { generateToken, sendTokenCookie } = require("../utils/generateToken");
const { sendPasswordResetEmail } = require("../services/emailService");

// @desc  Register a new user
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing)
    throw new ApiError(409, "An account with this email already exists.");

  const user = await User.create({ fullName, email, phone, password });
  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res
    .status(201)
    .json({ success: true, data: { user: user.toSafeObject(), token } });
});

// @desc  Log in
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (!user.isActive)
    throw new ApiError(403, "This account has been deactivated.");

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  res.json({ success: true, data: { user: user.toSafeObject(), token } });
});

// @desc  Log out
// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out." });
});

// @desc  Get current logged-in user
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

// @desc  Request a password reset token
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond the same way whether or not the user exists, to avoid
  // leaking which emails are registered.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    const result = await sendPasswordResetEmail(email, resetUrl);

    // If SMTP isn't configured (e.g. local dev without email set up), fall
    // back to logging the link so the flow is still testable end-to-end.
    if (!result.sent) {
      console.log(`Password reset link for ${email}: ${resetUrl}`);
    }
  }

  res.json({
    success: true,
    message:
      "If an account exists for that email, a reset link has been generated.",
  });
});

// @desc  Reset password using token
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+password +resetPasswordToken +resetPasswordExpires");

  if (!user) throw new ApiError(400, "Reset link is invalid or has expired.");

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Password has been reset. Please log in.",
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
