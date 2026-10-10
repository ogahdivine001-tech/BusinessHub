const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { publicPdfLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/invoiceController');

const router = express.Router();

// Public — shareable PDF link, must be registered before the auth
// middleware below so it isn't caught by router.use(protect, ...).
router.get('/:id/pdf', publicPdfLimiter, ctrl.downloadInvoicePdf);

router.use(protect, requireBusiness);

router.route('/').get(ctrl.getInvoices).post(ctrl.createInvoice);
router.route('/:id').get(ctrl.getInvoice).put(ctrl.updateInvoice).delete(ctrl.deleteInvoice);
router.patch('/:id/status', ctrl.setInvoiceStatus);

module.exports = router;
