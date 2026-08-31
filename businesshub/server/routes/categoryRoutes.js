const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const ctrl = require('../controllers/categoryController');

const router = express.Router();
router.use(protect, requireBusiness);

router.route('/').get(ctrl.getCategories).post(ctrl.createCategory);
router.delete('/:id', ctrl.deleteCategory);

module.exports = router;
