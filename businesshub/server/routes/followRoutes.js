const express = require('express');
const { protect } = require('../middleware/auth');
const { engageLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/followController');
const router = express.Router();

router.use(protect);
router.get('/mine', ctrl.mine); // before '/:businessId' so "mine" is not read as an id
router.get('/:businessId/status', ctrl.status);
router.post('/:businessId', engageLimiter, ctrl.follow);
router.delete('/:businessId', engageLimiter, ctrl.unfollow);

module.exports = router;
