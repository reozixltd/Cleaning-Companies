/**
 * Import-boundary rules (docs/spec.md §4.2). Pure apart from reading files,
 * so the test can run it against small fixture trees.
 *
 *   pages → layouts | sections → features → domain → core
 *
 * findViolations(rootDir) scans rootDir/src and returns one entry per broken rule.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SOURCE = /\.(ts|mjs|astro|css)$/;
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const STORAGE = /\b(localStorage|sessionStorage)\b/;
const STORAGE_EXEMPT = new Set(['src/core/storage.ts', 'src/layouts/ThemeBoot.astro']);
const COLOUR_EXEMPT = new Set(['src/styles/tokens.css']);
const CSS_HEX = /(?:^|[;{\s])(?:--[\w-]+|color|background(?:-color)?|fill|stroke|stop-color|outline(?:-color)?|border(?:-[\w-]+)?|box-shadow|caret-color)\s*:[^;}]*#[0-9a-fA-F]{3,8}\b/m;
const ATTR_HEX = /\b(?:fill|stroke|stop-color|color)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/;
const COLOUR_FN = /\b(?:rgba?|hsla?)\(/;

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out = out.concat(walk(path));
    else if (SOURCE.test(name)) out.push(path);
  }
  return out;
}

/** 'src/features/plan/x.ts' → 'features/plan'; 'src/core/ui/B.astro' → 'core'. */
function area(srcRelative) {
  const [top, second] = srcRelative.split('/');
  return top === 'features' && second ? `features/${second}` : top;
}

function targetArea(spec, fileAbs, srcAbs) {
  if (spec.startsWith('@/')) return area(spec.slice(2));
  if (spec.startsWith('.')) {
    const rel = relative(srcAbs, resolve(dirname(fileAbs), spec)).split(sep).join('/');
    return rel.startsWith('..') ? null : area(rel);
  }
  return null; // npm package or astro:* virtual module
}

/** The page-level areas above features: README "How the code is organised". */
const PAGE_LEVEL = new Set(['sections', 'layouts', 'pages']);

/**
 * The rule an import from area `from` to area `to` breaks, or null. Areas are what area() returns.
 * Only core/ is barred from config/, content/ and styles/; imports made by those folders aren't checked.
 */
export function importRule(from, to) {
  if (!to || from === to) return null;
  if (from === 'core' && to !== 'core') return 'core-imports-outside';
  if (from === 'domain' && to.startsWith('features/')) return 'domain-imports-feature';
  if (from === 'domain' && PAGE_LEVEL.has(to)) return 'domain-imports-upward';
  if (from.startsWith('features/') && to.startsWith('features/')) return 'feature-imports-feature';
  if (from.startsWith('features/') && PAGE_LEVEL.has(to)) return 'feature-imports-upward';
  if (from === 'sections' && (to === 'pages' || to === 'layouts')) return 'section-imports-page';
  if (from === 'layouts' && (to === 'pages' || to === 'sections')) return 'layout-imports-page';
  return null;
}

export function findViolations(rootDir) {
  const srcAbs = resolve(rootDir, 'src');
  const violations = [];
  for (const fileAbs of walk(srcAbs)) {
    const file = 'src/' + relative(srcAbs, fileAbs).split(sep).join('/');
    const from = area(file.slice(4));
    const text = readFileSync(fileAbs, 'utf8');

    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      const rule = importRule(from, targetArea(spec, fileAbs, srcAbs));
      if (rule) violations.push({ file, rule, detail: `imports ${spec}` });
    }
    if (!STORAGE_EXEMPT.has(file) && STORAGE.test(text)) {
      violations.push({ file, rule: 'storage-outside-core', detail: 'use core/storage.ts' });
    }
    if (!COLOUR_EXEMPT.has(file) && (CSS_HEX.test(text) || ATTR_HEX.test(text) || COLOUR_FN.test(text))) {
      violations.push({ file, rule: 'raw-colour-outside-tokens', detail: 'use a token from styles/tokens.css' });
    }
  }
  return violations;
}
