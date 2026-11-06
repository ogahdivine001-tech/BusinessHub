const express = require('express');
const ctrl = require('../controllers/discoverController');
const router = express.Router();

// Public, read-only.
router.get('/businesses', ctrl.searchBusinesses);
router.get('/home', ctrl.getHome);

module.exports = router;
