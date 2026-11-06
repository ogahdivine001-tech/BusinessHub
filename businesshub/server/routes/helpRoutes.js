const express = require('express');
const { helpLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/helpController');

// Public and read-only.
const router = express.Router();
router.use(helpLimiter);
router.get('/articles', ctrl.listArticles);
router.get('/articles/:id', ctrl.getArticle);
router.get('/search', ctrl.search);

module.exports = router;
