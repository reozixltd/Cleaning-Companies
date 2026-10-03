/**
 * Builds internal URLs from scripts. Normally the site lives at the domain
 * root and this returns the path unchanged. When the build is exported for a
 * sub-folder host, each page gets <html data-root="../"> and links resolve
 * relative to it.
 */
export function sitePath(path: string): string {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const base = root?.dataset.root;
  if (!base) return path;
  const [pathname, query = ''] = path.split('?');
  let rel = base + pathname.replace(/^\//, '');
  if (root.hasAttribute('data-static-files') && (rel.endsWith('/') || rel === base)) rel += 'index.html';
  return query ? `${rel}?${query}` : rel;
}
