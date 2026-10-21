const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/subscriptionController');

const router = express.Router();

// Public on purpose: Paystack's servers call this, and it is guarded by the
// Paystack signature check, not by a login. Must come BEFORE the login guard.
router.post('/webhook', ctrl.paystackWebhook);

router.use(protect, requireBusiness);

router.get('/me', ctrl.getMySubscription);
router.post('/checkout', ctrl.startCheckout);
router.get('/verify/:reference', ctrl.verifyCheckout);

module.exports = router;
