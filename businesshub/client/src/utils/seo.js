// Sets/creates a <meta> tag by name or property (for Open Graph tags,
// which use `property` instead of `name`). No dependency needed for this
// — react-helmet would be overkill for the one page in the app that
// actually needs dynamic SEO tags (the public storefront).
export function setMetaTag(key, content, { isProperty = false } = {}) {
  if (!content) return;
  const attr = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Applies a full set of storefront SEO tags in one call.
export function applyStoreSeo(business) {
  const title = `${business.name} — ${business.category} in ${business.location?.city || 'Nigeria'}`;
  const description =
    business.description?.slice(0, 160) ||
    `Shop ${business.name} on BusinessHub — browse products and order directly on WhatsApp.`;
  const image = business.coverImage?.url || business.logo?.url;
  const url = window.location.href;

  document.title = title;
  setMetaTag('description', description);
  setMetaTag('og:title', title, { isProperty: true });
  setMetaTag('og:description', description, { isProperty: true });
  setMetaTag('og:type', 'website', { isProperty: true });
  setMetaTag('og:url', url, { isProperty: true });
  if (image) setMetaTag('og:image', image, { isProperty: true });
  setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  if (image) setMetaTag('twitter:image', image);
}
