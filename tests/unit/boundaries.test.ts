import { describe, expect, it } from 'vitest';
import { findViolations, importRule } from '../../tools/boundaries.mjs';

const ok = 'tests/fixtures/boundaries/ok';
const bad = 'tests/fixtures/boundaries/bad';

describe('findViolations', () => {
  it('ok fixture has no violations', () => {
    expect(findViolations(ok)).toEqual([]);
  });

  it('flags each rule once', () => {
    const rules = findViolations(bad).map((v: { rule: string }) => v.rule).sort();
    expect(rules).toEqual([
      'core-imports-outside',
      'domain-imports-feature',
      'domain-imports-upward',
      'feature-imports-feature',
      'feature-imports-upward',
      'layout-imports-page',
      'raw-colour-outside-tokens',
      'section-imports-page',
      'storage-outside-core',
    ]);
  });

  it('names the file and the import for each new layer rule', () => {
    const found = findViolations(bad).map((v: { file: string; rule: string; detail: string }) => `${v.file}: ${v.rule} (${v.detail})`);
    expect(found).toEqual(
      expect.arrayContaining([
        'src/domain/y.ts: domain-imports-upward (imports @/sections/band)',
        'src/features/pricing/q.ts: feature-imports-upward (imports ../../layouts/site)',
        'src/layouts/L.astro: layout-imports-page (imports @/pages/index.astro)',
      ]),
    );
  });

  it('allows type-only config imports from domain', () => {
    const files = findViolations(ok).map((v: { file: string }) => v.file);
    expect(files).not.toContain('src/domain/ok.ts');
  });
});

describe('importRule', () => {
  // README "How the code is organised", the "May import" column. config/ and content/ are read by
  // everything except core/; an area may always import from itself.
  const data = ['config', 'content'];
  const features = ['features/a', 'features/b'];
  const mayImport: Record<string, string[]> = {
    core: ['core'],
    domain: ['domain', 'core', ...data],
    'features/a': ['features/a', 'domain', 'core', ...data],
    sections: ['sections', ...features, 'domain', 'core', ...data],
    layouts: ['layouts', ...features, 'domain', 'core', ...data],
    pages: ['pages', 'layouts', 'sections', ...features, 'domain', 'core', ...data],
  };
  const targets = ['core', 'domain', ...features, 'sections', 'layouts', 'pages', ...data];

  it('allows exactly the imports the README table lists', () => {
    const wrong: string[] = [];
    for (const [from, allowed] of Object.entries(mayImport)) {
      for (const to of targets) {
        const rule = importRule(from, to);
        if ((rule === null) !== allowed.includes(to)) wrong.push(`${from} → ${to}: ${rule ?? 'allowed'}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
