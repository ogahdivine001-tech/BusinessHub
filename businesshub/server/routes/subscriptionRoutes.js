const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/subscriptionController');

const router = express.Router();
router.use(protect, requireBusiness);

router.get('/me', ctrl.getMySubscription);
router.post('/checkout', ctrl.startCheckout);
router.get('/verify/:reference', ctrl.verifyCheckout);

module.exports = router;
