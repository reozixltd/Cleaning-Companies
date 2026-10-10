import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { LAZY_LIMIT, LIMIT, overBudget, pageScriptBytes } from '../../tools/js-budget.mjs';

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
    expect(pages).toContainEqual({ page: '/', bytes: gz(boot) + gz(a) + gz(b) + gz(shared), lazy: 0 });
    expect(pages).toContainEqual({ page: '/about/', bytes: 0, lazy: 0 });
  });

  it('counts a dynamic import, and what only it imports, as lazy', () => {
    const main = 'import("./lazy.js");';
    const lazy = 'import{t}from"./three.js";export default t;';
    const three = 'export const t = 3;'.repeat(40);
    const root = dist({
      'index.html': '<script type="module" src="/_astro/main.js"></script>',
      '_astro/main.js': main,
      '_astro/lazy.js': lazy,
      '_astro/three.js': three,
    });
    expect(pageScriptBytes(root)).toEqual([{ page: '/', bytes: gz(main), lazy: gz(lazy) + gz(three) }]);
  });

  it('counts a file reached both ways as eager, even when the lazy route is found first', () => {
    const one = 'import("./lazy.js");';
    const lazy = 'import{s}from"./shared.js";export default s;';
    const two = 'import{s}from"./shared.js";console.log(s);';
    const root = dist({
      'index.html': '<script type="module" src="/_astro/one.js"></script><script type="module" src="/_astro/two.js"></script>',
      '_astro/one.js': one,
      '_astro/lazy.js': lazy,
      '_astro/two.js': two,
      '_astro/shared.js': shared,
    });
    expect(pageScriptBytes(root)).toEqual([{ page: '/', bytes: gz(one) + gz(two) + gz(shared), lazy: gz(lazy) }]);
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
    expect(pageScriptBytes(root)).toEqual([{ page: '/', bytes: gz('export{v as w}from"./inner.js";') + gz(inner), lazy: 0 }]);
  });
});

describe('overBudget', () => {
  it('lists the pages over either limit, heaviest first', () => {
    const pages = [
      { page: '/', bytes: 31_000, lazy: 0 },
      { page: '/book/', bytes: 40_000, lazy: 0 },
      { page: '/faq/', bytes: 2_000, lazy: 0 },
      { page: '/model/', bytes: 2_000, lazy: 160_000 },
      { page: '/fine/', bytes: 30_000, lazy: 150_000 },
    ];
    expect(overBudget(pages, 30_720, 153_600).map((p: { page: string }) => p.page)).toEqual(['/model/', '/book/', '/']);
  });

  it('defaults to 30 KB eager and 150 KB lazy', () => {
    expect([LIMIT, LAZY_LIMIT]).toEqual([30_720, 153_600]);
  });
});
