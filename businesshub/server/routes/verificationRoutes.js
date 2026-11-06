const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { verifyEmailLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/verificationController');

const router = express.Router();
router.use(protect, requireBusiness);

router.get('/mine', ctrl.getMine);
router.post('/request', verifyEmailLimiter, ctrl.requestVerification); // 5/hour: a request is not something to repeat
router.post('/pay', ctrl.startPayment);
router.get('/verify/:reference', ctrl.verifyPayment);

module.exports = router;
