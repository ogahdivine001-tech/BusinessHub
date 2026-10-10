const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/orderController');

const router = express.Router();
router.use(protect, requireBusiness);

router.route('/').get(ctrl.getOrders).post(ctrl.createOrder);
router.route('/:id').get(ctrl.getOrder).delete(ctrl.deleteOrder);
router.patch('/:id/status', ctrl.updateOrderStatus);

module.exports = router;
