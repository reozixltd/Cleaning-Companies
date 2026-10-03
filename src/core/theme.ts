/**
 * Which theme a page shows. In demo mode a partner can switch theme with
 * ?theme=<name> (remembered for the session) to show a prospect "your colours".
 * layouts/ThemeBoot.astro applies the same rule before first paint.
 */
export function resolveTheme(opts: {
  param: string | null;
  stored: string | null;
  configured: string;
  allowed: readonly string[];
  demoMode: boolean;
}): string {
  const ok = (t: string | null): t is string => t !== null && opts.allowed.includes(t);
  if (opts.demoMode && ok(opts.param)) return opts.param;
  if (opts.demoMode && ok(opts.stored)) return opts.stored;
  return opts.configured;
}
