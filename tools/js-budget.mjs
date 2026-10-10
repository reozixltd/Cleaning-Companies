/**
 * JavaScript budget (spec §8): two limits on the gzipped JS of every built page.
 *   eager: inline scripts, script files and everything they import statically. 30 KB.
 *   lazy:  files reached only through a dynamic import(). 150 KB.
 * Each file counts once per page; a file reached both ways counts as eager.
 *
 *   npm run build && npm run budget       exits 1 if any page is over either limit
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const LIMIT = 30_720;
export const LAZY_LIMIT = 153_600;

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const SRC = /\bsrc=["']([^"']+)["']/;
const JSON_TYPE = /\btype=["']application\/(ld\+)?json["']/;
const STATIC_IMPORT = /\b(?:import|export)\s*(?:[\w{}\s,*$]+from\s*)?["'](\.{1,2}\/[^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']/g;

const gz = (text) => gzipSync(text).length;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

function pageName(root, file) {
  const rel = relative(root, file).split(sep).join('/');
  return '/' + rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/');
}

const size = (files) => [...files].reduce((sum, file) => sum + gz(readFileSync(file, 'utf8')), 0);

/**
 * Sorts a script file and everything it imports into `eager` or `lazy`.
 * A file behind a dynamic import() is lazy, and so is whatever only it imports.
 */
function reach(file, eager, lazy, isLazy) {
  if (eager.has(file) || (isLazy && lazy.has(file)) || !existsSync(file)) return;
  lazy.delete(file);
  (isLazy ? lazy : eager).add(file);
  const text = readFileSync(file, 'utf8');
  for (const [, spec] of text.matchAll(STATIC_IMPORT)) reach(resolve(dirname(file), spec), eager, lazy, isLazy);
  for (const [, spec] of text.matchAll(DYNAMIC_IMPORT)) reach(resolve(dirname(file), spec), eager, lazy, true);
}

/** Gzipped JavaScript bytes for every page in a built site: `bytes` is eager, `lazy` is behind import(). */
export function pageScriptBytes(root) {
  return htmlFiles(root).map((file) => {
    const html = readFileSync(file, 'utf8');
    const eager = new Set();
    const lazy = new Set();
    let inline = 0;
    for (const [, attrs, body] of html.matchAll(SCRIPT)) {
      if (JSON_TYPE.test(attrs)) continue;
      const src = attrs.match(SRC)?.[1];
      if (src) reach(src.startsWith('/') ? join(root, src) : resolve(dirname(file), src), eager, lazy, false);
      else if (body.trim()) inline += gz(body);
    }
    return { page: pageName(root, file), bytes: inline + size(eager), lazy: size(lazy) };
  });
}

/** Pages over either limit, heaviest first. */
export function overBudget(pages, limit = LIMIT, lazyLimit = LAZY_LIMIT) {
  return pages.filter((p) => p.bytes > limit || p.lazy > lazyLimit).sort((x, y) => y.bytes + y.lazy - (x.bytes + x.lazy));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? 'dist');
  const pages = pageScriptBytes(root).sort((x, y) => y.bytes - x.bytes);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(`JS budget, gzipped per page: ${kb(LIMIT)} eager, ${kb(LAZY_LIMIT)} lazy. Heaviest:`);
  for (const p of pages.slice(0, 3)) console.log(`  ${kb(p.bytes).padStart(8)}  ${p.page}`);
  for (const p of pages.filter((p) => p.lazy)) console.log(`  ${kb(p.lazy).padStart(8)}  ${p.page} (lazy)`);
  const over = overBudget(pages);
  if (over.length) {
    console.error(`Over budget: ${over.map((p) => `${p.page} (${kb(p.bytes)} eager, ${kb(p.lazy)} lazy)`).join(', ')}`);
    process.exit(1);
  }
  console.log(`All ${pages.length} pages within budget.`);
}
