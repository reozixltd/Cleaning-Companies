// @vitest-environment node
/**
 * Every theme in src/styles/tokens.css must meet WCAG 2.2 AA for the colour
 * pairs the components actually use. Themes are found by their [data-theme]
 * selector, so a client theme copied into tokens.css is checked automatically.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { business } from '@/config/business';

type Colours = Record<string, string>;

/** WCAG 2.x relative luminance of an sRGB hex colour (#rgb or #rrggbb). */
function luminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. Order of the two colours does not matter. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

interface Block {
  selectors: string[];
  colours: Colours;
}

/** Top-level rule blocks with their --color-* declarations. At-rules (@media) are skipped. */
function readBlocks(css: string): Block[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: Block[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open === -1) break;
    const prelude = text.slice(i, open).trim();
    let depth = 1;
    let close = open + 1;
    for (; close < text.length && depth > 0; close++) {
      if (text[close] === '{') depth++;
      else if (text[close] === '}') depth--;
    }
    if (!prelude.startsWith('@')) {
      const body = text.slice(open + 1, close - 1);
      const colours: Colours = {};
      for (const [, name, value] of body.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)) colours[name] = value.trim().toLowerCase();
      blocks.push({ selectors: prelude.split(',').map((s) => s.trim()), colours });
    }
    i = close;
  }
  return blocks;
}

const themeOf = (selector: string) => selector.match(/^\[data-theme=(['"]?)([\w-]+)\1\]$/)?.[2] ?? null;

/**
 * The colours <html data-theme="name"> ends up with: every block that matches it
 * (`:root` always does) applied in source order, the way the cascade does it.
 */
function readTokens(css: string): { themes: Record<string, Colours>; defaultTheme: string } {
  const blocks = readBlocks(css);
  const names = [...new Set(blocks.flatMap((b) => b.selectors.map(themeOf)).filter((n): n is string => n !== null))];
  const themes: Record<string, Colours> = {};
  for (const name of names) {
    themes[name] = Object.assign(
      {},
      ...blocks.filter((b) => b.selectors.some((s) => s === ':root' || themeOf(s) === name)).map((b) => b.colours),
    );
  }
  const root = blocks.find((b) => b.selectors.includes(':root') && b.selectors.some((s) => themeOf(s)));
  return { themes, defaultTheme: root ? root.selectors.map(themeOf).find(Boolean)! : '' };
}

const tokensCss = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = readTokens(tokensCss);

/** [foreground, background, minimum ratio] */
type Pair = [string, string, number];

const THEME_PAIRS: Pair[] = [
  ['ink', 'paper', 4.5],
  ['ink-muted', 'paper', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'room', 4.5], // photo placeholder label
  ['ink', 'highlight', 4.5],
  ['ink', 'room', 4.5],
  ['on-ink', 'ink', 4.5],
  ['on-ink', 'ink-hover', 4.5], // primary button on hover
  ['focus', 'paper', 3], // focus ring (non-text: 3:1)
  ['focus', 'highlight', 3], // focus ring on the price tag's Choose a time button
  ['field-border', 'paper', 3], // text field outline (non-text: 3:1, WCAG 1.4.11)
  ['field-border', 'surface', 3], // the same outline against the field's own white fill
  ['ink', 'card', 4.5],
  ['ink-muted', 'card', 4.5],
  ['field-border', 'card', 3],
  ['on-ink', 'panel', 4.5],
  ['on-panel-muted', 'panel', 4.5],
  ['field-border', 'panel', 3],
];

/** Semantic colours from the shared :root block, as each theme ends up with them. */
const SEMANTIC_PAIRS: Pair[] = [
  ['success', 'success-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['danger', 'paper', 4.5],
  ['star', 'paper', 3], // filled rating stars: a non-text graphic, so WCAG 1.4.11 (3:1)
];

function ratio(fg: string, bg: string, colours: Colours): number {
  for (const name of [fg, bg]) {
    expect(colours[name], `--color-${name} must be a #hex value`).toMatch(/^#[0-9a-f]{3}([0-9a-f]{3})?$/);
  }
  return contrast(colours[fg], colours[bg]);
}

describe('contrast', () => {
  it('black on white is 21:1 and a colour on itself is 1:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#17323f', '#17323f')).toBeCloseTo(1, 5);
  });

  it('is the same either way round and reads 3-digit hex', () => {
    expect(contrast('#fff', '#000')).toBeCloseTo(21, 5);
    expect(contrast('#4e6874', '#ffffff')).toBeCloseTo(contrast('#ffffff', '#4e6874'), 10);
  });

  it('matches the known AA boundary grey', () => {
    // #767676 is the lightest grey that passes 4.5:1 on white.
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});

describe('tokens.css', () => {
  it('has the floorplan and eucalyptus themes, with floorplan as the :root default', () => {
    expect(Object.keys(tokens.themes)).toEqual(expect.arrayContaining(['floorplan', 'eucalyptus']));
    expect(tokens.defaultTheme).toBe('floorplan');
  });

  it('every theme block sets every colour the default theme sets, so none is silently inherited', () => {
    const blocks = readBlocks(tokensCss);
    const own = (name: string) => Object.keys(blocks.filter((b) => b.selectors.some((sel) => themeOf(sel) === name)).reduce((all, b) => ({ ...all, ...b.colours }), {} as Colours));
    const required = own(tokens.defaultTheme);
    for (const name of Object.keys(tokens.themes)) {
      expect(required.filter((token) => !own(name).includes(token)), `${name} is missing`).toEqual([]);
    }
  });

  it('has a [data-theme] block for every theme in business.themes', () => {
    for (const name of business.themes) expect(Object.keys(tokens.themes), name).toContain(name);
  });
});

describe.each(Object.keys(tokens.themes))('theme %s meets AA', (theme) => {
  const colours = tokens.themes[theme];

  it.each([...THEME_PAIRS, ...SEMANTIC_PAIRS])('%s on %s at least %s:1', (fg, bg, min) => {
    const value = ratio(fg, bg, colours);
    expect(value, `${theme}: --color-${fg} on --color-${bg} is ${value.toFixed(2)}:1, needs ${min}:1`).toBeGreaterThanOrEqual(min);
  });
});
