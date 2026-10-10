const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

const router = express.Router();
router.use(protect);

router.put('/profile', ctrl.updateProfile);
router.put('/avatar', ctrl.updateAvatar);
router.put('/password', ctrl.changePassword);

module.exports = router;
