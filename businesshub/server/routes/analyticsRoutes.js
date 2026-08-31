const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/analyticsController');

const router = express.Router();
router.use(protect, requireBusiness);

router.get('/overview', ctrl.getOverview);
router.get('/revenue', ctrl.getRevenueOverTime);
router.get('/sales-by-category', ctrl.getSalesByCategory);
router.get('/best-sellers', ctrl.getBestSellers);

module.exports = router;
