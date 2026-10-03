import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { overBudget, pageScriptBytes } from '../../tools/js-budget.mjs';

const gz = (text: string) => gzipSync(text).length;

function dist(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'budget-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const shared = 'export const s = 1;'.repeat(50);
const a = 'import{s}from"./shared.js";console.log("a",s);';
const b = 'import"./shared.js";console.log("b");';
const boot = 'document.documentElement.dataset.theme="floorplan";';

describe('pageScriptBytes', () => {
  it('sums gzipped scripts per page, follows imports and counts a shared chunk once', () => {
    const root = dist({
      'index.html': `<script>${boot}</script><script type="application/ld+json">{"a":1}</script><script type="module" src="/_astro/a.js"></script><script type="module" src="/_astro/b.js"></script>`,
      'about/index.html': '<p>No scripts</p>',
      '_astro/a.js': a,
      '_astro/b.js': b,
      '_astro/shared.js': shared,
    });
    const pages = pageScriptBytes(root);
    expect(pages).toContainEqual({ page: '/', bytes: gz(boot) + gz(a) + gz(b) + gz(shared) });
    expect(pages).toContainEqual({ page: '/about/', bytes: 0 });
  });

  it('counts dynamic imports, since they still load on the page', () => {
    const lazy = 'export default 1;';
    const root = dist({
      'index.html': '<script type="module" src="/_astro/main.js"></script>',
      '_astro/main.js': 'import("./lazy.js");',
      '_astro/lazy.js': lazy,
    });
    expect(pageScriptBytes(root)).toEqual([{ page: '/', bytes: gz('import("./lazy.js");') + gz(lazy) }]);
  });
});

describe('pageScriptBytes re-exports', () => {
  it('follows export-from, which bundlers use to pass a chunk along', () => {
    const inner = 'export const v = 2;';
    const root = dist({
      'index.html': '<script type="module" src="/_astro/main.js"></script>',
      '_astro/main.js': 'export{v as w}from"./inner.js";',
      '_astro/inner.js': inner,
    });
    expect(pageScriptBytes(root)).toEqual([{ page: '/', bytes: gz('export{v as w}from"./inner.js";') + gz(inner) }]);
  });
});

describe('overBudget', () => {
  it('lists the pages over the limit, heaviest first', () => {
    const pages = [
      { page: '/', bytes: 31_000 },
      { page: '/book/', bytes: 40_000 },
      { page: '/faq/', bytes: 2_000 },
    ];
    expect(overBudget(pages, 30_720)).toEqual([
      { page: '/book/', bytes: 40_000 },
      { page: '/', bytes: 31_000 },
    ]);
  });
});
