const slugifyLib = require('slugify');

// Builds a unique slug for a business by appending a short random suffix
// if the base slug is already taken.
async function buildUniqueSlug(Business, name) {
  const base = slugifyLib(name, { lower: true, strict: true });
  let slug = base;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await Business.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) break;
  }
  return slug;
}

module.exports = { buildUniqueSlug };
