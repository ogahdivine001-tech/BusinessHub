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
router.get("/audit-logs", ctrl.getAuditLogs);
router.get("/verifications", ctrl.listVerifications);
router.get("/verifications/:id", ctrl.getVerification);
router.post("/verifications/:id/approve", ctrl.approveVerification);
router.post("/verifications/:id/reject", ctrl.rejectVerification);
router.post("/businesses/:id/verification/grant", ctrl.grantVerification);
router.post("/businesses/:id/verification/revoke", ctrl.revokeVerification);
router.get("/reviews", ctrl.getReviews);
router.patch("/reviews/:id", ctrl.moderateReview);
router.get("/messages", ctrl.getMessages);
router.get("/messages/audience", ctrl.countAudience);
router.post("/messages", adminMessageLimiter, ctrl.sendMessage);

module.exports = router;
