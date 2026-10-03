/**
 * JavaScript budget (spec §8): every built page must ship under 30 KB of
 * gzipped JS. For each HTML file in dist/, adds up the gzipped size of its
 * inline scripts and every script file it loads, following imports (static and
 * dynamic) so shared chunks count, each file once per page.
 *
 *   npm run build && npm run budget       exits 1 if any page is over
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const LIMIT = 30_720;

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const SRC = /\bsrc=["']([^"']+)["']/;
const JSON_TYPE = /\btype=["']application\/(ld\+)?json["']/;
const IMPORT = /\b(?:import|export)\s*(?:[\w{}\s,*$]+from\s*)?\(?\s*["'](\.{1,2}\/[^"']+)["']/g;

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

/** Adds a script file and everything it imports to `seen`; returns their gzipped bytes. */
function scriptBytes(file, seen) {
  if (seen.has(file) || !existsSync(file)) return 0;
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  let bytes = gz(text);
  for (const [, spec] of text.matchAll(IMPORT)) bytes += scriptBytes(resolve(dirname(file), spec), seen);
  return bytes;
}

/** Gzipped JavaScript bytes for every page in a built site. */
export function pageScriptBytes(root) {
  return htmlFiles(root).map((file) => {
    const html = readFileSync(file, 'utf8');
    const seen = new Set();
    let bytes = 0;
    for (const [, attrs, body] of html.matchAll(SCRIPT)) {
      if (JSON_TYPE.test(attrs)) continue;
      const src = attrs.match(SRC)?.[1];
      if (src) bytes += scriptBytes(src.startsWith('/') ? join(root, src) : resolve(dirname(file), src), seen);
      else if (body.trim()) bytes += gz(body);
    }
    return { page: pageName(root, file), bytes };
  });
}

/** Pages over the limit, heaviest first. */
export function overBudget(pages, limit = LIMIT) {
  return pages.filter((p) => p.bytes > limit).sort((a, b) => b.bytes - a.bytes);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? 'dist');
  const pages = pageScriptBytes(root).sort((a, b) => b.bytes - a.bytes);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(`JS budget ${kb(LIMIT)} gzipped per page. Heaviest:`);
  for (const p of pages.slice(0, 3)) console.log(`  ${kb(p.bytes).padStart(8)}  ${p.page}`);
  const over = overBudget(pages);
  if (over.length) {
    console.error(`Over budget: ${over.map((p) => `${p.page} (${kb(p.bytes)})`).join(', ')}`);
    process.exit(1);
  }
  console.log(`All ${pages.length} pages within budget.`);
}
