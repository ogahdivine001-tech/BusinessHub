const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { publicOrderLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/businessController');

const router = express.Router();

router.get('/store/:slug', ctrl.getPublicBusiness); // public
router.post('/store/:slug/orders', publicOrderLimiter, ctrl.createPublicOrder); // public
router.post('/', protect, ctrl.createBusiness);
router.get('/me', protect, requireBusiness, ctrl.getMyBusiness);
router.put('/me', protect, requireBusiness, ctrl.updateMyBusiness);
router.post('/me/image', protect, requireBusiness, ctrl.uploadBusinessImage);

module.exports = router;
