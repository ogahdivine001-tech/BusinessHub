const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/myOrderController');

// Open to ANY logged-in person (customers and sellers alike): it only ever returns
// orders that person placed themselves, filtered by their own account id.
const router = express.Router();
router.use(protect);

router.get('/', ctrl.listMine);

module.exports = router;
