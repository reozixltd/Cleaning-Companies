/**
 * The site's public address, decided at build time (used for canonical links,
 * the sitemap and structured data):
 *
 *   1. SITE_URL, if set (any host: an explicit override)
 *   2. VERCEL_PROJECT_PRODUCTION_URL, which Vercel sets on every build: the
 *      *.vercel.app address until a custom domain is assigned, then that domain
 *   3. the fallback (local builds)
 */
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function asOrigin(value) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
}

export function resolveSiteUrl(env, fallback) {
  const chosen = clean(env.SITE_URL) || clean(env.VERCEL_PROJECT_PRODUCTION_URL);
  return chosen ? asOrigin(chosen) : fallback;
}
