const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { publicPdfLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/receiptController');

const router = express.Router();

// Public — shareable PDF link, same reasoning as invoices above.
router.get('/:id/pdf', publicPdfLimiter, ctrl.downloadReceiptPdf);

router.use(protect, requireBusiness);

router.route('/').get(ctrl.getReceipts).post(ctrl.createReceipt);
router.route('/:id').get(ctrl.getReceipt).delete(ctrl.deleteReceipt);

module.exports = router;
