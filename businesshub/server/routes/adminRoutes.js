const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const router = express.Router();
router.use(protect, requireRole('admin'));

router.get('/overview', ctrl.getOverview);
router.get('/users', ctrl.getUsers);
router.patch('/users/:id/active', ctrl.setUserActive);
router.get('/businesses', ctrl.getBusinesses);
router.patch('/businesses/:id/published', ctrl.setBusinessPublished);
router.get('/subscriptions', ctrl.getSubscriptions);

module.exports = router;
