const express = require('express');
const { protect } = require('../middleware/auth');
const requireBusiness = require('../middleware/requireBusiness');
const { aiLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/assistantController');

const router = express.Router();
router.use(protect, requireBusiness);
router.post('/chat', aiLimiter, ctrl.chat);

module.exports = router;
