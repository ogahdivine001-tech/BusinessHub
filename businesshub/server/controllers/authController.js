const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { generateToken, sendTokenCookie } = require("../utils/generateToken");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../services/emailService");
const { getClientOrigin } = require("../utils/clientOrigin");
const { welcomeNewUser } = require("../services/welcomeService");

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

// Creates a single-use verification token, stores only its hash, and emails the
// link. Never throws: email problems must not break signup or the dashboard.
async function issueEmailVerification(user, req) {
  try {
    const raw = crypto.randomBytes(32).toString("hex");
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerifyToken: crypto.createHash("sha256").update(raw).digest("hex"),
          emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
        },
      },
    );
    const url = `${getClientOrigin(req)}/verify-email?token=${raw}`;
    const result = await sendVerificationEmail(user.email, url, user.fullName);
    if (result && result.sent === false && process.env.NODE_ENV !== "production") {
      console.log(`Email verification link for ${user.email}: ${url}`);
    }
  } catch (err) {
    console.error("[verify-email] could not send:", err.message);
  }
}

// @desc  Register a new user
// @route POST /api/auth/register
// accountType: "seller" (default; the original behaviour) or "buyer" (a customer
// account: follow businesses, write reviews). Customer sign-up is open unless
// ENABLE_BUYER_SIGNUP is set to "false".
const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, accountType = "seller" } = req.body;

  const isBuyer = accountType === "buyer";
  if (isBuyer && String(process.env.ENABLE_BUYER_SIGNUP ?? "true").toLowerCase() === "false") {
    throw new ApiError(400, "Customer accounts are not available right now.");
  }

  const existing = await User.findOne({ email });
  if (existing)
    throw new ApiError(409, "An account with this email already exists.");

  // The role is decided here from a fixed list. Nothing in the request can
  // ever create an admin.
  const user = await User.create({ fullName, email, phone, password, role: isBuyer ? "buyer" : "owner" });
  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  // Emails run in the background so signup is never slowed or broken by the
  // email provider. The welcome email walks sellers through setting up a
  // business page, so buyers do not get it.
  if (!isBuyer) {
    welcomeNewUser(user).catch((err) => console.error("[welcome] unexpected error:", err.message));
  }
  issueEmailVerification(user, req);

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
  let devResetUrl;

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

    // Where the reset link points. This must NEVER be built from request
    // headers on a public server: an attacker could submit a victim's email
    // with a forged Origin header, and the victim would receive a genuine
    // BusinessHub email whose link goes to the attacker's site (reset-link
    // poisoning). Only a direct connection from this machine (local
    // development) may use the request's own origin.
    const isLocalRequest = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      req.socket && req.socket.remoteAddress,
    );
    const clientOrigin =
      process.env.CLIENT_URL ||
      (isLocalRequest
        ? req.headers.origin || "http://localhost:5173"
        : "https://businesshubng.vercel.app");
    if (!process.env.CLIENT_URL) {
      console.warn(
        `[auth] CLIENT_URL is not set — using "${clientOrigin}" for the password reset URL. Set CLIENT_URL explicitly in production.`,
      );
    }
    const resetUrl = `${clientOrigin.replace(/\/+$/, "")}/reset-password?token=${rawToken}`;

    // The link is a password-equivalent secret. Only echo it back in the API
    // response when developing on your own machine, never on a deployed
    // server (a wrong or missing NODE_ENV must not turn this into a leak).
    if (process.env.NODE_ENV !== "production" && isLocalRequest) {
      devResetUrl = resetUrl;
    }

    // Deliberately NOT awaited — an external SMTP call can be slow or
    // hang depending on network conditions, and the browser should never
    // be stuck waiting on that. The token is already saved, so the reset
    // link is valid the moment this response goes out; the email just
    // needs to arrive whenever it arrives.
    sendPasswordResetEmail(email, resetUrl)
      .then((result) => {
        if (!result.sent)
          console.log(`Password reset link for ${email}: ${resetUrl}`);
      })
      .catch((err) =>
        console.error("Password reset email failed to send:", err.message),
      );
  }

  res.json({
    success: true,
    message:
      "If an account exists for that email, a reset link has been generated.",
    ...(devResetUrl ? { data: { resetUrl: devResetUrl } } : {}),
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

// @desc  Turn a customer account into a seller account so the person can set up a business
// @route POST /api/auth/become-seller
// One-way and limited to customers: sellers are left as they are, and an admin
// account can never be changed through this route. Follows and reviews are kept.
const becomeSeller = asyncHandler(async (req, res) => {
  if (req.user.role === "admin") throw new ApiError(403, "Admin accounts cannot be changed here.");
  if (req.user.role === "buyer") {
    await User.updateOne({ _id: req.user._id, role: "buyer" }, { $set: { role: "owner" } });
  }
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

// @desc  (Re)send the verification email to the logged-in user
// @route POST /api/auth/verify-email/request
const requestEmailVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerifiedAt) {
    return res.json({ success: true, data: { alreadyVerified: true } });
  }
  await issueEmailVerification(req.user, req);
  res.json({ success: true, message: "Verification email sent. Please check your inbox." });
});

// @desc  Confirm an email address using the emailed token
// @route POST /api/auth/verify-email
const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.body.token).digest("hex");
  // One atomic step: only a matching, unexpired token can be claimed, and
  // claiming it removes it, so a link works exactly once.
  const user = await User.findOneAndUpdate(
    { emailVerifyToken: hashed, emailVerifyExpires: { $gt: new Date() } },
    { $set: { emailVerifiedAt: new Date() }, $unset: { emailVerifyToken: 1, emailVerifyExpires: 1 } },
    { new: true },
  );
  if (!user) throw new ApiError(400, "Verification link is invalid or has expired.");
  res.json({ success: true, message: "Your email has been confirmed." });
});

module.exports = {
  becomeSeller,
  requestEmailVerification,
  verifyEmail,
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
