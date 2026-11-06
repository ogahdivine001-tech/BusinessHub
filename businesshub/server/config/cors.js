// Which browser origins may call the API.
//
//  - CLIENT_URL        the main site (already required by the app)
//  - ALLOWED_ORIGINS   optional, comma-separated extras (preview/staging sites)
//  - localhost         only when NODE_ENV is not "production"
//
// For backward compatibility, when ALLOWED_ORIGINS is not set the original
// production site is still allowed. Set ALLOWED_ORIGINS (even to your
// production URL) to take full control and drop that fallback.
const LEGACY_PRODUCTION_ORIGINS = ['https://businesshubng.vercel.app'];

const clean = (v) => String(v || '').trim().replace(/\/+$/, '');

function buildAllowedOrigins(env = process.env) {
  const extras = clean(env.ALLOWED_ORIGINS) ? String(env.ALLOWED_ORIGINS).split(',').map(clean).filter(Boolean) : null;
  const list = [clean(env.CLIENT_URL), ...(extras || LEGACY_PRODUCTION_ORIGINS)];
  if (env.NODE_ENV !== 'production') list.push('http://localhost:5173', 'http://localhost:3000');
  return [...new Set(list.filter(Boolean))];
}

module.exports = { buildAllowedOrigins };
