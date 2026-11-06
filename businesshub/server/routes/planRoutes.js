const express = require('express');
const ctrl = require('../controllers/planController');

// Public and read-only.
const router = express.Router();
router.get('/', ctrl.getPlans);

module.exports = router;
