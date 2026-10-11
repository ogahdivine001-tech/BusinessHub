const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");
const { adminMessageLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
router.use(protect, requireRole("admin"));

router.get("/overview", ctrl.getOverview);
router.get("/users", ctrl.getUsers);
router.patch("/users/:id/active", ctrl.setUserActive);
router.get("/businesses", ctrl.getBusinesses);
router.patch("/businesses/:id/published", ctrl.setBusinessPublished);
router.patch("/businesses/:id/plan", ctrl.setBusinessPlan);
router.get("/subscriptions", ctrl.getSubscriptions);
router.get("/messages", ctrl.getMessages);
router.get("/messages/audience", ctrl.countAudience);
router.post("/messages", adminMessageLimiter, ctrl.sendMessage);

module.exports = router;
