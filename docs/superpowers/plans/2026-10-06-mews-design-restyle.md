# Apply DESIGN.md ("Mews" style) to Clearday Cleaning — Implementation Plan

## Context

The site at `D:\Reozix\Cleaning Companies\clearday-cleaning-source\clearday-cleaning` currently uses its own "floor plan" look (teal ink on grey-blue paper, Schibsted Grotesk, 6px radii, heavy 2px ink rules). `d:\Reozix\Cleaning Companies\DESIGN.md` specifies a different visual system: white canvas, black ink, cream cards with lilac hairlines, one bubblegum-pink pill CTA, Inter at heavy weights, 4px/8px/pill radii, hairline dividers, a dark hero panel. This plan re-skins the existing site to that system **without changing behaviour, content, routes, data hooks or tests' functional assertions**. It is written so a cheaper model can execute it task by task with no design decisions left open.

Decisions already made by the owner (do not reopen):

1. **Primary CTA is white text on pink `#ff83da`**, as DESIGN.md's component spec says (not the lime variant from its "Agent Prompt Guide"). This is 2.21:1 and fails WCAG AA; it is a documented, deliberate exception limited to two elements.
2. **The Mews look becomes the default theme (theme name stays `floorplan`); the `eucalyptus` theme is kept** and re-tuned to the same structure.
3. **Console (`/console/`) gets tokens only** — no layout rework.

Where DESIGN.md and `docs/design-system.md` disagree, DESIGN.md wins; the docs are updated in Phase 9.

**Executor rules (apply to every task)**

- Work on a branch: `git checkout -b design/mews-restyle`. Commit after each task: `git commit -am "style: <task name>"`.
- Raw colours (hex, `rgb(`, `hsl(`) may only appear in `src/styles/tokens.css`. `tools/check-boundaries.mjs` fails the build otherwise — even inside comments. Everywhere else use `var(--…)`.
- Never add `text-transform: uppercase` except in the two global classes `.eyebrow` and `.arrow-link` (e2e tests compare case-sensitive visible text).
- Never rename or remove an `id`, a `data-*` attribute, a form field `name`, or a class that appears in `tests/`.
- Line numbers below were correct at commit `d5053fe`; if a line has moved, find the rule by its selector.
- **GATE** (run at the end of every task unless it says otherwise): `npm test` then `npm run check` then `npm run build`. All three must pass.
- **E2E GATE** (run where a task says so). PowerShell:
  ```powershell
  $env:CHROMIUM_PATH = (Get-ChildItem "$env:LOCALAPPDATA\ms-playwright\chromium-*\chrome-win*\chrome.exe" | Select-Object -First 1).FullName
  npm run build
  # terminal A (leave running):  npm run preview        → http://localhost:4321
  # terminal B:                  npm run e2e
  ```
- **SHOT** = `node tools/shot.mjs <path> <width> <out.png> 1` (needs preview running and `CHROMIUM_PATH`). Save into a git-ignored folder `shots/` (create it; do not commit).

---

## 1. Project Understanding

| Item | Finding |
|---|---|
| Framework | Astro `^5.18.2`, static output, `trailingSlash: 'always'`, `@astrojs/sitemap`. TypeScript strict. Alias `@/*` → `src/*`. No React/Vue/Tailwind. |
| Styling | Scoped `<style>` blocks inside `.astro` files + CSS custom properties. Shared CSS: `src/styles/tokens.css` (all raw values), `src/styles/global.css` (base + utilities), `src/styles/console.css` (console only), `src/features/booking/booking.css`, `src/features/forms/forms.css`. |
| Themes | Two `[data-theme]` blocks in `tokens.css`: `floorplan` (also `:root` default) and `eucalyptus`. Chosen by `business.theme` in `src/config/business.ts`; `src/layouts/ThemeBoot.astro` honours `?theme=` and sessionStorage; `src/layouts/DemoRibbon.astro` shows a switcher. |
| Layering | pages → layouts \| sections → features → domain → core. Enforced by `tools/check-boundaries.mjs` (first step of `npm test`). |
| Shared UI | `src/core/ui/`: `Button`, `Badge`, `Field`, `ErrorSummary`, `Icon`, `Photo`, `Placeholder`. Layout chrome in `src/layouts/`: `BaseLayout`, `Header`, `Footer`, `DemoRibbon`, `MobileBookingBar`, `Logo`. Page sections in `src/sections/` (19 files). |
| Routes | `/`, `/book/`, `/offices/`, `/services/`, `/services/[slug]/` (4), `/prices/`, `/areas/`, `/areas/[slug]/` (12), `/about/`, `/faq/`, `/careers/`, `/refer/`, `/terms/`, `/privacy/`, `/accessibility/`, `/404`, `/console/` (own shell + `console.css`), `/dev/ui/` (component gallery). |
| Fonts | `@fontsource-variable/schibsted-grotesk`, imported at `src/styles/global.css:2`, named in `tokens.css:53`. |
| Images | 10 photo slots in `src/config/photo-slots.ts`, none filled; `Photo.astro` falls back to `Placeholder.astro`. No hero photo slot exists. |
| Tests | `npm test` = boundary check + vitest (incl. `tests/unit/contrast.test.ts`, which parses `tokens.css`). `npm run e2e` = Playwright + axe over a preview build (`tests/e2e/*.e2e.mjs`). `npm run budget` = JS size (30,720 B gz; this plan adds no JS). |
| Backend | None. Leads go to localStorage. |

## 2. DESIGN.md Summary

- **Colour**: canvas `#ffffff`; cards warm-cream `#fffcf6` with 1px lilac-mist `#c4c9dd` border; ink `#000000`; body text charcoal `#333333`; hairlines mist-gray `#cccccc`; dark panel `#161616`; primary CTA bubblegum `#ff83da`; supporting tints cotton-pink `#ffc5ee`, blush-mist `#f7e1f7`, ice-blue `#d2f4ff`, voltage-lime `#e8ff5b`. No gradients, no cool greys, no card shadows.
- **Type**: Inter (substitute for Soehne). Body 16/1.5/400 in `#333`. Headings ≥700; display 900. Scale: 11, 16, 20, 22, 28, 48, 96px with negative tracking on large sizes (−0.025em display, about −0.015em mid) and positive tracking on uppercase eyebrows (+0.02…0.05em). Tabular numerals for figures; ligatures off in display.
- **Shape**: pills (9999px) for buttons/tags; 4px for cards/frames; 8px for inputs and ghost buttons. Never 12/16/24px.
- **Layout**: max width 1280px; 80px between sections; card padding 24–32px; card grids 4 → 2 → 1 columns.
- **Components**: pink pill primary CTA (one per screen, never duplicated); ghost button (1px black, 8px); nav with active pink-tint pill, sticky, hairline bottom; pastel announcement bar 36–40px; dark hero panel with 96px/900 white headline; cream category cards; FAQ rows with hairlines and a plus/minus in a `#ffc5ee` circle, max ~800px centred; uppercase eyebrow; uppercase arrow link.

## 3. Design-to-Code Mapping

| Design Requirement | Existing Implementation | Change Required | Location |
|---|---|---|---|
| White canvas, black ink, `#333` body | Grey-blue paper, teal ink, body in ink | New token values; body colour → `--color-ink-muted`, headings → `--color-ink` | `src/styles/tokens.css`, `src/styles/global.css` |
| Cream cards + lilac hairline, 4px | No card primitive; panels use `--color-room`/`--color-surface` + 6px | New tokens `--color-card`, `--color-card-border`, `--radius-card`; global `.card` class | `tokens.css`, `global.css`, sections below |
| Pink pill CTA, single per screen | Ink-fill 6px `primary` button used everywhere | New `accent` variant (pink pill) used only in header; `primary` becomes black pill; phone bar button pink | `src/core/ui/Button.astro`, `src/layouts/Header.astro`, `src/layouts/MobileBookingBar.astro` |
| Ghost button 1px black, 8px | `secondary` variant, 6px | `--radius-control` 6px → 8px | `tokens.css` |
| Inter, weights to 900 | Schibsted Grotesk, 400/500/700 | Swap font package; add 600/900 weight tokens | `package.json`, `global.css:2`, `tokens.css` |
| Type scale 16/20/22/28/48/96 | 14/16/18/22/28/36 + hero clamp to 56px | Add `--text-12/13/20/48/display`; remove `--text-36`, `--text-hero`; body 17px → 16px, leading 1.6 → 1.5 | `tokens.css`, `global.css`, 6 consumers |
| Max width 1280px, 80px section gap | 1200px, 96–128px | `--page-max: 80rem`; `.band` padding = half of `--space-section` | `tokens.css`, `global.css` |
| Hairline `#cccccc` dividers | Heavy `2px solid ink` "ruled list" tops in ~25 places | Replace with `var(--hairline) solid var(--color-line)` | listed in Tasks 5.7, 6.1, 7.1 |
| No card shadows | One shadow: `BookingTag.astro:23` | Remove; delete `--color-shadow` token | `src/features/pricing/BookingTag.astro`, `tokens.css` |
| Announcement bar, pastel, 36–40px | `DemoRibbon` ink bar | Pink-tint bg, ink text, 13px/500, 36px min-height | `src/layouts/DemoRibbon.astro` |
| Nav active pill | Underline on `aria-current` | Tint pill | `src/layouts/Header.astro:74-78` |
| Dark hero panel, 96px/900 headline | Plain hero copy on paper | Dark panel on `.hero__copy`; `.display` class on h1 | `src/sections/Hero.astro`, `src/features/areas/SuburbCheck.astro` |
| Product frame, hard corners | `.hero__plan` unframed | 4px hairline frame. **Not applied:** tilt and scenic photo (plan is interactive; no photo assets exist) | `src/sections/Hero.astro` |
| Category cards, 4 → 2 → 1 | `TrustRow` inline items; `ServicesList` rows | Card grids | `src/sections/TrustRow.astro`, `src/sections/ServicesList.astro` |
| FAQ rows, plus/minus in pink circle, ≤800px centred | Duplicate scoped accordion CSS in two files, bare `+`/`−` | One global `.accordion`; centre containers at 50rem | `global.css`, `src/sections/Faq.astro`, `src/sections/Questions.astro`, `src/pages/faq.astro`, `src/pages/services/[slug].astro` |
| Eyebrow, arrow link | None | Global `.eyebrow`, `.arrow-link`; `PageHeader` optional `eyebrow` prop | `global.css`, `src/sections/PageHeader.astro` |
| Feature pill / tags | `Badge` 6px | Pill radius; `highlight` tone uses lime | `src/core/ui/Badge.astro` |
| Lime / ice-blue on supporting UI only | n/a | `--color-lime` → highlight badge; `--color-ice` → photo placeholder | `tokens.css`, `Badge.astro`, `src/core/ui/Placeholder.astro` |
| Soehne typeface | n/a | **Not applied:** licensed font; DESIGN.md names Inter as the substitute | — |
| Lime primary action ("Agent Prompt Guide") | n/a | **Not applied:** owner chose pink/white | — |

## 4. Architecture & Dependency Analysis

- **Single source of values.** Every component reads `var(--…)`. Changing token *values* while keeping token *names* re-skins ~80% of the site with no component edits. So tokens go first, and existing names are kept: `paper, ink, ink-hover, ink-muted, room, highlight, line, field-border, surface, on-ink, focus, shade`.
- **Role remap of existing tokens** (names unchanged): `--color-room` = quiet tint that must be visible on white (blush `#f7e1f7`: selected rooms on the plan, done steps, console selected rows, hover washes, nav active pill). `--color-highlight` = stronger tint (cotton-pink `#ffc5ee`: price tag, priced rooms, FAQ toggle, announcement bar). Cream is a **new** token `--color-card` because cream on white is too faint for the things `--color-room` already does.
- **Test coupling.** `tests/unit/contrast.test.ts` requires: themes named `floorplan` and `eucalyptus`; `floorplan` shares the `:root` selector; every colour in the default block also set in every theme block; paired tokens are 3/6-digit hex. Shared (theme-independent) tokens live in the separate `:root {}` block and are exempt.
- **Header height is load-bearing**: `Header.astro:54` (64px), `BookingTag.astro:14` (`top: 76px`), `BookingForm.astro:143`, `PolicyPage.astro:65`, `price-tag.ts:51`. The header stays 64px, so none of these change.
- **Breakpoints are load-bearing** (e2e): 768 (header phone text + Book button appear, mobile bar hides, booking tag shows) and 1024 (desktop nav). Keep them.
- **Justified consolidation (only these):** (a) `.accordion` in `global.css` replaces identical scoped CSS in `Faq.astro` and `Questions.astro`; (b) `.card`, `.eyebrow`, `.arrow-link` in `global.css` because each is used by 2+ files. No new components and no new source files.
- **Dependency order:** tokens → global base → core UI → layouts → sections → features → pages → console/dev → docs → QA. A later phase never needs an earlier file changed again.

## 5. Implementation Phases

| Phase | Scope | Why here |
|---|---|---|
| 0 | Baseline: branch, test run, "before" screenshots | Proves the starting state is green |
| 1 | Font package + all tokens + contrast test pairs | Everything reads tokens |
| 2 | `global.css` base typography, spacing, 4 shared classes | Components inherit from it |
| 3 | Core UI: Button (+accent), axe exemption, Badge, Photo/Placeholder, status boxes | Used by every layout/section |
| 4 | Layout chrome: Header, DemoRibbon, MobileBookingBar, Footer, favicon | On every page |
| 5 | Sections (home first) | Depend on 2–3 |
| 6 | Features: booking, pricing tags, referral | Depend on 2–3 |
| 7 | Page-local styles | Depend on 2–5 |
| 8 | Console radii + `/dev/ui/` gallery | Token-only pass |
| 9 | Docs | Describe the final state |
| 10 | Full QA in both themes | Last |

## 6. Detailed Tasks

### Task 0.1 — Baseline

**Objective:** Confirm the repo is green before any change and capture "before" screenshots.

**Files to inspect:** `package.json`, `tools/shot.mjs`, `tests/e2e/run.mjs`.

**Files likely to modify:** `.gitignore` (add a line `shots/`).

**Implementation:**
1. `git checkout -b design/mews-restyle`; `npm install`.
2. Run GATE, then E2E GATE. Record pass/fail counts.
3. With preview running, SHOT each of `/`, `/book/`, `/offices/`, `/services/`, `/services/regular/`, `/prices/`, `/areas/`, `/about/`, `/faq/`, `/console/` at widths 375 and 1280 into `shots/before/<route>-<width>.png` (use `home` for `/`).

**Design requirements:** none.

**Preserve:** everything.

**Dependencies:** none.

**Verification:** GATE and E2E GATE pass; 20 PNGs exist.

**Done when:** baseline is green and screenshots are saved. If the baseline is red, stop and report — do not start Phase 1.

---

### Task 1.1 — Swap the font to Inter

**Objective:** Replace Schibsted Grotesk with Inter Variable.

**Files to inspect:** `package.json`, `src/styles/global.css:2`, `src/styles/tokens.css:52-53`.

**Files likely to modify:** `package.json`, `package-lock.json`, `src/styles/global.css`, `src/styles/tokens.css`.

**Implementation:**
1. `npm uninstall @fontsource-variable/schibsted-grotesk` then `npm install @fontsource-variable/inter`.
2. `global.css:2` → `@import '@fontsource-variable/inter';`
3. `tokens.css:52-53` → comment `/* Type: Inter only (DESIGN.md substitute for Soehne) */` and `--font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;`

**Design requirements:** Inter; weights 400–900 available (the variable file covers 100–900).

**Preserve:** the `@import './tokens.css'` line and its position.

**Dependencies:** 0.1.

**Verification:** GATE. `npm run dev`, open `/`, DevTools → Computed → `font-family` on `body` resolves to Inter Variable.

**Done when:** no reference to "Schibsted" remains under `src/` or in `package.json` (`docs/` is handled in Task 9.1).

---

### Task 1.2 — Replace colour tokens (both themes)

**Objective:** Install the DESIGN.md palette under the existing token names, add the new colour tokens, remove the shadow token.

**Files to inspect:** `src/styles/tokens.css:1-50`, `src/features/pricing/BookingTag.astro:12-24`, `tests/unit/contrast.test.ts`.

**Files likely to modify:** `src/styles/tokens.css`, `src/features/pricing/BookingTag.astro`.

**Implementation:**
1. Replace `tokens.css` lines 9–40 (the two theme blocks) with exactly:
   ```css
   :root,
   [data-theme='floorplan'] {
     --color-paper: #ffffff;        /* page canvas */
     --color-ink: #000000;          /* headings, borders, default buttons */
     --color-ink-hover: #333333;
     --color-ink-muted: #333333;    /* body text */
     --color-room: #f7e1f7;         /* quiet tint: selected rooms, done steps, active nav pill, hover */
     --color-highlight: #ffc5ee;    /* strong tint: price tag, priced rooms, FAQ toggle, announcement bar. Always ink text */
     --color-card: #fffcf6;         /* card and panel fill */
     --color-card-border: #c4c9dd;  /* card edge (decorative) */
     --color-line: #cccccc;         /* hairline dividers (decorative) */
     --color-field-border: #8c8c8c; /* text field outlines: 3:1 on paper, card and panel */
     --color-surface: #ffffff;      /* form surfaces */
     --color-on-ink: #ffffff;
     --color-focus: #000000;
     --color-shade: rgb(0 0 0 / 0.06);  /* pressed and hover washes */
     --color-accent: #ff83da;       /* the one primary action per screen */
     --color-on-accent: #ffffff;    /* 2.2:1 on accent: owner-approved exception, see docs/design-system.md */
     --color-panel: #161616;        /* dark hero panel */
     --color-on-panel-muted: #cccccc;
   }

   [data-theme='eucalyptus'] {
     --color-paper: #ffffff;
     --color-ink: #142a22;
     --color-ink-hover: #1e3b30;
     --color-ink-muted: #33483f;
     --color-room: #dcebdf;
     --color-highlight: #cfe5d2;
     --color-card: #f7f9f3;
     --color-card-border: #bccabc;
     --color-line: #c9d3c9;
     --color-field-border: #728f72;
     --color-surface: #ffffff;
     --color-on-ink: #ffffff;
     --color-focus: #142a22;
     --color-shade: rgb(20 42 34 / 0.06);
     --color-accent: #2f7d5b;
     --color-on-accent: #ffffff;
     --color-panel: #142a22;
     --color-on-panel-muted: #c9d3c9;
   }
   ```
2. In the shared `:root {` block, directly after `--color-star: #7a4f00;`, add:
   ```css
   /* Supporting tints, shared by both themes. Never a page or button background. */
   --color-ice: #d2f4ff;
   --color-lime: #e8ff5b;
   ```
3. `BookingTag.astro:23`: delete the `box-shadow` line and add in its place `border: var(--hairline) solid var(--color-ink);` (the only consumer of `--color-shadow`).
4. Leave the semantic colours (`success`, `warning`, `danger`, `star`) untouched.

**Design requirements:** palette in §2; no shadows; no cool greys.

**Preserve:** theme names `floorplan`/`eucalyptus`; the `:root, [data-theme='floorplan']` selector pairing; every existing token name except `--color-shadow`.

**Dependencies:** 1.1.

**Verification:** GATE — `tests/unit/contrast.test.ts` must pass for both themes (pre-computed: lowest ratios are field-border/paper 3.36 floorplan, 3.57 eucalyptus; all text pairs ≥ 7.9). `Grep` for `--color-shadow` under `src/` returns nothing.

**Done when:** GATE passes and the home page renders white with black/pink (layout still old).

---

### Task 1.3 — Type, space and shape tokens

**Objective:** Add DESIGN.md's scale, weights, radii and widths; remove `--text-36` and `--text-hero` and repoint their consumers in the same commit.

**Files to inspect:** `src/styles/tokens.css` (shared `:root` block), and each consumer listed below.

**Files likely to modify:** `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/console.css`, `src/features/pricing/PriceTag.astro`, `src/features/booking/BookingForm.astro`, `src/features/referral/ReferralCode.astro`, `src/sections/HowItWorks.astro`, `src/pages/offices.astro`.

**Implementation:**
1. In the shared `:root` block of `tokens.css`, make the type section read:
   ```css
   --text-12: 0.75rem;
   --text-13: 0.8125rem;
   --text-14: 0.875rem;
   --text-16: 1rem;
   --text-18: 1.125rem;
   --text-20: 1.25rem;
   --text-22: 1.375rem;
   --text-28: 1.75rem;
   --text-48: clamp(2rem, 5vw, 3rem);
   --text-display: clamp(2.75rem, 6.5vw, 6rem);
   --body-size: 1rem;
   --leading-body: 1.5;
   --leading-tight: 1.1;
   --leading-display: 0.9;
   --measure: 68ch;
   --weight-regular: 400;
   --weight-medium: 500;
   --weight-semibold: 600;
   --weight-bold: 700;
   --weight-black: 900;
   --tracking-display: -0.025em;
   --tracking-heading: -0.015em;
   --tracking-caps: 0.03em;
   ```
   (`--text-36` and `--text-hero` are deleted.)
2. Space: change `--page-max: 75rem;` → `--page-max: 80rem;` and add `--space-section: 5rem;` after `--space-8`.
3. Shape: change `--radius-control: 6px;` → `--radius-control: 8px;  /* inputs, ghost buttons, segments */` and add `--radius-card: 4px;` and `--radius-pill: 9999px;`. Change the `--wall` comment to `/* floor-plan walls and status outlines only */`.
4. Repoint consumers (property stays the same, only the variable changes):

   | File:line | Old | New |
   |---|---|---|
   | `src/styles/global.css:40` | `--text-hero` | `--text-48` |
   | `src/features/pricing/PriceTag.astro:55` | `--text-hero` | `--text-48` |
   | `src/features/booking/BookingForm.astro:88` and `:158` | `--text-36` | `--text-48` |
   | `src/sections/HowItWorks.astro:45` | `--text-36` | `--text-48` |
   | `src/pages/offices.astro:153` | `--text-36` | `--text-48` |
   | `src/features/referral/ReferralCode.astro:37` | `--text-36` | `--text-28` |
   | `src/styles/console.css:14` | `--text-36` | `--text-28` |

**Design requirements:** scale 12/13/14/16/18/20/22/28/48/96; radii 4/8/pill; 1280px; 80px section unit.

**Preserve:** `--space-1…8`, `--gutter`, `--target`, `--hairline`, `--wall`, motion tokens, the `@media (min-width: 768px)` gutter block.

**Dependencies:** 1.2.

**Verification:** GATE. `Grep` for `--text-36|--text-hero` under `src/` returns nothing.

**Done when:** GATE passes.

---

### Task 1.4 — Guard the new colour pairs in the contrast test

**Objective:** Make the unit test fail if a future theme breaks the new text/background pairs.

**Files to inspect:** `tests/unit/contrast.test.ts:87-100` (`THEME_PAIRS`).

**Files likely to modify:** `tests/unit/contrast.test.ts`.

**Implementation:** Append to `THEME_PAIRS`, in the file's existing tuple style:
```ts
['ink', 'card', 4.5],
['ink-muted', 'card', 4.5],
['field-border', 'card', 3],
['on-ink', 'panel', 4.5],
['on-panel-muted', 'panel', 4.5],
['field-border', 'panel', 3],
```
Do **not** add an `on-accent`/`accent` pair (it is the approved exception and would fail at 2.21).

**Design requirements:** accessibility of everything except the approved CTA.

**Preserve:** all existing pairs and thresholds.

**Dependencies:** 1.2.

**Verification:** `npm test` passes (pre-computed minimums: field-border/card 3.28 and 3.36; field-border/panel 5.38 and 4.25).

**Done when:** test passes in both themes.

---

### Task 2.1 — Base typography, body colour, section rhythm

**Objective:** Apply DESIGN.md type rules globally.

**Files to inspect:** `src/styles/global.css:22-46` and `:89-97`. Run `Grep` for `class="display"` and `display'` under `src/` to list current users of `.display` (expected: none or the hero only).

**Files likely to modify:** `src/styles/global.css`.

**Implementation:**
1. `body`: change `color: var(--color-ink);` → `color: var(--color-ink-muted);`.
2. Replace the heading rules (lines 32–46) with:
   ```css
   h1, h2, h3, h4 {
     margin: 0;
     color: var(--color-ink);
     line-height: var(--leading-tight);
     font-weight: var(--weight-bold);
     text-wrap: balance;
   }

   h1 {
     font-size: var(--text-48);
     line-height: 1.03;
     font-weight: var(--weight-black);
     letter-spacing: var(--tracking-heading);
   }

   /* The one oversized headline per page (home hero). */
   .display {
     font-size: var(--text-display);
     line-height: var(--leading-display);
     letter-spacing: var(--tracking-display);
     font-variant-ligatures: none;
     overflow-wrap: break-word;
   }

   h2 {
     font-size: var(--text-28);
     line-height: 1.15;
     font-weight: var(--weight-black);
     letter-spacing: var(--tracking-heading);
   }
   h3 { font-size: var(--text-22); line-height: 1.2; letter-spacing: var(--tracking-heading); }
   h4 { font-size: var(--text-20); line-height: 1.35; }
   ```
3. Replace the `.band` rules with:
   ```css
   .band {
     padding-block: var(--space-6);
   }

   @media (min-width: 1024px) {
     .band {
       padding-block: calc(var(--space-section) / 2);
     }
   }
   ```
4. `.form-done` (line ~152): `border-radius: var(--radius-control)` → `var(--radius-card)`.

**Design requirements:** body 16/1.5/400 `#333`; headings ≥700 in ink; h1 48/1.03/900; display 96/0.9/900/−0.025em, no ligatures; h2 28/1.15; h3 22/1.2; h4 20/1.35; 80px between adjacent sections on desktop.

**Preserve:** `.wrap`, `.muted`, `.visually-hidden`, `.skip-link`, `.tabular`, `:focus-visible` (3px `--color-focus`, offset 2px), reduced-motion block, `.form-failure`, `.hp`, the `max(16px, 1rem)` input rule.

**Dependencies:** 1.3.

**Verification:** GATE. On `/about/` the h1 computes `font-weight: 900`, body paragraphs compute `color: rgb(51, 51, 51)` and `font-size: 16px`.

**Done when:** GATE passes.

---

### Task 2.2 — Shared classes: `.card`, `.accordion`, `.eyebrow`, `.arrow-link`

**Objective:** Add the four reusable DESIGN.md primitives once.

**Files to inspect:** `src/styles/global.css`, `src/sections/Faq.astro:33-66` (the accordion CSS being centralised).

**Files likely to modify:** `src/styles/global.css` (append after `.tabular`, before the reduced-motion block).

**Implementation:** add exactly:
```css
/* Card: cream fill, lilac hairline, hard 4px corners, no shadow. */
.card {
  padding: var(--space-5);
  border: var(--hairline) solid var(--color-card-border);
  border-radius: var(--radius-card);
  background: var(--color-card);
}

@media (min-width: 768px) {
  .card {
    padding: var(--space-6);
  }
}

/* Question rows: native <details>, hairline dividers, plus/minus in a tint circle. */
.accordion {
  border-top: var(--hairline) solid var(--color-line);
}
.accordion details {
  border-bottom: var(--hairline) solid var(--color-line);
}
.accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 56px;
  padding-block: var(--space-3);
  color: var(--color-ink);
  font-size: var(--text-18);
  font-weight: var(--weight-semibold);
  cursor: pointer;
  list-style: none;
}
.accordion summary::-webkit-details-marker {
  display: none;
}
.accordion summary::after {
  content: '+';
  flex: none;
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-pill);
  background: var(--color-highlight);
  color: var(--color-ink);
  font-size: var(--text-20);
  font-weight: var(--weight-regular);
  line-height: 1;
}
.accordion details[open] summary::after {
  content: '−';
}
.accordion details p {
  padding-bottom: var(--space-4);
}

/* Small uppercase label above a heading. */
.eyebrow {
  color: var(--color-ink);
  font-size: var(--text-13);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

/* Text link with a trailing arrow. The arrow is CSS so copy stays plain. */
.arrow-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--target);
  color: var(--color-ink);
  font-size: var(--text-14);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-caps);
  text-decoration: none;
  text-transform: uppercase;
}
.arrow-link::after {
  content: '→';
}
@media (hover: hover) and (pointer: fine) {
  .arrow-link:hover {
    text-decoration: underline;
  }
}
```

**Design requirements:** Category Card, FAQ, Eyebrow, Link-with-Arrow specs.

**Preserve:** nothing existing is edited in this task.

**Dependencies:** 2.1.

**Verification:** GATE (classes are unused until Phase 5, so no visual change yet).

**Done when:** GATE passes.

---

### Task 3.1 — Button: pill shapes and the `accent` variant

**Objective:** Restyle buttons and add the single pink CTA variant.

**Files to inspect:** `src/core/ui/Button.astro` (whole file, 104 lines).

**Files likely to modify:** `src/core/ui/Button.astro`.

**Implementation:**
1. Doc comment (lines 3–8) → list four variants: `accent  pink pill: the single primary action on a screen (header only)`, `primary  ink pill: main action inside content`, `secondary  ink outline, 8px corners`, `quiet  underlined text`.
2. Line 15: `variant?: 'primary' | 'secondary' | 'quiet' | 'accent';`
3. `.btn`: `border-radius: var(--radius-pill);` `font-size: var(--text-14);` `font-weight: var(--weight-semibold);` Add `color var(--dur-colour) ease` to the `transition` list. Keep `min-height: var(--target)` and `padding: 0 var(--space-5)`.
4. `.btn--lg`: keep `min-height: 3.25rem; padding: 0 var(--space-6);` change `font-size` to `var(--text-16)`.
5. `.btn--secondary` and `.btn--quiet`: add `border-radius: var(--radius-control);`.
6. Add after `.btn--primary`:
   ```css
   .btn--accent {
     background: var(--color-accent);
     color: var(--color-on-accent);
     font-weight: var(--weight-bold);
   }
   ```
7. In the hover media block add `.btn--accent:hover { background: var(--color-ink); color: var(--color-on-ink); }`.

**Design requirements:** pill radius; 14px/600–700; padding 24–32px inline; sentence case (do **not** uppercase); ghost = 1px ink + 8px.

**Preserve:** class names `btn`, `btn--${variant}`, `btn--${size}`, `btn--block`; `:active { transform: scale(0.97) }` and the reduced-motion override (e2e checks the pressed matrix on `#plan [data-choose-time]`); `min-height: var(--target)`; default variant `primary`; all props.

**Dependencies:** 1.3.

**Verification:** GATE. `/dev/ui/` shows pill primary and 8px outline secondary.

**Done when:** GATE passes; no call site changed.

---

### Task 3.2 — Scope the approved contrast exception in the axe scan

**Objective:** Let the e2e accessibility scan pass with white-on-pink on exactly two elements, and nothing else.

**Files to inspect:** `tests/e2e/quality.e2e.mjs:38-45` (`seriousIssues`).

**Files likely to modify:** `tests/e2e/quality.e2e.mjs`.

**Implementation:** replace the body of `seriousIssues` after the `analyze()` line with:
```js
  // Owner-approved exception: white text on the pink primary action (DESIGN.md), on these two elements only.
  const APPROVED = /btn--accent|bar__book/;
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => (v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((n) => !APPROVED.test(n.html)) } : v))
    .filter((v) => v.nodes.length > 0)
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
```

**Design requirements:** owner decision 1.

**Preserve:** `AXE_TAGS`, the scroll-to-top line, every other test in the file. Do not disable the `color-contrast` rule globally.

**Dependencies:** 3.1.

**Verification:** `node --check tests/e2e/quality.e2e.mjs`. (Full e2e runs at 4.3.)

**Done when:** file parses; only `color-contrast` nodes matching the regex are dropped.

---

### Task 3.3 — Badge, placeholder, photo, status boxes

**Objective:** Apply radii and supporting tints to the remaining core UI.

**Files to inspect:** `src/core/ui/Badge.astro`, `Placeholder.astro:17-23`, `Photo.astro:47-51`, `ErrorSummary.astro:15-19`, `Field.astro:55-85`.

**Files likely to modify:** `Badge.astro`, `Placeholder.astro`, `Photo.astro`, `ErrorSummary.astro`.

**Implementation:**
- `Badge.astro:16` → `border-radius: var(--radius-pill);` and line 15 padding → `0.125rem var(--space-3)`; line 18 weight → `var(--weight-semibold)`. Line 25: `.badge--highlight { background: var(--color-lime); color: var(--color-ink); }`.
- `Placeholder.astro:20` → `var(--radius-card)`; `:21` → `background: var(--color-ice);`.
- `Photo.astro:49` → `var(--radius-card)`.
- `ErrorSummary.astro:18` → `var(--radius-card)`.
- `Field.astro`: **no edit** (8px comes from the token; label stays weight 500).

**Design requirements:** tags are pills; frames/cards 4px; inputs 8px; lime/ice only on supporting UI.

**Preserve:** Badge text (never uppercase; e2e reads it); `--wall` outlines on `ErrorSummary` and `Placeholder`; all Field markup and `aria-*`.

**Dependencies:** 1.3.

**Verification:** GATE; `/dev/ui/` shows pill badges.

**Done when:** GATE passes.

---

### Task 4.1 — Header

**Objective:** DESIGN.md top nav: active pill, 14px links, pink CTA.

**Files to inspect:** `src/layouts/Header.astro`.

**Files likely to modify:** `src/layouts/Header.astro`.

**Implementation:**
1. Line 28: `<Button href="/book/" variant="accent" class="header__book">Book a clean</Button>`.
2. `.header__nav a` (66–73): add `font-size: var(--text-14);` `border-radius: var(--radius-pill);` `color: var(--color-ink);`.
3. Replace the `[aria-current='page']` rule (74–78) with:
   ```css
   .header__nav a[aria-current='page'] {
     background: var(--color-room);
   }
   ```
4. `.header__phone`: add `color: var(--color-ink);`. `.mobile-menu a`: add `color: var(--color-ink);`.

**Design requirements:** white bar, 1px `#cccccc` bottom, sticky, links 14–15/500, active tint pill with black text, pink pill CTA right.

**Preserve:** `min-height: 64px`; `position: sticky; top: 0; z-index: 40`; breakpoints 768/1024 and the `.header__actions .header__book` specificity rules; `data-menu-toggle`, `data-menu`, `aria-*`; 44px tap targets (`min-height: var(--target)`); hover underline.

**Dependencies:** 3.1.

**Verification:** GATE. At 1280 on `/prices/` the "Prices" link has a pink-tint pill; at 375 the Book button is hidden and the menu toggles.

**Done when:** GATE passes.

---

### Task 4.2 — DemoRibbon as the announcement bar

**Objective:** Pastel announcement bar.

**Files to inspect:** `src/layouts/DemoRibbon.astro:22-46`.

**Files likely to modify:** `src/layouts/DemoRibbon.astro`.

**Implementation:**
- `.ribbon`: `background: var(--color-highlight); color: var(--color-ink); font-size: var(--text-13); font-weight: var(--weight-medium);`
- `.ribbon__inner`: add `align-items: center; min-height: 2.25rem;`
- **Delete** lines 42–45 (the comment and `.ribbon a:focus-visible` override) — a white ring on pink would fail the e2e focus-ring check; the default ink ring is correct now.

**Design requirements:** `#ffc5ee` bg, 36–40px, 13px/500 black.

**Preserve:** `data-demo-ribbon`, `data-theme-link`, the `names` map, `business.demoMode` guard, link text.

**Dependencies:** 1.2.

**Verification:** GATE.

**Done when:** GATE passes.

---

### Task 4.3 — MobileBookingBar, Footer, favicon

**Objective:** Finish the chrome; first full e2e run on the new skin.

**Files to inspect:** `src/layouts/MobileBookingBar.astro:28-91`, `src/layouts/Footer.astro:55-100`, `public/favicon.svg`, `src/layouts/Logo.astro`.

**Files likely to modify:** `MobileBookingBar.astro`, `Footer.astro`, `public/favicon.svg`.

**Implementation:**
- `MobileBookingBar.astro:38` → `border-top: var(--hairline) solid var(--color-line);`
- `.bar__book` (67–71) → `padding-inline: var(--space-5); border-radius: var(--radius-pill); background: var(--color-accent); color: var(--color-on-accent); font-size: var(--text-14); font-weight: var(--weight-bold);`
- `.bar__call`: add `color: var(--color-ink);` (keeps the 8px radius from the shared rule).
- `.bar__price`: add a rule `.bar__price { color: var(--color-ink); }`.
- `Footer.astro:59` → `border-top: var(--hairline) solid var(--color-line);`
- `public/favicon.svg`: replace `#f4f7f8` → `#ffffff`, `#17323f` → `#000000`, `#f2c14e` → `#ffc5ee` (static asset; the boundary check does not scan `public/`).
- `Logo.astro`: inspect only. If the wordmark's `font-weight` is below `var(--weight-bold)`, set it to `var(--weight-bold)`; otherwise no edit.

**Design requirements:** one pink action per screen (below 768px the header Book button is hidden and this bar's button is the pink one; at ≥768px the bar is hidden); hairlines; wordmark 700.

**Preserve:** `data-booking-bar`, `data-price-summary`, `data-price-per-visit`, `data-choose-time`; `min-height: var(--target)`; press scale and reduced-motion rule; `display: none !important` at ≥768; safe-area padding; footer grid breakpoints and legal text.

**Dependencies:** 3.1, 3.2, 4.1, 4.2.

**Verification:** GATE, then **E2E GATE**. Expected: all pass. If a `color-contrast` failure lists any selector other than `.btn--accent`/`.bar__book`, fix that element's colours (do not widen the exemption).

**Done when:** GATE and E2E GATE pass.

---

### Task 5.1 — Hero dark panel and plan frame

**Objective:** DESIGN.md dark hero panel on the copy column; framed plan.

**Files to inspect:** `src/sections/Hero.astro` (73 lines), `src/features/areas/SuburbCheck.astro:19-66`.

**Files likely to modify:** `src/sections/Hero.astro`, `src/features/areas/SuburbCheck.astro`.

**Implementation:**
1. `Hero.astro:16` → `<h1 id="hero-title" class="display">Your home, priced room by room.</h1>` (text unchanged).
2. `.hero__copy` rule: keep existing declarations and add:
   ```css
   padding: var(--space-5);
   border-radius: var(--radius-card);
   background: var(--color-panel);
   color: var(--color-on-ink);
   --color-focus: var(--color-on-ink); /* ink ring would vanish on the dark panel */
   ```
   Add `.hero__copy h1 { color: inherit; }`.
3. `.hero__lead`: `color: var(--color-on-panel-muted);` (keep 18px).
4. `.hero__plan`: add `padding: var(--space-4); border: var(--hairline) solid var(--color-card-border); border-radius: var(--radius-card); background: var(--color-paper);`
5. In the `@media (min-width: 1024px)` block add `.hero__copy { padding: var(--space-6); }` and change `column-gap: var(--space-8)` → `var(--space-6)`.
6. `SuburbCheck.astro`: in `input` add `color: var(--color-ink);` (otherwise typed text inherits white on a white field). In `button` change `border: var(--hairline) solid var(--color-ink);` → `border: var(--hairline) solid currentColor;`.

**Design requirements:** `#161616` panel, white 96px/900 headline (clamped: 44px at 320 → 96px at ≥1477), 18px lead in `#cccccc`, ~45% left column (existing `5fr / 6fr`), hard-corner frame for the product visual. Tilt and scenic photo intentionally not applied (interactive SVG; no photo assets).

**Preserve:** DOM order and `grid-template-areas`; ids `plan`, `hero-title`, `home-plan`, `suburb-input`; `data-suburb-check`, `data-suburb-result`; `.hero__controls` stays on white; `SuburbCheck` field border token (e2e checks ≥3:1 against the panel: 5.38 / 4.25); 44px targets inside `.hero`.

**Dependencies:** 2.1, 1.2.

**Verification:** GATE. SHOT `/` at 320, 375, 1024, 1280 → no horizontal scrollbar, headline wraps inside the panel, typing in the suburb field shows black text, keyboard focus on the Check button shows a white ring.

**Done when:** GATE passes and the four screenshots show no overflow.

---

### Task 5.2 — PriceTag and BookingTag

**Objective:** Card radius on the price tag; pill on the pinned tag.

**Files to inspect:** `src/features/pricing/PriceTag.astro:36-72`, `src/features/pricing/BookingTag.astro:11-47`.

**Files likely to modify:** both.

**Implementation:**
- `PriceTag.astro:43` → `var(--radius-card)`; `.tag__amount` weight → `var(--weight-black)`.
- `BookingTag.astro:22` → `var(--radius-pill)`; `.pin` add `color: var(--color-ink);`; `.pin__book` (`:36`) → `border-radius: var(--radius-pill); font-size: var(--text-14); font-weight: var(--weight-semibold);`.

**Design requirements:** pink tint used as a UI highlight with ink text; the buttons on these tags stay **ink** pills (a second pink pill would break the single-CTA rule).

**Preserve:** all `data-price-*`, `data-booking-tag`, `data-choose-time`; `top: 76px`; `<768` hide rule; `block` Button in PriceTag.

**Dependencies:** 1.2, 3.1.

**Verification:** GATE.

**Done when:** GATE passes.

---

### Task 5.3 — TrustRow as four cards

**Objective:** Category-card grid for the trust items.

**Files to inspect:** `src/sections/TrustRow.astro`.

**Files likely to modify:** `src/sections/TrustRow.astro`.

**Implementation:**
1. Line 22: `<li class="trust__item card">`.
2. `.trust` rule: delete both declarations (`border-block`, `background`); the empty rule may be removed.
3. `.trust__list`: `padding-block: var(--space-6); gap: var(--space-4);`
4. `.trust__item`: `grid-template-columns: minmax(0, 1fr);` (icon stacks above text), `align-content: start`.
5. `.trust__title`: add `color: var(--color-ink); font-size: var(--text-18);`. `.trust__text`: `font-size: var(--text-14);` and remove its `color` line (inherits `#333`).

**Design requirements:** cream card, lilac hairline, 4px, 24px icon top-left, title 18–20/700, description 14–15 `#333`; grid 1 → 2 (768) → 4 (1200).

**Preserve:** the `items` array and all copy; `aria-label`; both breakpoints.

**Dependencies:** 2.2.

**Verification:** GATE; SHOT `/` at 375/768/1280.

**Done when:** GATE passes.

---

### Task 5.4 — ServicesList as a card grid

**Objective:** Four service cards, 4 → 2 → 1.

**Files to inspect:** `src/sections/ServicesList.astro`.

**Files likely to modify:** `src/sections/ServicesList.astro`.

**Implementation:**
1. Line 2 comment → `/** The four home services as cards: photo, one line, from price. */`
2. Line 21: `<li class="service card">`. Line 22 `sizes` → `"(min-width: 1200px) 280px, (min-width: 768px) 45vw, 100vw"`.
3. Replace the whole `<style>` block with:
   ```css
   .services {
     display: grid;
     gap: var(--space-4);
     padding: 0;
     list-style: none;
   }
   .service {
     position: relative;
     display: grid;
     grid-template-rows: auto 1fr auto;
     gap: var(--space-4);
     transition: border-color var(--dur-colour) ease;
   }
   .service__body {
     display: grid;
     gap: var(--space-2);
     align-content: start;
   }
   .service h3 {
     font-size: var(--text-20);
   }
   .service h3 a {
     text-decoration: none;
   }
   .service h3 a::after {
     content: '';
     position: absolute;
     inset: 0;
   }
   .service__body p {
     font-size: var(--text-14);
   }
   .service__price {
     display: flex;
     align-items: baseline;
     gap: var(--space-2);
     font-size: var(--text-14);
   }
   .service__price strong {
     color: var(--color-ink);
     font-size: var(--text-22);
   }
   .service__price::after {
     content: '→';
     margin-left: auto;
     color: var(--color-ink);
     font-size: var(--text-18);
   }
   @media (min-width: 768px) {
     .services {
       grid-template-columns: repeat(2, minmax(0, 1fr));
     }
   }
   @media (min-width: 1200px) {
     .services {
       grid-template-columns: repeat(4, minmax(0, 1fr));
     }
   }
   @media (hover: hover) and (pointer: fine) {
     .service:hover {
       border-color: var(--color-ink);
     }
     .service:hover h3 a {
       text-decoration: underline;
     }
   }
   ```

**Design requirements:** Category Card spec; arrow affordance; no shadow on hover (border darkens instead).

**Preserve:** `id="services"`, `id="services-title"`; exactly one `<a href="/services/…/">` per card (e2e counts 4); the literal text `from $N` in normal case (e2e counts 4 — the arrow is a pseudo-element so it is not in `innerText`); `Photo` usage; sort order.

**Dependencies:** 2.2.

**Verification:** GATE; SHOT `/` at 375/768/1280: 1, 2, 4 columns.

**Done when:** GATE passes.

---

### Task 5.5 — Reviews as cards

**Objective:** Replace the ink left bar with cards.

**Files to inspect:** `src/sections/Reviews.astro:31-98`.

**Files likely to modify:** `src/sections/Reviews.astro`.

**Implementation:** line 34 → `<figure class="card">`. In the scoped `figure` rule delete `padding-left` and `border-left` (keep `display: grid; gap`). `.reviews__list` gap → `var(--space-4)`. `.reviews__score strong`: add `color: var(--color-ink);`. In the 900px block `gap: var(--space-8)` → `var(--space-6)`.

**Design requirements:** cream card, no ink bars.

**Preserve:** `data-review`, `data-choose-time`, star `aria-label`s, `--color-star`, the primary (ink) Button, `4fr 7fr` split.

**Dependencies:** 2.2.

**Verification:** GATE.

**Done when:** GATE passes.

---

### Task 5.6 — OfficesBand and CtaBand

**Objective:** Hairlines and cream instead of heavy rules and tint.

**Files to inspect:** `src/sections/OfficesBand.astro:18-41`, `src/sections/CtaBand.astro:27-51`.

**Files likely to modify:** both.

**Implementation:**
- `OfficesBand.astro:21` → `border-block: var(--hairline) solid var(--color-line);`
- `CtaBand.astro` `.cta` → `padding-block: var(--space-7); background: var(--color-card); border-block: var(--hairline) solid var(--color-card-border);`

**Design requirements:** hairline dividers; cream supporting surface.

**Preserve:** ids, `data-choose-time`, button variants (primary ink + secondary ghost), copy.

**Dependencies:** 1.2.

**Verification:** GATE.

**Done when:** GATE passes.

---

### Task 5.7 — Accordions (Faq, Questions) and their containers

**Objective:** Use the global `.accordion`; centre question columns at 800px; arrow links.

**Files to inspect:** `src/sections/Faq.astro`, `src/sections/Questions.astro`, `src/pages/faq.astro:68-76`, `src/pages/services/[slug].astro:84-90,132-137`.

**Files likely to modify:** those four files.

**Implementation:**
1. `Faq.astro:21` → `<div class="faq__list accordion">`; line 29 → `{more && <p class="faq__more"><a class="arrow-link" href="/faq/">All questions</a></p>}`. In `<style>` delete every rule except `.faq__more`, and add `.faq { max-width: 50rem; }` (the element also has `.wrap`, whose `margin-inline: auto` centres it).
2. `Questions.astro:16` → `<div class="questions__list accordion">`. In `<style>` keep only the `.questions` rule; delete the rest.
3. `pages/faq.astro` `.group` → `max-width: 50rem; margin-inline: auto; scroll-margin-top: var(--space-8);` (add `width: 100%`).
4. `pages/services/[slug].astro:87` → `<p class="more"><a class="arrow-link" href="/faq/">All questions</a></p>`; `.narrow` → `max-width: 50rem; margin-inline: auto;`.

**Design requirements:** FAQ spec (hairline rows, 18/600 question, plus/minus in `#ffc5ee` circle, 16/400 `#333` answer, ~800px centred); arrow link.

**Preserve:** native `<details>/<summary>` (works without JS); counts (3 per service page, 13 on `/faq/`, 5 on home); `id="faq"`, `aria-labelledby`; group heading text and case; `min-height: 56px` on summary; `PlanControls.astro`'s own `details.extras` is **not** touched.

**Dependencies:** 2.2.

**Verification:** GATE; open `/faq/` and toggle a row with keyboard (Enter/Space) — circle shows `+` then `−`.

**Done when:** GATE passes; no scoped `summary`/`details` rule remains in the two section files.

---

### Task 5.8 — Remaining sections: hairlines and eyebrow

**Objective:** Remove heavy ink rules from the other sections; add the optional eyebrow to `PageHeader`.

**Files to inspect / modify:** `src/sections/HowItWorks.astro:40`, `ServiceChecklist.astro:73`, `ServiceClose.astro:43`, `PolicyPage.astro:53`, `PageHeader.astro`.

**Implementation:**
- At each of the four listed lines: `border-top: var(--wall) solid var(--color-ink);` → `border-top: var(--hairline) solid var(--color-line);`
- `HowItWorks.astro` counter rule (the one using `--text-48`): add `color: var(--color-ink); font-weight: var(--weight-black);`.
- `PageHeader.astro`: add `eyebrow?: string;` to `Props`, destructure it, and render `{eyebrow && <p class="eyebrow">{eyebrow}</p>}` immediately before `<h1>`. Update the doc comment to mention it.
- `Vetting.astro`, `RoomChecklist.astro`, `Coverage.astro`, `NumberedSteps.astro`, `Prose.astro`, `SectionHead.astro`: inspect only — they re-skin through tokens; no edit.

**Design requirements:** hairline dividers; eyebrow component.

**Preserve:** `ServiceChecklist.astro` print rules; `#how ol > li` (4) and `#process ol > li` (3) counts; `[data-room-list]`; `PolicyPage.astro:65` sticky offset; one `h1` per page.

**Dependencies:** 2.2.

**Verification:** GATE.

**Done when:** GATE passes.

---

### Task 6.1 — Booking flow

**Objective:** Radii, hairlines and hover wash in the booking feature.

**Files to inspect / modify:** `src/features/booking/booking.css:177`, `BookingForm.astro:85,147`, `steps/Check.astro:57,103,117-118`, `steps/Home.astro:149`.

**Implementation:**

| Location | Change |
|---|---|
| `booking.css:177` (segment hover) | `background: var(--color-room)` → `var(--color-shade)` |
| `BookingForm.astro:85` | wall/ink top border → `var(--hairline) solid var(--color-line)` |
| `BookingForm.astro:147` | radius → `var(--radius-card)` |
| `steps/Check.astro:57` | radius → `var(--radius-pill)` |
| `steps/Check.astro:103` | wall/ink top border → `var(--hairline) solid var(--color-line)` |
| `steps/Check.astro:117-118` | radius → `var(--radius-card)`; `background` → `var(--color-card)`; add `border: var(--hairline) solid var(--color-card-border);` |
| `steps/Home.astro:149` | radius → `var(--radius-card)` |

No edits to `Step.astro`, `When.astro`, `You.astro`, `Access.astro` (the 2px ink top border on the *current* step at `Step.astro:60` and the bar at `When.astro:48` are state indicators and stay).

**Design requirements:** inputs/segments 8px (from token); cards 4px; tags pill; hairlines.

**Preserve:** every `data-*`, `name`, `id`, `aria-*`; `booking.css:92` and `BookingForm.astro:97` status outlines; segment/stepper `:active scale(0.97)` + reduced-motion rule (e2e checks it); native checkboxes visible; `scroll-margin` values; no `.ts` file is touched.

**Dependencies:** 1.3.

**Verification:** GATE, then **E2E GATE** (`booking.e2e`, `journey.e2e`, `quality.e2e` exercise this).

**Done when:** both gates pass.

---

### Task 6.2 — Referral code and remaining features

**Objective:** Card radius on the referral panel; confirm the rest need nothing.

**Files to inspect / modify:** `src/features/referral/ReferralCode.astro:34-36`.

**Implementation:** line 35 → `var(--radius-card)`. Keep the dashed `--wall` border and highlight fill.
Inspect only (token re-skin, no edit): `features/plan/FloorPlan.astro` (rooms: white → blush when included → pink when priced; walls stay 2px ink), `features/plan/PlanControls.astro`, `features/areas/CoverageMap.astro`, `features/forms/forms.css`, `features/forms/*.astro`, `features/walkthrough/WalkthroughForm.astro`.

**Design requirements:** 4px panels.

**Preserve:** `.room--included .room__fill` `transition: fill …` (e2e); `[data-map-point]` (12); `--wall` on `FloorPlan.astro:106` and `forms.css:35`.

**Dependencies:** 1.3.

**Verification:** GATE; on `/` click a dashed room — it fills pink and the price updates.

**Done when:** GATE passes.

---

### Task 7.1 — Page-local "ruled list" borders

**Objective:** Replace every remaining heavy ink rule in page files with a hairline.

**Files to inspect / modify:** exactly these lines:

| File | Lines | Change |
|---|---|---|
| `src/pages/404.astro` | 51 | A |
| `src/pages/about.astro` | 126, 142 | A |
| `src/pages/about.astro` | 114 | `border-left: var(--wall) solid var(--color-highlight);` |
| `src/pages/areas/index.astro` | 80 | A |
| `src/pages/areas/[slug].astro` | 87 | A |
| `src/pages/offices.astro` | 134, 139, 152 | A |
| `src/pages/prices.astro` | 119, 166 | A |
| `src/pages/refer.astro` | 75 | A |
| `src/pages/services/index.astro` | 62 | A |
| `src/pages/services/index.astro` | 140 | delete the `text-decoration-thickness: var(--wall);` line |

**A** = replace `var(--wall) solid var(--color-ink)` with `var(--hairline) solid var(--color-line)` (keep the property name: `border-top`).

**Implementation:** mechanical edits per the table. Then `Grep` `var\(--wall\)` under `src/` and confirm the only remaining hits are: `FloorPlan.astro:106`, `booking.css:92`, `forms.css:35`, `global.css` (2), `ErrorSummary.astro:17`, `Placeholder.astro:19`, `BookingForm.astro:97`, `When.astro:48`, `Step.astro:60`, `ReferralCode.astro:34`, `about.astro:114`.

**Design requirements:** hairline `#cccccc` dividers only.

**Preserve:** table markup/headers on `/prices/` and `/areas/`; `[data-suburb-row]` (12); `[data-from-price]` (4); `#pricing` heading text.

**Dependencies:** 1.3.

**Verification:** GATE + the grep above.

**Done when:** grep matches the allowed list exactly.

---

### Task 7.2 — Page-local panels, radii and eyebrows

**Objective:** Finish page-specific surfaces.

**Files to inspect / modify:** `src/pages/offices.astro:156,159`, `src/pages/book.astro:105`, `src/pages/services/[slug].astro:52`, `src/pages/areas/[slug].astro:31`.

**Implementation:**
- `offices.astro:156` `.request { background: var(--color-room) …}` → `background: var(--color-card)` (rest of the rule unchanged).
- `offices.astro:159` `.request__panel`: `border: var(--hairline) solid var(--color-card-border); border-radius: var(--radius-card);` (keep padding and surface background).
- `book.astro:105`: `border-radius: var(--radius-card) var(--radius-card) var(--radius-card) 0;`
- `services/[slug].astro:52`: add prop `eyebrow="Services"` to `<PageHeader …>`.
- `areas/[slug].astro:31`: add prop `eyebrow="Areas"`.

**Design requirements:** cream supporting surface; 4px frames; eyebrow above page titles of child pages.

**Preserve:** `#walkthrough` anchor and scroll margin; service page facts, buttons (`primary` + `quiet`), `ServiceChecklist` `printable`; one h1 per page.

**Dependencies:** 5.8.

**Verification:** GATE; SHOT `/services/regular/` and `/areas/<first slug>/` at 1280 — eyebrow shows in caps above the h1.

**Done when:** GATE passes.

---

### Task 8.1 — Console: token-only pass

**Objective:** Map console radii to the new shape tokens; nothing else.

**Files to inspect / modify:** `src/styles/console.css`.

**Implementation:**

| Lines | Change |
|---|---|
| 71, 209, 259, 339, 376, 487, 585 (panels/cards) | `var(--radius-control)` → `var(--radius-card)` |
| 569 (timeline channel chip) | → `var(--radius-pill)` |
| 36 (fields), 221 (tab) | leave as `--radius-control` |

Before editing each line, read the selector; if a listed line is an input, button or tab rather than a panel, leave it. No layout, spacing or colour declarations change.

**Design requirements:** owner decision 3 (tokens only).

**Preserve:** all `data-*` hooks, sign-in flow, `box-shadow: inset … var(--color-ink)` selected-row marker at line 288 (a state indicator, not a card shadow), status badge text.

**Dependencies:** 1.3.

**Verification:** GATE, then E2E GATE (`console.e2e`, console axe scans in both themes).

**Done when:** both gates pass.

---

### Task 8.2 — `/dev/ui/` gallery

**Objective:** Show the new variant in the component gallery.

**Files to inspect / modify:** `src/pages/dev/ui.astro` (~line 30).

**Implementation:** insert `<Button variant="accent">Book a clean</Button>` as the first button in the existing button row. If the file has a colour-swatch list, add `accent`, `card`, `card-border`, `panel` using the same markup as existing swatches; if it has none, add nothing.

**Design requirements:** none (developer page).

**Preserve:** the `themes` array and page shell.

**Dependencies:** 3.1.

**Verification:** GATE; open `/dev/ui/`.

**Done when:** GATE passes.

---

### Task 9.1 — Documentation

**Objective:** Make the docs describe what shipped.

**Files to inspect / modify:** `docs/design-system.md`, `docs/spec.md` (§7.1–7.5 and line ~352), `docs/customising.md` (lines ~98–159 theme/font steps, ~145, ~551–566).

**Implementation:** update, in place, only statements that are now false:
- Font: Schibsted Grotesk → Inter Variable (`@fontsource-variable/inter`).
- Palette table: the token values from Task 1.2, plus the new tokens `card`, `card-border`, `accent`, `on-accent`, `panel`, `on-panel-muted`, `ice`, `lime`, and removal of `shadow`.
- Type scale, weights, radii (`control 8px`, `card 4px`, `pill`), `--page-max 80rem`, `--space-section`.
- Button variants: add `accent` and the rule "one pink action per screen: header at ≥768px, booking bar below".
- Shared classes `.card`, `.accordion`, `.eyebrow`, `.arrow-link`.
- A short section **"Known accessibility exception"**: white on `#ff83da` is 2.21:1; limited to `.btn--accent` and `.bar__book`; chosen by the owner to match DESIGN.md; exempted in `tests/e2e/quality.e2e.mjs` only for those selectors; the eucalyptus theme's accent passes AA (4.99:1).
- `customising.md` "add a theme" steps: a new theme block must define all 18 colour tokens.

**Design requirements:** none.

**Preserve:** document structure and unrelated sections; `docs/superpowers/plans/*` untouched.

**Dependencies:** all previous.

**Verification:** `Grep` `Schibsted|radius-control: 6px|--text-36|--text-hero|color-shadow` under `docs/` (excluding `docs/superpowers/`) returns nothing.

**Done when:** grep is clean.

---

### Task 10.1 — Full QA

**Objective:** Prove nothing regressed and the design is applied on every route in both themes.

**Files to inspect:** none. **Files likely to modify:** none (fix forward in the owning task's files if something fails).

**Implementation:** run §10 in full.

**Design requirements / Preserve / Dependencies:** all above.

**Verification:** §10.

**Done when:** every box in §12 is ticked.

---

## 7. Route-by-Route Changes

| Route | File(s) | What changes | Task |
|---|---|---|---|
| all | `BaseLayout` chrome | Pastel announcement bar; white sticky header with tint active pill and pink Book pill; hairline footer; pink pill in phone booking bar; Inter; white canvas; `#333` body | 1.x, 2.1, 4.x |
| `/` | `Hero`, `SuburbCheck`, `PriceTag`, `BookingTag`, `TrustRow`, `ServicesList`, `Reviews`, `HowItWorks`, `OfficesBand`, `Faq` | Dark hero panel with display headline; framed plan; pink-tint price tag with ink pill; 4 trust cards; 4 service cards; review cards; hairline steps; hairline offices band; accordion ≤800px centred + arrow link | 5.1–5.8 |
| `/book/` | `book.astro`, `booking.css`, `BookingForm`, `steps/*` | 8px controls, 4px panels, pill tags, hairline dividers, shade hover | 6.1, 7.2 |
| `/offices/` | `offices.astro`, `WalkthroughForm` | Hairline lists; cream request band with 4px white panel; 48px step numerals | 1.3, 7.1, 7.2 |
| `/services/` | `services/index.astro` | Hairline row list (stays a list; not turned into cards) | 7.1 |
| `/services/[slug]/` | `services/[slug].astro`, `PageHeader`, `ServiceChecklist`, `Questions`, `ServiceClose` | "Services" eyebrow; hairlines; accordion centred; arrow link | 5.7, 5.8, 7.2 |
| `/prices/` | `prices.astro` | Hairline table tops | 7.1 |
| `/areas/` | `areas/index.astro`, `CoverageMap` | Hairline list top; map re-tinted by tokens | 7.1 |
| `/areas/[slug]/` | `areas/[slug].astro`, `Reviews` | "Areas" eyebrow; hairline; review cards | 5.5, 7.1, 7.2 |
| `/about/` | `about.astro` | Hairline lists; pink-tint quote bar | 7.1 |
| `/faq/` | `faq.astro`, `Questions`, `CtaBand` | Accordion groups centred at 800px; cream CTA band | 5.6, 5.7 |
| `/careers/` | `careers.astro`, `ApplicationForm` | Tokens only | — |
| `/refer/` | `refer.astro`, `ReferralCode` | Hairline; 4px code panel | 6.2, 7.1 |
| `/terms/`, `/privacy/`, `/accessibility/` | `PolicyPage` | Hairline | 5.8 |
| `/404` | `404.astro` | Hairline | 7.1 |
| `/console/` | `console.css` | Radii remap; colours via tokens | 1.3, 8.1 |
| `/dev/ui/` | `dev/ui.astro` | Accent button shown | 8.2 |

## 8. Responsive Plan

Breakpoints are the existing ones; none are added or moved (768 and 1024 are asserted by e2e; 900 and 1200 are already used by sections).

| Concern | Mobile (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Navigation | Logo + phone icon + menu toggle; menu list below header; pink action lives in the bottom booking bar | Phone number text and pink Book pill appear; still the toggle menu | Inline nav links with active tint pill; toggle hidden |
| Hero | Stack: dark panel → framed plan + price → controls; panel padding 24px | Same stack | Two columns `5fr / 6fr`; panel padding 32px; controls under the panel |
| Display headline | `clamp` floor 44px; `overflow-wrap: break-word`; `text-wrap: balance` | 6.5vw (50–66px) | 66px at 1024 → 96px at ≥1477 |
| h1 (inner pages) | 32px | 5vw (38–48px) | 48px |
| Card grids (trust, services) | 1 column | 2 columns | 2 columns until 1200, then 4 |
| Reviews | Head then stacked cards | same | `4fr / 7fr` from 900 |
| Accordions | Full width | Max 800px centred | Max 800px centred |
| Section rhythm | `.band` 32px top/bottom | 32px | 40px (80px between adjacent bands) |
| Cards | 24px padding | 32px | 32px |
| Overflow | No element wider than the viewport at 320/375 (e2e asserts 0 overflow on `/` at 320, 375, 1280 and elsewhere at 375, 1280). Buttons keep `white-space: nowrap`; hero panel text wraps | — | Content capped at 1280px |
| Touch targets | ≥44px (`--target`) on every link/button in header, hero, booking bar, booking form, arrow links, accordion rows (56px) | same | same |
| Fixed UI | Bottom booking bar (hairline top, safe-area padding) | Pinned price pill under header (`top: 76px`) | same |

## 9. Accessibility Plan

- **Contrast (verified numerically):** body `#333` on white 12.6, on cream 12.3, on blush 10.3, on cotton-pink 8.7; ink on any tint ≥14; white on panel 18.1; `#ccc` on panel 11.3; field borders ≥3.28 on every backdrop they sit on (white, cream, dark panel). Eucalyptus: all text pairs ≥7.4, field borders ≥3.36. Guarded by `tests/unit/contrast.test.ts` (Task 1.4).
- **`#8c8c8c` (fog-gray) is never used for text** (3.36:1) — only for field outlines. **`#cccccc` is never used for text on light backgrounds.**
- **Known exception:** white on `#ff83da` = 2.21:1 on `.btn--accent` (header) and `.bar__book` (phone bar). Owner-approved; exempted narrowly in the axe scan (Task 3.2); documented (Task 9.1). Mitigations kept: 14px bold label, hover/focus states switch to black with white text, and the same action is always also available as an ink button or plain link in content.
- **Focus:** global 3px ring in `--color-focus` with 2px offset is unchanged; inside the dark hero panel `--color-focus` is re-scoped to white; the announcement bar reverts to the ink ring (white-on-pink override removed).
- **Semantics unchanged:** one h1 per page, heading order, landmarks, `aria-current`, `aria-live` on suburb result, native `<details>`, native checkboxes, form labels and error summary. No element changes tag.
- **Decorative glyphs** (`+`, `−`, `→`) are CSS pseudo-content, never the only signal: accordions expose open state natively; arrow links have text.
- **Uppercase** is CSS-only on `.eyebrow` / `.arrow-link` (source text stays sentence case for screen readers and tests).
- **Motion:** DESIGN.md is silent; existing press/fill transitions and the `prefers-reduced-motion` rules are kept as they are.
- **Zoom/reflow:** rem-based sizes; no fixed heights added; 320px reflow covered by the overflow test.

## 10. Visual QA & Regression Plan

1. **Static checks:** `npm test` (boundaries + unit incl. contrast), `npm run check`, `npm run build`, `npm run budget` (must be unchanged — no JS was added).
2. **E2E:** E2E GATE; all suites pass (`home`, `pages`, `booking`, `journey`, `offices`, `console`, `quality`). The quality suite runs axe on `/`, `/offices/`, `/book/` (steps 1, 4, 4-with-errors) and `/console/` in both themes at 375 and 1280.
3. **Screenshots (after):** repeat Task 0.1's SHOT list into `shots/after/`, plus `/` at 320, 768, 1024, and `/?theme=eucalyptus` at 375 and 1280. Compare side by side with `shots/before/`.
4. **Per-screenshot checklist:** white canvas; no teal/grey-blue anywhere; no 2px black rules except floor-plan walls, the current booking step and status boxes; no shadows; exactly one pink pill visible; all cards cream with lilac hairline and 4px corners; inputs 8px; buttons pills (ghost = 8px); headings heavy black; body `#333` 16px; nothing clipped or overflowing.
5. **Manual interaction (in `npm run preview`):** toggle rooms on the home plan (fills + price update); suburb check (black text in field, result readable on dark panel); open/close FAQ rows by keyboard; mobile menu toggle; complete `/book/` to the done state; submit `/offices/` walk-through form with errors then valid; sign in to `/console/` (`owner@demo.clearday` / `demo1234`) and open a lead; switch theme via the ribbon and back; tab through header and hero checking a visible focus ring on every stop; print preview of `/services/end-of-lease/` checklist.
6. **Regression watch-list (most likely breakages):** hero headline overflow at 320–375; white-on-white text in the suburb input; a focus ring invisible on the dark panel or pink bar; `from $N` count ≠ 4 in `#services`; `.btn:active` transform missing; header height ≠ 64px (shifts pinned tag and sticky offsets); axe `color-contrast` hit on anything other than the two approved elements.

## 11. Master Execution Order

1. Task 0.1 — Baseline
2. Task 1.1 — Swap the font to Inter
3. Task 1.2 — Replace colour tokens
4. Task 1.3 — Type, space and shape tokens
5. Task 1.4 — Contrast test pairs
6. Task 2.1 — Base typography, body colour, section rhythm
7. Task 2.2 — Shared classes
8. Task 3.1 — Button + `accent`
9. Task 3.2 — Axe exemption
10. Task 3.3 — Badge, placeholder, photo, status boxes
11. Task 4.1 — Header
12. Task 4.2 — DemoRibbon
13. Task 4.3 — MobileBookingBar, Footer, favicon (**first E2E GATE on new skin**)
14. Task 5.1 — Hero
15. Task 5.2 — PriceTag, BookingTag
16. Task 5.3 — TrustRow
17. Task 5.4 — ServicesList
18. Task 5.5 — Reviews
19. Task 5.6 — OfficesBand, CtaBand
20. Task 5.7 — Accordions
21. Task 5.8 — Remaining sections + PageHeader eyebrow
22. Task 6.1 — Booking flow (**E2E GATE**)
23. Task 6.2 — Referral and remaining features
24. Task 7.1 — Page-local ruled lists
25. Task 7.2 — Page-local panels, radii, eyebrows
26. Task 8.1 — Console (**E2E GATE**)
27. Task 8.2 — `/dev/ui/`
28. Task 9.1 — Docs
29. Task 10.1 — Full QA

## Must NOT be touched

- Anything under `src/domain/`, `src/core/` except the five `src/core/ui/*.astro` files named above, `src/config/` (all copy, prices, navigation, theme list), `src/content/`, `src/content.config.ts`, every `.ts` file in `src/features/` and `src/pages/console/`.
- `astro.config.mjs`, `tsconfig.json`, `tools/*`, `tests/unit/*` except the six added lines in `contrast.test.ts`, `tests/e2e/*` except `seriousIssues` in `quality.e2e.mjs`.
- Theme names, `ThemeBoot.astro`, `Seo.astro`, `BaseLayout.astro` structure, JSON-LD.
- Ids, `data-*` attributes, form `name`s, visible copy, heading levels, list item counts, breakpoints 768/1024, header height 64px, print styles in `ServiceChecklist.astro`.
- No new dependencies other than `@fontsource-variable/inter`; no new source files; no JavaScript.

## 12. Final Checklist

- [ ] Branch `design/mews-restyle`; one commit per task
- [ ] `@fontsource-variable/inter` installed; Schibsted removed from `package.json`, `src/`, `docs/`
- [ ] `tokens.css`: both themes define the same 18 colour tokens; `--color-shadow` gone; `--color-ice`/`--color-lime` in shared `:root`
- [ ] `tokens.css`: `--text-36`/`--text-hero` gone; `--text-12/13/20/48/display`, weights 600/900, `--radius-card`, `--radius-pill`, `--radius-control: 8px`, `--page-max: 80rem`, `--space-section` present
- [ ] `contrast.test.ts` has the six new pairs and passes for `floorplan` and `eucalyptus`
- [ ] `global.css`: body `#333` 16/1.5; h1 48/900; `.display`; `.band` rhythm; `.card`, `.accordion`, `.eyebrow`, `.arrow-link`
- [ ] `Button.astro`: pill primary, 8px ghost, new `accent`; press scale intact
- [ ] Pink pill appears only on the header Book button (≥768px) and the phone booking bar (<768px)
- [ ] `quality.e2e.mjs` exemption limited to `btn--accent|bar__book` on `color-contrast`
- [ ] Header: 64px, sticky, tint active pill; DemoRibbon: pastel 36px bar with ink focus ring
- [ ] Footer and MobileBookingBar use hairlines; favicon recoloured
- [ ] Hero: dark panel + `.display` h1; suburb input text is ink; framed plan; no overflow at 320
- [ ] TrustRow = 4 cards (1/2/4); ServicesList = 4 cards (1/2/4) with exactly 4 `/services/` links and 4 "from $N"
- [ ] Reviews are cards; OfficesBand hairlines; CtaBand cream
- [ ] Faq + Questions use `.accordion`; columns centred at 50rem; "All questions" are arrow links
- [ ] `PageHeader` eyebrow on `/services/[slug]/` and `/areas/[slug]/`
- [ ] Booking flow: 8px controls, 4px panels, pill tag, shade hover; all booking e2e pass
- [ ] `var(--wall)` remains only in the 12 allowed places (Task 7.1 grep)
- [ ] Console radii remapped; console e2e + axe pass in both themes
- [ ] `/dev/ui/` shows the accent button
- [ ] Docs updated, including the "Known accessibility exception" section
- [ ] `npm test`, `npm run check`, `npm run build`, `npm run e2e`, `npm run budget` all pass
- [ ] Before/after screenshots reviewed at 320/375/768/1024/1280 in both themes; §10.4 checklist holds on every one
- [ ] No file in the "Must NOT be touched" list appears in `git diff --stat main`
