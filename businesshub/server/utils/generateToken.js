const jwt = require("jsonwebtoken");

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// In local dev, frontend (localhost:5173) and backend (localhost:5000)
// are different ports but the same "site", so a Lax cookie works fine.
// In production, they're on totally different domains (vercel.app vs
// onrender.com) — genuinely cross-site — so the cookie needs
// SameSite=None to be sent at all, and browsers require Secure (HTTPS)
// for any cookie using SameSite=None. Both Render and Vercel serve
// HTTPS by default, so this is safe to enable whenever NODE_ENV is
// production.
const sendTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

module.exports = { generateToken, sendTokenCookie };
