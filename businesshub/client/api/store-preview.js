// Link-preview helper for public store pages (https://site/store/<slug>).
//
// WhatsApp, Facebook, Telegram, etc. read only the raw HTML of a link and do
// NOT run JavaScript, so the tags set by the React app (utils/seo.js) are
// invisible to them. vercel.json sends ONLY those preview bots here; real
// visitors still get the normal single-page app.

const SITE_URL = (process.env.SITE_URL || 'https://businesshubng.vercel.app').replace(/\/+$/, '');
const API_URL = (process.env.API_URL || process.env.VITE_API_URL || 'https://businesshub-api-p7hm.onrender.com/api').replace(/\/+$/, '');
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_TITLE = 'BusinessHub — Run your whole business from one link';
const DEFAULT_DESC =
  'Set up a professional business page in 30 seconds, send invoices that look the part, and keep track of every sale. Built for Nigerian businesses, free to start.';

// Business names/descriptions are user-controlled, so escape everything that
// goes into the HTML.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Ask Cloudinary for a 1200x630 JPG crop (the size preview cards use).
function previewImage(business) {
  const url = business && ((business.coverImage && business.coverImage.url) || (business.logo && business.logo.url));
  if (!url) return DEFAULT_IMAGE;
  return url.includes('/res.cloudinary.com/') && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/c_fill,w_1200,h_630,f_jpg,q_auto:eco/')
    : url;
}

function page({ title, description, image, url }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:site_name" content="BusinessHub" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head>
<body><a href="${esc(url)}">${esc(title)}</a></body>
</html>`;
}

export default async function handler(req, res) {
  const raw = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const slug = String(raw || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  const url = `${SITE_URL}/store/${slug}`;

  let business = null;
  let status = 200;
  if (slug) {
    try {
      // The free API host can be asleep; don't make the preview bot wait long.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(`${API_URL}/businesses/store/${slug}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) business = ((await r.json()).data || {}).business || null;
      else if (r.status === 404) status = 404;
    } catch {
      /* fall back to the default BusinessHub card */
    }
  }

  const meta = business
    ? {
        title: `${business.name} — ${business.category}${business.location && business.location.city ? ` in ${business.location.city}` : ''}`,
        description:
          (business.description || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
          `Shop ${business.name} on BusinessHub. Browse products and order on WhatsApp.`,
        image: previewImage(business),
        url,
      }
    : { title: DEFAULT_TITLE, description: DEFAULT_DESC, image: DEFAULT_IMAGE, url: SITE_URL };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', business ? 'public, s-maxage=600, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.status(status).send(page(meta));
}
