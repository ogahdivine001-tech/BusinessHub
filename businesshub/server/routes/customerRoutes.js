const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/customerController');

const router = express.Router();
router.use(protect, requireBusiness);

router.route('/').get(ctrl.getCustomers).post(ctrl.createCustomer);
router.route('/:id').get(ctrl.getCustomer).put(ctrl.updateCustomer).delete(ctrl.deleteCustomer);

module.exports = router;
