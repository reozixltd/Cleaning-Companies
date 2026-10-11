# Cinematic 3D Redesign, Part 2: Sections, Media and QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the home page's cinematic redesign below the estimator (trust, services, the before-and-after room stage, reviews, team, process, areas, offices, FAQ and a closing band) using the owner's generated assets, then document, measure and test it.

**Architecture:** No animation library. `src/layouts/motion.ts` gains Reveal (an `IntersectionObserver` adds `.is-in` once) beside the existing Progress (`--p` on `[data-progress]`), and sets `.motion` on `<html>` so CSS only ever hides or moves anything after the script has run with motion allowed. Sections are restyled in place with scoped CSS driven by `--p` and `.is-in`. The room stage is one new feature (`src/features/stage/`): a pure state function, a small scroll script, and CSS; the kitchen's action clip reuses the existing `Scene` primitive, so video gating, the pause button and the failure path are not written twice.

**Tech Stack:** Astro 5.18 (static), TypeScript strict, scoped CSS on design tokens, Vitest, Playwright (custom harness in `tests/e2e/`), `@axe-core/playwright`, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md` (binding). This plan implements §5.3 to §5.11, §7.3, §7.4, §8 (Reveal), §11 (remaining assets), §12 to §16 and phases 4 to 6 of §19. Part 1 is `docs/superpowers/plans/2026-10-10-cinematic-3d-foundation-hero-estimator.md`.

## Global Constraints

- Pricing, service rules, booking logic, business policies and content do not change. No price is typed into markup: prices come from `quote()` / `fromPrice()` through the existing `data-price-*` hooks.
- Sample data stays labelled sample. No invented customer photographs, reviews, ratings or customer numbers. No avatars or faces on reviews.
- New visible copy is limited to these strings, verbatim: `Sample photo`, `Illustration, not a client's home.`, and the existing `Pause background video` (already in `Scene.astro`). Alt text is not visible copy. Every other string on the page already exists in the repo and is reused unchanged.
- Motion uses `transform`, `translate` and `opacity` only. Never animate layout properties. Scroll is never hijacked: no wheel or touch listeners, no `preventDefault` on scroll, no scroll snapping.
- Under `prefers-reduced-motion: reduce` there is no Reveal, no Progress, no pinning, no sweep and no video. Existing colour fades stay. `body.is-bare` pages (`/console/`) get none of it. `/book/` gets no decorative motion and never loads three.js or video.
- Nothing is hidden or moved unless `layouts/motion.ts` has run: every reveal or scroll-driven rule is scoped under `.motion` (on `<html>`) or `.is-live` (on the stage). With JavaScript off the page reads completely.
- Copy never sits directly on imagery: text over a picture is on a solid surface. Tap targets are at least 44px. Nothing depends on hover.
- Colours come from tokens: no hex, `rgb()` or `hsl()` outside `src/styles/tokens.css` (`npm test` enforces it; `color-mix()` on tokens is allowed).
- Import boundaries (`npm test` enforces them): `pages → layouts | sections → features → domain → core`. A feature never imports another feature. `core/` imports nothing outside `core/`.
- Existing tests: only `tests/unit/js-budget.test.ts` and `tests/e2e/home.e2e.mjs` may be edited, and this plan edits neither. New checks go in new files. If an existing test fails because of a change here, stop and report it; do not edit the test.
- A missing asset never blocks a feature: every new picture is optional at build time (`hasPhoto`), and the page without it is the page as it was.
- `D:\Reozix\videos` is the owner's folder: read from it, never write to it.
- JavaScript budget: eager at most 30 KB gzipped per page, lazy at most 150 KB (`npm run budget`). No new dependency.
- Videos: 1920×1080, no audio, H.264 level 4.0 MP4 at most 2,500,000 bytes and VP9 WebM at most 1,500,000 bytes, never requested under 768px wide.
- Git: work in the worktree on `design/cinematic-3d`. Run git as plain single commands (no `&&`, no pipes, no `git -C`). Commit locally; never push, never merge. Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never report a measurement or a passing test that was not actually run.

## Verified before planning (11 October 2026)

- Branch `design/cinematic-3d` at `df2041c`, clean, 16 commits ahead of `main`.
- All 15 owner assets in `D:\Reozix\videos` were opened. Every still is 2752×1536 (about 16:9, not the spec's 3:2). `action-kitchen.mp4` is 1920×1080, 24 fps, 10 s, with an audio track, and its first frame is the kitchen "before" still.
- Before/after alignment (SSIM): kitchen 0.918, bathroom 0.892, bedroom 0.864 line up; living room 0.736 does not (different camera position).
- axe ignores text at `opacity: 0` and reports `color-contrast` for text at partial opacity (measured on the current build: 0 and 38 violations). So a scan must run only after reveal transitions have finished.
- Home page transfer size on the current build (`tools/page-weight.mjs`, Task 8): 375px wide 112 KB at load and 128 KB after scrolling the whole page; 1280px wide 1111 KB at load and after scrolling.
- At 1280 wide the read-only plan and its checklist are 528px tall; checklists run from 204px to 557px.
- The read-only plan's rooms are `#whats-included .room--included[role="button"]` with `data-room-id` and `data-kind`; choosing one dispatches `clearday:room` with `{ id, kind }`.

## Rulings made while planning (the owner should know)

1. **The stage is 16:9, not 3:2.** Every supplied still and the clip are 16:9, and the clip's first frame matches the kitchen "before" still only at that shape. Room stills are stored at 1920×1080.
2. **The living room fades instead of sweeping** (spec §18), because its two stills were not shot from the same position.
3. **The stage pins only on screens at least 1024px wide and tall enough to hold the whole block** (plan, stage and checklist). Shorter laptop screens get the unpinned version, where the stage plays as it crosses the screen. The spec says "sticky for about 120vh" at 1024px and wider; pinning a block that does not fit would put the checklist out of reach.
4. **Without scroll progress (reduced motion, or no JavaScript) the stage shows the finished room** with its caption and booking button. The "before" still is not shown in that case.
5. **A room with no pictures (study, laundry) hides the stage**; the plan and checklist are as today.
6. **The phone's action frame is the clip at 4 seconds** (the cleaner mid-wipe), because the first frame has nobody in it. Wider screens use the first frame as the clip's poster, as the spec says.
7. **The clip is trimmed to 8 seconds** (the spec's length) to meet the size limit, and it loops while its beat is on screen because `Scene` loops.
8. **"Icons draw in" is a scale and fade**, not a stroke animation, to keep the transform-and-opacity rule.
9. **The map's tilt and pin drop play once when the map comes on screen** (Reveal), not tied to scroll position, so the map on `/areas/` is never left tilted.
10. **The closing band on the home page reuses the FAQ page's existing words**, "Ready when you are" and "Price your home on the floor plan and choose a time. No phone call needed.", because no new copy is allowed.
11. **The offices band's building icon is replaced by the `offices` photo.**
12. **`G1.mp4` was not regenerated**, so the hero loop keeps its dissolve in the last second.
13. **The existing axe scan in `tests/e2e/quality.e2e.mjs` is left as it is** (it scans from the top of the page, where nothing is mid-fade). A new scan in `tests/e2e/sections.e2e.mjs` runs after every block has been revealed. The stale comment at `quality.e2e.mjs:204` ("The home page has no hero photo") is reported, not edited.

## Review Focus

1. **JavaScript off or the script failing:** every section, picture, caption and button is visible and in place. Pinned by "without JavaScript every block is visible" (Task 2) and "without JavaScript the stage shows the finished kitchen" (Task 5).
2. **Reduced motion:** nothing fades, moves, pins or plays; the stage shows the finished room and no clip is requested. Pinned by "reduced motion leaves every block in place" (Task 2) and "reduced motion: the finished room, no pinning, no clip" (Task 5).
3. **A desktop screen too short for the pinned block (1366×768 laptops):** the block does not pin, the checklist stays reachable and the stage still plays. Pinned by "on a short desktop screen nothing pins" (Task 5).
4. **Choosing rooms part-way through, including a room with no pictures:** the stage swaps at the same point and hides for a study; the checklist behaves as today. Pinned by "choosing a room swaps the stage where it stands" (Task 5).
5. **A returning visitor with a saved selection, now that the price shows in two more places:** the closing band's price and link equal the estimator's on load and after a change. Pinned by "the closing band's price follows the estimator" (Task 7).

Also pinned: a phone never requests the action clip (Task 5); axe passes in both themes at 375 and 1280 after everything has been revealed (Task 2, re-run by every task); no horizontal scroll at 320, 375, 768 and 1280 after reveal (Task 2).

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/assets/photos/*.jpg` (13 new), `public/media/action-kitchen.{mp4,webm}` | 1 | The owner's assets, cropped and encoded |
| `src/config/photo-slots.ts`, `tools/photo-brief.mjs`, `docs/photo-credits.md`, `docs/photo-brief.md` | 1 | Slots, credits and the people rule for photos |
| `src/layouts/motion.ts`, `src/styles/global.css`, `src/sections/SectionHead.astro` | 2 | Reveal, `.motion`, shared `.sample-tag` |
| `tests/e2e/sections.e2e.mjs` | 2 to 7 | Every new e2e check for the sections (created in 2, appended after) |
| `src/sections/TrustRow.astro`, `HowItWorks.astro`, `Faq.astro` | 3 | Trust, process line, FAQ reveal |
| `src/sections/ServicesList.astro`, `Reviews.astro` | 4 | Photo cards with tilt, quote cards with drift |
| `src/features/stage/stage.ts`, `RoomStage.astro`, `tests/unit/stage.test.ts`, `src/sections/RoomChecklist.astro` | 5 | The room stage |
| `src/sections/Vetting.astro`, `src/pages/about.astro` | 6 | Founder and team pictures with "Sample photo" |
| `src/features/areas/CoverageMap.astro`, `src/sections/OfficesBand.astro`, `CtaBand.astro`, `src/pages/index.astro` | 7 | Map entrance, offices photo, closing band |
| `docs/spec.md`, `docs/design-system.md`, `docs/customising.md`, `README.md`, `tools/page-weight.mjs`, `tests/e2e/browsers.e2e.mjs` | 8 | Documents, measurements, Firefox and WebKit |

## Commands used throughout

```bash
# Once per shell. The e2e harness needs the browser path.
export CHROMIUM_PATH="$(node -e "import('playwright').then((p) => console.log(p.chromium.executablePath()))")"

npm test                 # boundaries, then every unit test
npm run check            # astro check: expect 0 errors
npm run build            # the preview serves dist/, so build before every e2e run
npm run budget           # JavaScript budget for every built page

# A preview is normally already running on port 4331. If `curl -sI http://localhost:4331/` fails,
# start one in the background: npm run preview -- --port 4331
npm run e2e -- http://localhost:4331 sections        # one file
STEP="stage" npm run e2e -- http://localhost:4331 sections   # steps whose name matches
npm run e2e -- http://localhost:4331                 # every file
```

Inside `.claude/worktrees/` the Glob and Grep tools return nothing: use `grep`, `cat` or exact Read paths.

---

### Task 1: Assets and photo slots

**Files:**
- Create: `src/assets/photos/room-kitchen-before.jpg`, `room-kitchen-after.jpg`, `room-bath-before.jpg`, `room-bath-after.jpg`, `room-bed-before.jpg`, `room-bed-after.jpg`, `room-living-before.jpg`, `room-living-after.jpg`, `action-kitchen.jpg`, `action-kitchen-still.jpg`, `founder.jpg`, `team.jpg`, `closing.jpg`
- Create: `public/media/action-kitchen.mp4`, `public/media/action-kitchen.webm`
- Modify: `src/config/photo-slots.ts`, `tools/photo-brief.mjs`, `docs/photo-credits.md`
- Regenerate: `docs/photo-brief.md`

**Interfaces:**
- Consumes: the owner's files in `D:/Reozix/videos` (read only): eight `room-*-before.jpg` / `room-*-after.jpg`, `founder.jpg`, `team.jpg`, `closing.jpg`, `action-kitchen.mp4`.
- Produces: photo slots `room-kitchen-before`, `room-kitchen-after`, `room-bath-before`, `room-bath-after`, `room-bed-before`, `room-bed-after`, `room-living-before`, `room-living-after`, `action-kitchen`, `action-kitchen-still`, `team`, `closing`, and a filled `founder`; clip name `action-kitchen` for `<Scene video="action-kitchen">`.

- [ ] **Step 1: Crop and resize the stills**

Room stills go to exactly 1920×1080, the clip's size, so the kitchen "before" still and the clip's first frame line up. Each pair uses the same filter, so a pair stays aligned.

```bash
SRC="D:/Reozix/videos"; P=src/assets/photos
for n in room-kitchen-before room-kitchen-after room-bath-before room-bath-after room-bed-before room-bed-after room-living-before room-living-after; do
  ffmpeg -y -loglevel error -i "$SRC/$n.jpg" -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 "$P/$n.jpg"
done
ffmpeg -y -loglevel error -i "$SRC/closing.jpg" -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350" -q:v 2 "$P/closing.jpg"
# 3:2 from the middle, at the supplied size (no upscaling).
ffmpeg -y -loglevel error -i "$SRC/team.jpg" -vf "crop=2304:1536" -q:v 2 "$P/team.jpg"
# 4:5 around the person, who stands right of centre (no upscaling).
ffmpeg -y -loglevel error -i "$SRC/founder.jpg" -vf "crop=1228:1536:1092:0" -q:v 2 "$P/founder.jpg"
```

- [ ] **Step 2: Encode the clip and take its two stills**

```bash
SRC="D:/Reozix/videos"; P=src/assets/photos
VF="scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p"
ffmpeg -y -loglevel error -i "$SRC/action-kitchen.mp4" -t 8 -an -map_metadata -1 -vf "$VF" -c:v libx264 -preset slow -crf 26 -level:v 4.0 -movflags +faststart public/media/action-kitchen.mp4
ffmpeg -y -loglevel error -i "$SRC/action-kitchen.mp4" -t 8 -an -map_metadata -1 -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 public/media/action-kitchen.webm
# The poster is the first frame; phones get the frame at 4 s, where the cleaner is mid-wipe.
ffmpeg -y -loglevel error -i "$SRC/action-kitchen.mp4" -frames:v 1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 "$P/action-kitchen.jpg"
ffmpeg -y -loglevel error -ss 4 -i "$SRC/action-kitchen.mp4" -frames:v 1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 "$P/action-kitchen-still.jpg"
```

- [ ] **Step 3: Check the outputs**

```bash
for f in src/assets/photos/room-*.jpg src/assets/photos/action-kitchen*.jpg src/assets/photos/founder.jpg src/assets/photos/team.jpg src/assets/photos/closing.jpg; do
  echo "$f $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f") $(stat -c %s "$f")"
done
for f in public/media/action-kitchen.mp4 public/media/action-kitchen.webm; do
  echo "$f $(stat -c %s "$f") bytes; streams: $(ffprobe -v error -show_entries stream=codec_type,codec_name,pix_fmt,level,width,height -of csv=p=0 "$f" | tr '\n' ' ')"
done
```

Expected: ten stills at `1920,1080`; `founder.jpg` `1228,1536`; `team.jpg` `2304,1536`; `closing.jpg` `2400,1350`. Each video has exactly one stream (`video`), `yuv420p`, 1920×1080; the MP4 is `h264` level `40` and at most 2,500,000 bytes; the WebM is `vp9` and at most 1,500,000 bytes. If a video is over its limit, raise its `-crf` by 2, encode again, and repeat until it fits; report the final value.

Open `room-kitchen-before.jpg`, `action-kitchen.jpg` and `action-kitchen-still.jpg` with the Read tool: the first two must show the same empty kitchen from the same position, and the third must show the cleaner at the bench.

- [ ] **Step 4: Register the slots**

In `src/config/photo-slots.ts`, replace the header comment's sentence `Photos show finished rooms; never present stock people as staff.` with:

```ts
 * labelled placeholder. Pictures of people follow docs/photo-credits.md: in the demo they
 * are generated illustrations marked "Sample photo"; a live client uses real photographs.
```

(keep the rest of the comment), replace the `founder` entry, and add the new entries after `offices`:

```ts
  founder: { alt: 'Founder of the business', brief: 'Demo: a generated portrait, marked "Sample photo" on the page. Live client: the real founder, half-length, approachable. 4:5.', search: '(demo: prompt T1 in the redesign spec; live: the client\'s own photo)', orientation: 'portrait' },
```

```ts
  'room-kitchen-before': { alt: 'The kitchen before a clean: dishes and crumbs on the bench after an ordinary week', brief: 'The kitchen in an ordinary lived-in week, never filthy. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G3 in the redesign spec)', orientation: 'landscape' },
  'room-kitchen-after': { alt: 'The same kitchen after a clean: clear benches, a wiped cooktop and a shining sink', brief: 'The same kitchen, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G3 in the redesign spec)', orientation: 'landscape' },
  'room-bath-before': { alt: 'The bathroom before a clean: water marks on the glass and towels left out', brief: 'The bathroom in an ordinary lived-in week. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G4 in the redesign spec)', orientation: 'landscape' },
  'room-bath-after': { alt: 'The same bathroom after a clean: clear glass, bright tiles and folded towels', brief: 'The same bathroom, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G4 in the redesign spec)', orientation: 'landscape' },
  'room-living-before': { alt: 'The living room before a clean: cushions out of place and cups on the coffee table', brief: 'The living room in an ordinary lived-in week. 1920×1080.', search: '(generated: prompt G5 in the redesign spec)', orientation: 'landscape' },
  'room-living-after': { alt: 'The living room after a clean: straightened cushions and a clear coffee table', brief: 'The living room after a clean. If it is not from the same camera position as the "before" still, the stage fades between them instead of sweeping. 1920×1080.', search: '(generated: prompt G5 in the redesign spec)', orientation: 'landscape' },
  'room-bed-before': { alt: 'The bedroom before a clean: an unmade bed and clothes on the chair', brief: 'The bedroom in an ordinary lived-in week. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G6 in the redesign spec)', orientation: 'landscape' },
  'room-bed-after': { alt: 'The same bedroom after a clean: a made bed and clear surfaces', brief: 'The same bedroom, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G6 in the redesign spec)', orientation: 'landscape' },
  'action-kitchen': { alt: 'The kitchen bench before a clean', brief: 'The first frame of the kitchen clip (public/media/action-kitchen.*): its poster on screens 768px and wider. 1920×1080.', search: '(first frame of clip C1 in the redesign spec)', orientation: 'landscape' },
  'action-kitchen-still': { alt: 'A cleaner in a charcoal apron wiping down the kitchen bench', brief: 'A frame from the middle of the kitchen clip with the cleaner at work: what phones show instead of the clip. 1920×1080.', search: '(frame at 4 s of clip C1 in the redesign spec)', orientation: 'landscape' },
  team: { alt: 'Two cleaners in charcoal aprons arriving at a Queenslander home with their caddy and vacuum', brief: 'Demo: a generated picture of cleaners arriving, marked "Sample photo" on the page. Live client: the real team, with their permission. Plain clothing, no logo. 3:2.', search: '(demo: prompt T2 in the redesign spec; live: the client\'s own photo)', orientation: 'landscape' },
  closing: { alt: 'The living room in late afternoon light, with the door open to the garden', brief: 'The home from `hero` later in the day, as the backdrop of the closing band. The card sits on the left. 2400×1350.', search: '(generated: prompt G7 in the redesign spec)', orientation: 'landscape' },
```

Open each of the eight room stills, `team.jpg` and `closing.jpg` with the Read tool. If an alt names something that is not in its picture, correct that alt to what the picture shows (same form: what state the room is in, then two things you can see) and list the change in your report.

- [ ] **Step 5: Update the photo rules**

In `tools/photo-brief.mjs`, replace the four rule lines in `markdown()` (the array entries from `'- Show rooms and results: finished, tidy spaces in daylight.'` to `'- A live client uses their own photos. The \`founder\` slot is always the real person.'`) with:

```js
    '- Show rooms and results: finished, tidy spaces in daylight. "Before" pictures show an ordinary lived-in week, never filth.',
    '- People, demo site: generated illustrations only (cleaners working or arriving, and one founder portrait in `founder`), in plain clothing with no logo. The page marks each one "Sample photo". Never a face on a review, never a child, never a real or recognisable person.',
    '- People, live client: replace every picture of a person with a real photograph of the client\'s own people, with their permission, before going live.',
    '- Demo photos must be licence-free or generated for this site. Record each one in [`photo-credits.md`](photo-credits.md).',
```

In `docs/photo-credits.md`, replace the two bullets that start `- **Demo site:**` and `- **Live client:**` with:

```markdown
- **Demo site:** photos are licence-free (for example the Unsplash or Pexels licence) or generated for this site. Pictures of people are generated illustrations: cleaners working or arriving, and one founder portrait in the `founder` slot. The page marks each one "Sample photo" while `demoMode` is on. Never use a photo of a real person as the business's staff, founder or client, and never put a face on a review.
- **Live client:** use the client's own photos of their own work, team and premises. Before launch, delete every demo photo and its row here, and replace every picture of a person with a real photograph. Photos of the client's staff need each person's permission.
```

and add these rows to the Credits table, after the `hero-portrait` row:

```markdown
| `room-kitchen-before`, `room-kitchen-after` | `room-kitchen-before.jpg`, `room-kitchen-after.jpg` | Generated with Google Flow for this site (prompt G3 in the redesign spec), approved by the owner | Owner's own | Generated image |
| `room-bath-before`, `room-bath-after` | `room-bath-before.jpg`, `room-bath-after.jpg` | Generated with Google Flow for this site (prompt G4), approved by the owner | Owner's own | Generated image |
| `room-living-before`, `room-living-after` | `room-living-before.jpg`, `room-living-after.jpg` | Generated with Google Flow for this site (prompt G5), approved by the owner | Owner's own | Generated image |
| `room-bed-before`, `room-bed-after` | `room-bed-before.jpg`, `room-bed-after.jpg` | Generated with Google Flow for this site (prompt G6), approved by the owner | Owner's own | Generated image |
| `action-kitchen`, `action-kitchen-still` | `action-kitchen.jpg`, `action-kitchen-still.jpg` | Frames of the generated clip C1 (`public/media/action-kitchen.*`), approved by the owner. Shows a generated person | Owner's own | Generated image |
| `founder` | `founder.jpg` | Generated with Google Flow for this site (prompt T1), approved by the owner. A generated person, not a real one | Owner's own | Generated image |
| `team` | `team.jpg` | Generated with Google Flow for this site (prompt T2), approved by the owner. Generated people, not real ones | Owner's own | Generated image |
| `closing` | `closing.jpg` | Generated with Google Flow for this site (prompt G7), approved by the owner | Owner's own | Generated image |
```

- [ ] **Step 6: Regenerate the brief and verify**

```bash
npm run photos:status -- --write
npm test
npm run check
npm run build
```

Expected: `photos:status` prints `Photo slots: 24 of 24 filled` and no "Files that match no slot" section; unit tests pass; `astro check` reports 0 errors; the build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/assets/photos public/media src/config/photo-slots.ts tools/photo-brief.mjs docs/photo-credits.md docs/photo-brief.md
git commit -m "feat(media): add the room, team and closing pictures and the kitchen clip" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Reveal

**Files:**
- Modify: `src/layouts/motion.ts` (whole file), `src/styles/global.css`, `src/sections/SectionHead.astro`
- Create: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `data-reveal` (attribute): the element fades and rises in once, the first time it is on screen. Optional inline `--i` (a number) delays it by `--i × 80ms`. Never put it inside an element that can be `hidden`.
  - `.is-in` (class): added to a `[data-reveal]` element once it has shown. Components key their own entrance on it.
  - `.motion` (class on `<html>`): present only when the script ran, motion is allowed and the page is not bare. Every scroll-driven or reveal rule in a component is written as `:global(.motion) .thing { … }`.
  - `--p` now reaches exactly 0 below and exactly 1 above the viewport.
  - `.sampled` (wrapper, `position: relative`) and `.sample-tag` (the "Sample photo" chip) in `global.css`.
  - In `tests/e2e/sections.e2e.mjs`: `revealAll(page)`, `seriousIssues(page)`, `THEMES`, used by later tasks' steps. New steps are always added above the final `await finish();`.

- [ ] **Step 1: Write the failing e2e file**

Create `tests/e2e/sections.e2e.mjs`:

```js
/** The home page's sections below the estimator (spec §5.3 to §5.10) and the Reveal system (spec §8). */
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { harness } from './harness.mjs';

const { step, go, overflow, finish } = await harness();

const THEMES = ['floorplan', 'eucalyptus'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/** Scroll the whole page in steps so every block has been on screen, then wait for the last fade to finish. */
async function revealAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
}

async function seriousIssues(page) {
  // Scan from the top: content scrolled under the sticky header reads as "obscured" to axe.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
}

const opacities = (page) => page.$$eval('[data-reveal]', (els) => els.map((el) => getComputedStyle(el).opacity));

// ── Reveal (spec §8) ─────────────────────────────────────────
await step('without JavaScript every block is visible', async (page) => {
  for (const path of ['/', '/about/']) {
    await go(page, path);
    const found = await opacities(page);
    assert.ok(found.length > 0, `${path} has blocks marked data-reveal`);
    assert.ok(found.every((o) => o === '1'), `${path}: ${found.join(' ')}`);
  }
}, { width: 1280, javaScriptEnabled: false });

await step('a block below the fold waits, shows once it is scrolled to, and stays shown', async (page) => {
  await go(page, '/');
  const head = page.locator('#how [data-reveal]').first();
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '0');
  await head.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#how [data-reveal]')).opacity === '1');
  assert.ok(await head.evaluate((el) => el.classList.contains('is-in')));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  assert.equal(await head.evaluate((el) => getComputedStyle(el).opacity), '1');
}, { width: 1280 });

await step('what is already on screen at load never fades', async (page) => {
  await go(page, '/');
  const onScreen = await page.$$eval('[data-reveal]', (els) =>
    els.filter((el) => el.getBoundingClientRect().top < window.innerHeight).map((el) => `${el.classList.contains('is-in')} ${getComputedStyle(el).opacity}`));
  assert.ok(onScreen.length > 0, 'a 3000px-tall screen shows some blocks at load');
  assert.ok(onScreen.every((s) => s === 'true 1'), onScreen.join(', '));
}, { width: 1280, height: 3000 });

await step('reduced motion leaves every block in place', async (page) => {
  await go(page, '/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
  const found = await opacities(page);
  assert.ok(found.length > 0 && found.every((o) => o === '1'), found.join(' '));
}, { width: 1280, reducedMotion: 'reduce' });

await step('the owner console gets no motion', async (page) => {
  await go(page, '/console/');
  assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains('motion'))));
}, { width: 1280 });

await step('scroll progress is exactly 0 below the screen and exactly 1 above it', async (page) => {
  await go(page, '/');
  const p = () => page.locator('.scene-hero').evaluate((el) => el.style.getPropertyValue('--p'));
  assert.equal(await p(), '0.0000');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.scene-hero').style.getPropertyValue('--p') === '1.0000');
}, { width: 1280 });

// ── After every block has shown ──────────────────────────────
for (const theme of THEMES) {
  for (const width of [375, 1280]) {
    await step(`axe finds no serious or critical issues once everything has been revealed (${theme}, ${width})`, async (page) => {
      const found = [];
      for (const path of ['/', '/about/', '/areas/chermside/']) {
        await go(page, `${path}?theme=${theme}`);
        await revealAll(page);
        found.push(...(await seriousIssues(page)).map((i) => `${path}: ${i}`));
      }
      assert.deepEqual(found, []);
    }, { width });
  }
}

for (const width of [320, 375, 768, 1280]) {
  await step(`no horizontal scroll once every section has shown (${width})`, async (page) => {
    await go(page, '/');
    await revealAll(page);
    assert.equal(await overflow(page), 0);
  }, { width });
}

await finish();
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm run build
npm run e2e -- http://localhost:4331 sections
```

Expected: FAIL. "without JavaScript every block is visible" fails with `/ has blocks marked data-reveal`; "a block below the fold…" fails because `#how [data-reveal]` does not exist; "scroll progress is exactly…" fails (the value never reaches `1.0000`). The axe and overflow steps pass.

- [ ] **Step 3: Rewrite `src/layouts/motion.ts`**

```ts
/**
 * Scroll motion (spec §8), with no library.
 *
 * Progress: an element marked data-progress gets --p, 0 where it first shows (or
 * at the top of the page, if it starts on screen) and 1 where its bottom edge
 * leaves the top of the viewport. CSS turns --p into transforms and opacity.
 *
 * Reveal: an element marked data-reveal gets .is-in the first time it shows.
 * global.css hides those blocks only under html.motion, which is set here, so a
 * page where this script never runs reads normally.
 *
 * Nothing runs under reduced motion or on bare (app-like) pages.
 */
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('is-bare');

if (!still && 'IntersectionObserver' in window) {
  const tracked = [...document.querySelectorAll<HTMLElement>('[data-progress]')];
  let queued = false;
  const measure = () => {
    queued = false;
    const viewport = window.innerHeight;
    for (const el of tracked) {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const from = Math.max(top - viewport, 0);
      const p = Math.min(Math.max((window.scrollY - from) / (top + r.height - from), 0), 1).toFixed(4);
      if (el.style.getPropertyValue('--p') !== p) el.style.setProperty('--p', p);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  if (tracked.length) {
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    measure();
  }

  const reveals = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  // What is already on screen (or above it) stays put: it gets .is-in before the class that hides the rest.
  for (const el of reveals) if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of reveals) if (!el.classList.contains('is-in')) seen.observe(el);
  document.documentElement.classList.add('motion');
}
```

- [ ] **Step 4: Add the shared styles to `src/styles/global.css`**

Insert after the `.tabular` rule and before the `/* Reduced motion: … */` comment:

```css
/* Reveal (spec §8). layouts/motion.ts sets .motion on <html> when movement is allowed and adds
   .is-in the first time a block shows, so without the script nothing is ever hidden.
   It moves with `translate`, which leaves `transform` free for the component. */
.motion [data-reveal] {
  opacity: 0;
  translate: 0 var(--space-5);
  transition: opacity var(--dur-reveal) var(--ease-out), translate var(--dur-reveal) var(--ease-out);
  transition-delay: calc(var(--i, 0) * 80ms);
}

.motion [data-reveal].is-in {
  opacity: 1;
  translate: none;
}

/* "Sample photo" on demo pictures of people (spec §7.3): a solid chip, so it never relies on the picture for contrast. */
.sampled {
  position: relative;
}

.sample-tag {
  position: absolute;
  left: var(--space-2);
  bottom: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: var(--text-14);
  font-weight: var(--weight-medium);
  line-height: var(--leading-tight);
}
```

- [ ] **Step 5: Mark section heads**

In `src/sections/SectionHead.astro`, change `<div class="head">` to:

```astro
<div class="head" data-reveal>
```

- [ ] **Step 6: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331 sections
npm run e2e -- http://localhost:4331
npm run budget
```

Expected: every step in `sections` passes; every other e2e file still passes (a failure in an existing file is a finding to report, not a test to edit); the budget prints that all pages are within budget.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/motion.ts src/styles/global.css src/sections/SectionHead.astro tests/e2e/sections.e2e.mjs
git commit -m "feat(motion): reveal blocks as they come on screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Trust, process and FAQ

**Files:**
- Modify: `src/sections/TrustRow.astro`, `src/sections/HowItWorks.astro`, `src/sections/Faq.astro`
- Test: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: `data-reveal`, `--i`, `.is-in`, `.motion`, `data-progress` / `--p` (Task 2).
- Produces: nothing later tasks use.

- [ ] **Step 1: Add the failing steps**

In `tests/e2e/sections.e2e.mjs`, above `// ── After every block has shown`, add:

```js
// ── Trust, process, FAQ (spec §5.3, §5.8, §5.10) ─────────────
await step('the four trust proofs rise one after another', async (page) => {
  await go(page, '/');
  const delays = await page.$$eval('.trust__item[data-reveal]', (els) => els.map((el) => parseFloat(getComputedStyle(el).transitionDelay)));
  assert.equal(delays.length, 4);
  assert.deepEqual([...delays].sort((a, b) => a - b), delays);
  assert.ok(delays[3] > delays[0], delays.join(' '));
  await page.locator('.trust__item').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.trust__item .icon')].every((el) => getComputedStyle(el).opacity === '1'));
}, { width: 1280 });

const fillOf = () => new DOMMatrix(getComputedStyle(document.querySelector('#how .steps'), '::after').transform).a;
const firstNumber = (page) => page.locator('#how .steps li').last().evaluate((li) => Number(getComputedStyle(li, '::before').opacity));

await step('the process line fills, and its numbers darken, as the steps cross the screen', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#how ol.steps > li').count(), 4);
  const toSteps = (fromTop) =>
    page.locator('#how .steps').evaluate((ol, y) => window.scrollTo({ top: ol.getBoundingClientRect().top + window.scrollY - y, behavior: 'instant' }), fromTop);
  await toSteps(780); // the list has only just come on screen
  await page.waitForFunction(`(${fillOf})() < 0.1`);
  assert.ok((await firstNumber(page)) < 0.7, 'the last number starts quiet');
  await toSteps(120); // the list is near the top
  await page.waitForFunction(`(${fillOf})() === 1`);
  assert.equal(await firstNumber(page), 1);
}, { width: 1280 });

await step('under reduced motion the process line is complete from the start', async (page) => {
  await go(page, '/');
  assert.equal(await page.evaluate(fillOf), 1);
  assert.equal(await firstNumber(page), 1);
}, { width: 1280, reducedMotion: 'reduce' });

await step('the FAQ keeps its native accordion', async (page) => {
  await go(page, '/');
  const first = page.locator('#faq details').first();
  await first.locator('summary').click();
  assert.equal(await first.evaluate((d) => d.open), true);
  assert.ok(await first.locator('p').isVisible());
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm run build
STEP="trust|process|FAQ" npm run e2e -- http://localhost:4331 sections
```

Expected: the trust step fails (`0 !== 4`), the two process steps fail (the `::after` transform is `none`, which reads as 1, so the first wait times out; under reduced motion it passes already), the FAQ step passes.

- [ ] **Step 3: Trust row**

In `src/sections/TrustRow.astro`, change the list item to carry its index:

```astro
    {items.map((i, n) => (
      <li class="trust__item" data-reveal style={`--i: ${n}`}>
```

and add to the end of its `<style>` block:

```css
  /* Each proof rises in turn (Reveal); its icon follows a beat later. */
  :global(.motion) .trust__item :global(.icon) {
    opacity: 0;
    transform: scale(0.6);
    transition: opacity var(--dur-reveal) var(--ease-out), transform var(--dur-reveal) var(--ease-out);
    transition-delay: calc(var(--i, 0) * 80ms + 200ms);
  }
  :global(.motion) .trust__item.is-in :global(.icon) {
    opacity: 1;
    transform: none;
  }
```

- [ ] **Step 4: Process line**

In `src/sections/HowItWorks.astro`, replace the list markup with:

```astro
    <ol class="steps" data-progress>
      {steps.map((s, i) => (
        <li style={`--i: ${i}`}>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
```

and replace the whole `<style>` block with:

```astro
<style>
  /* One line runs past the four steps: a quiet track with an ink fill over it. The fill is complete
     unless scroll progress is driving it (.motion), so the list reads the same without the script. */
  .steps {
    --fill: 1;
    position: relative;
    display: grid;
    gap: var(--space-5);
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  :global(.motion) .steps {
    --fill: clamp(0, (var(--p) - 0.12) * 2.2, 1);
  }
  /* Phones: down the left side. */
  .steps::before,
  .steps::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--wall);
    background: var(--color-line);
  }
  .steps::after {
    background: var(--color-ink);
    transform: scaleY(var(--fill));
    transform-origin: top left;
  }
  .steps li {
    display: grid;
    gap: var(--space-2);
    padding-left: var(--space-5);
    counter-increment: step;
  }
  /* Each number darkens as the fill reaches it. 0.55 keeps the quiet state above 3:1 for large text. */
  .steps li::before {
    content: counter(step);
    font-size: var(--text-36);
    font-weight: var(--weight-bold);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    opacity: clamp(0.55, 0.55 + var(--fill) * 4 - var(--i), 1);
  }
  .steps h3 {
    font-size: var(--text-18);
  }
  .steps p {
    color: var(--color-ink-muted);
  }
  /* From 768px: across the top. */
  @media (min-width: 768px) {
    .steps {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .steps::before,
    .steps::after {
      right: 0;
      bottom: auto;
      width: auto;
      height: var(--wall);
    }
    .steps::after {
      transform: scaleX(var(--fill));
    }
    .steps li {
      padding-left: 0;
      padding-top: var(--space-4);
    }
  }
</style>
```

- [ ] **Step 5: FAQ**

In `src/sections/Faq.astro`, change `<div class="faq__list">` to:

```astro
    <div class="faq__list" data-reveal>
```

- [ ] **Step 6: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331 sections
npm run e2e -- http://localhost:4331 home
```

Expected: all pass, including the four axe steps and the four overflow steps.

- [ ] **Step 7: Commit**

```bash
git add src/sections/TrustRow.astro src/sections/HowItWorks.astro src/sections/Faq.astro tests/e2e/sections.e2e.mjs
git commit -m "feat(home): trust proofs rise in turn and the process line fills on scroll" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Service cards and review cards

**Files:**
- Modify: `src/sections/ServicesList.astro`, `src/sections/Reviews.astro`
- Test: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: `data-reveal`, `--i`, `.motion`, `data-progress` / `--p` (Task 2).
- Produces: nothing later tasks use. `Reviews` is also rendered on `/areas/<slug>/`, which gets the same cards.

- [ ] **Step 1: Add the failing steps**

In `tests/e2e/sections.e2e.mjs`, above `// ── After every block has shown`, add:

```js
// ── Services and reviews (spec §5.4, §5.6) ───────────────────
await step('the four services are cards, two across on a desktop, each with its link and from price', async (page) => {
  await go(page, '/');
  const cards = page.locator('#services [data-tilt]');
  assert.equal(await cards.count(), 4);
  for (let i = 0; i < 4; i++) {
    assert.equal(await cards.nth(i).locator('a[href^="/services/"]').count(), 1);
    assert.match(await cards.nth(i).innerText(), /from \$\d+/);
  }
  await cards.first().scrollIntoViewIfNeeded();
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => cards.nth(i).boundingBox()));
  assert.ok(Math.abs(a.y - b.y) < 2 && b.x > a.x + a.width - 2, 'the first two sit side by side');
  assert.ok(c.y > a.y + a.height - 2, 'the third starts a new row');
}, { width: 1280 });

await step('a service card leans toward a fine pointer by at most 4 degrees', async (page) => {
  await go(page, '/');
  const card = page.locator('#services [data-tilt]').first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.waitForFunction(() => document.querySelector('#services [data-tilt]').style.getPropertyValue('--tilt-x') !== '');
  const [x, y] = await card.evaluate((el) => ['--tilt-x', '--tilt-y'].map((v) => parseFloat(el.style.getPropertyValue(v))));
  assert.ok(Math.abs(x) > 2 && Math.abs(x) <= 4 && Math.abs(y) > 2 && Math.abs(y) <= 4, `${x} ${y}`);
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector('#services [data-tilt]').style.getPropertyValue('--tilt-x') === '');
}, { width: 1280 });

for (const [name, options] of [['a touch screen', { hasTouch: true, isMobile: true }], ['reduced motion', { width: 1280, reducedMotion: 'reduce' }]]) {
  await step(`a service card stays flat for ${name}`, async (page) => {
    await go(page, '/');
    const card = page.locator('#services [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(200);
    assert.equal(await card.evaluate((el) => el.style.getPropertyValue('--tilt-x')), '');
  }, options);
}

const reviewShift = (page) => page.$$eval('#reviews [data-review] figure', (els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).f));

await step('review cards drift at different rates, with no faces', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#reviews img').count(), 0);
  await page.locator('#reviews').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.7, behavior: 'instant' }));
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#reviews')).getPropertyValue('--p')) > 0);
  const shifts = await reviewShift(page);
  assert.equal(shifts.length, 3);
  assert.equal(new Set(shifts.map((s) => s.toFixed(1))).size, 3, shifts.join(' '));
}, { width: 1280 });

await step('review cards hold still under reduced motion', async (page) => {
  await go(page, '/');
  await page.locator('#reviews').scrollIntoViewIfNeeded();
  assert.deepEqual(await reviewShift(page), [0, 0, 0]);
}, { width: 1280, reducedMotion: 'reduce' });
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm run build
STEP="service|review" npm run e2e -- http://localhost:4331 sections
```

Expected: the cards step and the lean step fail (`[data-tilt]` does not exist); the two "stays flat" steps fail on a missing element; the drift step fails (all three shifts are 0); the reduced-motion review step passes.

- [ ] **Step 3: Service cards**

In `src/sections/ServicesList.astro`, change the opening doc comment to `/** The four home services as photo cards: photo, one line, from price. Two across on a desktop. */` and replace the `<ul>` with:

```astro
    <ul class="services" role="list" data-progress>
      {services.map((s, i) => {
        const slot = `service-${s.data.service}` as keyof typeof photoSlots;
        return (
          <li data-reveal style={`--i: ${i % 2}`}>
            <div class="service" data-tilt>
              <Photo slot={slot} alt={photoSlots[slot].alt} ratio="3 / 2" sizes="(min-width: 900px) 560px, 100vw" class="service__photo" />
              <div class="service__body">
                <h3><a href={`/services/${s.id}/`}>{s.data.title}</a></h3>
                <p>{s.data.summary}</p>
              </div>
              <p class="service__price">from <strong class="tabular">{formatMoney(fromPrice(s.data.service, pricing))}</strong></p>
            </div>
          </li>
        );
      })}
    </ul>
```

Add this script between the closing `</section>` and the `<style>` block:

```astro
<script>
  // Fine pointers only: a card leans up to 4° toward the pointer, with a soft sheen where it points.
  // Touch screens and reduced motion keep the flat card; nothing here is needed to read or use it.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const card of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--tilt-x', `${((0.5 - y) * 8).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${((x - 0.5) * 8).toFixed(2)}deg`);
        card.style.setProperty('--sheen-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--sheen-y', `${(y * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    }
  }
</script>
```

Replace the whole `<style>` block with:

```astro
<style>
  .services {
    display: grid;
    gap: var(--space-5);
    padding: 0;
    list-style: none;
  }
  .service {
    position: relative;
    display: grid;
    align-content: start;
    gap: var(--space-4);
    height: 100%;
    padding-bottom: var(--space-5);
    overflow: hidden;
    background: var(--color-surface);
    border-radius: var(--radius-control);
    box-shadow: var(--shadow-1);
    transform: perspective(60rem) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
    transition: transform var(--dur-fill) var(--ease-out);
  }
  /* The sheen: a soft light where the pointer is. It never takes a click. */
  .service::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), color-mix(in srgb, var(--color-surface) 35%, transparent), transparent 55%);
    transition: opacity var(--dur-colour) linear;
  }
  .service :global(.service__photo) {
    border-radius: 0;
  }
  /* The photo drifts inside its frame as the list crosses the screen. */
  :global(.motion) .service :global(.service__photo img) {
    transform: scale(1.12) translateY(calc((0.5 - var(--p)) * 6%));
  }
  .service__body {
    display: grid;
    gap: var(--space-2);
    padding-inline: var(--space-5);
  }
  .service h3 a {
    text-decoration: none;
  }
  /* The whole card is the link's target. */
  .service h3 a::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  .service__body p {
    color: var(--color-ink-muted);
  }
  .service__price {
    padding-inline: var(--space-5);
    font-size: var(--text-18);
  }
  .service__price strong {
    font-size: var(--text-28);
  }
  @media (min-width: 900px) {
    .services {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-6);
    }
  }
  @media (hover: hover) and (pointer: fine) {
    .service:hover::after {
      opacity: 1;
    }
    .service:hover h3 a {
      text-decoration: underline;
      text-decoration-thickness: var(--wall);
    }
  }
</style>
```

- [ ] **Step 4: Review cards**

In `src/sections/Reviews.astro`, change the opening tag of the section and the list item:

```astro
<section class="band" id="reviews" aria-labelledby="reviews-title" data-progress>
```

```astro
      {reviews.map((r, i) => (
        <li data-review data-reveal style={`--i: ${i}`}>
```

and replace these three rules in its `<style>` block (`.reviews__list`, `figure`, `blockquote`) with:

```css
  .reviews__list {
    display: grid;
    gap: var(--space-6);
    padding: 0;
    list-style: none;
  }
  /* Editorial quote cards. Each drifts a little as the section crosses the screen, at its own rate. */
  figure {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--color-surface);
    border-radius: var(--radius-control);
    box-shadow: var(--shadow-1);
  }
  li:nth-child(3n + 1) figure {
    --drift: 16px;
  }
  li:nth-child(3n + 2) figure {
    --drift: 40px;
  }
  li:nth-child(3n) figure {
    --drift: 28px;
  }
  :global(.motion) figure {
    transform: translateY(calc((0.5 - var(--p)) * var(--drift)));
  }
  blockquote {
    margin: 0;
    font-size: var(--text-22);
  }
```

Then add inside the existing `@media (min-width: 900px)` block, after the `.reviews` rule:

```css
    li:nth-child(even) {
      margin-left: var(--space-7);
    }
```

- [ ] **Step 5: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331 sections
npm run e2e -- http://localhost:4331 home
npm run e2e -- http://localhost:4331 pages
npm run budget
```

Expected: all pass. `home` still finds four service links, four "from $N" prices and at least three `[data-review]` items each with one `time[datetime]`.

- [ ] **Step 6: Commit**

```bash
git add src/sections/ServicesList.astro src/sections/Reviews.astro tests/e2e/sections.e2e.mjs
git commit -m "feat(home): service photo cards and drifting review cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The room stage

**Files:**
- Create: `src/features/stage/stage.ts`, `src/features/stage/RoomStage.astro`, `tests/unit/stage.test.ts`
- Modify: `src/sections/RoomChecklist.astro`
- Test: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: photo slots `room-kitchen-*`, `room-bath-*`, `room-bed-*`, `room-living-*`, `action-kitchen`, `action-kitchen-still` and the clip `action-kitchen` (Task 1); `.sample-tag` (Task 2); `Scene.astro` (existing: fills its positioned parent; attaches the video only at 768px and wider with motion allowed, Save-Data off and not on 2G/3G; plays only while on screen; shows its own pause button); `Photo.astro`; `Button.astro`.
- Produces:
  - `stageState(p: number): { phase: 'before' | 'action' | 'sweep' | 'after'; sweep: number }`
  - `pinnedProgress(trackTop: number, stickTop: number, travel: number): number`
  - `passingProgress(top: number, height: number, viewport: number): number`
  - `initStage(): void`
  - DOM contract: `[data-stage-block]` (the figure; `hidden` when the chosen room has no pictures), `[data-stage]` (carries `data-phase` and inline `--sweep`; `.is-live` once the script drives it), `[data-stage-room="<kind>"]` (one per room with pictures; all but the chosen one `hidden`), `[data-stage-action]` (kitchen only), `[data-stage-book]` (the booking button's wrapper), and `[data-stage-pin]` on the block that pins, whose parent is the track.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/stage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { passingProgress, pinnedProgress, stageState } from '@/features/stage/stage';

describe('stageState', () => {
  it('goes before, action, sweep, after at 0.3, 0.6 and 0.9', () => {
    expect(stageState(0).phase).toBe('before');
    expect(stageState(0.29).phase).toBe('before');
    expect(stageState(0.3).phase).toBe('action');
    expect(stageState(0.59).phase).toBe('action');
    expect(stageState(0.6).phase).toBe('sweep');
    expect(stageState(0.89).phase).toBe('sweep');
    expect(stageState(0.9).phase).toBe('after');
    expect(stageState(1).phase).toBe('after');
  });

  it('uncovers "after" only during the sweep', () => {
    expect(stageState(0).sweep).toBe(0);
    expect(stageState(0.6).sweep).toBe(0);
    expect(stageState(0.75).sweep).toBeCloseTo(0.5);
    expect(stageState(0.9).sweep).toBe(1);
    expect(stageState(1).sweep).toBe(1);
  });

  it('treats progress outside 0 to 1 as its nearest end', () => {
    expect(stageState(-1)).toEqual({ phase: 'before', sweep: 0 });
    expect(stageState(2)).toEqual({ phase: 'after', sweep: 1 });
  });
});

describe('pinnedProgress', () => {
  it('is 0 until the block sticks, 1 once it has travelled the whole way', () => {
    expect(pinnedProgress(400, 88, 960)).toBe(0);
    expect(pinnedProgress(88, 88, 960)).toBe(0);
    expect(pinnedProgress(88 - 480, 88, 960)).toBeCloseTo(0.5);
    expect(pinnedProgress(88 - 960, 88, 960)).toBe(1);
    expect(pinnedProgress(-5000, 88, 960)).toBe(1);
  });

  it('is complete when there is nowhere to travel', () => {
    expect(pinnedProgress(88, 88, 0)).toBe(1);
  });
});

describe('passingProgress', () => {
  it('runs from the stage centre 85% down the screen to 30% down', () => {
    expect(passingProgress(900, 200, 800)).toBe(0);
    expect(passingProgress(580, 200, 800)).toBe(0); // centre at 680 = 85%
    expect(passingProgress(360, 200, 800)).toBeCloseTo(0.5); // centre at 460
    expect(passingProgress(140, 200, 800)).toBe(1); // centre at 240 = 30%
    expect(passingProgress(-400, 200, 800)).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/stage.test.ts`
Expected: FAIL, cannot resolve `@/features/stage/stage`.

- [ ] **Step 3: Write `src/features/stage/stage.ts`**

```ts
/**
 * The room stage (spec §5.5): a room before a clean, an action beat, a sweep that
 * uncovers the room after it, then the finished room. What shows is a pure
 * function of scroll progress. Which room shows is decided by whoever owns the
 * plan (sections/RoomChecklist), by hiding all but one [data-stage-room].
 *
 * Without this script, and under reduced motion, the stage rests on the finished room.
 */
export type Phase = 'before' | 'action' | 'sweep' | 'after';

const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

/** The stage at progress p (0 to 1). `sweep` is how much of "after" is uncovered, 0 to 1. */
export function stageState(p: number): { phase: Phase; sweep: number } {
  const phase = p >= 0.9 ? 'after' : p >= 0.6 ? 'sweep' : p >= 0.3 ? 'action' : 'before';
  return { phase, sweep: clamp((p - 0.6) / 0.3) };
}

/** Pinned: 0 until the block sticks at `stickTop`, 1 once it has travelled `travel` px. Viewport px. */
export function pinnedProgress(trackTop: number, stickTop: number, travel: number): number {
  return travel > 0 ? clamp((stickTop - trackTop) / travel) : 1;
}

/** Not pinned: 0 with the stage's centre 85% down the viewport, 1 with it 30% down. */
export function passingProgress(top: number, height: number, viewport: number): number {
  return clamp((viewport * 0.85 - (top + height / 2)) / (viewport * 0.55));
}

export function initStage(): void {
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pin = stage.closest<HTMLElement>('[data-stage-pin]');
  const action = stage.querySelector<HTMLElement>('[data-stage-action]');

  let queued = false;
  const measure = () => {
    queued = false;
    let p: number;
    // The stylesheet decides whether the block pins (screen size, room to fit); this only reads the answer.
    if (pin?.parentElement && getComputedStyle(pin).position === 'sticky') {
      const track = pin.parentElement.getBoundingClientRect();
      p = pinnedProgress(track.top, parseFloat(getComputedStyle(pin).top), track.height - pin.offsetHeight);
    } else {
      const r = stage.getBoundingClientRect();
      p = passingProgress(r.top, r.height, window.innerHeight);
    }
    const { phase, sweep } = stageState(p);
    stage.style.setProperty('--sweep', sweep.toFixed(4));
    if (stage.dataset.phase === phase) return;
    stage.dataset.phase = phase;
    // Shown only for its beat, so Scene (which plays while on screen) starts and stops the clip by itself.
    if (action) action.hidden = phase !== 'action' && phase !== 'sweep';
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  stage.classList.add('is-live');
  measure();
}
```

- [ ] **Step 4: Run the unit test to see it pass**

Run: `npx vitest run tests/unit/stage.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add the failing e2e steps**

In `tests/e2e/sections.e2e.mjs`, above `// ── After every block has shown`, add:

```js
// ── Room stage (spec §5.5) ───────────────────────────────────
const STAGE = '#whats-included [data-stage]';
const untilPhase = (page, want) => page.waitForFunction((w) => document.querySelector('#whats-included [data-stage]').dataset.phase === w, want);
const shownRooms = (page) => page.$$eval('[data-stage-room]:not([hidden])', (els) => els.map((el) => el.dataset.stageRoom));
const pinned = (page) => page.locator('[data-stage-pin]').evaluate((el) => getComputedStyle(el).position === 'sticky');

/** Pinned layout: scroll to fraction f (0 to 1) of the stage's travel. */
const pinTo = (page, f) =>
  page.evaluate((f) => {
    const pin = document.querySelector('[data-stage-pin]');
    const track = pin.parentElement;
    const start = track.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(pin).top);
    window.scrollTo({ top: start + (track.offsetHeight - pin.offsetHeight) * f, behavior: 'instant' });
  }, f);

/** Unpinned layout: put the stage's centre where its progress is f. */
const passTo = (page, f) =>
  page.evaluate((f) => {
    const r = document.querySelector('#whats-included [data-stage]').getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight * (0.85 - 0.55 * f), behavior: 'instant' });
  }, f);

function clipRequests(page) {
  const urls = [];
  page.on('request', (request) => {
    if (request.url().includes('/media/action-kitchen')) urls.push(request.url());
  });
  return urls;
}

await step('on a tall desktop screen the stage holds still and plays before, action, sweep, after', async (page) => {
  await go(page, '/');
  assert.equal(await pinned(page), true);
  const pin = page.locator('[data-stage-pin]');
  await pinTo(page, 0.1);
  await untilPhase(page, 'before');
  assert.deepEqual(await shownRooms(page), ['kitchen']);
  assert.ok(!(await page.locator('[data-stage-book] a').isVisible()), 'no booking button yet');
  const box = await pin.boundingBox();
  assert.ok(box.y + box.height <= 900, `the pinned block fits the screen (bottom at ${box.y + box.height})`);
  await pinTo(page, 0.45);
  await untilPhase(page, 'action');
  assert.equal(Math.round((await pin.boundingBox()).y), Math.round(box.y), 'still pinned in the action beat');
  await pinTo(page, 0.75);
  await untilPhase(page, 'sweep');
  const sweep = await page.locator(STAGE).evaluate((el) => Number(el.style.getPropertyValue('--sweep')));
  assert.ok(sweep > 0.3 && sweep < 0.7, `--sweep is ${sweep}`);
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  const book = page.locator('[data-stage-book] a');
  await book.waitFor();
  assert.match(await book.getAttribute('href'), /^\/book\//);
  assert.equal((await book.innerText()).trim(), 'Book a clean');
  assert.equal((await page.locator('[data-stage-block] figcaption').innerText()).trim(), "Illustration, not a client's home.");
  for (const img of await page.locator('[data-stage-room]:not([hidden]) img').all()) assert.ok((await img.getAttribute('alt')).length > 20, 'before and after pictures are described');
}, { width: 1280, height: 900 });

await step('a wide screen plays the kitchen clip in the action beat and stops it afterwards', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  await pinTo(page, 0.1);
  await page.waitForTimeout(500);
  assert.deepEqual(urls, [], 'nothing is fetched before the beat');
  await pinTo(page, 0.45);
  await page.locator('[data-stage-action] [data-scene][data-playing]').waitFor();
  assert.ok(urls.some((u) => /\/media\/action-kitchen\.(webm|mp4)$/.test(u)), urls.join(', '));
  assert.ok(await page.locator('[data-stage-action] [data-scene-toggle]').isVisible(), 'the clip has a pause button');
  assert.ok(await page.locator('[data-stage-action] .sample-tag').isVisible(), 'the cleaner is marked as a sample');
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  await page.waitForFunction(() => document.querySelector('[data-stage-action] video').paused);
}, { width: 1280, height: 900 });

await step('choosing a room swaps the stage where it stands, and a room without pictures hides it', async (page) => {
  await go(page, '/');
  await page.locator('#plan [data-room-id="add-study"]').click(); // a study has a checklist and no pictures
  await pinTo(page, 1);
  await untilPhase(page, 'after');
  await page.locator('#whats-included .room--included[data-kind="bathroom"]').first().click();
  assert.deepEqual(await shownRooms(page), ['bathroom']);
  assert.equal(await page.locator(STAGE).getAttribute('data-phase'), 'after');
  await page.locator('#whats-included .room--included[data-kind="study"]').first().click();
  assert.ok(await page.locator('[data-stage-block]').isHidden());
  assert.equal((await page.locator('#whats-included [data-room-panel]:visible h3').innerText()).trim(), 'Study');
  await page.locator('#whats-included [data-room-id="kitchen"]').click();
  assert.ok(await page.locator('[data-stage-block]').isVisible());
  assert.deepEqual(await shownRooms(page), ['kitchen']);
}, { width: 1280, height: 900 });

await step('the living room fades to its finished state instead of sweeping', async (page) => {
  await go(page, '/');
  await pinTo(page, 0.75);
  await untilPhase(page, 'sweep');
  await page.locator('#whats-included .room--included[data-kind="living"]').first().click();
  const after = page.locator('[data-stage-room="living"] .stage__after');
  const [opacity, transform] = await after.evaluate((el) => [Number(getComputedStyle(el).opacity), getComputedStyle(el).transform]);
  assert.ok(opacity > 0.3 && opacity < 0.7, `opacity is ${opacity}`);
  assert.equal(transform, 'none');
  assert.ok(await page.locator(`${STAGE} .stage__band`).isHidden(), 'no light band over a fade');
}, { width: 1280, height: 900 });

await step('on a short desktop screen nothing pins and the stage plays as it crosses the screen', async (page) => {
  await go(page, '/');
  assert.equal(await pinned(page), false);
  assert.equal(await page.locator('[data-stage-pin]').evaluate((el) => el.parentElement.offsetHeight - el.offsetHeight), 0, 'no empty travel');
  await passTo(page, 0.1);
  await untilPhase(page, 'before');
  await passTo(page, 0.97);
  await untilPhase(page, 'after');
  await page.locator('[data-stage-book] a').waitFor();
  assert.ok(await page.locator('#whats-included [data-room-panel]:visible h3').isVisible(), 'the checklist is in reach');
}, { width: 1280, height: 700 });

await step('phones get a still of the cleaner in the action beat and never ask for the clip', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  assert.equal(await pinned(page), false);
  await passTo(page, 0.45);
  await untilPhase(page, 'action');
  const action = page.locator('[data-stage-action]');
  await action.waitFor();
  assert.equal(await action.locator('img').count(), 1);
  assert.match(await action.locator('img').getAttribute('alt'), /cleaner/i);
  assert.equal(await action.locator('video source').count(), 0);
  await passTo(page, 0.97);
  await untilPhase(page, 'after');
  await page.waitForTimeout(400);
  assert.deepEqual(urls, []);
});

await step('reduced motion: the finished room, the booking button, no pinning, no clip', async (page) => {
  const urls = clipRequests(page);
  await go(page, '/');
  assert.equal(await pinned(page), false);
  const stage = page.locator(STAGE);
  await stage.scrollIntoViewIfNeeded();
  assert.equal(await stage.getAttribute('data-phase'), 'after');
  assert.ok(!(await stage.evaluate((el) => el.classList.contains('is-live'))));
  assert.equal(await page.locator('[data-stage-room="kitchen"] .stage__after').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e), 0, '"after" is fully uncovered');
  assert.ok(await page.locator('[data-stage-book] a').isVisible());
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(400);
  assert.equal(await stage.getAttribute('data-phase'), 'after');
  assert.deepEqual(urls, []);
}, { width: 1280, height: 900, reducedMotion: 'reduce' });

await step('without JavaScript the stage shows the finished kitchen, its caption and the booking button', async (page) => {
  await go(page, '/');
  assert.deepEqual(await shownRooms(page), ['kitchen']);
  assert.equal(await page.locator(STAGE).getAttribute('data-phase'), 'after');
  assert.ok(await page.locator('[data-stage-book] a').isVisible());
  assert.equal((await page.locator('[data-stage-block] figcaption').innerText()).trim(), "Illustration, not a client's home.");
  assert.ok(await page.locator('[data-stage-action]').isHidden());
}, { width: 1280, height: 900, javaScriptEnabled: false });
```

- [ ] **Step 6: Run them to see them fail**

```bash
npm run build
STEP="stage|clip|room|phones get|living" npm run e2e -- http://localhost:4331 sections
```

Expected: FAIL: `[data-stage-pin]` and `[data-stage]` do not exist yet.

- [ ] **Step 7: Write `src/features/stage/RoomStage.astro`**

```astro
---
/**
 * The room stage (spec §5.5): the chosen room before and after a clean, played by
 * scroll progress (stage.ts). Rooms without both stills are left out, and with no
 * rooms at all nothing renders, so the checklist never waits on a picture.
 *
 * It rests on the finished room: that is what shows without the script and under
 * reduced motion. The owner of the plan picks the room by hiding all but one
 * [data-stage-room], and hides [data-stage-block] for a room that has none.
 */
import { business } from '@/config/business';
import { photoSlots } from '@/config/photo-slots';
import type { RoomKind } from '@/config/rooms';
import { hasPhoto } from '@/core/photos';
import Button from '@/core/ui/Button.astro';
import Photo from '@/core/ui/Photo.astro';
import Scene from '@/core/ui/Scene.astro';

/** `fade`: the two stills are not from the same camera position, so "after" fades in instead of sweeping across. */
const ROOMS: { kind: RoomKind; slot: string; fade?: boolean }[] = [
  { kind: 'kitchen', slot: 'room-kitchen' },
  { kind: 'bathroom', slot: 'room-bath' },
  { kind: 'bedroom', slot: 'room-bed' },
  { kind: 'living', slot: 'room-living', fade: true },
];
const staged = ROOMS.filter((r) => hasPhoto(`${r.slot}-before`) && hasPhoto(`${r.slot}-after`));
const alt = (slot: string) => (photoSlots as Record<string, { alt: string }>)[slot].alt;
const FIRST: RoomKind = 'kitchen';
const SIZES = '(min-width: 900px) 50vw, 100vw';
---

{
  staged.length > 0 && (
    <figure class="stage-block" data-stage-block hidden={!staged.some((r) => r.kind === FIRST)}>
      <div class="stage" data-stage data-phase="after">
        {staged.map((r) => (
          <div class="stage__room" data-stage-room={r.kind} data-fade={r.fade ? '' : undefined} hidden={r.kind !== FIRST}>
            <Photo slot={`${r.slot}-before`} alt={alt(`${r.slot}-before`)} ratio="16 / 9" sizes={SIZES} class="stage__img" />
            {r.kind === 'kitchen' && hasPhoto('action-kitchen') && (
              <div class="stage__action" data-stage-action hidden>
                <Scene slot="action-kitchen" portrait="action-kitchen-still" video="action-kitchen" alt={alt('action-kitchen-still')} />
                {business.demoMode && <span class="sample-tag">Sample photo</span>}
              </div>
            )}
            <div class="stage__after">
              <div class="stage__after-inner">
                <Photo slot={`${r.slot}-after`} alt={alt(`${r.slot}-after`)} ratio="16 / 9" sizes={SIZES} class="stage__img" />
              </div>
            </div>
          </div>
        ))}
        <div class="stage__band" aria-hidden="true" />
        <div class="stage__book" data-stage-book>
          <Button href="/book/" data-choose-time>Book a clean</Button>
        </div>
      </div>
      <figcaption>Illustration, not a client's home.</figcaption>
    </figure>
  )
}

<script>
  import { initStage } from './stage';
  initStage();
</script>

<style>
  .stage-block {
    display: grid;
    gap: var(--space-2);
  }
  figcaption {
    color: var(--color-ink-muted);
    font-size: var(--text-14);
  }
  /* --sweep is how much of "after" is uncovered. It rests at 1; stage.ts moves it. */
  .stage {
    --sweep: 1;
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--radius-control);
    background: var(--color-room);
  }
  .stage__room,
  .stage__action,
  .stage__after,
  .stage__after-inner,
  .stage__band,
  .stage :global(.stage__img) {
    position: absolute;
    inset: 0;
  }
  .stage :global(.stage__img) {
    border-radius: 0;
  }

  /* "After" is uncovered from left to right by two wrappers moving in opposite directions, so only transforms change. */
  .stage__after {
    overflow: hidden;
    transform: translateX(calc((var(--sweep) - 1) * 100%));
  }
  .stage__after-inner {
    transform: translateX(calc((1 - var(--sweep)) * 100%));
  }
  /* Stills that do not line up fade instead (spec §18). */
  .stage__room[data-fade] .stage__after {
    transform: none;
    opacity: var(--sweep);
  }
  .stage__room[data-fade] .stage__after-inner {
    transform: none;
  }

  /* The light band rides the sweep's edge. */
  .stage__band {
    opacity: 0;
    pointer-events: none;
    transform: translateX(calc(var(--sweep) * 100%));
    transition: opacity var(--dur-colour) linear;
  }
  .stage__band::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 14%;
    translate: -50% 0;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-surface) 65%, transparent), transparent);
  }
  .stage[data-phase='sweep'] .stage__band {
    opacity: 1;
  }
  .stage:has(.stage__room[data-fade]:not([hidden])) .stage__band {
    display: none;
  }

  /* The booking button belongs to the finished room. A solid button, so it never relies on the picture. */
  .stage__book {
    position: absolute;
    left: var(--space-4);
    bottom: var(--space-4);
    z-index: 1;
    transition: opacity var(--dur-colour) linear;
  }
  .stage.is-live:not([data-phase='after']) .stage__book {
    visibility: hidden;
    opacity: 0;
  }

  /* A room, or the action beat, fades in when it is switched on and fades out before it leaves.
     Browsers without discrete transitions swap at once. */
  @media (prefers-reduced-motion: no-preference) {
    .stage__room,
    .stage__action {
      transition:
        opacity var(--dur-reveal) var(--ease-out),
        display var(--dur-reveal) allow-discrete;
    }
    .stage__room[hidden],
    .stage__action[hidden] {
      opacity: 0;
    }
    @starting-style {
      .stage__room,
      .stage__action {
        opacity: 0;
      }
    }
  }
</style>
```

- [ ] **Step 8: Put the stage in `src/sections/RoomChecklist.astro`**

Add the import after the `FloorPlan` import:

```astro
import RoomStage from '@/features/stage/RoomStage.astro';
```

Replace the `<div class="included"> … </div>` block (the plan and the lists) with:

```astro
    <div class="included__track">
      <div class="included" data-stage-pin>
        <div class="included__plan">
          <div class="included__map">
            <FloorPlan id="included-plan" mode="read" title="Your home. Choose a room to see its checklist." selected="kitchen" />
          </div>
          <RoomStage />
        </div>
        <div class="included__lists" data-room-panels>
          {SERVICE_IDS.flatMap((service) =>
            ROOM_KINDS.map((kind) => (
              <div class="panel" data-room-panel data-room-kind={kind} data-service={service} hidden={!(kind === 'kitchen' && service === 'regular')}>
                <h3>{rooms.rooms[kind].label}</h3>
                <p class="panel__service">{SERVICE_LABELS[service]}</p>
                <ul role="list">
                  {checklistFor(kind, service, rooms).map((item) => (
                    <li><Icon name="check" size={20} />{item}</li>
                  ))}
                </ul>
              </div>
            )),
          )}
        </div>
      </div>
    </div>
```

In the `<script>`, replace the `show` function with:

```ts
  const stageBlock = section.querySelector<HTMLElement>('[data-stage-block]');
  const stageRooms = [...section.querySelectorAll<HTMLElement>('[data-stage-room]')];

  const show = () => {
    section.querySelectorAll<HTMLElement>('[data-room-panel]').forEach((p) => {
      p.hidden = !(p.dataset.roomKind === kind && p.dataset.service === service);
    });
    // The stage shows the same room. A room with no pictures has no stage: the checklist is all there is, as before.
    stageRooms.forEach((r) => (r.hidden = r.dataset.stageRoom !== kind));
    if (stageBlock) stageBlock.hidden = !stageRooms.some((r) => r.dataset.stageRoom === kind);
  };
```

In the `<style>` block, add after the `.included` rule:

```css
  .included__plan {
    display: grid;
    gap: var(--space-5);
  }
```

and replace the `@media (min-width: 900px)` block with:

```css
  @media (min-width: 900px) {
    .included {
      grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
      gap: var(--space-8);
    }
    /* Beside the stage the plan is the room picker, so it stays the size it is on a phone. */
    .included__map {
      max-width: 20rem;
    }
  }
  /* Tall desktop screens: the plan, stage and checklist hold still for 120vh of scrolling while the stage
     plays (spec §5.5). Only where the whole block fits under the header, and never under reduced motion.
     stage.ts reads `position` to know which way to measure, so this rule is the only switch. */
  @media (min-width: 1024px) and (min-height: 780px) and (prefers-reduced-motion: no-preference) {
    .included {
      position: sticky;
      top: 5.5rem;
    }
    .included__track::after {
      content: '';
      display: block;
      height: 120vh;
    }
  }
```

- [ ] **Step 9: Calibrate the pinning height**

The `min-height: 780px` above is an estimate: the block must fit under the header on every screen that pins. Build, then measure the tallest the block gets (the longest checklist is on a deep or end of lease clean):

```bash
npm run build
cat > ./.pin.tmp.mjs <<'EOF'
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const width of [1024, 1280, 1440]) {
  const page = await (await browser.newContext({ viewport: { width, height: 1400 } })).newPage();
  await page.goto('http://localhost:4331/', { waitUntil: 'load' });
  const tallest = await page.evaluate(() => {
    const pin = document.querySelector('[data-stage-pin]');
    const panels = [...document.querySelectorAll('#whats-included [data-room-panel]')];
    let max = 0;
    for (const shown of panels) {
      panels.forEach((p) => (p.hidden = p !== shown));
      max = Math.max(max, pin.offsetHeight);
    }
    return max;
  });
  console.log(width, 'tallest block', tallest, 'needs a screen of', tallest + 88);
  await page.close();
}
await browser.close();
EOF
node ./.pin.tmp.mjs
rm ./.pin.tmp.mjs
```

Set `min-height` in the media query to the largest "needs a screen of" value, rounded up to the next 20px. If that is more than 900px, stop and report the numbers instead of changing the layout. Report the value you set.

- [ ] **Step 10: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331 sections
npm run e2e -- http://localhost:4331 home
npm run e2e -- http://localhost:4331
npm run budget
```

Expected: all pass. If `#plan [data-room-id="add-study"]` does not resolve in the room-swap step, look at how `tests/e2e/home.e2e.mjs` adds a room to the estimator and use the same locator; do not change what the step asserts. If the pinned step's "fits the screen" assertion fails, Step 9's value is wrong.

- [ ] **Step 11: Commit**

```bash
git add src/features/stage src/sections/RoomChecklist.astro tests/unit/stage.test.ts tests/e2e/sections.e2e.mjs
git commit -m "feat(home): before and after room stage beside the checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Team pictures and the "Sample photo" mark

**Files:**
- Modify: `src/sections/Vetting.astro`, `src/pages/about.astro`
- Test: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: photo slots `founder` and `team` (Task 1); `.sampled`, `.sample-tag`, `data-reveal`, `--i`, `.motion`, `.is-in` (Task 2).
- Produces: nothing later tasks use.

- [ ] **Step 1: Add the failing steps**

In `tests/e2e/sections.e2e.mjs`, above `// ── After every block has shown`, add:

```js
// ── Team (spec §5.7, §7.3) ───────────────────────────────────
await step('the team section shows the founder and the team, each marked as a sample photo', async (page) => {
  await go(page, '/');
  const team = page.locator('#team');
  assert.equal(await team.locator('.checks li[data-reveal]').count(), 4);
  assert.equal(await team.locator('img').count(), 2);
  const tags = team.locator('.sample-tag');
  assert.equal(await tags.count(), 2);
  for (const tag of await tags.all()) {
    assert.equal((await tag.innerText()).trim(), 'Sample photo');
    assert.ok(await tag.evaluate((el) => el.closest('.sampled')?.querySelector('img') !== null), 'the mark sits on its picture');
    assert.equal(await tag.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'on a solid chip');
  }
  assert.match(await team.locator('.founder img').getAttribute('alt'), /Mel Hartigan/);
});

await step('the checks tick in one after another', async (page) => {
  await go(page, '/');
  await page.locator('#team .checks li').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('#team .checks .icon')].every((el) => getComputedStyle(el).opacity === '1'));
  const delays = await page.$$eval('#team .checks .icon', (els) => els.map((el) => parseFloat(getComputedStyle(el).transitionDelay)));
  assert.ok(delays[3] > delays[0], delays.join(' '));
}, { width: 1280 });

await step('the founder picture on the about page is marked as a sample photo', async (page) => {
  await go(page, '/about/');
  const tag = page.locator('.founder .sample-tag');
  assert.equal(await tag.count(), 1);
  assert.ok(await tag.isVisible());
  assert.equal(await page.locator('.founder img').getAttribute('loading'), 'eager');
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm run build
STEP="team|checks|founder" npm run e2e -- http://localhost:4331 sections
```

Expected: the team step fails (`0 !== 4`), the checks step fails or times out, the about step fails (`0 !== 1`).

- [ ] **Step 3: `src/sections/Vetting.astro`**

Add the imports:

```astro
import { photoSlots } from '@/config/photo-slots';
import { hasPhoto } from '@/core/photos';
```

Replace the markup inside `<div class="wrap vetting__grid">` with:

```astro
    <div class="vetting__checks">
      <SectionHead id="team-title" title="Who comes to your home" />
      <ul class="checks" role="list">
        {checks.map((c, i) => <li data-reveal style={`--i: ${i}`}><Icon name="check" size={22} />{c}</li>)}
      </ul>
      {
        hasPhoto('team') && (
          <div class="sampled vetting__team" data-reveal>
            <Photo slot="team" alt={photoSlots.team.alt} ratio="3 / 2" sizes="(min-width: 900px) 640px, 100vw" />
            {business.demoMode && <span class="sample-tag">Sample photo</span>}
          </div>
        )
      }
    </div>
    <figure class="founder" data-reveal>
      <div class="sampled">
        <Photo slot="founder" alt={`${founder.name}, ${founder.role}`} label={`${founder.name}, ${founder.role}`} ratio="4 / 5" sizes="(min-width: 900px) 320px, 100vw" />
        {business.demoMode && hasPhoto('founder') && <span class="sample-tag">Sample photo</span>}
      </div>
      <blockquote>{founder.note}</blockquote>
      <figcaption>{founder.name}, {founder.role.toLowerCase()} since {founder.since}</figcaption>
    </figure>
```

Add to the `<style>` block, after the `.checks li` rule:

```css
  /* Each check ticks in a beat after its line rises. */
  :global(.motion) .checks li :global(.icon) {
    opacity: 0;
    transform: scale(0.4);
    transition: opacity var(--dur-reveal) var(--ease-out), transform var(--dur-reveal) var(--ease-out);
    transition-delay: calc(var(--i, 0) * 80ms + 250ms);
  }
  :global(.motion) .checks li.is-in :global(.icon) {
    opacity: 1;
    transform: none;
  }
  .vetting__team {
    margin-top: var(--space-6);
  }
```

- [ ] **Step 4: `src/pages/about.astro`**

Add `import { hasPhoto } from '@/core/photos';` to the frontmatter imports. Replace the founder `<Photo … />` line (the one with `slot="founder" priority`) with:

```astro
    <div class="sampled founder__photo">
      <Photo slot="founder" priority alt={`${founder.name}, ${founder.role.toLowerCase()}`} label={`${founder.name}, ${founder.role.toLowerCase()}`} ratio="4 / 5" sizes="(min-width: 900px) 360px, 100vw" />
      {business.demoMode && hasPhoto('founder') && <span class="sample-tag">Sample photo</span>}
    </div>
```

and in its `<style>` block replace

```css
  .founder :global(.placeholder),
  .founder :global(.photo) {
    max-width: 360px;
  }
```

with

```css
  .founder__photo {
    max-width: 360px;
  }
```

- [ ] **Step 5: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331 sections
npm run e2e -- http://localhost:4331 pages
npm run e2e -- http://localhost:4331 quality
```

Expected: all pass. `quality` still finds the about page's founder picture loading eagerly with high priority; `pages` still finds the team's names on the about page.

- [ ] **Step 6: Commit**

```bash
git add src/sections/Vetting.astro src/pages/about.astro tests/e2e/sections.e2e.mjs
git commit -m "feat(team): founder and team pictures, marked as sample photos in the demo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Map entrance, offices photo and the closing band

**Files:**
- Modify: `src/features/areas/CoverageMap.astro`, `src/sections/OfficesBand.astro`, `src/sections/CtaBand.astro`, `src/pages/index.astro`
- Test: `tests/e2e/sections.e2e.mjs`

**Interfaces:**
- Consumes: photo slots `offices` (existing) and `closing` (Task 1); `data-reveal`, `.is-in`, `.motion`, `data-progress` / `--p` (Task 2); `Scene.astro` (`--scene-scale` scales its picture); `PriceLine.astro` (existing: renders the live price with the `data-price-*` hooks and a "Choose a time" button, takes extra actions in its default slot, and marks itself `data-price-line` so the pinned price tag hides while it is on screen).
- Produces: `CtaBand` prop `scene?: string` (a photo slot). With a slot that has a file, the band is a solid card over that picture holding the live price. Without it, the band is unchanged.

- [ ] **Step 1: Add the failing steps**

In `tests/e2e/sections.e2e.mjs`, above `// ── After every block has shown`, add:

```js
// ── Areas, offices, close (spec §5.9, §5.10) ─────────────────
const mapTransform = () => getComputedStyle(document.querySelector('#areas .map svg')).transform;

await step('the map lies back, settles flat, and its pins drop in', async (page) => {
  await go(page, '/');
  assert.equal(await page.locator('#areas [data-map-point]').count(), 12);
  assert.notEqual(await page.evaluate(mapTransform), 'none');
  await page.locator('#areas .map').scrollIntoViewIfNeeded();
  await page.waitForFunction(`(${mapTransform})() === 'none' || new DOMMatrix((${mapTransform})()).isIdentity`);
  await page.waitForFunction(() => [...document.querySelectorAll('#areas [data-map-point]')].every((el) => getComputedStyle(el).opacity === '1'));
  const delays = await page.$$eval('#areas [data-map-point]', (els) => els.map((el) => parseFloat(getComputedStyle(el).transitionDelay)));
  assert.ok(delays[11] > delays[0], delays.join(' '));
}, { width: 1280 });

await step('the map is flat from the start under reduced motion', async (page) => {
  await go(page, '/');
  assert.equal(await page.evaluate(mapTransform), 'none');
  assert.ok((await page.$$eval('#areas [data-map-point]', (els) => els.map((el) => getComputedStyle(el).opacity))).every((o) => o === '1'));
}, { width: 1280, reducedMotion: 'reduce' });

await step('the offices band shows its photo, which settles from 1.1 to 1, and keeps its link', async (page) => {
  await go(page, '/');
  const band = page.locator('.offices');
  assert.equal(await band.locator('a[href="/offices/#walkthrough"]').count(), 1);
  const scale = () => band.locator('img').evaluate((img) => new DOMMatrix(getComputedStyle(img).transform).a);
  await band.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight + 10, behavior: 'instant' }));
  await page.waitForTimeout(150);
  assert.ok((await scale()) > 1.08, `starts near 1.1: ${await scale()}`);
  await band.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'instant' }));
  await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.offices img')).transform).a === 1);
}, { width: 1280 });

const text = (page, selector) => page.locator(selector).innerText();

await step("the closing band's price follows the estimator, on load and after a change", async (page) => {
  await go(page, '/');
  const closing = page.locator('.cta--scenic');
  assert.equal(await closing.locator('[data-scene] img').getAttribute('alt'), '');
  assert.equal(await closing.locator('.cta__card').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  assert.equal(await text(page, '.cta--scenic [data-price-per-visit]'), await text(page, '#plan [data-price-per-visit]'));
  assert.equal((await closing.locator('[data-choose-time]').innerText()).trim(), 'Choose a time');

  const before = await text(page, '#plan [data-price-per-visit]');
  await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
  await page.waitForFunction((was) => document.querySelector('#plan [data-price-per-visit]').textContent !== was, before);
  const same = async () => {
    assert.equal(await text(page, '.cta--scenic [data-price-per-visit]'), await text(page, '#plan [data-price-per-visit]'));
    assert.equal(await text(page, '.cta--scenic [data-price-summary]'), await text(page, '.scene-hero [data-price-summary]'));
    assert.equal(await closing.locator('[data-choose-time]').getAttribute('href'), await page.locator('#plan [data-choose-time]').getAttribute('href'));
  };
  await same();
  // A returning visitor: the saved selection is applied to every price on the page before they scroll.
  await go(page, '/');
  assert.notEqual(await text(page, '#plan [data-price-per-visit]'), before);
  await same();
  // At the foot of the page the price is on screen in full, so the pinned tag steps aside.
  await closing.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-booking-tag]').hidden);
  assert.equal(await page.locator('h1').count(), 1);
}, { width: 1280 });

await step('the closing picture settles from 1.08 as the band comes up the screen', async (page) => {
  await go(page, '/');
  const scale = () => page.locator('.cta--scenic [data-scene] img').evaluate((img) => new DOMMatrix(getComputedStyle(img).transform).a);
  assert.ok(Math.abs((await scale()) - 1.08) < 0.001, `starts at 1.08: ${await scale()}`);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.cta--scenic [data-scene] img')).transform).a < 1.07);
}, { width: 1280 });

await step('inner pages keep the plain closing band', async (page) => {
  await go(page, '/faq/');
  assert.equal(await page.locator('.cta--scenic').count(), 0);
  assert.equal((await page.locator('.cta [data-choose-time]').innerText()).trim(), 'Book a clean');
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
npm run build
STEP="map|offices|closing|inner pages" npm run e2e -- http://localhost:4331 sections
```

Expected: the first map step fails (the transform is already `none`), the offices step fails (no `img`), the two closing steps fail (`.cta--scenic` does not exist); the reduced-motion map step and the inner-pages step pass.

- [ ] **Step 3: `src/features/areas/CoverageMap.astro`**

Change the figure and the point group:

```astro
<figure class="map" data-reveal>
```

```astro
    {business.areas.map((a, i) => {
      const p = at.get(a.suburb);
      return p && (
        <g data-map-point={a.suburb} class:list={['map__point', { 'map__point--page': a.page }]} style={`--i: ${i}`}>
```

and add to the end of its `<style>` block:

```css
  /* Entrance (spec §5.9), once, when the map comes on screen: it lies back 12° and settles flat,
     then the pins drop in one after another. Under .motion only, so the map is never left tilted. */
  :global(.motion) .map svg {
    transform: perspective(60rem) rotateX(12deg);
    transform-origin: 50% 100%;
    transition: transform var(--dur-scene) var(--ease-out);
  }
  :global(.motion) .map.is-in svg {
    transform: none;
  }
  :global(.motion) .map__point {
    opacity: 0;
    transform: translateY(-16px);
    transition: opacity var(--dur-reveal) var(--ease-out), transform var(--dur-reveal) var(--ease-out);
    transition-delay: calc(var(--i, 0) * 60ms + 300ms);
  }
  :global(.motion) .map.is-in .map__point {
    opacity: 1;
    transform: none;
  }
```

- [ ] **Step 4: `src/sections/OfficesBand.astro`**

Replace the whole file with:

```astro
---
/** One line for facility managers, in their own voice, pointing to the offices page. */
import { photoSlots } from '@/config/photo-slots';
import Button from '@/core/ui/Button.astro';
import Photo from '@/core/ui/Photo.astro';
---

<section class="offices" aria-labelledby="offices-title" data-progress>
  <div class="wrap offices__inner">
    <Photo slot="offices" alt={photoSlots.offices.alt} ratio="3 / 2" sizes="(min-width: 900px) 240px, 100vw" class="offices__photo" />
    <div>
      <h2 id="offices-title">Managing an office, clinic or strata building?</h2>
      <p>We price commercial cleaning after a walk-through of your site, and send insurance certificates on request.</p>
    </div>
    <Button href="/offices/#walkthrough" variant="secondary">Request a walk-through</Button>
  </div>
</section>

<style>
  .offices {
    padding-block: var(--space-6);
    border-block: var(--wall) solid var(--color-ink);
  }
  .offices__inner {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }
  .offices :global(.offices__photo) {
    width: 100%;
  }
  /* The photo settles from 1.1 to 1 inside its frame as the band comes up the screen. */
  :global(.motion) .offices :global(.offices__photo img) {
    transform: scale(calc(1.1 - 0.1 * min(1, var(--p) * 2)));
  }
  h2 {
    font-size: var(--text-22);
  }
  p {
    color: var(--color-ink-muted);
  }
  @media (min-width: 900px) {
    .offices__inner {
      grid-template-columns: 240px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-6);
    }
  }
</style>
```

- [ ] **Step 5: `src/sections/CtaBand.astro`**

Replace the whole file with:

```astro
---
/**
 * Closing call to action: book, or call. With `scene` (a photo slot that has a file)
 * the band is a solid card in front of that picture, holding the live price. Without
 * one, or while the slot is empty, it is the plain band.
 */
import { business } from '@/config/business';
import { formatPhoneHref } from '@/core/format';
import { hasPhoto } from '@/core/photos';
import Button from '@/core/ui/Button.astro';
import Scene from '@/core/ui/Scene.astro';
import PriceLine from '@/features/pricing/PriceLine.astro';

interface Props {
  title: string;
  text?: string;
  /** Photo slot for a backdrop behind a card with the live price. */
  scene?: string;
}
const { title, text, scene } = Astro.props;
const scenic = scene !== undefined && hasPhoto(scene);
---

{
  scenic ? (
    <section class="cta cta--scenic" aria-labelledby="cta-title" data-progress>
      <Scene slot={scene!} />
      <div class="wrap cta__front">
        <div class="cta__card" data-reveal>
          <div>
            <h2 id="cta-title">{title}</h2>
            {text && <p>{text}</p>}
          </div>
          <PriceLine>
            <Button href={formatPhoneHref(business.phone)} variant="secondary" size="lg" icon="phone">{business.phone}</Button>
          </PriceLine>
        </div>
      </div>
    </section>
  ) : (
    <section class="cta" aria-labelledby="cta-title">
      <div class="wrap cta__inner" data-reveal>
        <div>
          <h2 id="cta-title">{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <div class="cta__actions">
          <Button href="/book/" size="lg" data-choose-time>Book a clean</Button>
          <Button href={formatPhoneHref(business.phone)} variant="secondary" size="lg" icon="phone">{business.phone}</Button>
        </div>
      </div>
    </section>
  )
}

<style>
  .cta {
    padding-block: var(--space-7);
    background: var(--color-room);
  }
  .cta__inner {
    display: grid;
    gap: var(--space-5);
  }
  p {
    margin-top: var(--space-2);
    color: var(--color-ink-muted);
  }
  .cta__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  @media (min-width: 900px) {
    .cta__inner {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }
  }

  /* With a picture: the card is solid, so its words and buttons never rely on the picture for contrast. */
  .cta--scenic {
    position: relative;
    padding-block: var(--space-8);
  }
  /* The picture settles from 1.08 to 1 as the band comes up the screen. */
  :global(.motion) .cta--scenic {
    --scene-scale: calc(1.08 - 0.08 * min(1, var(--p) * 2));
  }
  .cta__front {
    position: relative;
  }
  .cta__card {
    display: grid;
    gap: var(--space-4);
    max-width: 32rem;
    padding: var(--space-5);
    background: var(--color-surface);
    border-radius: var(--radius-control);
    box-shadow: var(--shadow-2);
  }
  @media (min-width: 768px) {
    .cta__card {
      padding: var(--space-6);
    }
  }
</style>
```

- [ ] **Step 6: `src/pages/index.astro`**

Add `import CtaBand from '@/sections/CtaBand.astro';` after the `Faq` import, and add after `<Faq tag="home" limit={5} />`:

```astro
  <CtaBand title="Ready when you are" text="Price your home on the floor plan and choose a time. No phone call needed." scene="closing" />
```

Both strings are the ones `src/pages/faq.astro` already passes to `CtaBand`; copy them exactly.

- [ ] **Step 7: Run the checks**

```bash
npm test
npm run check
npm run build
npm run e2e -- http://localhost:4331
npm run budget
```

Expected: every file passes. In particular `hero` and `home` still pass with a second price line on the page, and the four overflow steps and four axe steps in `sections` pass with the closing band present.

- [ ] **Step 8: Commit**

```bash
git add src/features/areas/CoverageMap.astro src/sections/OfficesBand.astro src/sections/CtaBand.astro src/pages/index.astro tests/e2e/sections.e2e.mjs
git commit -m "feat(home): map entrance, offices photo and a closing band with the live price" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Documents, measurements and other browsers

**Files:**
- Create: `tools/page-weight.mjs`, `tests/e2e/browsers.e2e.mjs`
- Modify: `docs/spec.md`, `docs/design-system.md`, `docs/customising.md`, `README.md`, this plan's Measurements table

**Interfaces:**
- Consumes: everything above.
- Produces: the numbers in the Measurements table and the report to the owner.

- [ ] **Step 1: Write `tools/page-weight.mjs`**

```js
/**
 * How many bytes the home page transfers, at a phone and a desktop width: once
 * loaded, and after scrolling the whole page. Needs a running preview.
 *
 *   node tools/page-weight.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [width, height] of [[375, 800], [1280, 800]]) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const atLoad = bytes;
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 150));
    }
  });
  await page.waitForLoadState('networkidle');
  console.log(`${width}px  at load ${(atLoad / 1024).toFixed(0)} KB  after scrolling the whole page ${(bytes / 1024).toFixed(0)} KB`);
  await page.close();
}
await browser.close();
```

- [ ] **Step 2: Write `tests/e2e/browsers.e2e.mjs`**

```js
/**
 * The home page in Firefox and WebKit (spec §19, phase 6), where Playwright has
 * them installed. Every other file runs in Chromium through harness.mjs; this one
 * checks that the page still reads, prices and scrolls in the other two engines.
 * A browser that is not installed is reported as skipped, never as passed.
 */
import assert from 'node:assert/strict';
import { firefox, webkit } from 'playwright';

const base = process.argv[2] ?? process.env.E2E_BASE ?? 'http://localhost:4321';
const results = [];
let failed = 0;

async function check(name, engine, viewport) {
  let browser;
  try {
    browser = await engine.launch();
  } catch {
    results.push(`– ${name}: skipped, this browser is not installed`);
    return;
  }
  const page = await (await browser.newContext({ viewport })).newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + '/', { waitUntil: 'load' });
    assert.equal(await page.locator('h1').count(), 1);
    const price = () => page.locator('#plan [data-price-per-visit]').innerText();
    const before = await price();
    await page.locator('[data-plan-controls] [data-step="bedrooms"][data-delta="1"]').click();
    await page.waitForFunction((was) => document.querySelector('#plan [data-price-per-visit]').textContent !== was, before);
    assert.equal(await page.locator('.cta--scenic [data-price-per-visit]').innerText(), await price(), 'the closing band shows the same price');
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.6) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-reveal]')].every((el) => getComputedStyle(el).opacity === '1'));
    await page.waitForFunction(() => document.querySelector('#whats-included [data-stage]').dataset.phase === 'after');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll');
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    results.push(`✓ ${name}`);
  } catch (e) {
    failed++;
    results.push(`✗ ${name}\n    ${String(e.message).split('\n').slice(0, 3).join('\n    ')}`);
  } finally {
    await browser.close();
  }
}

for (const [label, engine] of [['Firefox', firefox], ['WebKit', webkit]]) {
  await check(`${label}, 1280 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 1280, height: 900 });
  await check(`${label}, 390 wide: the home page prices, reveals every block and finishes the stage`, engine, { width: 390, height: 800 });
}

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('✓')).length}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run it**

```bash
npm run build
npm run e2e -- http://localhost:4331 browsers
```

Expected: four lines, each ✓ or "– … skipped". A ✗ is a real finding: investigate it (systematically: read the message, reproduce in that engine, find the cause) and fix the cause in the component, not the check. Report exactly which lines were ✓ and which were skipped.

- [ ] **Step 4: Update `docs/spec.md`**

Read §6.1, §7.4, §8, §9 and §15 first, then make these changes, keeping each section's existing style:

- **§6.1 (home order):** the order is now hero, estimator, trust row, services, room checklist with the room stage, reviews, team, process, areas, offices band, FAQ, closing band. State that services are photo cards (two across from 900px), reviews are quote cards, the room checklist has a before-and-after stage for kitchen, bathroom, bedroom and living room, and the page ends with the closing band holding the live price.
- **§7.4 (motion):** add Reveal (blocks marked `data-reveal` fade and rise once; hidden only under `html.motion`, which `layouts/motion.ts` sets), and that scroll-driven styles are scoped under `.motion` too. State again that under reduced motion and on bare pages none of it runs.
- **§8 (budget):** no limit changes. Replace the measured figures with the ones from Step 7.
- **§9 (photos):** replace "never of people presented as staff" with the people rule: in the demo, pictures of people are generated illustrations (cleaners working or arriving, one founder portrait), each marked "Sample photo"; never a face on a review, never a child, never a real person; a live client replaces every one with real photographs before going live. Add that "before" pictures show an ordinary week and the stage always carries "Illustration, not a client's home."
- **§15 (build notes and measured table):** the photo slots are 24 of 24 filled; the home page has a hero photo and clip, the room stills and the kitchen clip; update every measured figure with Step 7's numbers and today's date (11 October 2026). If the heading at about line 478 disagrees with the Lighthouse row beneath it (a known leftover), make the heading match the row.

- [ ] **Step 5: Update `docs/design-system.md`, `docs/customising.md` and `README.md`**

`docs/design-system.md`:
- Shape: replace "Services, reviews and team are lists or rows, never grids of identical cards" with: services are photo cards two across from 900px and reviews are quote cards, both on `--color-surface` with `--shadow-1`; nothing else on the home page is a card grid.
- Motion table: add rows for Reveal (`data-reveal`, optional `--i`, 500ms, once), the process line (`--fill` from `--p`), service photo drift and card tilt (fine pointers, at most 4°), review drift, the room stage (before, action, sweep, after at 0.3, 0.6, 0.9; pinned only at 1024px and wider on screens tall enough), the map entrance, and the offices and closing pictures settling to scale 1.
- Core UI / sections tables: add `.sample-tag`, `features/stage/RoomStage.astro`, and `CtaBand`'s `scene` prop; update the `OfficesBand`, `ServicesList`, `Reviews`, `Vetting`, `HowItWorks` and `RoomChecklist` rows to what they now do.

`docs/customising.md`:
- Photos: replace "The `founder` slot is always the real person" and "never people presented as staff" with the people rule from §9 above, ending with this sentence verbatim: `Replace every image of a person with a real photograph before a real business goes live.`
- Add a short "Room stage" part: the eight room slots (`room-<kitchen|bath|bed|living>-<before|after>`), that a pair must be shot from the same position or the room is given `fade: true` in `src/features/stage/RoomStage.astro`, that a room without both files has no stage, and how to replace the kitchen clip (`public/media/action-kitchen.mp4` and `.webm` plus `action-kitchen.jpg` as its first frame and `action-kitchen-still.jpg` for phones). Give the encode commands from Task 1 Step 2 of this plan.
- In the existing hero encode commands, add `-level:v 4.0` to the MP4 line and `-map_metadata -1` to both, and remove `fps=30` if it is still there.
- Going live checklist: add "Replace every picture of a person (`founder`, `team`, the kitchen clip and its two stills) with real photographs or remove them."
- Swapping the closing picture: the `closing` slot; without a file the home page's closing band is the plain band.

`README.md`: in the `src/features/` row of the code table, add `stage` to the listed folders.

- [ ] **Step 6: Run everything**

```bash
npm test
npm run check
npm run build
npm run budget
npm run e2e -- http://localhost:4331
npm run photos:status
node tools/page-weight.mjs http://localhost:4331
```

Expected: all green; record the unit test count, the e2e step total (add up every file's "N/N steps passed"), the three heaviest pages from the budget, the lazy chunk size, and the four page-weight numbers.

- [ ] **Step 7: Lighthouse**

Three runs each for `/` and `/book/` (mobile is Lighthouse's default):

```bash
OUT=node_modules/.cache/lighthouse; mkdir -p "$OUT"
for page in home book; do
  url="http://localhost:4331/"; [ "$page" = book ] && url="http://localhost:4331/book/"
  for i in 1 2 3; do CHROME_PATH="$CHROMIUM_PATH" npx --yes lighthouse@12 "$url" --only-categories=performance,accessibility --output=json --output-path="$OUT/$page-$i.json" --quiet --chrome-flags="--headless=new"; done
done
node -e "const fs=require('fs');for(const p of ['home','book'])for(const i of [1,2,3]){const r=JSON.parse(fs.readFileSync('node_modules/.cache/lighthouse/'+p+'-'+i+'.json'));console.log(p,i,'perf',Math.round(r.categories.performance.score*100),'a11y',Math.round(r.categories.accessibility.score*100),'LCP',r.audits['largest-contentful-paint'].displayValue,'CLS',r.audits['cumulative-layout-shift'].displayValue,'TBT',r.audits['total-blocking-time'].displayValue)}"
```

Record the median of each page's three runs. If Lighthouse cannot run here, say so and leave the cells as "not run"; never fill in a number that was not measured. If home performance is under 90 or accessibility under 100, or layout shift is above 0, report the failing audits (`r.audits` entries with a score under 1) instead of adjusting anything in this task.

- [ ] **Step 8: Fill in the Measurements table at the end of this plan, and the same figures in `docs/spec.md` §15**

- [ ] **Step 9: Commit**

```bash
git add tools/page-weight.mjs tests/e2e/browsers.e2e.mjs docs README.md
git commit -m "docs: record the finished home page, the people rule and the measurements" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Measurements

"Before" is the branch at `df2041c` (the end of part 1), measured on 11 October 2026 before any change in this plan. Fill "After" in Task 8 with numbers that were actually measured; write "not run" where one was not.

| Item | Target | Before | After |
|---|---|---|---|
| Unit tests | all pass | 334 | 340 |
| E2E steps | all pass | 132 | 193 (12 files, none skipped) |
| `/` eager JavaScript, gzipped | ≤ 30 KB | 12.5 KB | 13.7 KB |
| Lazy JavaScript, gzipped | ≤ 150 KB | 130.8 KB | 130.8 KB |
| Home transfer, phone 375px at pixel ratio 1, at load / after scrolling | report | 112 KB / 128 KB | 76 KB / 212 KB |
| Home transfer, phone 375px at pixel ratio 3 (what a current phone downloads), at load / after scrolling | report | not measured | 97 KB / 491 KB |
| Home transfer, desktop 1280px at pixel ratio 1, at load / after scrolling | report | 1111 KB / 1111 KB | 1088 KB / 2052 KB |
| `action-kitchen.mp4` / `.webm` | ≤ 2.5 MB / ≤ 1.5 MB | not present | 1,106,976 / 723,771 bytes |
| Lighthouse mobile `/`: performance / accessibility | ≥ 90 / 100 | 99 / 100 (before the hero photo and clip) | 98 / 100 (median of 3) |
| Lighthouse mobile `/book/`: performance / accessibility | ≥ 90 / 100 | not re-run in part 1 | 98 / 100 (median of 3) |
| Layout shift, `/` | 0 | not re-run in part 1 | 0.026 (target not met; see the note below the table) |
| Layout shift, `/book/` | 0 | not re-run in part 1 | 0.074 (target not met; the same cause) |
| Firefox and WebKit through Playwright | pass where installed | not run | 5 of 5 passed (1280 and 390 wide, both engines, and a WebKit reload at 1280); a missing engine is reported as skipped |

The page-weight figures in the "After" column come from the final `tools/page-weight.mjs`, which adds up every chunk of every response body (`Network.dataReceived`, headers not counted) in Chromium. The "Before" figures came from the first version of the tool, which counted only responses that finished, so the columns are not exactly like for like. Three identical runs of the final tool gave the same lines. The pixel ratio 3 line is what a current phone downloads, because it fetches the larger pictures; the pixel ratio 1 line is kept so it can be compared with the "Before" column. At 1280 wide the growth after load (about 964 KB) was measured as the kitchen clip, 707 KB as WebM in Chromium, and about 257 KB of lazy pictures, 99 KB of them the room stills; nothing else grew. Phones never request either clip. A browser that takes the MP4 files would fetch more, and that has not been measured.

The layout shift is not the hero. At about 412px wide the demo ribbon's sentence (`src/layouts/DemoRibbon.astro`) fits on one line in the fallback font and wraps to two when the web font loads, which pushes `main` down 22px (measured at 412 wide: `main` moves from 118 to 140px, and the ribbon's theme line from 26 to 49px) on both pages. There is no shift of note at 375 wide or 1280 wide (0.003 or less). The ribbon renders only in demo mode, and it predates the redesign and was left unchanged. The 0.026 and 0.074 are Lighthouse's phone-profile figures.

## Not covered by this plan (for the owner)

- A real iPhone, a screen reader and 200% zoom need the owner's devices.
- The home model's frame rate was not measured in part 1 and is not measured here.
- `tests/e2e/quality.e2e.mjs:204` has a stale comment ("The home page has no hero photo"). The spec allows edits to only two existing test files, so it is left for the owner to approve.
- Four service photos are under 1600px wide and `service-move-in.jpg` is a portrait picture in a landscape slot (carried over from part 1).
- Known issue: the demo ribbon wraps to a second line when the web font loads at about 412px wide, shifting the page 22px (0.026 on `/`, 0.074 on `/book/`, against a target of 0). It shows only in demo mode and was not changed.
- All eight room stills load once the stage is near, although one room shows. Loading only the chosen room's pair would save most of that on phones, at the cost of a short wait when another room is tapped.
