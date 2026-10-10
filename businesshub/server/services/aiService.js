const ApiError = require('../utils/apiError');

// Every provider below speaks the same "OpenAI chat completions" request
// format, including Google's Gemini via its official OpenAI-compatibility
// endpoint — so swapping providers is just picking a different config
// block below, not rewriting any request logic. Switch providers by
// setting AI_PROVIDER in server/.env; only that provider's API key needs
// to be filled in.
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'openai/gpt-oss-120b', // Groq retired llama-3.3-70b-versatile on 2026-06-17; this is their recommended replacement
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
  },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKeyEnv: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
};

function getProvider() {
  const key = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  return PROVIDERS[key] || PROVIDERS.openai;
}

const isConfigured = () => Boolean(process.env[getProvider().apiKeyEnv]);

const PROMPTS = {
  productDescription: ({ name, details }) =>
    `Write a persuasive, SEO-friendly product description (under 80 words) for a product called "${name}". Details: ${details || 'none provided'}. Return plain text only.`,
  socialCaption: ({ product, platform, tone }) =>
    `Write a ${tone || 'friendly'} social media caption for ${platform || 'Instagram'} promoting: ${product}. Include 3-5 relevant hashtags. Return plain text only.`,
  advertisement: ({ product, platform }) =>
    `Write short, high-converting advertisement copy for ${platform || 'Facebook Ads'} promoting: ${product}. Return plain text only.`,
  businessDescription: ({ name, category, details }) =>
    `Write a professional 2-3 sentence business bio for "${name}", a ${category} business. Details: ${details || 'none'}. Return plain text only.`,
  marketingIdeas: ({ business, category }) =>
    `Give 5 concise, actionable marketing ideas for a ${category} business called "${business}" targeting Nigerian customers. Return as a numbered list.`,
  productName: ({ details }) =>
    `Suggest 5 catchy product names for: ${details}. Return as a numbered list.`,
  chat: ({ message }) => message,
};

async function generateAIContent(type, params) {
  const provider = getProvider();
  const apiKey = process.env[provider.apiKeyEnv];

  if (!apiKey) {
    throw new ApiError(
      503,
      `AI features are not configured yet. Add ${provider.apiKeyEnv} to the server .env to enable ${provider.label}.`
    );
  }
  const buildPrompt = PROMPTS[type];
  if (!buildPrompt) {
    throw new ApiError(400, 'Unknown AI request type.');
  }
  const prompt = buildPrompt(params || {});
  const model = process.env.AI_MODEL || provider.defaultModel;

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are the AI assistant inside BusinessHub, a SaaS platform for small businesses in Nigeria. Be concise, practical, and business-focused.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`AI provider error (${provider.label}):`, errText);
    throw new ApiError(502, 'The AI service is temporarily unavailable. Please try again.');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = { generateAIContent, isConfigured, getProvider, PROVIDERS };
