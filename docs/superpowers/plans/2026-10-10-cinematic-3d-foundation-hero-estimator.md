# Cinematic 3D redesign, plan 1: foundation, hero and estimator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Clearday home page a photoreal hero with a live price, and turn the estimator's floor plan into a real-time 3D model of the visitor's home, without changing pricing, booking or content.

**Architecture:** The existing SVG plan stays the single source of interaction. three.js's `CSS3DRenderer` lays that real SVG on a ground plane and a transparent, click-through WebGL canvas above it draws only walls, furniture and shadows, so every existing hook, focus ring and test keeps working. The model is one lazy chunk behind load gates; the hero is a `Scene` backdrop (still plus optional video) with a solid card; scroll-linked motion is a 20-line script that sets `--p` for CSS.

**Tech Stack:** Astro 5 (static), TypeScript strict, scoped CSS on tokens, three.js 0.186.1 (no React Three Fiber), Vitest, Playwright, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md`. This plan covers the spec's phases 2 and 3. Phases 4 to 6 (the other sections, performance pass, QA) are plan 2, written after this one lands.

## Global Constraints

- Work on branch `design/cinematic-3d`, created from `main` (`d5053fe`) in its own worktree. Never touch, stash or commit the `design/mews-restyle` checkout except to copy files out of it.
- Commit locally only. Never push. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not change `src/config/*` (except adding photo slots), `src/domain/*`, `src/content/*`, the `/book/` flow, any form, or the owner console.
- The estimator section keeps `id="plan"` and class `hero`, and contains exactly one of each `data-price-*` hook.
- No price is typed into markup. Every price is rendered from `quote()`.
- New copy is limited to four strings: "Price your home", "Sample photo", "Illustration, not a client's home." and "Pause background video". Everything else reuses existing copy word for word.
- Sample data stays labelled as sample ("Sample prices." beside every demo price).
- Colours come from tokens only. Outside `src/styles/tokens.css`, a hex colour after a colour property, or the text `rgb(` / `hsl(` anywhere (even in a comment), fails `npm test`.
- Import boundaries hold: `pages → layouts | sections → features → domain → core`; `core` imports only `core`; features never import each other. Storage only through `src/core/storage.ts`.
- `three` is imported by exactly one file: `src/features/plan/scene3d.ts`. No animation library is added.
- Motion uses `transform` and `opacity` only. Scrolling stays native. `prefers-reduced-motion: reduce` removes video, scroll-linked motion and the 3D model, and keeps colour fades.
- JavaScript budget per page, gzipped: eager at most 30 KB (30,720 bytes), lazy at most 150 KB (153,600 bytes).
- The 3D model loads only when all hold: viewport 768px or wider, reduced motion off, Save-Data off, WebGL2 available, estimator within one viewport of the screen, page loaded.
- Video is attached only when: viewport 768px or wider, reduced motion off, Save-Data off, connection not 2G or 3G.
- Existing tests are not edited, except `tests/unit/js-budget.test.ts` (spec §12). If another existing test needs a change, stop and raise it.
- A bug found in existing behaviour is written down for the owner and left alone.
- Never report a test as passed unless it ran. Report performance only from measurements.

## Verified before planning

A throwaway spike (a scratch folder outside the repo, three 0.186.1) ran this plan's exact `scene3d.ts`, `model.ts` and `plan.ts` changes against the real `layout()` and `renderPlanSvg()` from `main`, on a static page that copies the estimator's markup. The browser was Playwright's Chromium, launched the way `tests/e2e/harness.mjs` launches it (`executablePath`, no flags).

- Eleven of the twelve `model.e2e.mjs` steps in Task 4 were ported and all eleven passed. The twelfth needs `/book/`. The price assertions were left out, because the scratch page has no price tag or controls.
- WebGL's projection and the browser's CSS 3D transform of the SVG agree to within 0.01 px at rest, and after a resize from 1280 to 900 wide.
- Starting the model moves nothing around it and keeps keyboard focus. Clicks and key presses reach the real SVG rooms through the canvas. Losing the WebGL context restores the flat plan, and rooms can still be added.
- That launch has WebGL2 on this machine (ANGLE over Direct3D 11) with no extra flags, so the harness needs no change. A machine without it prints "– skipped" for the model steps.
- `CSS3DRenderer`'s floor has to stay clipped. Left unclipped, the tilted plan widened the page's scroll area by 20 px at 1280. `overflow: clip` with an 8 px margin fixed it and still shows a focus ring just outside the drawing. The first model step asserts there is no horizontal scroll.
- `PCFSoftShadowMap` no longer exists in three 0.186 (it warns and falls back). The default `PCFShadowMap` is already soft, so the code sets no shadow type.
- Bundled and minified with esbuild, the lazy chunk was 135.4 KB gzipped (138,670 bytes), inside the 150 KB lazy limit. Astro's build will differ a little; Task 4 measures the real figure.
- `scene3d.ts`, `scene.ts`, `motion.ts` and the changed `plan.ts` and `price-tag.ts` type-check with 0 errors under the project's strict settings. The box counts the tests expect (41, 81, 52, 47, 53) were checked against the real `layout()`.

Not run before planning: the `Scene`, `PriceLine`, `HeroScene` and `Estimator` markup and CSS. Their tasks' tests and screenshots are the check.

## Spec notes the owner should know

- **Reveal is deferred to plan 2.** Spec §8 puts Reveal in `motion.ts`. Nothing in this plan uses it, and it hides off-screen sections from the axe scan until they are revealed, which needs a change to `tests/e2e/quality.e2e.mjs`. Plan 2 adds it with its first consumer and raises that test change. This plan builds the Progress half (`--p`).
- **`tests/e2e/home.e2e.mjs` needs no edit.** Its steps already scroll through Playwright.
- **Wall rule.** Spec §6.2 says camera-side walls are lowered. Implemented as: walls that run across the view are 0.2 high, except along the back edge of the plan (0.9). Side walls are 0.9.
- **Test seams.** The figure gets `data-model="on"`, `data-model-boxes="<count>"` and a `planPointOnScreen(x, y)` method while the model runs, so e2e can check alignment and state.
- **Two icons added**, `pause` and `play`, for the video button. The button keeps one label, "Pause background video", and uses `aria-pressed`.
- **A two-second sample clip** (`public/media/sample.webm` and `.mp4`, a few KB) ships for the `/dev/ui/` page so the video path is tested before the real hero loop exists.
- **One rule in `price-tag.ts` widens.** The pinned desktop price tag hides while the estimator is on screen, because the price is already in view. The hero now shows the price too, so the tag also hides while the hero's price line is on screen. Without this, a returning visitor on a short laptop screen gets the pinned tag on top of the hero. It is presentation only: no price, quote or booking link changes. A test in Task 6 pins it.
- **The estimator card sits inside the page margins.** `Hero.astro` had one element carrying both `wrap` and `hero__grid`. `Estimator.astro` nests them, so the card's padding and shadow sit inside the wrap. Every hook the tests use is unchanged.
- **No new tooling.** Screenshots use the existing `tools/shot.mjs`, and e2e runs through the existing `npm run e2e` with `CHROMIUM_PATH` set for this machine.

## Review Focus

Each line is pinned by a test in the task that owns the code.

1. **The GPU drops the WebGL context mid-visit** (driver reset, tab restored). The plan goes flat and rooms can still be added. Test: `losing the WebGL context puts the flat plan back and the estimator still works` (Task 4).
2. **A returning visitor has a saved home** that is not the default. The model builds that home, and the hero shows that price. Tests: `a returning visitor's saved home is the one the model builds` (Task 4) and `the hero price follows the estimator and is still right on the next visit` (Task 6).
3. **A keyboard user is focused inside the plan when the model starts.** Focus stays on the same room and nothing on the page moves. Test: `starting the model shifts nothing and keeps keyboard focus` (Task 4).
4. **The window is resized or a tablet is rotated with the model running.** The model stays aligned and inside the page. Test: `the model follows a resize and stays inside the page` (Task 4).
5. **The visitor is on Save-Data or a 2G/3G connection.** Neither the model nor the video is downloaded. Tests: `Save-Data keeps the flat plan` (Task 4), `Save-Data never asks for the video` and `a 3G connection never asks for the video` (Task 5).

## File map

| File | Status | Responsibility |
| --- | --- | --- |
| `tools/js-budget.mjs` | change | Two limits: eager and lazy |
| `src/features/plan/model.ts` | new | Pure: `Plan` to wall and furniture boxes |
| `src/features/plan/scene3d.ts` | new | The only three.js importer: renders the model |
| `src/features/plan/plan.ts` | change | Load gates and the lazy `import('./scene3d')` |
| `src/features/plan/FloorPlan.astro` | change | Fixed-aspect stage wrapper |
| `src/features/plan/svg.ts` | change | Exports `PAD` |
| `src/styles/tokens.css` | change | `--shadow-1`, `--shadow-2`, `--dur-reveal`, `--dur-scene` |
| `src/core/ui/Scene.astro`, `scene.ts` | new | Backdrop still, lazy video, pause button |
| `src/core/ui/icons.ts` | change | `pause`, `play` |
| `src/features/pricing/PriceLine.astro` | new | Compact live price for the hero |
| `src/features/pricing/price-tag.ts` | change | The pinned tag also hides while the hero's price line is on screen |
| `src/layouts/motion.ts` | new | Sets `--p` on `[data-progress]` |
| `src/layouts/BaseLayout.astro`, `src/styles/global.css` | change | Load `motion.ts`; register `--p` |
| `src/sections/HeroScene.astro` | new | The first screen |
| `src/sections/Estimator.astro` | renamed from `Hero.astro` | The estimator as a raised card |
| `src/pages/index.astro` | change | Section order |
| `src/config/photo-slots.ts` | change | Corrected alt texts; slots `hero` and `hero-portrait` |
| `src/pages/dev/ui.astro` | change | Shows `Scene` with the sample clip |
| `tests/unit/model.test.ts`, `tests/e2e/model.e2e.mjs`, `scene.e2e.mjs`, `hero.e2e.mjs` | new | Tests |

## Commands used throughout

Run from the worktree root, in Git Bash. The e2e harness and `tools/shot.mjs` default to a Linux CI browser path, so every new shell starts by pointing them at Playwright's own Chromium:

```bash
export CHROMIUM_PATH="$(node -e "import('playwright').then((p) => console.log(p.chromium.executablePath()))")"
```

The preview server is started once (in the background) and keeps serving `dist/` across rebuilds. If a build fails with `EBUSY` or `EPERM` on Windows, stop the preview, build, and start it again.

```bash
npm run preview -- --port 4331                             # background; leave running
npm run e2e -- http://localhost:4331                       # every e2e file
npm run e2e -- http://localhost:4331 model                 # only files whose name contains "model"
STEP="resize" npm run e2e -- http://localhost:4331 model   # only steps whose name matches
```

Screenshots use the existing `tools/shot.mjs <path> <width> <out.png> [fullPage]`, where `0` captures the first screen (800px high) and `1` the whole page:

```bash
mkdir -p shots
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 1280 shots/home.png 0
```

`MSYS_NO_PATHCONV=1` stops Git Bash rewriting the `/` argument into a Windows path; it is harmless on other systems. `shots/` is ignored by the existing `*.png` rule in `.gitignore`. If the tool prints `ERRORS:`, the page logged an error: find the cause before going on.

---

### Task 1: Workspace, baseline and carried-over photos

**Files:**

- Create: `src/assets/photos/` (9 files copied in)
- Modify: `src/config/photo-slots.ts`, `docs/photo-credits.md`, `docs/photo-brief.md` (regenerated)
- Modify: the Measurements table at the end of this plan

**Interfaces:**

- Consumes: nothing.
- Produces: a clean worktree on `design/cinematic-3d`; the "main" column of the Measurements table; photo slots `offices` and `service-regular` filled (Task 5 uses both).

- [ ] **Step 1: Create the worktree**

Use superpowers:using-git-worktrees. The result must equal:

```bash
MAIN="D:/Reozix/Cleaning Companies/clearday-cleaning-source/clearday-cleaning"
git -C "$MAIN" worktree add -b design/cinematic-3d "$MAIN/.claude/worktrees/cinematic-3d" main
cd "$MAIN/.claude/worktrees/cinematic-3d" && npm ci
```

Expected: `git status` in the worktree is clean and `git log --oneline -1` shows `d5053fe`. Every later path is relative to this worktree. `$MAIN` always means the original checkout.

- [ ] **Step 2: Bring the spec and this plan onto the branch**

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp "$MAIN/docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md" docs/superpowers/specs/
cp "$MAIN/docs/superpowers/plans/2026-10-10-cinematic-3d-foundation-hero-estimator.md" docs/superpowers/plans/
git add docs/superpowers
git commit -m "docs: cinematic 3D redesign spec and plan 1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

From here on, tick checkboxes in the worktree's copy of the plan.

- [ ] **Step 3: Record the baseline on untouched `main` code**

```bash
npm test
npm run check
npm run build
npm run budget
```

Start the preview in the background (`npm run preview -- --port 4331`), then:

```bash
export CHROMIUM_PATH="$(node -e "import('playwright').then((p) => console.log(p.chromium.executablePath()))")"
npm run e2e -- http://localhost:4331
```

Expected: unit tests all pass, `astro check` reports 0 errors, the budget prints "All 24 pages within budget.", and every e2e file shows ✓. If Chromium is missing, run `npx playwright install chromium` and repeat.

Then Lighthouse, three runs each for `/` and `/book/` (mobile is Lighthouse's default):

```bash
OUT=node_modules/.cache/lighthouse; mkdir -p "$OUT"
for page in home book; do
  url="http://localhost:4331/"; [ "$page" = book ] && url="http://localhost:4331/book/"
  for i in 1 2 3; do CHROME_PATH="$CHROMIUM_PATH" npx --yes lighthouse@12 "$url" --only-categories=performance,accessibility --output=json --output-path="$OUT/$page-$i.json" --quiet --chrome-flags="--headless=new"; done
done
node -e "const fs=require('fs');for(const p of ['home','book'])for(const i of [1,2,3]){const r=JSON.parse(fs.readFileSync(process.argv[1]+'/'+p+'-'+i+'.json'));console.log(p,i,'perf',Math.round(r.categories.performance.score*100),'a11y',Math.round(r.categories.accessibility.score*100),'LCP',r.audits['largest-contentful-paint'].displayValue,'CLS',r.audits['cumulative-layout-shift'].displayValue,'TBT',r.audits['total-blocking-time'].displayValue)}" "$OUT"
```

Write the results into the "main" column of the Measurements table at the end of this plan: unit test count, e2e step total, the three heaviest pages from `npm run budget`, and the median of the three Lighthouse runs for each page.

- [ ] **Step 4: Copy the nine CC0 photos**

```bash
mkdir -p src/assets/photos
cp "$MAIN"/src/assets/photos/{area-albany-creek.jpg,area-aspley.jpg,area-chermside.jpg,area-everton-park.jpg,offices.jpg,service-deep.jpg,service-end-of-lease.webp,service-move-in.jpg,service-regular.jpg} src/assets/photos/
ls src/assets/photos | wc -l
```

Expected: `9`.

- [ ] **Step 5: Correct the alt texts to match the photos**

In `src/config/photo-slots.ts`, change only the `alt` of these seven slots:

| Slot | New `alt` |
| --- | --- |
| `service-deep` | `A clean basin and tapware against dark bathroom tiles` |
| `service-move-in` | `A clean, bright kitchen ready for a new household` |
| `area-chermside` | `The atrium at Westfield Chermside` |
| `area-aspley` | `Gympie Road in Aspley under a blue sky` |
| `area-albany-creek` | `Albany Creek Road and the local shops in Albany Creek` |
| `area-everton-park` | `Everton Park Library on South Pine Road` |
| `offices` | `A clean, empty meeting room with a long table` |

- [ ] **Step 6: Record the credits**

In `docs/photo-credits.md`, add these rows under the existing table header:

```markdown
| `service-regular` | `service-regular.jpg` | https://stocksnap.io/photo/bedroom-bed-XWI13131WH | CC0 | Mary Whitney |
| `service-deep` | `service-deep.jpg` | https://stocksnap.io/photo/bathroom-sink-D3901L7G93 | CC0 | Dan Watson |
| `service-end-of-lease` | `service-end-of-lease.webp` | https://www.rawpixel.com/image/3285456/free-photo-image-door-room-empty | CC0 | rawpixel (not named) |
| `service-move-in` | `service-move-in.jpg` | https://stocksnap.io/photo/kitchen-interior-3ZX53UFU8B | CC0 | Matt Bango |
| `offices` | `offices.jpg` | https://stocksnap.io/photo/office-work-FSU5SG0X4U | CC0 | Benjamin Child |
| `area-chermside` | `area-chermside.jpg` | https://commons.wikimedia.org/wiki/File:Westfield_Chermside_South_Atrium_stairs,_Gympie_Road,_Chermside_P1120759.jpg | CC0 | John Robert McPherson |
| `area-aspley` | `area-aspley.jpg` | https://commons.wikimedia.org/wiki/File:Cumulus_mediocris_Gympie_Rd_Aspley_P1430322.jpg | CC0 | John Robert McPherson |
| `area-albany-creek` | `area-albany-creek.jpg` | https://commons.wikimedia.org/wiki/File:Albany_Creek_Queensland.gjm.JPG | Public domain | Gmcgarry |
| `area-everton-park` | `area-everton-park.jpg` | https://commons.wikimedia.org/wiki/File:Everton_Park_Library_South_Pine_Rd_Everton_Park_P1330239.jpg | CC0 | John Robert McPherson |
```

- [ ] **Step 7: Regenerate the photo brief and verify with photos in place**

```bash
npm run photos:status -- --write
npm test && npm run build && npm run e2e -- http://localhost:4331
```

Expected: the status line starts "Photo slots: 9 of 10 filled", and tests, build and every e2e file pass.

- [ ] **Step 8: Commit**

```bash
git add src/assets/photos src/config/photo-slots.ts docs/photo-credits.md docs/photo-brief.md docs/superpowers/plans
git commit -m "chore: baseline numbers and the nine CC0 photos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: JavaScript budget with an eager and a lazy limit

**Files:**

- Modify: `tools/js-budget.mjs`
- Test: `tests/unit/js-budget.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `LIMIT = 30_720`, `LAZY_LIMIT = 153_600`, `pageScriptBytes(root): { page: string; bytes: number; lazy: number }[]`, `overBudget(pages, limit = LIMIT, lazyLimit = LAZY_LIMIT)`. `bytes` is eager JavaScript, `lazy` is JavaScript reached only through a dynamic `import()`.

- [ ] **Step 1: Rewrite the test file**

Replace all of `tests/unit/js-budget.test.ts` with:

```ts
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
    expect(overBudget(pages, 30_720, 153_600).map((p) => p.page)).toEqual(['/model/', '/book/', '/']);
  });

  it('defaults to 30 KB eager and 150 KB lazy', () => {
    expect([LIMIT, LAZY_LIMIT]).toEqual([30_720, 153_600]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/js-budget.test.ts`
Expected: FAIL. The results have no `lazy` field and `LAZY_LIMIT` is undefined.

- [ ] **Step 3: Change the tool**

In `tools/js-budget.mjs`, replace the header comment with:

```js
/**
 * JavaScript budget (spec §8): two limits on the gzipped JS of every built page.
 *   eager: inline scripts, script files and everything they import statically. 30 KB.
 *   lazy:  files reached only through a dynamic import(). 150 KB.
 * Each file counts once per page; a file reached both ways counts as eager.
 *
 *   npm run build && npm run budget       exits 1 if any page is over either limit
 */
```

Replace the `LIMIT` line and the `IMPORT` regex with:

```js
export const LIMIT = 30_720;
export const LAZY_LIMIT = 153_600;
```

```js
const STATIC_IMPORT = /\b(?:import|export)\s*(?:[\w{}\s,*$]+from\s*)?["'](\.{1,2}\/[^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']/g;
```

Replace `scriptBytes`, `pageScriptBytes` and `overBudget` with:

```js
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
```

Replace the command-line block at the bottom with:

```js
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
```

- [ ] **Step 4: Run the tests and the tool**

Run: `npx vitest run tests/unit/js-budget.test.ts && npm run build && npm run budget`
Expected: 6 tests pass. The budget prints the same three heaviest pages as the baseline, no "(lazy)" line, and "All 24 pages within budget."

- [ ] **Step 5: Commit**

```bash
git add tools/js-budget.mjs tests/unit/js-budget.test.ts
git commit -m "feat(budget): separate eager and lazy JavaScript limits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The pure box model

**Files:**

- Create: `src/features/plan/model.ts`
- Test: `tests/unit/model.test.ts`

**Interfaces:**

- Consumes: `Plan` and `PlanRoom` from `src/features/plan/layout.ts` (`PlanRoom` has `id`, `kind`, `x`, `y`, `w`, `h`, `state: 'included' | 'available'`); `RoomKind` from `@/config/rooms`.
- Produces: `interface Box { room: string; kind: 'wall' | 'furniture'; x: number; y: number; w: number; d: number; h: number }` in plan units (`x`, `y` are the top-left corner on the plan, `w` and `d` the size along the plan's x and y, `h` the height); `model(plan: Plan): Box[]`; `WALL_HEIGHT = 0.9`; `LOW_WALL_HEIGHT = 0.2`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rooms } from '@/config/rooms';
import { DEFAULT_SELECTION } from '@/domain/selection';
import { layout } from '@/features/plan/layout';
import { LOW_WALL_HEIGHT, WALL_HEIGHT, model } from '@/features/plan/model';

const home = layout(DEFAULT_SELECTION, rooms);
const boxes = model(home);
const full = layout({ ...DEFAULT_SELECTION, bedrooms: rooms.max.bedrooms, bathrooms: rooms.max.bathrooms, study: true, laundry: true }, rooms);
const EPSILON = 1e-9;

describe('model', () => {
  it('gives the default home four walls a room: 28 for its 7 rooms', () => {
    expect(home.rooms.filter((r) => r.state === 'included')).toHaveLength(7);
    expect(boxes.filter((b) => b.kind === 'wall')).toHaveLength(28);
  });

  it('builds 41 boxes for the default home and 81 for the largest', () => {
    expect(boxes).toHaveLength(41);
    expect(model(full)).toHaveLength(81);
  });

  it('builds nothing on a dashed "add" slot', () => {
    const slots = home.rooms.filter((r) => r.state === 'available').map((r) => r.id);
    expect(slots.length).toBeGreaterThan(0);
    expect(boxes.filter((b) => slots.includes(b.room))).toEqual([]);
  });

  for (const [name, plan] of [['default', home], ['largest', full]] as const) {
    it(`keeps every box inside its room (${name} home)`, () => {
      for (const b of model(plan)) {
        const r = plan.rooms.find((room) => room.id === b.room)!;
        expect(b.x, b.room).toBeGreaterThanOrEqual(r.x - EPSILON);
        expect(b.y, b.room).toBeGreaterThanOrEqual(r.y - EPSILON);
        expect(b.x + b.w, b.room).toBeLessThanOrEqual(r.x + r.w + EPSILON);
        expect(b.y + b.d, b.room).toBeLessThanOrEqual(r.y + r.h + EPSILON);
        expect(b.w > 0 && b.d > 0 && b.h > 0, b.room).toBe(true);
      }
    });
  }

  it('keeps walls that run across the view low, except along the back of the plan', () => {
    const across = boxes.filter((b) => b.kind === 'wall' && b.w > b.d);
    for (const b of across) expect(b.h).toBe(b.y === 0 ? WALL_HEIGHT : LOW_WALL_HEIGHT);
    expect(across.some((b) => b.h === WALL_HEIGHT)).toBe(true);
  });

  it('furnishes every room in the home, in the top part of the room so the label stays clear', () => {
    for (const r of full.rooms) {
      const furniture = model(full).filter((b) => b.room === r.id && b.kind === 'furniture');
      expect(furniture.length, r.id).toBeGreaterThan(0);
      for (const b of furniture) {
        expect(b.y + b.d, r.id).toBeLessThanOrEqual(r.y + r.h * 0.4);
        expect(b.h, r.id).toBeLessThan(WALL_HEIGHT);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/model.test.ts`
Expected: FAIL, cannot resolve `@/features/plan/model`.

- [ ] **Step 3: Write the model**

Create `src/features/plan/model.ts`:

```ts
/**
 * Turns a Plan into the boxes of the 3D home model: walls and simple furniture,
 * in plan units (the units PlanRoom uses). Pure: no three.js and no DOM.
 * Only rooms that are in the home get boxes; a dashed "add" slot stays flat.
 */
import type { RoomKind } from '@/config/rooms';
import type { Plan, PlanRoom } from './layout';

export interface Box {
  room: string;
  kind: 'wall' | 'furniture';
  /** Top-left corner on the plan, then size along the plan's x and y. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Height above the floor. */
  h: number;
}

export const WALL_HEIGHT = 0.9;
/** A wall that runs across the view would hide the floor behind it, so it stays low. */
export const LOW_WALL_HEIGHT = 0.2;
const WALL = 0.08;

/**
 * Furniture per room kind, as fractions of the room: x, y, width, depth, then
 * height in plan units. All of it sits in the top third, clear of the room's label.
 */
const FURNITURE: Record<RoomKind, [number, number, number, number, number][]> = {
  bedroom: [[0.2, 0.08, 0.6, 0.28, 0.25], [0.2, 0.08, 0.6, 0.04, 0.5]],
  bathroom: [[0.1, 0.08, 0.42, 0.2, 0.4], [0.62, 0.08, 0.28, 0.28, 0.25]],
  living: [[0.12, 0.1, 0.5, 0.26, 0.22], [0.12, 0.1, 0.5, 0.07, 0.42]],
  kitchen: [[0.08, 0.08, 0.84, 0.2, 0.45]],
  study: [[0.15, 0.08, 0.7, 0.22, 0.36]],
  laundry: [[0.15, 0.08, 0.7, 0.26, 0.42]],
};

function walls(r: PlanRoom): Box[] {
  const wall = (x: number, y: number, w: number, d: number, h: number): Box => ({ room: r.id, kind: 'wall', x, y, w, d, h });
  return [
    wall(r.x, r.y, r.w, WALL, r.y === 0 ? WALL_HEIGHT : LOW_WALL_HEIGHT),
    wall(r.x, r.y + r.h - WALL, r.w, WALL, LOW_WALL_HEIGHT),
    wall(r.x, r.y + WALL, WALL, r.h - 2 * WALL, WALL_HEIGHT),
    wall(r.x + r.w - WALL, r.y + WALL, WALL, r.h - 2 * WALL, WALL_HEIGHT),
  ];
}

function furniture(r: PlanRoom): Box[] {
  return FURNITURE[r.kind].map(([x, y, w, d, h]) => ({ room: r.id, kind: 'furniture', x: r.x + x * r.w, y: r.y + y * r.h, w: w * r.w, d: d * r.h, h }));
}

export function model(plan: Plan): Box[] {
  return plan.rooms.filter((r) => r.state === 'included').flatMap((r) => [...walls(r), ...furniture(r)]);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/model.test.ts && npm test`
Expected: 7 model tests pass, and the full unit suite and boundary check pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/plan/model.ts tests/unit/model.test.ts
git commit -m "feat(plan): pure box model of the home for the 3D view" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The 3D home model on the estimator

**Files:**

- Create: `src/features/plan/scene3d.ts`
- Modify: `src/features/plan/svg.ts` (export `PAD`), `src/features/plan/FloorPlan.astro`, `src/features/plan/plan.ts`, `package.json`, `package-lock.json`
- Test: `tests/e2e/model.e2e.mjs`

**Interfaces:**

- Consumes: `model(plan): Box[]` and `Box` from Task 3; `layout(s, rooms)`; `UNIT` and `PAD` from `./svg`; `onSelection(cb): () => void` from `@/domain/events`; `Selection` from `@/domain/selection`.
- Produces: `start(figure: HTMLElement, selection: Selection): void` in `scene3d.ts`. While the model runs, the `[data-plan]` figure carries `data-model="on"`, `data-model-boxes="<number of boxes>"` and a method `planPointOnScreen(x: number, y: number): [number, number]` (plan units in, viewport pixels out). The stage wrapper is `[data-plan-stage]`; the canvas has class `plan__model`. The lazy chunk's file name contains `scene3d`.

This task is the spec's alignment spike made real. Step 9 is a stop gate.

- [ ] **Step 1: Add three.js**

```bash
npm install --save-exact three@0.186.1
npm install --save-dev --save-exact @types/three@0.186.0
```

- [ ] **Step 2: Write the failing e2e file**

Create `tests/e2e/model.e2e.mjs`:

```js
/**
 * The 3D home model on the estimator (spec §6, §16): it lines up with the SVG
 * plan, never gets in the plan's way, and the flat plan carries on whenever the
 * model can't or shouldn't load.
 */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { browser, step, go, overflow, finish } = await harness();

const FIGURE = '#plan [data-plan]';
const MODEL_ON = `${FIGURE}[data-model="on"]`;
const FLAT = '#plan [data-plan-stage] > [data-plan-svg]';

// Spec §16: without WebGL in the test browser, "model on" steps are skipped, never passed.
const probe = await browser.newPage();
const webgl = await probe.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
await probe.close();
const modelStep = (name, fn, options) => (webgl ? step(name, fn, options) : console.log(`– skipped, this browser has no WebGL2: ${name}`));

const modelOn = (page) => page.locator(MODEL_ON).waitFor({ timeout: 15000 });
const boxes = (page) => page.locator(FIGURE).getAttribute('data-model-boxes');
const price = (page) => page.locator('#plan [data-price-per-visit]').innerText();
const rect = (page, selector) =>
  page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  });

/** Waits until the model has stopped moving: the drawing's on-screen box reads the same twice running. */
async function settled(page) {
  let before = '';
  for (let i = 0; i < 50; i++) {
    const now = JSON.stringify(await rect(page, `${FIGURE} [data-plan-svg]`));
    if (now === before) return;
    before = now;
    await page.waitForTimeout(120);
  }
  throw new Error('the model never settled');
}

/** The largest gap, in pixels, between where WebGL puts a room's floor and where the browser drew that SVG room. */
async function misalignment(page, id) {
  const fill = `${FIGURE} [data-room-id="${id}"] .room__fill`;
  const dom = await rect(page, fill);
  const gl = await page.$eval(fill, (el) => {
    const figure = el.closest('[data-plan]');
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((name) => Number(el.getAttribute(name)) / 40); // svg.ts UNIT
    const points = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => figure.planPointOnScreen(px, py));
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  return Math.max(...dom.map((edge, i) => Math.abs(edge - gl[i])));
}

/** The core estimator behaviour on a fresh visit. It must hold whether or not the model is running. */
async function estimatorWorks(page) {
  assert.equal(await price(page), '$179');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
  assert.equal(await price(page), '$197');
  await page.locator('#plan [data-room-id="add-study"]').click();
  assert.equal(await page.locator('#plan [data-room-id="study"]').count(), 1);
  assert.notEqual(await price(page), '$197');
  await page.locator('#plan [data-room-id="add-bathroom"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#plan [data-room-id="bath-3"]').count(), 1);
}

/** Collects requests for the lazy model chunk. */
function modelRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('scene3d')) urls.push(request.url());
  });
  return urls;
}

/** A page where the model must not run: nothing was asked for, the plan is flat, and it all still works. */
async function staysFlat(page, { asked = 0 } = {}) {
  const urls = modelRequests(page);
  await go(page, '/');
  await page.waitForTimeout(700);
  assert.equal(urls.length, asked, 'requests for the model');
  assert.equal(await page.locator(MODEL_ON).count(), 0);
  assert.equal(await page.locator(FLAT).count(), 1);
  await estimatorWorks(page);
}

// ── Model on ─────────────────────────────────────────────────
await modelStep('the model starts on a wide screen and lines up with the SVG plan', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  for (const id of ['bed-1', 'kitchen', 'add-study']) {
    const off = await misalignment(page, id);
    assert.ok(off <= 1.5, `${id} is ${off.toFixed(2)}px out`);
  }
  const stage = await rect(page, '#plan [data-plan-stage]');
  const drawing = await rect(page, `${FIGURE} [data-plan-svg]`);
  assert.ok(drawing[3] - drawing[1] < (stage[3] - stage[1]) * 0.9, 'the plan is tilted at rest');
  const canvas = page.locator('#plan canvas.plan__model');
  assert.equal(await canvas.getAttribute('aria-hidden'), 'true');
  assert.equal(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await boxes(page), '41');
  assert.equal(await overflow(page), 0);
}, { width: 1280 });

await modelStep('starting the model shifts nothing and keeps keyboard focus', async (page) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route('**/scene3d*', async (route) => {
    await held;
    await route.continue();
  });
  await go(page, '/');
  await page.locator(`${FIGURE} [data-room-id="add-laundry"]`).focus();
  const around = () => Promise.all(['#plan [data-plan-stage]', '#plan [data-plan-rooms]', '#plan [data-price-tag]'].map((s) => rect(page, s)));
  const before = await around();
  release();
  await modelOn(page);
  assert.deepEqual(await around(), before);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-room-id')), 'add-laundry');
}, { width: 1280 });

await modelStep('rooms can still be added by click and by keyboard with the model on', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await settled(page);
  await page.locator('#plan [data-room-id="add-bedroom"]').click();
  assert.equal(await page.locator('#plan [data-room-id="bed-4"]').count(), 1);
  assert.equal(await price(page), '$197');
  assert.equal(await boxes(page), '47');
  await page.locator('#plan [data-room-id="add-bathroom"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#plan [data-room-id="bath-3"]').count(), 1);
  assert.equal(await boxes(page), '53');
  assert.ok(await page.evaluate(() => document.activeElement?.closest('[data-plan]') !== null), 'focus stays in the plan');
}, { width: 1280 });

await modelStep("a returning visitor's saved home is the one the model builds", async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.locator('[data-toggle="study"]').click();
  await go(page, '/');
  await modelOn(page);
  assert.equal(await boxes(page), '52');
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  const off = await misalignment(page, 'bed-4');
  assert.ok(off <= 1.5, `bed-4 is ${off.toFixed(2)}px out`);
}, { width: 1280 });

await modelStep('the model follows a resize and stays inside the page', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.setViewportSize({ width: 900, height: 800 });
  await page.locator(FIGURE).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settled(page);
  const off = await misalignment(page, 'bed-1');
  assert.ok(off <= 1.5, `bed-1 is ${off.toFixed(2)}px out after the resize`);
  assert.equal(await overflow(page), 0);
}, { width: 1280 });

await modelStep('losing the WebGL context puts the flat plan back and the estimator still works', async (page) => {
  await go(page, '/');
  await modelOn(page);
  await page.locator('#plan canvas.plan__model').evaluate((canvas) => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator(MODEL_ON).waitFor({ state: 'detached' });
  assert.equal(await page.locator('#plan canvas').count(), 0);
  assert.equal(await page.locator(FLAT).count(), 1);
  assert.equal(await page.locator(`${FIGURE} [data-plan-svg]`).getAttribute('style'), null);
  assert.equal(await page.locator(FIGURE).getAttribute('data-model-boxes'), null);
  await estimatorWorks(page);
}, { width: 1280 });

// ── Model off ────────────────────────────────────────────────
await step('phones get the flat plan and never download the model', (page) => staysFlat(page));

await step('reduced motion keeps the flat plan', (page) => staysFlat(page), { width: 1280, reducedMotion: 'reduce' });

await step('Save-Data keeps the flat plan', async (page, context) => {
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }), configurable: true }));
  await staysFlat(page);
}, { width: 1280 });

await step('a browser without WebGL2 keeps the flat plan', async (page, context) => {
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return type === 'webgl2' ? null : original.call(this, type, ...rest);
    };
  });
  await staysFlat(page);
}, { width: 1280 });

await modelStep('a model that fails to download leaves the flat plan working', async (page) => {
  await page.route('**/scene3d*', (route) => route.abort());
  await staysFlat(page, { asked: 1 });
}, { width: 1280 });

await step('the booking page never asks for the model', async (page) => {
  const urls = modelRequests(page);
  await go(page, '/book/');
  await page.waitForTimeout(700);
  assert.deepEqual(urls, []);
}, { width: 1280 });

await finish();
```

- [ ] **Step 3: Run it to see it fail**

Run: `npm run build && npm run e2e -- http://localhost:4331 model`
Expected: every "model on" step fails waiting for `[data-model="on"]`, and the "flat" steps fail on `#plan [data-plan-stage] > [data-plan-svg]` (the stage wrapper does not exist yet). "the booking page never asks for the model" passes.

- [ ] **Step 4: Export the plan padding**

In `src/features/plan/svg.ts`, change `const PAD = 4;` to:

```ts
export const PAD = 4;
```

- [ ] **Step 5: Give the plan a fixed-aspect stage**

In `src/features/plan/FloorPlan.astro`, change the import of `renderPlanSvg` to the first block below. Then replace the frontmatter's last line, `const svg = renderPlanSvg(layout(DEFAULT_SELECTION, rooms, { slots: mode === 'edit' }), { mode, title });`, with the last four lines of the second block (its first line is already there):

```astro
import { PAD, UNIT, renderPlanSvg } from './svg';
```

```astro
const { id, mode, title, selected } = Astro.props;
const plan = layout(DEFAULT_SELECTION, rooms, { slots: mode === 'edit' });
const svg = renderPlanSvg(plan, { mode, title });
// The stage holds the drawing's shape, so nothing moves when the 3D model takes the drawing over.
const aspect = `${plan.width * UNIT + 2 * PAD} / ${plan.height * UNIT + 2 * PAD}`;
```

Replace the `<figure>` markup with:

```astro
<figure class="plan" data-plan={id} data-mode={mode} data-title={title} data-selected={selected}>
  <div class="plan__stage" data-plan-stage style={`aspect-ratio: ${aspect}`}>
    <div class="plan__drawing" data-plan-svg tabindex="-1" set:html={svg} />
  </div>
  <figcaption class="plan__caption" data-plan-rooms aria-live="polite">{describeRooms(DEFAULT_SELECTION)}</figcaption>
</figure>
```

In the `<style>` block, add after the `.plan { … }` rule:

```css
  .plan__stage {
    position: relative;
  }
  /* The 3D model's two layers (scene3d.ts): the drawing on its floor, and the canvas above it. */
  .plan :global(.plan__floor),
  .plan :global(.plan__model) {
    position: absolute;
    inset: 0;
  }
  .plan :global(.plan__model) {
    pointer-events: none;
  }
```

- [ ] **Step 6: Write the renderer**

Create `src/features/plan/scene3d.ts`:

```ts
/**
 * The 3D home model on an edit plan (spec §6). The SVG plan itself is the floor:
 * CSS3DRenderer lays the real drawing on the ground plane, so its labels, colours,
 * focus rings and click handling are untouched. A transparent WebGL canvas above
 * it draws only what has height (walls, furniture, shadows) and never takes
 * pointer events. This is the only file that imports three.
 */
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { rooms } from '@/config/rooms';
import { onSelection } from '@/domain/events';
import type { Selection } from '@/domain/selection';
import { layout } from './layout';
import { model } from './model';
import { PAD, UNIT } from './svg';

const FOV = 30;
/** Rest pose: the camera sits 50° above the horizon, so 40° off straight down. */
const TILT = MathUtils.degToRad(40);
const TURN = MathUtils.degToRad(4);
/** At rest the plan's near edge fills this much of the stage width. */
const FIT = 0.9;
const RISE_MS = 180;
/** Frame-time watchdog (spec §6.4): frames per sample, and the slowest acceptable average. */
const SAMPLE = 60;
const SLOW_MS = 40;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Test seam (tests/e2e/model.e2e.mjs): where WebGL draws a point of the plan, in viewport pixels. */
type Probe = { planPointOnScreen?: (x: number, y: number) => [number, number] };

export function start(figure: HTMLElement & Probe, selection: Selection): void {
  const stage = figure.querySelector<HTMLElement>('[data-plan-stage]');
  const drawing = figure.querySelector<HTMLElement>('[data-plan-svg]');
  if (!stage || !drawing) return;

  let gl: WebGLRenderer;
  try {
    gl = new WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // no context: the flat plan stays
  }
  gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gl.shadowMap.enabled = true;
  const canvas = gl.domElement;
  canvas.className = 'plan__model';
  canvas.setAttribute('aria-hidden', 'true');

  const css = new CSS3DRenderer();
  css.domElement.className = 'plan__floor';
  // CSS3DRenderer clips at the stage edge. Clip a little further out, so a focus ring just outside the
  // drawing still shows; leaving it unclipped lets the tilted plan widen the page's scroll area.
  css.domElement.style.overflow = 'clip';
  css.domElement.style.overflowClipMargin = '8px';

  const token = (name: string) => new Color(getComputedStyle(figure).getPropertyValue(name).trim());
  const white = token('--color-surface');
  const geometry = new BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5); // origin at a bottom corner
  const materials = {
    wall: new MeshStandardMaterial({ color: white, roughness: 0.9 }),
    furniture: new MeshStandardMaterial({ color: token('--color-paper'), roughness: 0.9 }),
  };
  const shade = new ShadowMaterial({ color: token('--color-ink'), opacity: 0.2 });

  const scene = new Scene();
  const pivot = new Group(); // turns with the pointer
  const boxes = new Group(); // plan units to pixels
  const floor = new CSS3DObject(drawing);
  floor.rotation.x = -Math.PI / 2;
  const ground = new Mesh(new PlaneGeometry(1, 1), shade);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  pivot.add(boxes, ground);
  const sun = new DirectionalLight(white, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  scene.add(pivot, sun, sun.target, new HemisphereLight(white, token('--color-room'), 2.2));

  const camera = new PerspectiveCamera(FOV, 1, 1, 10);
  camera.up.set(0, 0, -1); // the top of the plan is the top of the screen

  let plan = layout(selection, rooms);
  let known = new Set<string>();
  let width = 0;
  let height = 0;
  let focal = 0;
  let tilt = 0; // 0 flat, 1 rest pose
  let tiltTarget = 0;
  let turn = 0; // -1 to 1, follows the pointer
  let turnTarget = 0;
  let inView = true;
  let frame = 0;
  let last = 0;
  let sampled = 0;
  let sampleMs = 0;
  let watching = 2; // slow samples left: the first turns shadows off, the second removes the model

  const ac = new AbortController();

  const build = (s: Selection, now: number) => {
    plan = layout(s, rooms);
    const before = known;
    known = new Set();
    boxes.clear();
    for (const b of model(plan)) {
      const mesh = new Mesh(geometry, materials[b.kind]);
      mesh.position.set(b.x, 0, b.y);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.castShadow = mesh.receiveShadow = true;
      // A room that was not there a moment ago rises; the first build stands with the tilt.
      mesh.userData = { h: b.h, born: before.size && !before.has(b.room) ? now : 0 };
      boxes.add(mesh);
      known.add(b.room);
    }
    figure.dataset.modelBoxes = String(boxes.children.length);
  };

  /** Flat as the estimator enters the viewport, at rest once it reaches the middle. */
  const measure = () => {
    const r = stage.getBoundingClientRect();
    tiltTarget = smooth(clamp01((window.innerHeight - r.top) / (window.innerHeight / 2 + r.height / 2)));
  };

  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    width = r.width;
    height = r.height;
    focal = height / 2 / Math.tan(MathUtils.degToRad(FOV / 2)); // at this distance one unit is one CSS pixel
    const px = (width / (plan.width * UNIT + 2 * PAD)) * UNIT;
    const reach = Math.hypot(width, height);
    drawing.style.width = `${width}px`;
    drawing.style.height = `${height}px`;
    camera.aspect = width / height;
    camera.near = focal / 10;
    camera.far = focal * 4;
    camera.updateProjectionMatrix();
    gl.setSize(width, height);
    css.setSize(width, height);
    boxes.scale.setScalar(px);
    boxes.position.set((-plan.width / 2) * px, 0, (-plan.height / 2) * px);
    ground.scale.set(width, height, 1); // shadows land on the plan only
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: reach, far: reach * 5 });
    sun.shadow.camera.updateProjectionMatrix();
    measure();
    invalidate();
  };

  /** Places camera, sun and boxes for the current tilt. True while a new room is still rising. */
  const pose = (now: number): boolean => {
    const angle = TILT * tilt;
    const distance = focal * (1 + tilt * (1 / FIT - 1)) + (height / 2) * Math.sin(angle);
    camera.position.set(0, distance * Math.cos(angle), distance * Math.sin(angle));
    camera.lookAt(0, 0, 0);
    pivot.rotation.y = turn * TURN * tilt;

    // The sun crosses from morning to afternoon as the page scrolls.
    const page = document.documentElement;
    const day = clamp01(window.scrollY / Math.max(page.scrollHeight - window.innerHeight, 1));
    const reach = Math.hypot(width, height);
    sun.position.set(Math.cos(MathUtils.lerp(0.2, 0.8, day) * Math.PI) * reach * 2, reach * 2, reach * 0.9);

    let rising = false;
    for (const mesh of boxes.children) {
      const { h, born } = mesh.userData as { h: number; born: number };
      const grown = born ? clamp01((now - born) / RISE_MS) : 1;
      if (grown < 1) rising = true;
      const up = h * tilt * smooth(grown);
      mesh.visible = up > 0.001;
      mesh.scale.y = Math.max(up, 0.001);
    }
    return rising;
  };

  /** Moving the drawing in the DOM drops focus; put it back where the visitor had it. */
  const keepFocus = (move: () => void) => {
    const active = document.activeElement;
    const held = (active instanceof HTMLElement || active instanceof SVGElement) && drawing.contains(active) ? active : null;
    move();
    held?.focus();
  };

  /** Back to the flat plan, for good (spec §6.4). */
  const stop = () => {
    if (ac.signal.aborted) return;
    ac.abort();
    cancelAnimationFrame(frame);
    resizer.disconnect();
    watcher.disconnect();
    unsubscribe();
    keepFocus(() => {
      pivot.remove(floor); // a removed CSS3DObject takes its element out of the page
      drawing.removeAttribute('style');
      drawing.removeAttribute('draggable');
      stage.prepend(drawing);
    });
    css.domElement.remove();
    canvas.remove();
    delete figure.dataset.model;
    delete figure.dataset.modelBoxes;
    delete figure.planPointOnScreen;
    geometry.dispose();
    ground.geometry.dispose();
    shade.dispose();
    Object.values(materials).forEach((material) => material.dispose());
    gl.dispose();
  };

  const watch = (dt: number) => {
    if (!watching) return;
    sampleMs += dt;
    if (++sampled < SAMPLE) return;
    const slow = sampleMs / sampled > SLOW_MS;
    sampled = sampleMs = 0;
    if (!slow) watching = 0;
    else if (--watching) {
      gl.shadowMap.enabled = false;
      sun.castShadow = false;
      ground.visible = false;
    } else stop();
  };

  /** Rendering is on demand: a frame is drawn only when something changed, and only while in view. */
  const invalidate = () => {
    if (!frame && inView && !ac.signal.aborted) frame = requestAnimationFrame(tick);
  };
  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min(now - last, 100) : 16;
    const k = 1 - Math.exp(-dt / 140);
    tilt += (tiltTarget - tilt) * k;
    turn += (turnTarget - turn) * k;
    const settling = Math.abs(tiltTarget - tilt) > 0.001 || Math.abs(turnTarget - turn) > 0.001;
    if (!settling) {
      tilt = tiltTarget;
      turn = turnTarget;
    }
    const moving = pose(now) || settling;
    css.render(scene, camera);
    gl.render(scene, camera);
    if (last) watch(now - last);
    last = moving ? now : 0;
    if (moving) invalidate();
  };

  build(selection, 0);
  pivot.add(floor);
  stage.append(css.domElement, canvas);
  figure.dataset.model = 'on';

  const resizer = new ResizeObserver(resize);
  resizer.observe(stage);
  const watcher = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    invalidate();
  });
  watcher.observe(stage);
  const unsubscribe = onSelection((s) => {
    build(s, performance.now());
    invalidate();
  });
  const listen = { passive: true, signal: ac.signal };
  window.addEventListener('scroll', () => (measure(), invalidate()), listen);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    figure.addEventListener(
      'pointermove',
      (e) => {
        const r = stage.getBoundingClientRect();
        turnTarget = Math.min(Math.max(((e.clientX - r.left) / r.width) * 2 - 1, -1), 1);
        invalidate();
      },
      listen,
    );
    figure.addEventListener('pointerleave', () => ((turnTarget = 0), invalidate()), listen);
  }
  canvas.addEventListener('webglcontextlost', stop, { once: true });

  resize();
  keepFocus(() => css.render(scene, camera)); // the first render moves the drawing onto the floor, still flat

  figure.planPointOnScreen = (x, y) => {
    const v = boxes.localToWorld(new Vector3(x, 0, y)).project(camera);
    const r = canvas.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  };
}
```

- [ ] **Step 7: Load it behind the gates**

In `src/features/plan/plan.ts`, add this function above `initEditPlan`:

```ts
/**
 * Runs `load` once the 3D model is worth downloading (spec §6.3): a viewport
 * 768px or wider, motion allowed, Save-Data off, WebGL2 present, the plan within
 * one viewport of the screen and the page finished loading. Otherwise the flat
 * plan is all there is, exactly as before.
 * ponytail: checked once, so a phone-width window that is later widened keeps the flat plan until reload.
 */
function whenModelAllowed(figure: HTMLElement, load: () => void): void {
  const matches = (query: string) => window.matchMedia(query).matches;
  if (!matches('(min-width: 768px)') || matches('(prefers-reduced-motion: reduce)')) return;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  if (!('IntersectionObserver' in window) || !document.createElement('canvas').getContext('webgl2')) return;
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      if (document.readyState === 'complete') load();
      else window.addEventListener('load', load, { once: true });
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(figure);
}
```

In `initEditPlan`, directly after the line `if (loadSelection(storage, pricing, rooms.max)) emitSelection(s);`, add:

```ts
  whenModelAllowed(figure, () => {
    // A failed download or start leaves the flat plan, which needs nothing from the model.
    import('./scene3d').then((model) => model.start(figure, s)).catch(() => {});
  });
```

- [ ] **Step 8: Run every check**

```bash
npm test && npm run check && npm run build && npm run budget
npm run e2e -- http://localhost:4331 model
npm run e2e -- http://localhost:4331
```

Expected:

- `npm test` and `npm run check` pass with 0 errors.
- The budget prints a line like `  13x.x KB  / (lazy)`, under 150.0 KB, and the eager figure for `/` stays under 30.0 KB.
- `model.e2e.mjs`: 12/12 steps pass. If the browser has no WebGL2, the seven "model on" steps print "– skipped" and 5/5 pass; say so in the report, because skipped is not passed.
- Every other e2e file still passes, unedited.

- [ ] **Step 9: Look at it (stop gate)**

```bash
mkdir -p shots
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 1280 shots/model-1280.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs "/?theme=eucalyptus" 1280 shots/model-eucalyptus.png 0
```

Read both images (in this task the estimator is still the top of the home page). Expected: a white walled model stands on the coloured plan, every room label and every dashed "+" slot is sharp and readable, shadows fall on the floor only, and neither command printed `ERRORS:`. The flat plan on phones is covered by the e2e step "phones get the flat plan and never download the model".

**Stop and report to the owner** if any alignment figure in Step 8 is over 1.5 px or the labels look blurred. The spec's fallback is a top-down rest pose (`TILT = 0`). Do not continue to Task 5 in that case.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/features/plan tests/e2e/model.e2e.mjs
git commit -m "feat(plan): real-time 3D home model on the estimator" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Elevation tokens and the Scene backdrop

**Files:**

- Create: `src/core/ui/Scene.astro`, `src/core/ui/scene.ts`, `public/media/sample.webm`, `public/media/sample.mp4`
- Modify: `src/styles/tokens.css`, `src/core/ui/icons.ts`, `src/pages/dev/ui.astro`
- Test: `tests/e2e/scene.e2e.mjs`

**Interfaces:**

- Consumes: `getPhoto(slot): ImageMetadata | undefined` from `src/core/photos.ts`; `sitePath(path): string` from `src/core/paths.ts`; `Icon` from `src/core/ui/Icon.astro`; photo slots `offices` and `service-regular` (filled in Task 1).
- Produces:
  - Tokens `--shadow-1`, `--shadow-2`, `--dur-reveal`, `--dur-scene`.
  - `<Scene slot portrait? video? alt? priority? />`. It fills its positioned parent. Root element `[data-scene]`; gains `data-playing` when the video has started. Video element `[data-scene-video]`; button `[data-scene-toggle]` with `aria-pressed`.
  - Two CSS hooks a parent may set: `--scene-scale` (number, scales the media) and `--scene-pause-bottom` (length, the button's bottom offset).
  - Icons `pause` and `play`.

- [ ] **Step 1: Make the sample clip**

```bash
mkdir -p public/media
ffmpeg -y -f lavfi -i "color=c=slategray:s=320x180:r=15:d=2" -an -c:v libvpx-vp9 -b:v 0 -crf 45 public/media/sample.webm
ffmpeg -y -f lavfi -i "color=c=slategray:s=320x180:r=15:d=2" -an -c:v libx264 -crf 32 -pix_fmt yuv420p -movflags +faststart public/media/sample.mp4
ls -l public/media
```

Expected: two files, each a few KB.

- [ ] **Step 2: Write the failing e2e file**

Create `tests/e2e/scene.e2e.mjs`:

```js
/** The Scene backdrop (spec §7.1), exercised on the /dev/ui/ page with the sample clip. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, finish } = await harness();

const scene = (page) => page.locator('[data-scene]').first();
const paused = (page) => scene(page).locator('video').evaluate((video) => video.paused);

function mediaRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('/media/')) urls.push(request.url());
  });
  return urls;
}

async function open(page) {
  await go(page, '/dev/ui/');
  await scene(page).scrollIntoViewIfNeeded();
}

/** A device that must not get the video: nothing asked for, no source attached, no button. */
async function staysStill(page) {
  const urls = mediaRequests(page);
  await open(page);
  await page.waitForTimeout(700);
  assert.deepEqual(urls, []);
  assert.equal(await scene(page).locator('video source').count(), 0);
  assert.ok(!(await scene(page).locator('[data-scene-toggle]').isVisible()));
  assert.equal(await scene(page).locator('img').count(), 1, 'the still is there');
}

const connection = (context, value) =>
  context.addInitScript((v) => Object.defineProperty(Navigator.prototype, 'connection', { get: () => v, configurable: true }), value);

await step('a wide screen gets the video over the still, with a pause button', async (page) => {
  const urls = mediaRequests(page);
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  assert.ok(urls.some((url) => url.endsWith('/media/sample.webm')), urls.join(', '));
  assert.equal(await paused(page), false);
  const video = scene(page).locator('video');
  assert.equal(await video.getAttribute('aria-hidden'), 'true');
  assert.equal(await video.evaluate((v) => v.muted && v.loop && v.playsInline), true);
  const toggle = scene(page).locator('[data-scene-toggle]');
  assert.ok(await toggle.isVisible());
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.equal((await toggle.innerText()).trim(), 'Pause background video');
  const box = await toggle.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44, `${box.width}x${box.height}`);
}, { width: 1280 });

await step('the pause button stops the video and starts it again', async (page) => {
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  const toggle = scene(page).locator('[data-scene-toggle]');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await paused(page), true);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => !document.querySelector('[data-scene] video').paused);
}, { width: 1280 });

await step('the video stops when the scene leaves the screen, and a paused one stays paused', async (page) => {
  await open(page);
  await page.locator('[data-scene][data-playing]').first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('[data-scene] video').paused);
  await scene(page).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('[data-scene] video').paused);
  await scene(page).locator('[data-scene-toggle]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await scene(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  assert.equal(await paused(page), true);
}, { width: 1280 });

await step('the still is one picture with a crop for phones and no alt text', async (page) => {
  await open(page);
  assert.equal(await scene(page).locator('picture').count(), 1);
  assert.ok((await scene(page).locator('picture source[media="(max-width: 767px)"]').count()) >= 1);
  assert.equal(await scene(page).locator('img').getAttribute('alt'), '');
}, { width: 1280 });

await step('phones never ask for the video', (page) => staysStill(page));

await step('reduced motion never asks for the video', (page) => staysStill(page), { width: 1280, reducedMotion: 'reduce' });

await step('Save-Data never asks for the video', async (page, context) => {
  await connection(context, { saveData: true, effectiveType: '4g' });
  await staysStill(page);
}, { width: 1280 });

await step('a 3G connection never asks for the video', async (page, context) => {
  await connection(context, { saveData: false, effectiveType: '3g' });
  await staysStill(page);
}, { width: 1280 });

await finish();
```

- [ ] **Step 3: Run it to see it fail**

Run: `npm run build && npm run e2e -- http://localhost:4331 scene`
Expected: all 8 steps fail; `/dev/ui/` has no `[data-scene]`.

- [ ] **Step 4: Add the tokens**

In `src/styles/tokens.css`, inside the shared `:root { … }` block, add after the `--target` line:

```css

  /* Elevation: two steps, both from the theme's shadow colour. Resolved on <html>,
     so a nested [data-theme] (only /dev/ui/ has one) keeps the page's shadow colour. */
  --shadow-1: 0 1px 2px var(--color-shadow), 0 4px 12px var(--color-shadow);
  --shadow-2: 0 2px 6px var(--color-shadow), 0 18px 48px var(--color-shadow);
```

and after the `--dur-colour` line:

```css
  --dur-reveal: 500ms;
  --dur-scene: 900ms;
```

- [ ] **Step 5: Add the two icons**

In `src/core/ui/icons.ts`, add after the `copy` line:

```ts
  pause: 'M9 5v14M15 5v14',
  play: 'M8 5l11 7-11 7z',
```

- [ ] **Step 6: Write the video script**

Create `src/core/ui/scene.ts`:

```ts
/**
 * Background video for Scene.astro (spec §7.1). The <video> ships with no source,
 * so nothing downloads until this decides the device can afford it: a viewport
 * 768px or wider, motion allowed, Save-Data off and a connection better than 3G.
 * It plays only while on screen. If anything fails, the still stays as it is.
 */
import { sitePath } from '../paths';

type Connection = { saveData?: boolean; effectiveType?: string };

function allowed(): boolean {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  return (
    window.matchMedia('(min-width: 768px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !connection?.saveData &&
    !/[23]g$/.test(connection?.effectiveType ?? '')
  );
}

function attach(scene: HTMLElement): void {
  const video = scene.querySelector<HTMLVideoElement>('[data-scene-video]');
  const toggle = scene.querySelector<HTMLButtonElement>('[data-scene-toggle]');
  if (!video || !toggle) return;
  for (const format of (video.dataset.formats ?? '').split(' ').filter(Boolean)) {
    const source = document.createElement('source');
    source.src = sitePath(`/media/${video.dataset.sceneVideo}.${format}`);
    source.type = `video/${format}`;
    video.append(source);
  }

  let pausedByVisitor = false;
  let onScreen = false;
  const sync = () => {
    if (onScreen && !pausedByVisitor) video.play().catch(() => {});
    else video.pause();
  };
  // The button arrives with the first moving frame, so there is never motion without a way to stop it.
  video.addEventListener(
    'playing',
    () => {
      scene.dataset.playing = '';
      toggle.hidden = false;
    },
    { once: true },
  );
  toggle.addEventListener('click', () => {
    pausedByVisitor = !pausedByVisitor;
    toggle.setAttribute('aria-pressed', String(pausedByVisitor));
    sync();
  });
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(scene);
}

let started = false;

export function initScenes(): void {
  if (started) return;
  started = true;
  if (!('IntersectionObserver' in window) || !allowed()) return;
  const begin = () => document.querySelectorAll<HTMLElement>('[data-scene]').forEach(attach);
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}
```

- [ ] **Step 7: Write the component**

Create `src/core/ui/Scene.astro`:

```astro
---
/**
 * A full-bleed backdrop (spec §7.1): a still from a photo slot and, when a clip
 * exists, a silent looping video that fades in over it. It fills its parent,
 * which must be positioned. With `portrait`, screens under 768px get that slot.
 * The <video> ships with no source: scene.ts attaches one only on devices that
 * can afford it, and the still stays if anything fails.
 *
 * A parent can set --scene-scale (a number) to scale the media, and
 * --scene-pause-bottom (a length) to lift the pause button.
 */
import { existsSync } from 'node:fs';
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { getPhoto } from '../photos';
import Icon from './Icon.astro';

interface Props {
  /** Photo slot for the still. */
  slot: string;
  /** Photo slot used under 768px wide. */
  portrait?: string;
  /** Clip name: public/media/<video>.webm and .mp4. */
  video?: string;
  /** Backdrops are decorative, so the default is empty. */
  alt?: string;
  /** True for a first-screen scene: the still loads eagerly as the largest paint. */
  priority?: boolean;
}

const { slot, portrait, video, alt = '', priority = false } = Astro.props;
const wide = getPhoto(slot);
const tall = portrait ? getPhoto(portrait) : undefined;

const srcset = async (image: ImageMetadata, sizes: number[], format: 'avif' | 'webp') => {
  const widths = sizes.filter((w) => w <= image.width);
  return (await getImage({ src: image, widths: widths.length ? widths : [image.width], format })).srcSet.attribute;
};
const WIDE = [800, 1200, 1600, 2400];
const TALL = [480, 720, 1080];
const still = wide && {
  fallback: (await getImage({ src: wide, width: Math.min(1600, wide.width), format: 'jpeg' })).src,
  avif: await srcset(wide, WIDE, 'avif'),
  webp: await srcset(wide, WIDE, 'webp'),
  tallAvif: tall && (await srcset(tall, TALL, 'avif')),
  tallWebp: tall && (await srcset(tall, TALL, 'webp')),
};
// `astro build` and `astro dev` both run from the project root, where public/ is.
const clips = video ? ['webm', 'mp4'].filter((format) => existsSync(`public/media/${video}.${format}`)) : [];
---

<div class="scene" data-scene>
  {
    still && (
      <picture>
        {still.tallAvif && <source media="(max-width: 767px)" type="image/avif" srcset={still.tallAvif} sizes="100vw" />}
        {still.tallWebp && <source media="(max-width: 767px)" type="image/webp" srcset={still.tallWebp} sizes="100vw" />}
        <source type="image/avif" srcset={still.avif} sizes="100vw" />
        <source type="image/webp" srcset={still.webp} sizes="100vw" />
        <img src={still.fallback} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : 'auto'} decoding="async" />
      </picture>
    )
  }
  {
    clips.length > 0 && (
      <>
        <video class="scene__video" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1" data-scene-video={video} data-formats={clips.join(' ')} />
        <button class="scene__pause" type="button" aria-pressed="false" data-scene-toggle hidden>
          <Icon name="pause" class="scene__icon-pause" />
          <Icon name="play" class="scene__icon-play" />
          <span class="visually-hidden">Pause background video</span>
        </button>
      </>
    )
  }
</div>

<script>
  import { initScenes } from './scene';
  initScenes();
</script>

<style>
  .scene {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--color-room);
  }
  .scene img,
  .scene__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
    transform: scale(var(--scene-scale, 1));
  }
  .scene__video {
    opacity: 0;
    transition: opacity var(--dur-scene) var(--ease-out);
  }
  .scene[data-playing] .scene__video {
    opacity: 1;
  }
  /* A solid chip, so the control never depends on the picture behind it for contrast. */
  .scene__pause {
    position: absolute;
    right: var(--space-4);
    bottom: var(--scene-pause-bottom, var(--space-4));
    z-index: 1; /* above anything a parent lays over the backdrop */
    display: grid;
    place-items: center;
    width: var(--target);
    height: var(--target);
    padding: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: var(--color-surface);
    color: var(--color-ink);
    box-shadow: var(--shadow-1);
    cursor: pointer;
  }
  .scene__pause:focus-visible {
    outline-offset: -5px;
  }
  .scene__pause[aria-pressed='true'] :global(.scene__icon-pause),
  .scene__pause[aria-pressed='false'] :global(.scene__icon-play) {
    display: none;
  }
</style>
```

- [ ] **Step 8: Show it on the kitchen-sink page**

In `src/pages/dev/ui.astro`, add the import after the `Photo` import:

```astro
import Scene from '@/core/ui/Scene.astro';
```

Add this block directly after the `<Photo slot="does-not-exist" … />` line:

```astro
            <div class="scene-demo">
              <Scene slot="offices" portrait="service-regular" video="sample" />
            </div>
```

Add this rule to the page's `<style>` block:

```css
      .scene-demo { position: relative; aspect-ratio: 16 / 9; }
```

The page renders every component once per theme, so it now has two scenes. The tests use the first.

- [ ] **Step 9: Run every check**

```bash
npm test && npm run check && npm run build && npm run budget
npm run e2e -- http://localhost:4331 scene
npm run e2e -- http://localhost:4331
```

Expected: tests and types pass; budget within both limits; `scene.e2e.mjs` 8/8; every other file still passes.

- [ ] **Step 10: Look at it**

The scene is far down this page and `tools/shot.mjs` cannot scroll, so this one look uses Playwright directly:

```bash
node -e "import('playwright').then(async ({ chromium }) => { const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH }); for (const width of [1280, 375]) { const page = await browser.newPage({ viewport: { width, height: 800 } }); await page.goto('http://localhost:4331/dev/ui/'); const scene = page.locator('[data-scene]').first(); await scene.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); await scene.screenshot({ path: 'shots/scene-' + width + '.png' }); } await browser.close(); })"
```

Read `shots/scene-1280.png` and `shots/scene-375.png`. Expected at 1280: the frame is filled (the grey sample clip covers the meeting-room still) with a white square pause button at the bottom right. At 375: the bedroom photo, cropped upright, and no button.

- [ ] **Step 11: Commit**

```bash
git add src/styles/tokens.css src/core/ui/Scene.astro src/core/ui/scene.ts src/core/ui/icons.ts src/pages/dev/ui.astro public/media tests/e2e/scene.e2e.mjs
git commit -m "feat(ui): Scene backdrop with a lazily attached video, and elevation tokens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The first screen: hero, live price and the estimator card

**Files:**

- Create: `src/features/pricing/PriceLine.astro`, `src/sections/HeroScene.astro`, `src/layouts/motion.ts`
- Rename: `src/sections/Hero.astro` to `src/sections/Estimator.astro`, then modify
- Modify: `src/features/pricing/price-tag.ts`, `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `src/config/photo-slots.ts`, `docs/photo-brief.md` (regenerated)
- Test: `tests/e2e/hero.e2e.mjs`

**Interfaces:**

- Consumes: `<Scene>` and its `--scene-scale` / `--scene-pause-bottom` hooks, `--shadow-2` (Task 5); `hasPhoto(slot): boolean` from `src/core/photos.ts`; `initPriceTags()` from `src/features/pricing/price-tag.ts`, which updates every `data-price-*` hook and every `[data-choose-time]` link on the page; `quote`, `DEFAULT_SELECTION`, `toParams`, `describeSelection`, `formatMoney` as `PriceTag.astro` uses them.
- Produces: `<PriceLine>` with root `[data-price-line]` and a default slot for extra actions; `<HeroScene />` with root class `scene-hero` (plus `scene-hero--scenic` when a `hero` photo exists); `<Estimator />` with `id="plan"`, class `hero` and heading `h2#plan-title`; `--p` (a registered number, 0 to 1) on any `[data-progress]` element; photo slots `hero` and `hero-portrait`.

`--p` runs from 0, where the element first shows (or the top of the page, if it starts on screen), to 1, where its bottom edge leaves the top of the viewport.

- [ ] **Step 1: Write the failing e2e file**

Create `tests/e2e/hero.e2e.mjs`:

```js
/** The home page's first screen (spec §5.1, §5.2): the hero card, its live price, and the estimator beneath it. */
import assert from 'node:assert/strict';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const HERO = '.scene-hero';
const text = (page, selector) => page.locator(selector).innerText();
const addBedroom = (page) => page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
const progress = (page) => page.locator(HERO).evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--p')));

/** Every price hook, read from one part of the page. */
const priced = async (page, scope) => ({
  summary: await text(page, `${scope} [data-price-summary]`),
  perVisit: await text(page, `${scope} [data-price-per-visit]`),
  unit: await text(page, `${scope} [data-price-unit]`),
  firstVisit: await page.locator(`${scope} [data-price-first-visit]`).textContent(),
  firstVisitShown: await page.locator(`${scope} [data-price-first-visit-row]`).isVisible(),
  book: await page.locator(`${scope} [data-choose-time]`).getAttribute('href'),
});

await step('the hero carries the one h1, the default price and both ways on', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await text(page, `${HERO} h1`), 'Your home, priced room by room.');
  const hero = await priced(page, HERO);
  assert.equal(hero.perVisit, '$179');
  assert.equal(hero.summary, '3 bed, 2 bath, fortnightly');
  assert.match(hero.firstVisit, /\$318/);
  assert.match(hero.book, /\/book\/\?.*bed=3/);
  assert.match(await text(page, HERO), /Sample prices\./);
  assert.equal(await page.locator(`${HERO} a[href="#plan"]`).innerText(), 'Price your home');
  assert.equal(await text(page, '#plan h2 >> nth=0'), 'Price your home');
  assert.equal(await page.locator('#plan.hero').count(), 1);
}, { width: 1280 });

await step('the hero price follows the estimator and is still right on the next visit', async (page) => {
  await go(page, '/');
  await addBedroom(page);
  assert.equal((await priced(page, HERO)).perVisit, '$197');
  assert.deepEqual(await priced(page, HERO), await priced(page, '#plan'));
  await go(page, '/');
  assert.equal((await priced(page, HERO)).perVisit, '$197');
  assert.deepEqual(await priced(page, HERO), await priced(page, '#plan'));
}, { width: 1280 });

await step('a one-off clean shows one price in the hero too', async (page) => {
  await go(page, '/');
  await page.locator('[data-plan-controls] label:has(input[value="end-of-lease"])').click();
  const hero = await priced(page, HERO);
  assert.equal(hero.perVisit, '$438');
  assert.equal(hero.unit, 'one visit');
  assert.equal(hero.firstVisitShown, false);
  assert.deepEqual(hero, await priced(page, '#plan'));
}, { width: 1280 });

await step('Price your home goes to the estimator, clear of the header', async (page) => {
  await go(page, '/');
  await page.locator(`${HERO} a[href="#plan"]`).click();
  await page.waitForFunction(() => location.hash === '#plan');
  await page.waitForTimeout(200);
  const heading = await page.locator('#plan h2').first().evaluate((el) => el.getBoundingClientRect().top);
  const header = await page.locator('header.header').evaluate((el) => el.getBoundingClientRect().bottom);
  assert.ok(heading >= header && heading < 400, `the heading is at ${Math.round(heading)}px and the header ends at ${Math.round(header)}px`);
}, { width: 1280 });

for (const width of [375, 1280]) {
  await step(`every control in the hero is at least 44px (${width})`, async (page) => {
    await go(page, '/');
    const small = await page.$$eval(`${HERO} :is(a, button)`, (els) =>
      els
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 1 && box.height > 1)
        .filter(({ box }) => box.height < 44 || box.width < 44)
        .map(({ el, box }) => `"${el.textContent.trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`),
    );
    assert.deepEqual(small, []);
  }, { width });
}

await step('the hero reports its scroll progress, from 0 at the top of the page', async (page) => {
  await go(page, '/');
  assert.equal(await progress(page), 0);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.scene-hero')).getPropertyValue('--p')) > 0);
  const p = await progress(page);
  assert.ok(p > 0 && p < 1, `--p is ${p}`);
}, { width: 1280 });

await step('reduced motion leaves the hero still', async (page) => {
  await go(page, '/');
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(300);
  assert.equal(await progress(page), 0);
}, { width: 1280, reducedMotion: 'reduce' });

await step('without JavaScript the hero still prices the default home', async (page) => {
  await go(page, '/');
  assert.equal(await text(page, `${HERO} h1`), 'Your home, priced room by room.');
  assert.equal(await text(page, `${HERO} [data-price-per-visit]`), '$179');
  assert.match(await page.locator(`${HERO} [data-choose-time]`).getAttribute('href'), /\/book\/\?.*bed=3/);
  assert.equal(await page.locator(`${HERO} a[href="#plan"]`).count(), 1);
  assert.equal(await page.locator('#plan [data-room-id="bed-3"]').count(), 1);
}, { width: 1280, javaScriptEnabled: false });

await step('the estimator starts on the first screen of a laptop, and a returning visitor sees no pinned tag over the hero', async (page) => {
  await go(page, '/');
  const top = await page.locator('#plan').evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(top < 800, `#plan starts at ${Math.round(top)}px`);
  await addBedroom(page);
  await go(page, '/');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  assert.ok(!(await page.locator('[data-booking-tag]').isVisible()));
}, { width: 1280 });

await step('the pinned tag stays away while the hero price is on screen, and comes back below the estimator', async (page) => {
  await go(page, '/');
  await addBedroom(page);
  // A screen short enough that the hero's price is showing and the estimator is not.
  const priceTop = await page.locator(`${HERO} [data-price-line]`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const height = Math.round(priceTop) + 60;
  await page.setViewportSize({ width: 1280, height });
  await go(page, '/');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  const planTop = await page.locator('#plan').evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(planTop > height, `the estimator starts at ${Math.round(planTop)}px on a ${height}px screen`);
  assert.ok(!(await page.locator('[data-booking-tag]').isVisible()));
  await page.locator('#plan').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY));
  await page.locator('[data-booking-tag]').waitFor();
}, { width: 1280 });

await step('home has no horizontal scroll at 320, 375, 768, 1024 and 1280', async (page) => {
  for (const width of [320, 375, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/');
    assert.equal(await overflow(page), 0, `${width}px`);
  }
});

await finish();
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run build && npm run e2e -- http://localhost:4331 hero`
Expected: every step fails; the page has no `.scene-hero`.

- [ ] **Step 3: Register the two hero photo slots**

In `src/config/photo-slots.ts`, replace the header comment's last line, `The home page has no hero photo on purpose: the floor plan is the hero.`, with:

```ts
 * The home hero uses `hero` as a backdrop behind its headline card, and `hero-portrait` on phones.
```

Add these two entries at the top of `photoSlots`, before `'service-regular'`:

```ts
  hero: { alt: 'A bright open-plan living room and kitchen in morning light', brief: 'Wide interior of a just-cleaned open-plan living room and kitchen in morning light. Keep the left 40% calm: the headline card sits there. 2880×1620.', search: '(generated: prompt G0 in docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md)', orientation: 'landscape' },
  'hero-portrait': { alt: 'A sunlit kitchen island in a clean home', brief: 'The same home as `hero`, framed upright for phones: island and sunlit window in the top two thirds. 1440×2560.', search: '(generated: prompt G2 in the same spec)', orientation: 'portrait' },
```

Then run: `npm run photos:status -- --write`
Expected: "Photo slots: 9 of 12 filled".

- [ ] **Step 4: Write the scroll progress script**

Create `src/layouts/motion.ts`:

```ts
/**
 * Scroll-linked motion (spec §8), with no library. An element marked
 * data-progress gets --p: 0 where it first shows (or at the top of the page, if
 * it starts on screen) and 1 where its bottom edge leaves the top of the
 * viewport. CSS turns --p into transforms and opacity. Nothing runs under
 * reduced motion or on bare (app-like) pages, so --p stays at its initial 0.
 */
const tracked = [...document.querySelectorAll<HTMLElement>('[data-progress]')];
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('is-bare');

if (tracked.length && !still) {
  let queued = false;
  const measure = () => {
    queued = false;
    const viewport = window.innerHeight;
    for (const el of tracked) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > viewport) continue;
      const top = r.top + window.scrollY;
      const from = Math.max(top - viewport, 0);
      const p = (window.scrollY - from) / (top + r.height - from);
      el.style.setProperty('--p', Math.min(Math.max(p, 0), 1).toFixed(4));
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  measure();
}
```

In `src/layouts/BaseLayout.astro`, change the script at the end of `<body>` to:

```astro
    <script>
      import './site';
      import './motion';
    </script>
```

In `src/styles/global.css`, add after the two `@import` lines:

```css

/* Scroll progress, 0 to 1, set by layouts/motion.ts on [data-progress] elements. */
@property --p {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}
```

- [ ] **Step 5: Write the price line**

Create `src/features/pricing/PriceLine.astro`:

```astro
---
/**
 * The price as a compact block for the home hero. It uses the same data-price-*
 * hooks as PriceTag, so price-tag.ts keeps both in step with the visitor's
 * selection. Server-rendered for the default home; nothing here is a typed-in
 * price. The default slot takes extra actions beside Choose a time. While this
 * block is on screen, price-tag.ts keeps the pinned tag hidden (data-price-line).
 */
import { business } from '@/config/business';
import { pricing } from '@/config/pricing';
import { formatMoney } from '@/core/format';
import { describeSelection } from '@/domain/describe';
import { quote } from '@/domain/quote';
import { DEFAULT_SELECTION, toParams } from '@/domain/selection';
import Button from '@/core/ui/Button.astro';

const q = quote(DEFAULT_SELECTION, pricing);
---

<div class="line" data-price-line>
  <p class="line__summary" data-price-summary>{describeSelection(DEFAULT_SELECTION)}</p>
  <p class="line__price">
    <span class="line__amount tabular" data-price-per-visit>{formatMoney(q.perVisit)}</span>
    <span data-price-unit>a visit</span>
  </p>
  <p class="line__small" data-price-first-visit-row hidden={q.firstVisit === q.perVisit}>
    First visit <strong class="tabular" data-price-first-visit>{formatMoney(q.firstVisit)}</strong>, priced as a deep clean so we start from clean.
  </p>
  <p class="line__small">GST included.{business.demoMode && ' Sample prices.'}</p>
  <div class="line__actions">
    <Button href={`/book/?${toParams(DEFAULT_SELECTION)}`} size="lg" data-choose-time>Choose a time</Button>
    <slot />
  </div>
</div>

<script>
  import { initPriceTags } from './price-tag';
  initPriceTags();
</script>

<style>
  .line {
    display: grid;
    gap: var(--space-2);
  }
  .line__summary {
    font-weight: var(--weight-medium);
  }
  .line__price {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    line-height: 1;
  }
  .line__amount {
    font-size: var(--text-36);
    font-weight: var(--weight-bold);
    letter-spacing: var(--tracking-display);
  }
  .line__small {
    font-size: var(--text-16);
    color: var(--color-ink-muted);
  }
  .line__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
</style>
```

- [ ] **Step 6: Keep the pinned tag off the hero**

The pinned desktop tag hides while the estimator is on screen. The hero now shows the price as well, so the tag must hide there too. In `src/features/pricing/price-tag.ts`, replace the whole `watchHero` function with:

```ts
function watchHero(): void {
  // Wherever the page already shows the price in full: the estimator, and the home hero's price line.
  const priced = all('#plan, [data-price-line]');
  if (!priced.length || !('IntersectionObserver' in window)) {
    heroVisible = !priced.length ? false : heroVisible;
    return;
  }
  const onScreen = new Set<Element>();
  // The top margin matches the sticky header: a price hidden under it counts as gone.
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      heroVisible = onScreen.size > 0;
      showPinned();
    },
    { rootMargin: '-80px 0px 0px 0px' },
  );
  priced.forEach((el) => watcher.observe(el));
}
```

Nothing else in the file changes. A page with no `[data-price-line]` (every page but home) behaves exactly as before.

- [ ] **Step 7: Write the hero**

Create `src/sections/HeroScene.astro`:

```astro
---
/**
 * The first screen: a photo of a clean home (with a quiet video loop on larger
 * screens) and, in front of it, a solid card with the page's h1, the live price
 * and the two ways on. The card is solid so its contrast never depends on the
 * picture. With no `hero` photo it is the card on the page background, so the
 * page never waits on an asset.
 */
import Button from '@/core/ui/Button.astro';
import Scene from '@/core/ui/Scene.astro';
import { hasPhoto } from '@/core/photos';
import PriceLine from '@/features/pricing/PriceLine.astro';

const scenic = hasPhoto('hero');
---

<section class:list={['scene-hero', { 'scene-hero--scenic': scenic }]} aria-labelledby="hero-title" data-progress>
  {
    scenic && (
      <div class="scene-hero__scene">
        <Scene slot="hero" portrait="hero-portrait" video="hero-loop" priority />
      </div>
    )
  }
  <div class="wrap scene-hero__inner">
    <div class="scene-hero__card">
      <h1 id="hero-title">Your home, priced room by room.</h1>
      <p class="scene-hero__lead">Add your rooms and choose how often. The price updates as you go, and you can book a time without calling.</p>
      <PriceLine>
        <Button href="#plan" variant="secondary" size="lg">Price your home</Button>
      </PriceLine>
    </div>
  </div>
</section>

<style>
  .scene-hero {
    position: relative;
    padding-top: var(--space-6);
  }
  .scene-hero__card {
    display: grid;
    gap: var(--space-4);
  }
  .scene-hero__lead {
    font-size: var(--text-18);
    color: var(--color-ink-muted);
  }

  /* With a photo, on phones: the still, then the card on the page background. */
  .scene-hero--scenic {
    padding-top: 0;
  }
  .scene-hero__scene {
    position: relative;
    height: 52svh;
    margin-bottom: var(--space-6);
  }

  /* With a photo, on wider screens: the still fills the section and the card stands in front of it. */
  @media (min-width: 768px) {
    .scene-hero--scenic {
      display: grid;
      align-items: center;
      min-height: min(88svh, 52rem);
      padding-block: var(--space-7);
      /* As the hero leaves the screen the still pushes in, and the card rises and fades. */
      --scene-scale: calc(1 + 0.12 * var(--p));
    }
    .scene-hero--scenic .scene-hero__scene {
      position: absolute;
      inset: 0;
      height: auto;
      margin: 0;
    }
    .scene-hero--scenic .scene-hero__inner {
      position: relative;
    }
    .scene-hero--scenic .scene-hero__card {
      max-width: 30rem;
      padding: var(--space-6);
      background: var(--color-surface);
      border-radius: var(--radius-control);
      box-shadow: var(--shadow-2);
      transform: translateY(calc(var(--p) * -6%));
      opacity: clamp(0, calc(1.75 - var(--p) * 2.5), 1);
    }
  }
  /* From 1024px the estimator card rides up over the hero's lower edge (Estimator.astro):
     keep this card and the pause button clear of it. */
  @media (min-width: 1024px) {
    .scene-hero--scenic {
      padding-bottom: calc(var(--space-7) + var(--space-8));
      --scene-pause-bottom: calc(var(--space-8) + var(--space-4));
    }
  }
</style>
```

- [ ] **Step 8: Turn the old hero into the estimator card**

```bash
git mv src/sections/Hero.astro src/sections/Estimator.astro
```

Replace all of `src/sections/Estimator.astro` with:

```astro
---
/**
 * The estimator: heading, suburb check and controls on the left, the floor plan
 * and its price on the right. On phones the order is heading, plan, price,
 * controls. From 768px it is a raised card, and under a photo hero it overlaps
 * the hero's lower edge. It keeps id="plan" and class "hero": the price tags
 * and the tests find it by those.
 */
import FloorPlan from '@/features/plan/FloorPlan.astro';
import PlanControls from '@/features/plan/PlanControls.astro';
import PriceTag from '@/features/pricing/PriceTag.astro';
import SuburbCheck from '@/features/areas/SuburbCheck.astro';
---

<section class="hero" id="plan" aria-labelledby="plan-title">
  <div class="wrap">
    <div class="hero__grid">
      <div class="hero__copy">
        <h2 id="plan-title">Price your home</h2>
        <SuburbCheck />
      </div>
      <div class="hero__plan">
        <FloorPlan id="home-plan" mode="edit" title="Your home. Press a dashed room to add it." />
        <PriceTag />
      </div>
      <div class="hero__controls">
        <PlanControls id="home-plan" />
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    padding-block: var(--space-6) var(--space-7);
    scroll-margin-top: calc(var(--space-8) + var(--space-4)); /* a jump to #plan lands clear of the 64px sticky header */
  }
  .hero__grid {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'copy' 'plan' 'controls';
  }
  .hero__copy {
    grid-area: copy;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    align-content: start;
  }
  .hero__plan {
    grid-area: plan;
    display: grid;
    gap: var(--space-4);
    align-content: start;
  }
  .hero__controls {
    grid-area: controls;
  }
  @media (min-width: 768px) {
    .hero__grid {
      padding: var(--space-6);
      background: var(--color-surface);
      border-radius: var(--radius-control);
      box-shadow: var(--shadow-2);
    }
  }
  @media (min-width: 1024px) {
    .hero {
      padding-block: var(--space-6) var(--space-8);
    }
    /* Under a photo hero the card rides up over the hero's lower edge. */
    :global(.scene-hero--scenic) + .hero {
      position: relative;
      z-index: 1;
      margin-top: calc(-1 * var(--space-8));
      padding-top: 0;
    }
    .hero__grid {
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
      grid-template-rows: auto 1fr;
      grid-template-areas: 'copy plan' 'controls plan';
      column-gap: var(--space-8);
      row-gap: var(--space-6);
    }
  }
</style>
```

This differs from `Hero.astro` in three ways only: the h1 and lead moved to `HeroScene`, and an h2 that labels the section took their place; `wrap` and `hero__grid` are now two nested elements, so the card sits inside the page margins; and from 768px the grid is drawn as a card.

- [ ] **Step 9: Recompose the home page**

Replace all of `src/pages/index.astro` with:

```astro
---
/** Home: a photoreal first screen with the live price, the estimator, then the proof a homeowner looks for. */
import BaseLayout from '@/layouts/BaseLayout.astro';
import HeroScene from '@/sections/HeroScene.astro';
import Estimator from '@/sections/Estimator.astro';
import TrustRow from '@/sections/TrustRow.astro';
import ServicesList from '@/sections/ServicesList.astro';
import RoomChecklist from '@/sections/RoomChecklist.astro';
import Reviews from '@/sections/Reviews.astro';
import Vetting from '@/sections/Vetting.astro';
import HowItWorks from '@/sections/HowItWorks.astro';
import Coverage from '@/sections/Coverage.astro';
import OfficesBand from '@/sections/OfficesBand.astro';
import Faq from '@/sections/Faq.astro';
import BookingTag from '@/features/pricing/BookingTag.astro';
import { business } from '@/config/business';
---

<BaseLayout
  title={`${business.tradingName}: house cleaning in ${business.region}`}
  description="Price your home room by room and book a police-checked cleaner online. Regular, deep, end of lease and move-in cleaning in Brisbane's north."
>
  <HeroScene />
  <Estimator />
  <BookingTag />
  <TrustRow />
  <ServicesList />
  <RoomChecklist />
  <Reviews />
  <Vetting />
  <HowItWorks />
  <Coverage />
  <OfficesBand />
  <Faq tag="home" limit={5} />
</BaseLayout>
```

- [ ] **Step 10: Run every check**

```bash
npm test && npm run check && npm run build && npm run budget
npm run e2e -- http://localhost:4331 hero
npm run e2e -- http://localhost:4331
```

Expected: tests and types pass with 0 errors; budget within both limits; `hero.e2e.mjs` 12/12; and every other file passes unedited, including `home.e2e.mjs`, `quality.e2e.mjs` (axe in both themes at 375 and 1280, tap targets, first-screen photos) and `model.e2e.mjs`.

If an existing step fails, do not edit the test. Find the cause in the new code; if the test itself is what is out of date, stop and raise it.

- [ ] **Step 11: Look at it**

```bash
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 1280 shots/home-1280.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs "/?theme=eucalyptus" 1280 shots/home-eucalyptus-1280.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 768 shots/home-768.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 375 shots/home-375.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs "/#plan" 1280 shots/estimator-1280.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs "/#plan" 375 shots/estimator-375.png 0
```

Read all six. Without a `hero` photo this is the plain state. The two `estimator` images open at the estimator: a white raised card with the 3D model standing in it at 1280, and plain stacked content with the flat plan at 375. Expected in the four `home` images: the headline, lead, price ("3 bed, 2 bath, fortnightly", "$179 a visit", first visit and "GST included. Sample prices."), then "Choose a time" and "Price your home" side by side; below it the estimator as a white raised card at 768 and wider, and as plain stacked content at 375. Nothing overlaps, nothing is clipped, and both themes read cleanly.

- [ ] **Step 12: Commit**

```bash
git add src/sections src/pages/index.astro src/features/pricing/PriceLine.astro src/features/pricing/price-tag.ts src/layouts/motion.ts src/layouts/BaseLayout.astro src/styles/global.css src/config/photo-slots.ts docs/photo-brief.md tests/e2e/hero.e2e.mjs
git commit -m "feat(home): hero with a live price, and the estimator as a raised card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Documents and the measured result

**Files:**

- Modify: `docs/spec.md`, `docs/design-system.md`, `docs/customising.md`
- Modify: the Measurements table at the end of this plan

**Interfaces:**

- Consumes: everything built in Tasks 2 to 6.
- Produces: documents that describe the site as it now is, and before/after numbers.

- [ ] **Step 1: `docs/spec.md` §6.1, the home page list**

Replace the numbered list under `### 6.1 Home page` (items 1 to 11) with:

```markdown
1. Header (§3).
2. Hero: a photo of a clean home fills the first screen; on screens 768px and wider a silent video loop fades in over it, with a pause button. In front of it a solid card holds the headline "Your home, priced room by room.", one supporting line, the live price, **Choose a time** and **Price your home**, which jumps to the estimator. On phones the photo sits above the card. With no `hero` photo the card stands alone on the page background.
3. Estimator ("Price your home"), two columns (stacked on mobile), drawn from 768px as a raised card that overlaps the hero's lower edge on desktop:
   - Left: the heading, the suburb check and the controls.
   - Right: the floor plan calculator. Steppers for bedrooms and bathrooms, toggles for study and laundry, a frequency choice, and add-ons behind "Add extras". Included rooms are filled tile yellow; dashed "available" slots can be clicked to add a room. The price tag beside the plan shows per-visit and, when different, first-visit price. **Choose a time** opens `/book` with the selection in the URL. On screens 768px and wider the plan stands up into a 3D model of the home as it scrolls into view (§7.4).
4. Trust row: police-checked staff, public liability amount, re-clean promise, Google rating (labelled sample in demo mode). Values from `config/business.ts`.
5. Services list (not a card grid): Regular, Deep, End of lease, Move in, each with a photo, one line, "from" price and link.
6. What's included, room by room: the same plan in read-only mode; selecting a room shows its checklist from `config/rooms.ts` for the chosen service.
7. Reviews (named, dated, star rating) beside a **Book a clean** button, and "Who comes to your home": vetting steps, same cleaner each visit, founder photo and note.
8. How a booking works, numbered because it is a real sequence: choose a time, we confirm by SMS, reminder the day before, a review link after.
9. Where we clean: coverage map and suburb list, linking to area pages.
10. Offices band: one line to facility managers and **Request a walk-through**.
11. FAQ (5 questions from `faqs.json` tagged `home`).
12. Footer.
```

- [ ] **Step 2: `docs/spec.md` §7.4, §8, §10 and §15**

In §7.4, replace the bullet that begins `- No scroll-triggered entrances, no hover lifts.` and the bullet after it (`prefers-reduced-motion`) with:

```markdown
- Scroll-linked motion is limited to named moments, moves only `transform` and `opacity`, and never takes over scrolling. The home hero's photo scales from 1 to 1.12 and its card rises and fades as the hero leaves the screen; the estimator's plan tilts into a 3D model as it arrives. `src/layouts/motion.ts` sets `--p` (0 to 1) on `[data-progress]` elements and CSS does the rest.
- No hover lifts. Any hover style is gated by `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion: reduce` removes movement (the press scale, scroll-linked motion, background video and the 3D model) and keeps the short colour fade, which helps people see what changed.
```

In §8, in the performance budget bullet, replace `total page JS under 30 KB gzipped` with:

```markdown
page JS under 30 KB gzipped, plus at most 150 KB that loads only through a dynamic `import()` (the home page's 3D model, which phones never download)
```

In §10, replace `` `sections/Hero.astro` + `features/plan/FloorPlan.astro` (Choose a time) and Header (Book a clean, phone) `` with:

```markdown
`sections/HeroScene.astro` (Choose a time, Price your home), `sections/Estimator.astro` + `features/plan/FloorPlan.astro` (Choose a time) and Header (Book a clean, phone)
```

In §15, replace the whole bullet that begins `- **No hero photo.**` with:

```markdown
- **Hero photo.** The first build had none, because the floor plan was the hero. The cinematic redesign (`docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md`) brings back the `hero` slot and adds `hero-portrait` for phones (12 slots). The hero still is the largest paint and loads eagerly with `fetchpriority="high"`, as do the photos that open service, area, offices and about pages.
```

- [ ] **Step 3: `docs/design-system.md`**

In the colour table, in the `--color-shadow` row, replace `The one shadow: the pinned booking tag` with `Shadows: the two elevation steps and the pinned booking tag`.

In the layout bullet that lists each section's columns, replace `Hero: `5fr 6fr` from 1024px.` with `Estimator: `5fr 6fr` from 1024px.`

Under `## Shape: one bold element`, replace the bullet `- One shadow on the whole site: the pinned booking tag, so it reads as floating above the page.` with:

```markdown
- Elevation has two steps, both built from `--color-shadow`. `--shadow-2` lifts the home hero card and the estimator card, so they read as standing in front of the photo. `--shadow-1` is for a small control that sits on a photo (the video pause button). The pinned booking tag keeps its own shadow. Nothing else casts one.
```

Under `## Motion`, replace the opening sentence `There is one moment, and everything else responds quickly or not at all.` with `A few named moments move, and everything else responds quickly or not at all.` Then add these rows to the end of the table:

```markdown
| The home hero leaves the screen | Its photo scales 1 to 1.12; its card rises 6% of its own height and fades. Driven by `--p` | `HeroScene`, `src/layouts/motion.ts` |
| The estimator arrives | The plan tilts from flat to a three-quarter view and its walls rise. A room added later rises in 180ms | `src/features/plan/scene3d.ts` |
| A background video starts | It fades in over its still in `--dur-scene` (900ms) | `Scene` |
```

In the same section, replace the bullet `- No scroll-triggered entrances. The pinned booking tag appears and disappears without animating.` with:

```markdown
- Scroll-linked motion is opt-in. Mark an element `data-progress` and `motion.ts` gives it `--p`: 0 where it first shows, 1 where it has left the top of the screen. Use `--p` for `transform` and `opacity` only. The pinned booking tag appears and disappears without animating.
```

and replace the last bullet (`prefers-reduced-motion: reduce` removes movement…) with:

```markdown
- `prefers-reduced-motion: reduce` removes movement: `global.css` cuts CSS animations and smooth scrolling, each component removes its press scale, and `motion.ts`, the background video and the 3D model never start. The short colour fades stay, because they show what changed without moving anything.
```

In the Core UI table, add after the `Photo` row:

```markdown
| `Scene` | `slot`, `portrait?`, `video?`, `alt?` (''), `priority?` | A backdrop that fills its positioned parent: a still, and a silent loop from `public/media/<video>.webm`/`.mp4` that `scene.ts` attaches only on screens 768px and wider, with motion allowed, Save-Data off and a connection better than 3G. A parent can set `--scene-scale` and `--scene-pause-bottom` |
```

In the "Icons available" sentence, add `` `pause`, `play` `` after `` `copy` ``.

In the Features table, add after the `pricing/PriceTag` row:

```markdown
| `pricing/PriceLine` | none; default slot for extra actions | The same price hooks as `PriceTag` in a compact block, for the home hero |
```

After the Features table's closing paragraph about field ids, add:

```markdown
The edit plan's 3D model is not a component. `plan.ts` loads `plan/scene3d.ts` (the only file that imports three.js) when the screen is 768px or wider, motion is allowed, Save-Data is off and WebGL2 exists. `plan/model.ts` turns the plan into wall and furniture boxes; the SVG drawing itself is the floor, so every room stays a real, focusable element.
```

In the Sections table, replace the `Hero` row with:

```markdown
| `HeroScene` | none (the first screen: backdrop, headline card, live price, Choose a time, Price your home) |
| `Estimator` | none (the calculator: heading, suburb check, plan, price tag, controls) |
```

- [ ] **Step 4: `docs/customising.md`**

After the bullet list that ends the `## Photos` section, add:

````markdown
### The home hero: a still and a video

The hero's backdrop is a `Scene` (`src/core/ui/Scene.astro`): a still, and optionally a silent loop over it.

- `src/assets/photos/hero.jpg`: the wide still, 2880×1620. Keep the left 40% calm, because the headline card sits there.
- `src/assets/photos/hero-portrait.jpg`: the upright crop phones get, 1440×2560. Without it phones get the wide still, cropped.
- `public/media/hero-loop.mp4` and `public/media/hero-loop.webm`: the loop, 1920×1080, no audio, at most 2.5 MB and 1.5 MB. Its first frame should match the still. Encode a source clip with:

```bash
ffmpeg -i source.mp4 -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart public/media/hero-loop.mp4
ffmpeg -i source.mp4 -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 public/media/hero-loop.webm
```

With no `hero.jpg` the hero is its card alone. With no clip it is the still alone. The video is never requested on screens under 768px, under reduced motion, with Save-Data on, or on a 2G or 3G connection. `public/media/sample.*` is a two-second test clip for `/dev/ui/`; leave it in place.
````

In the "Checks, all green" block, replace the `npm run budget` line with:

```bash
npm run budget       # JavaScript per page: 30 KB gzipped eager, 150 KB lazy
```

In the "Wording that lives in components" table, add after the `PriceTag.astro` row:

```markdown
| `src/features/pricing/PriceLine.astro` | The same "priced as a deep clean so we start from clean" line, in the home hero |
```

- [ ] **Step 5: Measure the result**

With the final build served on `:4331`:

```bash
npm test && npm run check && npm run build && npm run budget && npm run e2e -- http://localhost:4331
```

Then repeat the Lighthouse block from Task 1, Step 3, unchanged.

Fill the "plan 1" column of the Measurements table. In `docs/spec.md` §15's results table, update the `Unit tests`, `End to end` and `JavaScript` rows with the numbers just measured (the JavaScript row gains the home page's lazy figure).

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "docs: the cinematic hero, the 3D estimator and the two-limit budget" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Report**

Report to the owner, from measurements only: the Measurements table (main beside plan 1), which checks ran, any "– skipped" e2e lines, and anything found in existing behaviour that looks like a bug (described, not fixed). State plainly that real iOS Safari and Firefox have not been tested; that is plan 2's QA phase.

---

### Task 8: Hero assets, when the owner supplies them

This task waits on the owner and blocks nothing. Tasks 1 to 7 are complete and green without it.

**Files:**

- Create: `src/assets/photos/hero.jpg`, `src/assets/photos/hero-portrait.jpg`, `public/media/hero-loop.mp4`, `public/media/hero-loop.webm`
- Modify: `docs/photo-credits.md`, `docs/photo-brief.md` (regenerated)

**Interfaces:**

- Consumes: owner-approved exports from Google Flow, made with prompts G0, G1 and G2 in spec §11.1, saved in a folder outside the repo. In the commands below `$IN` is that folder and the files are `G0.png`, `G2.png` and `G1.mp4`.
- Produces: the scenic hero. `HeroScene` picks the files up by name; no code changes.

- [ ] **Step 1: Check what arrived**

Read `$IN/G0.png` and `$IN/G2.png`. Confirm with the owner that these are the approved variants. Check: no people, no text or logos, the left 40% of G0 is calm, verticals are straight. If any check fails, say so and stop.

- [ ] **Step 2: Size the stills**

```bash
ffmpeg -y -i "$IN/G0.png" -vf "scale=2880:1620:force_original_aspect_ratio=increase,crop=2880:1620" -q:v 2 src/assets/photos/hero.jpg
ffmpeg -y -i "$IN/G2.png" -vf "scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560" -q:v 2 src/assets/photos/hero-portrait.jpg
```

- [ ] **Step 3: Encode the loop**

```bash
ffmpeg -y -i "$IN/G1.mp4" -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart public/media/hero-loop.mp4
ffmpeg -y -i "$IN/G1.mp4" -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 public/media/hero-loop.webm
ls -l public/media/hero-loop.*
```

Expected: the MP4 is at most 2,621,440 bytes and the WebM at most 1,572,864. If one is over, raise its `-crf` by 2 and encode again until it fits.

- [ ] **Step 4: Record where the files came from**

Add to the table in `docs/photo-credits.md`:

```markdown
| `hero` | `hero.jpg` | Generated with Google Flow for this site (prompt G0 in the redesign spec), approved by the owner | Owner's own | Generated image |
| `hero-portrait` | `hero-portrait.jpg` | Generated with Google Flow for this site (prompt G2 in the redesign spec), approved by the owner | Owner's own | Generated image |
```

Run: `npm run photos:status -- --write`
Expected: "Photo slots: 11 of 12 filled" (`founder` is plan 2).

- [ ] **Step 5: Verify**

```bash
npm test && npm run build && npm run budget && npm run e2e -- http://localhost:4331
ls -l dist/_astro | grep -i "hero"
```

Expected: everything passes with the scenic hero, including "photos on the first screen load eagerly with high priority" and axe in both themes. From the listing, note the size of the 1600-wide and 800-wide AVIF and WebP `hero` files against the spec's targets (120 KB and 60 KB) and report them as measured; do not tune quality without asking.

- [ ] **Step 6: Look at it**

```bash
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 1280 shots/hero-1280.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 1024 shots/hero-1024.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 768 shots/hero-768.png 0
MSYS_NO_PATHCONV=1 SHOT_BASE=http://localhost:4331 node tools/shot.mjs / 375 shots/hero-375.png 0
```

Read all four. Expected: at 768 and wider the photo fills the first screen, the white card sits on its calm left side, the estimator card overlaps the photo's lower edge at 1024 and wider, and the pause button is clear of both cards. At 375 the upright still sits above the card. Show the owner these four images.

- [ ] **Step 7: Commit**

```bash
git add src/assets/photos/hero.jpg src/assets/photos/hero-portrait.jpg public/media/hero-loop.mp4 public/media/hero-loop.webm docs/photo-credits.md docs/photo-brief.md
git commit -m "feat(home): hero still and video loop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Deferred to plan 2

- Reveal (spec §8), with the change it needs to the axe scan in `tests/e2e/quality.e2e.mjs`.
- Sections 5.3 to 5.10: trust, services, the room stage with before and after, reviews, team, process, areas and offices, FAQ and the closing band (`CtaBand`).
- People imagery: the "Sample photo" caption, the people rule in `docs/customising.md`, `docs/photo-credits.md`, `docs/spec.md` §9 and `tools/photo-brief.mjs`.
- The remaining photo slots and the action clip C1.
- The comment in `tests/e2e/quality.e2e.mjs` that says the home page has no hero photo. It is out of date once Task 8 lands; refresh it when that file is opened for Reveal.
- The performance pass against this plan's measurements, and QA in Firefox, WebKit and on a real iPhone.

## Measurements

Filled in by Task 1 (main) and Task 7 (plan 1). Lighthouse figures are the median of three mobile runs against the local preview.

| Check | main (`d5053fe`) | plan 1 |
| --- | --- | --- |
| Unit tests passing | 325 (38 files) | |
| `astro check` errors | 0 | |
| E2E files and steps passing | 7 files, 96 steps (0 skipped) | |
| Heaviest page, eager JS | 15.7 KB (`/console/`) | |
| `/` eager JS | 10.5 KB | |
| `/` lazy JS | 0 | |
| `/book/` eager JS | 15.3 KB | |
| Lighthouse `/`: performance | 99 | |
| Lighthouse `/`: accessibility | 100 | |
| Lighthouse `/`: LCP, CLS, TBT | 1.8 s, 0.026, 0 ms | |
| Lighthouse `/book/`: performance | 98 | |
| Lighthouse `/book/`: accessibility | 100 | |
