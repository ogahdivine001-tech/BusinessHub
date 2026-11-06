const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');
const { getKnowledgeBase } = require('../services/knowledgeBase');
const { plain } = require('../services/assistantPrompt');

// Public Help Center. Serves ONLY `public` articles, and needs no AI, so help
// is always available, including to businesses on plans without the assistant.

// @route GET /api/help/articles
const listArticles = asyncHandler(async (req, res) => {
  const articles = getKnowledgeBase().visible('public')
    .map((a) => ({ id: a.id, title: a.title, category: a.category, updated: a.updated }))
    .sort((x, y) => x.category.localeCompare(y.category) || x.title.localeCompare(y.title));
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { articles } });
});

// @route GET /api/help/articles/:id
const getArticle = asyncHandler(async (req, res) => {
  const article = /^[a-z0-9-]{1,60}$/.test(req.params.id) ? getKnowledgeBase().getArticle(req.params.id, 'public') : null;
  if (!article) throw new ApiError(404, 'That help article could not be found.');
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { article: { id: article.id, title: article.title, category: article.category, updated: article.updated, body: article.body } } });
});

// @route GET /api/help/search?q=
const search = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  const results = getKnowledgeBase().search(q, { level: 'public', limit: 6 }).map((r) => ({
    articleId: r.articleId, title: r.title, heading: r.heading, anchor: r.anchor, category: r.category,
    excerpt: plain(r.text).slice(0, 220),
  }));
  res.json({ success: true, data: { results } });
});

module.exports = { listArticles, getArticle, search };
