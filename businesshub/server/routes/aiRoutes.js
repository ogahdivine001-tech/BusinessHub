const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { aiLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/aiController');

const router = express.Router();
router.use(protect, requireBusiness);

router.post('/generate', aiLimiter, ctrl.generate);
router.get('/usage', ctrl.getUsage);

module.exports = router;
