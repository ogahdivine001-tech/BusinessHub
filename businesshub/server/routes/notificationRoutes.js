const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getNotifications);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.patch('/:id/pin', ctrl.setPinned);
router.delete('/', ctrl.clearRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
