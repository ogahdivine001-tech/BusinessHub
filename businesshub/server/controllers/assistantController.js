const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Business = require('../models/Business');
const Product = require('../models/Product');
const { getKnowledgeBase } = require('../services/knowledgeBase');
const { completeChat, isConfigured } = require('../services/aiService');
const { checkAiAccess, runWithAiQuota } = require('../services/aiQuota');
const { buildAccountContext } = require('../services/assistantContext');
const { cleanMessage, sanitizeHistory, buildSystemPrompt, sourcesOf, buildHelpOnlyReply } = require('../services/assistantPrompt');

// @desc  Ask the BusinessHub Assistant
// @route POST /api/assistant/chat   { message, history?: [{ role, content }] }
//
// Grounded in the help articles plus a tiny summary of the caller's OWN plan.
// It has no tools and no database access of its own, so it cannot read or
// change anything. Plan rules are enforced by the same code as every other AI
// feature (services/aiQuota.js). When AI is off or failing, the person still
// gets the matching help text, labelled as such.
const chat = asyncHandler(async (req, res) => {
  const message = cleanMessage(req.body.message);
  const history = sanitizeHistory(req.body.history);

  // Plans without AI chat are refused here, before any search or provider call.
  await checkAiAccess(req.businessId, 'chat');

  // Including the previous question helps short follow-ups ("and for Pro?") find the right article.
  const lastQuestion = [...history].reverse().find((m) => m.role === 'user');
  const results = getKnowledgeBase().search(`${lastQuestion ? `${lastQuestion.content} ` : ''}${message}`, { level: 'seller', limit: 4 });
  const sources = sourcesOf(results);

  if (!isConfigured()) {
    return res.json({ success: true, data: { reply: buildHelpOnlyReply(results, 'off'), sources, mode: 'help-only' } });
  }

  const [subscription, business, productCount] = await Promise.all([
    Subscription.findOne({ business: req.businessId }),
    Business.findById(req.businessId).select('verification delivery'),
    Product.countDocuments({ business: req.businessId }),
  ]);
  const system = buildSystemPrompt({
    results,
    accountContext: buildAccountContext({
      subscription,
      productCount,
      verificationStatus: (business && business.verification && business.verification.status) || 'none',
      emailVerified: Boolean(req.user && req.user.emailVerifiedAt),
      deliveryStatus: (business && business.delivery && business.delivery.status) || 'unspecified',
    }),
  });

  let providerError = null;
  let reply;
  try {
    reply = await runWithAiQuota({
      businessId: req.businessId,
      type: 'chat',
      params: { message: message.slice(0, 200) }, // only the start of the question is kept in the usage record
      execute: async () => {
        try {
          return await completeChat({ system, messages: [...history, { role: 'user', content: message }] });
        } catch (err) { providerError = err; throw err; }
      },
    });
  } catch (err) {
    if (err !== providerError) throw err; // plan/limit errors go to the person as they are
    // The provider failed: the use was already given back, so fall back to help text.
    return res.json({ success: true, data: { reply: buildHelpOnlyReply(results, 'error'), sources, mode: 'help-only' } });
  }

  if (!reply) return res.json({ success: true, data: { reply: buildHelpOnlyReply(results, 'error'), sources, mode: 'help-only' } });
  res.json({ success: true, data: { reply, sources, mode: 'ai' } });
});

module.exports = { chat };
