const express = require('express');
const { protect } = require('../middleware/auth');
const { reviewLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/reviewController');
const router = express.Router();

router.get('/mine', protect, ctrl.listMine);
router.get('/business/:businessId', ctrl.listForBusiness); // public
router.get('/business/:businessId/mine', protect, ctrl.getMine);
router.post('/business/:businessId', protect, reviewLimiter, ctrl.create);
router.put('/:id', protect, reviewLimiter, ctrl.update);
router.delete('/:id', protect, reviewLimiter, ctrl.remove);

module.exports = router;
