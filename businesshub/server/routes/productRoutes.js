const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/productController');

const router = express.Router();
router.use(protect, requireBusiness);

router.route('/').get(ctrl.getProducts).post(ctrl.createProduct);
router.route('/:id').get(ctrl.getProduct).put(ctrl.updateProduct).delete(ctrl.deleteProduct);

module.exports = router;
