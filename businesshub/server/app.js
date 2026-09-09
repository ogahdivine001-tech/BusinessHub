const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Render (like Heroku, Railway, etc.) sits the app behind a reverse proxy,
// which adds an X-Forwarded-For header showing the real visitor IP. By
// default Express doesn't trust that header — without this line,
// express-rate-limit can't safely determine per-visitor IPs and throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every rate-limited request,
// silently breaking auth, AI, and public-order endpoints in production.
// "1" means "trust exactly one hop" (Render's own proxy), which is
// correct here and avoids the security risk of trusting an arbitrary
// number of hops.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" })); // higher limit to allow base64 image payloads
app.use(cookieParser());
app.use(mongoSanitize());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "BusinessHub API is running." }),
);

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
