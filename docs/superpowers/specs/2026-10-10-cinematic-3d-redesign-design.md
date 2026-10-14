# Cinematic 3D redesign: design spec

Status: draft for owner review, 10 October 2026. No product code exists for this yet.

## 1. Goal

Turn the existing Clearday home page into a cinematic, scroll-led experience with one real-time 3D centrepiece, without changing pricing, booking logic, content or sample-data status.

Success means:

- A visitor sees a photoreal home in the first screen, then a 3D model of *their* home that reacts to the estimator.
- Every existing estimator, booking, navigation and form behaviour works exactly as on the live site, with and without WebGL, video, JavaScript storage or motion.
- All existing tests pass, with only the edits listed in §12.
- Performance and accessibility are reported from measurements taken before and after, never assumed.

## 2. Owner decisions (10 October 2026)

| # | Decision | Consequence |
|---|---|---|
| 1 | Build on the live site | Work branches from `main` (`d5053fe`). |
| 2 | Default palette | The live default theme `floorplan` (navy ink, yellow rooms) stays the default. `eucalyptus` stays as the alternate. Generated imagery is theme-neutral. |
| 3 | Real-time 3D | three.js is added. The JavaScript budget is split into an eager and a lazy limit (§9). |
| 4 | Generate people | Generated cleaners, a team image and a founder portrait are used, under the rules in §7.3. |
| 5 | Before and after | Illustrated before/after imagery is used, with a visible caption. |
| 6 | Flow capabilities | Frames to Video with start and end frames, image editing, 9:16 and clean 1080p export are available. |

Assumptions made on the owner's behalf, each reversible:

- A1. Decision 2 was read as "keep the live default palette". Switching the default is one value in `src/config/business.ts`.
- A2. The 9 CC0 photos in the uncommitted `src/assets/photos/` are copied onto the new branch with their credits and their corrected alt texts in `photo-slots.ts`. Nothing else is taken from the restyle branch.
- A3. In demo mode every image showing a person carries a "Sample photo" caption. Reviews get no faces.
- A4. three.js is used directly. React Three Fiber is not added, because the site has no React.
- A5. The 3D model is not downloaded on phones (viewport under 768 px).
- A6. Section order follows the owner's brief. The four process steps keep the site's existing copy.

## 3. What must not change

- `src/config/*`, `src/domain/*`, `src/content/*`: pricing numbers, quote logic, selection, events, checklists, reviews, team, FAQs, policies.
- `/book/` flow, walk-through, waitlist, referral and careers forms, and the owner console.
- Every `id`, `data-*` hook, form `name` and class that a test uses. In particular the estimator section keeps `id="plan"` and class `hero`, and contains exactly one of each `data-price-*` hook.
- Demo ribbon, "(sample)" labels, theme switcher and `?theme=` behaviour.
- Import boundaries, the tokens-only colour rule and the storage rule.

A bug found during the work is written up separately and left alone.

## 4. Creative direction: "One clear day"

The page is one day in one clean Brisbane home: morning light in the hero, the clean happening room by room, afternoon calm at the close.

- **Photoreal comes from footage and stills.** Real-time rendering cannot match it without a 3D artist's models and baked lighting, which this project does not have.
- **Real-time 3D is used where it earns its place:** the home model, because it must respond to 96 possible room combinations and cannot be pre-rendered.
- **Depth:** three planes. Scene at the back, elevated cards in the middle, copy in front.
- **Motion vocabulary:** Press (existing 160 ms scale), Reveal (16 px rise, 500 ms, 80 ms stagger, once), Drift (scroll-linked, at most 6% travel), Sweep (a band of light revealing the clean state).
- **One easing curve:** the existing `--ease-out`.
- Scrolling stays native. Nothing is scroll-jacked.

## 5. Home page structure

Order: `HeroScene`, estimator (`#plan`), `BookingTag`, `TrustRow`, `ServicesList`, `RoomChecklist`, `Reviews`, `Vetting`, `HowItWorks`, `Coverage`, `OfficesBand`, `Faq`, `CtaBand`.

### 5.1 Hero (new section `HeroScene`)

- Full-bleed scene: poster still G0, with video loop G1 fading in over the identical frame on desktop and tablet.
- Copy sits in a solid, elevated surface card on the calm left side of the scene, so contrast never depends on the image.
- The card holds the page's single `h1` ("Your home, priced room by room."), the existing lead, a price line and two buttons.
- The price line shows summary, per-visit price and first-visit price through the existing `data-price-*` hooks, server-rendered from `quote(DEFAULT_SELECTION)` like `PriceTag`. No price is typed into markup.
- Buttons: "Choose a time" (existing `data-choose-time` behaviour) and "Price your home" (links to `#plan`).
- Height is `min(88svh, 52rem)` on desktop so the estimator shows at the bottom of the first screen.
- Scroll: the scene scales 1 to 1.12 and the card drifts up and fades.
- A visible pause button controls the video.
- Phone: portrait still G2 at 52svh with the card below it on the page background. No video.

### 5.2 Estimator (existing `Hero.astro`, renamed `Estimator.astro`)

- Keeps `id="plan"`, class `hero`, the floor plan, `PriceTag`, `PlanControls` and `SuburbCheck`.
- Its heading becomes an `h2`, "Price your home". The existing lead sentence moves to the hero card.
- Presented as an elevated card that overlaps the hero's lower edge by `--space-8` on desktop.
- The plan frame hosts the 3D home model described in §6.

### 5.3 Trust (`TrustRow`)

Four existing proofs rise in sequence and their icons draw in. Numbers are not animated, because counting up a sample rating oversells it.

### 5.4 Services (`ServicesList`)

- Four existing services as photo cards in a 2×2 grid on desktop, stacked on phones, using the carried-over CC0 photos.
- Photos drift inside their frames. On fine pointers the card tilts up to 4° with a light sheen.
- Links, summaries and "from" prices are unchanged and readable without hover.

### 5.5 Cleaning in action (`RoomChecklist`, id `whats-included`)

The existing read-mode plan and room checklist gain a media stage showing the selected room.

- Media layers per room: a "before" still, an optional action beat, an "after" still.
- The visible state is a pure function of the selected room and scroll progress `p` (0 to 1):
  - `p` under 0.3: before.
  - 0.3 to 0.6: action beat. The kitchen plays clip C1; rooms without a clip hold "before".
  - 0.6 to 0.9: a light band sweeps left to right, revealing "after".
  - 0.9 and over: after, with a "Book a clean" button.
- Choosing another room on the plan crossfades to that room's state at the current `p`. Kitchen is the default, as today.
- Desktop (1024 px and wider): the stage is sticky for about 120vh of scrolling.
- Smaller screens: not sticky. `p` is the stage's own progress through the viewport, and the action beat shows a still frame.
- A permanent caption reads "Illustration, not a client's home."
- A room with no media shows the checklist exactly as today.

### 5.6 Reviews (`Reviews`)

The three newest sample reviews become editorial quote cards that drift at slightly different rates. Name, suburb, date, stars, the "(sample)" rating and the "Book a clean" button are unchanged. No avatars.

### 5.7 Team (`Vetting`)

- The four vetting checks tick in.
- The founder slot shows portrait T1 beside the existing founder note.
- Team image T2 sits under the checks.
- Both images carry "Sample photo" in demo mode.

### 5.8 Process (`HowItWorks`)

A line fills across the four existing steps as the section crosses the viewport, and each number darkens in turn. It stays an ordered list of four. On phones the line is vertical.

### 5.9 Areas and offices (`Coverage`, `OfficesBand`)

- The coverage map tilts from 12° to flat and its pins drop in sequence. Suburb links and the map's meaning are unchanged.
- The offices band gains the existing `offices` photo, scaling 1.1 to 1 inside its frame. The link to `/offices/#walkthrough` is unchanged.

### 5.10 FAQ and close (`Faq`, `CtaBand`)

- The FAQ keeps its native `<details>` accordion and gets Reveal only.
- The existing `CtaBand` is added to the home page with still G7 behind a solid card holding the live price and "Choose a time". The still scales 1.08 to 1.

### 5.11 Other pages

Inner pages inherit the new tokens and Reveal. `/book/` and `/console/` get no decorative motion and never load three.js or video.

## 6. Real-time 3D: the home model

### 6.1 What the visitor sees

The estimator's floor plan stands up into an architectural model: low white walls and simple furniture rise from the coloured plan, lit by a sun that casts soft shadows.

- When the estimator enters the viewport the plan is flat, as on the live site. As it reaches the centre it tilts to a three-quarter view.
- Adding a room raises its walls and furniture over 180 ms. Removing a room removes them at once.
- On fine pointers the model turns up to 4° with the cursor.
- The sun's direction moves with page scroll, so shadows swing through the day.

The model is a stylised maquette, not a photoreal room.

### 6.2 How it is built

- **The existing SVG plan is the floor.** It is placed on the 3D ground plane with three.js's `CSS3DRenderer`, so labels, colours, dashed slots, focus rings, the fill fade and theme switching keep working untouched.
- **WebGL draws only what has height:** walls, furniture and shadows, on a transparent canvas above the plan with `pointer-events: none`.
- **All interaction stays native.** Clicks, hover, focus and keyboard reach the real SVG room buttons. There is no raycasting and no second copy of the room logic.
- **Data flow:** `Selection` to `layout()` (existing, pure) to `model()` (new, pure) to the renderer. The renderer listens to the existing `clearday:selection` event.

Files, all inside the `plan` feature:

| File | Role |
|---|---|
| `src/features/plan/model.ts` | Pure. Turns a `Plan` into a list of boxes (walls and furniture) sized as fractions of each room. No three.js import. Rooms in state `available` produce nothing. |
| `src/features/plan/scene3d.ts` | The only file that imports `three`. Builds meshes from `model()`, owns camera, sun and render loop. |
| `src/features/plan/plan.ts` | Edit plans call `import('./scene3d')` when the gates in §6.3 pass. |
| `src/features/plan/FloorPlan.astro` | Gains a fixed-aspect stage wrapper around the drawing, so nothing shifts when 3D starts. |

Scene settings:

- Perspective camera, 30° field of view. Rest pose 50° above the horizon; entry pose top-down.
- One directional sun with a 1024 px soft shadow map and one hemisphere fill light.
- Walls 0.9 plan units high. Walls on the camera side are lowered to 0.2 so they never hide the floor.
- One shared box geometry and three shared materials. Wall and furniture colours are read from the theme tokens at start.
- Rendering is on demand: a frame is drawn only when scroll, pointer, selection or an animation changes something, and only while the estimator is in view.
- Device pixel ratio is capped at 2.

### 6.3 When it loads

All must be true, otherwise the flat SVG plan is shown exactly as today:

- Viewport 768 px or wider.
- `prefers-reduced-motion` is not `reduce`.
- Save-Data is off.
- A WebGL2 context can be created.
- The estimator is within one viewport of the screen, and the page has finished loading.

### 6.4 Failure handling

- Import failure, context creation failure or `webglcontextlost`: remove the canvas, reset the plan to flat, keep everything working.
- Frame-time watchdog: if the first 60 frames average over 40 ms, shadows are switched off. If the next 60 still do, the model is removed and the plan goes flat.
- The estimator never waits for the model. It is interactive from first paint.

### 6.5 Measured cost

A minimal scene with these features (three.js 0.186.1, `WebGLRenderer`, soft shadows, standard and shadow materials, `CSS3DRenderer`) bundles to 525.6 KB minified, **132.0 KB gzipped**, 108.9 KB Brotli. Measured in a scratch folder on 10 October 2026.

## 7. Media

### 7.1 Scene primitive

One component in `src/core/ui` renders a poster through the existing `Photo` pipeline and, optionally, a video.

- Markup: `<video muted playsinline loop preload="none">` with no `src` and no `autoplay` attribute.
- The source is attached after page load, only when the viewport is 768 px or wider, motion is allowed, Save-Data is off and the connection is not reported as 2G or 3G.
- The video plays only while on screen.
- A pause button with a 44 px target is always present when a video is attached (WCAG 2.2.2).
- If anything fails, the poster stays.

### 7.2 Where files live

- Stills: `src/assets/photos/<slot>.jpg`, registered in `src/config/photo-slots.ts`. A missing file shows the existing placeholder, so no feature waits on an asset.
- Video: `public/media/<name>.mp4` (H.264) and `<name>.webm`, 1920×1080, audio stripped, encoded with the installed ffmpeg.
- A video's poster is its own first frame.

### 7.3 People

- Allowed: adult cleaners shown working or arriving, and one founder portrait in the existing `founder` slot.
- Not allowed: faces on reviews, named portraits of the other team members, children, real or recognisable people.
- Clothing is a plain charcoal apron or polo with no logo or text.
- While `demoMode` is on, each such image shows "Sample photo".
- `docs/customising.md` gains a rule: replace every image of a person with a real photograph before a real business goes live.
- `docs/spec.md` §9 is amended to match.

### 7.4 Before and after

"Before" stills show an ordinary lived-in week, never filth. The stage always carries "Illustration, not a client's home."

## 8. Scroll and reveal system

No animation library is added.

- `src/layouts/motion.ts`, about 40 lines, loaded by `BaseLayout`.
- **Reveal:** an `IntersectionObserver` adds `is-in` to section blocks once. CSS transitions do the movement, staggered by an index variable. Content is hidden only after the script has run, so the page reads normally without JavaScript.
- **Progress:** for elements marked `data-progress`, one passive scroll listener, throttled to animation frames, sets a registered custom property `--p` from 0 to 1 while the element is in view. CSS turns `--p` into transforms and opacity.
- The Sweep uses two counter-translating wrappers, so it is transform-only.
- Under reduced motion neither runs. Existing colour fades stay.
- Skipped on pages with `body.is-bare`.

## 9. JavaScript budget

`tools/js-budget.mjs` and its unit test change from one limit to two:

| Limit | Value | Applies to |
|---|---|---|
| Eager | 30 KB gzipped per page (unchanged) | Inline scripts, script files and their static imports |
| Lazy | 150 KB gzipped per page (new) | Everything reached only through a dynamic `import()` |

Only the home page has a lazy chunk. There are no dynamic imports in the codebase today.

## 10. Tokens

Added to `src/styles/tokens.css` for both themes: `--shadow-1`, `--shadow-2` (built from the existing `--color-shadow`), `--dur-reveal: 500ms`, `--dur-scene: 900ms`. Copy over imagery always sits on a solid surface, so no translucent scrim token is needed.

## 11. Asset inventory

Generate G0 first and use it as the reference for every other asset, so the home is consistent. Generate at least four variants of each asset with people and reject any with face or hand artefacts. Each asset is approved by the owner before it counts as final.

| ID | Section | Type | Behaviour | Deliver as | Fallback | Priority |
|---|---|---|---|---|---|---|
| G0 | Hero | Image, 16:9 | Poster, first video frame | `src/assets/photos/hero.jpg`, 2880×1620 | Hero card on plain background | 1 |
| G1 | Hero | Video from G0, 16:9, 8 s | Loop | Flow MP4, encoded to `public/media/hero-loop.*` | G0 | 1 |
| G2 | Hero, phone | Image, 9:16 | Static | `hero-portrait.jpg`, 1440×2560 | Crop of G0 | 1 |
| G3 | Kitchen | Image pair, 3:2 | Scroll sweep | `room-kitchen-before.jpg`, `room-kitchen-after.jpg`, 2400×1600 | Checklist only | 1 |
| C1 | Kitchen | Video, 16:9, 8 s | Plays in action beat | Flow MP4, encoded to `public/media/action-kitchen.*`; first frame as `action-kitchen.jpg` | Skip the beat | 2 |
| G4–G6 | Bathroom, living, bedroom | Image pairs, 3:2 | Interactive | `room-bath-*`, `room-living-*`, `room-bed-*` | Checklist only | 2 |
| T1 | Team | Image, 4:5 | Static | `founder.jpg`, 1600×2000 | Existing placeholder | 2 |
| T2 | Team | Image, 3:2 | Static | `team.jpg`, 2400×1600 | No image | 2 |
| G7 | Close | Edit of G0, 16:9 | Scroll drift | `closing.jpg`, 2880×1620 | G0 | 2 |
| — | Services, areas, offices | Existing CC0 photos | Drift | Already in hand | Placeholder | — |
| — | Home model | Real-time WebGL | Interactive | Code | Flat SVG plan | — |
| — | Map, process line, icons | CSS and SVG | Scroll | Code | Static | — |

### 11.1 Prompts

**G0, hero master still (16:9)**

```
Photorealistic architectural interior photograph of a contemporary Queensland family home, open-plan living room and kitchen in one wide view, just after a professional clean. Early-morning sun enters through large timber-framed windows on the right and rakes across a pale honed-stone kitchen island and light oak floorboards, leaving soft-edged window shapes of light on the floor. Warm white walls, ivory linen sofa, pale stone, light oak, matte charcoal tapware and one charcoal pendant, a vase of fresh eucalyptus stems on the island, sheer white linen curtains. Every surface is clean, dry and uncluttered, with crisp natural reflections on stone and glass. The left 40 percent of the frame is calm and low in detail: plain warm white wall and curtain, slightly darker than the right. Full-frame camera, 28mm lens, tripod at 1.3 m, one-point perspective, verticals perfectly straight, f/8, natural exposure, soft contrast, neutral-warm white balance. No people, no pets, no text, no logos, no product labels, no cleaning products, no sparkle effects, no lens flare, no floating dust, no HDR look, no blue colour cast.
```

Composition: subject in the right two thirds, left kept quiet for the copy card. Lighting: morning sun from the right.

**G1, hero loop (Frames to Video, G0 as first and last frame; 16:9, 8 s, 1080p)**

```
Locked-off tripod shot, camera completely still. The room is empty and silent. The only movement: the sheer linen curtains breathe slowly in a light breeze, the patches of morning sunlight on the oak floor and stone island shimmer very slightly as leaves move outside, and the eucalyptus leaves barely stir. Calm, real-time speed. Lighting, exposure and colour stay constant from first frame to last. No camera movement, no zoom, no people, no objects appearing or disappearing, no text, no dust particles, no lens flare, no flicker. Silent.
```

Camera: none; the push on scroll is a CSS transform. Loop: seamless because first and last frames match; the seam is crossfaded at encode if needed.

**G2, phone hero still (9:16, G0 as reference)**

```
Same home, same morning and same materials as the reference image. Vertical composition for a phone screen: the pale stone kitchen island and the sunlit window fill the upper two thirds; the lower third is calm light oak floor with one soft patch of sunlight and no furniture. Tripod at 1.3 m, 28mm, verticals straight, f/8, natural exposure. No people, no pets, no text, no logos, no product labels, no cleaning products, no sparkle effects, no lens flare, no floating dust.
```

**G3–G6, room "after" stills (3:2, G0 as reference).** Each prompt is the room line followed by the shared tail.

| ID | Room line |
|---|---|
| G3 | Kitchen: pale honed-stone benchtop across the full width of the foreground, undermount sink with matte charcoal mixer, white handle-less cabinets, stone splashback, induction cooktop, one folded linen tea towel. |
| G4 | Bathroom: frameless glass shower screen on the right, large pale stone-look tiles with crisp even grout, floating oak vanity with white basin, round mirror, matte charcoal tapware, one folded white towel on a rail. |
| G5 | Living room: ivory linen sofa with plumped cushions, oak coffee table, sheer curtains fully open, light oak floor with an even sheen, one potted plant. |
| G6 | Bedroom: bed made with smooth white and ivory linen, oak bedside table with one lamp, white shutters open, clear mirror on the wall. |

```
Same home and materials as the reference image. Morning sun from the right, clean and dry surfaces with natural reflections. 35mm lens, tripod at 1.2 m, camera level and straight-on, f/8, natural exposure. No people, no hands, no pets, no text, no logos, no product labels, no cleaning products, no sparkle effects, no lens flare.
```

**Room "before" stills (image edit of each "after" still)**

```
Edit this exact photograph. Keep the camera position, framing, architecture, furniture and every object identical, so the two images align perfectly when overlaid. Change only the surface condition and the light: [ROOM LINE]. The light is flatter and about one stop darker, like an overcast afternoon, with weaker reflections. The home looks ordinary and lived-in after a busy week, never dirty or neglected. No rubbish, no mould, no food waste, no stains on fabric, no insects, no people, no text.
```

| Room | Room line for the edit |
|---|---|
| Kitchen | a dull film and a few dried water marks on the stone benchtop, light crumbs near the cooktop, faint fingerprints on the cabinet fronts, streaks on the splashback, the tea towel left unfolded |
| Bathroom | dried water spots and a light soap haze on the shower glass and mirror, dull tapware, the towel hung unevenly |
| Living | a faint dust film on the coffee table and skirting, flattened uneven cushions, a matte floor with a few scuffs, curtains half drawn |
| Bedroom | the bed unmade with rumpled linen, dust on the bedside table, a smudged mirror, shutters half closed |

**C1, cleaner in action (video, kitchen "before" still as reference; 16:9, 8 s, 1080p)**

```
Real-time, locked-off tripod shot in the same kitchen as the reference image, same framing. A professional home cleaner in their thirties, wearing a plain charcoal apron over a white t-shirt and light grey reusable gloves, stands at the stone benchtop and wipes it with a folded white microfibre cloth in long, unhurried strokes, moving from left to right. Seen in three-quarter profile from the side, looking down at the work and never at the camera, with a calm, focused expression. Where the cloth has passed, the stone is clean and evenly reflective. Soft morning light from the right. Natural skin texture, natural hands with five fingers, realistic fabric. No logos, no text, no brand labels, no spray mist, no sparkle effects, no camera movement, no other people. Silent.
```

Loop: none; plays once per visit to the beat.

**T1, founder portrait (image, 4:5, G0 as reference for the setting)**

```
Natural environmental portrait photograph of the owner of a small home-cleaning business, late forties, standing in the doorway of a bright Queensland home with warm white walls and a light oak floor softly out of focus behind. Relaxed and friendly, a slight natural smile, looking just off camera. Plain charcoal polo shirt with no logo. Soft window light from the left, 85mm lens, f/2.8, chest-up framing with space above the head. Real skin texture with natural lines and pores, natural hair, no retouched look. No text, no logos, no name badge, no props, no other people.
```

**T2, team arriving (image, 3:2)**

```
Candid documentary-style photograph of two professional home cleaners, in their thirties and forties, arriving at the front door of a Queensland home in the morning. Both wear plain charcoal aprons over white t-shirts; one carries a canvas caddy of folded cloths and the other a compact vacuum. They are mid-step and talking to each other, not looking at the camera, seen from a few metres away at a three-quarter angle. Timber front door, potted plants, soft morning light from the left. 50mm lens, f/4, natural colour. Real skin texture, natural hands, relaxed posture. No logos, no text, no brand labels, no name badges, no vehicles, no other people.
```

**G7, closing still (image edit of G0, 16:9)**

```
Edit this exact photograph, same camera and same room. Change the time to late afternoon: warm low sun through the same windows, longer soft shadows, a gentle golden tone on the oak floor, and the glass door on the far wall now open to a green subtropical garden. Calm, settled and welcoming. Everything is still spotless. No people, no pets, no text, no logos, no sparkle effects, no lens flare.
```

## 12. Documents and tests that change on purpose

Documents:

- `docs/spec.md`: §6.1 home order, §7.4 motion, §8 budget, §9 photos and people, §15 build notes (the `hero` slot returns).
- `docs/design-system.md`: elevation, motion table.
- `docs/customising.md`: swapping scenes, the people rule.
- `docs/photo-credits.md`: the carried-over CC0 credits and a note on generated imagery.

Tests:

- `tests/unit/js-budget.test.ts`: two limits.
- `tests/e2e/home.e2e.mjs`: steps that assume the estimator is at the top of the page scroll to it first. Selectors and assertions are unchanged.
- No other existing test is edited. Any further change needed is raised before it is made.

## 13. Performance targets

Targets, to be measured and reported against a baseline taken on `main` before the first change.

| Item | Target |
|---|---|
| Eager JavaScript | At most 30 KB gzipped on every page |
| Lazy JavaScript | At most 150 KB gzipped, home page only |
| Hero poster | At most 120 KB at 1600 px wide, 60 KB at 800 px |
| Each video | At most 2.5 MB MP4, 1.5 MB WebM; never requested under 768 px |
| Layout shift | 0 |
| Lighthouse mobile, home and `/book/` | Performance 90 or higher, accessibility 100 |
| Home model | 50 frames per second or better through the entry animation on the development laptop |

## 14. Accessibility

- Video has a pause button. Reduced motion removes video, Drift, Sweep, Reveal and the home model, and keeps colour fades.
- Copy never sits directly on imagery.
- The WebGL canvas and decorative media are hidden from assistive technology. The SVG plan keeps its roles, labels, focus order and text equivalent.
- Tap targets stay at 44 px. Nothing depends on hover.
- Before, after and action images have descriptive alt text. Backdrop stills have empty alt text.

## 15. Responsive behaviour

| Width | Hero | Estimator plan | Room stage |
|---|---|---|---|
| Under 768 px | Portrait still, card below, no video | Flat SVG, no three.js | Not sticky, still action frame |
| 768 to 1023 px | Landscape scene with video | 3D model | Not sticky, video action beat |
| 1024 px and wider | Landscape scene with video | 3D model with pointer turn | Sticky |

## 16. Testing

New checks:

- Unit: `model()` returns no boxes for `available` rooms, keeps every box inside its room, and returns the expected wall count for the default home.
- E2E, model on: the projected corners of room `bed-1` match the SVG room's on-screen rectangle within 1.5 px; adding a bedroom by click and by keyboard still works.
- E2E, model off: with the lazy chunk blocked, with reduced motion, and at 375 px, the plan is flat, no three.js request is made, and all estimator steps pass.
- E2E: after changing the selection, the hero price line equals `PriceTag`.
- E2E: no video request at 375 px or under reduced motion; the pause button stops playback.
- E2E: every control in the new hero is at least 44 px.
- Axe in both themes at 375 and 1280.

If the test browser cannot create a WebGL context, the "model on" steps are reported as skipped, not passed.

## 17. Out of scope

- A photoreal real-time interior.
- 3D on phones.
- A depth-parallax WebGL hero.
- New pages, and any change to pricing or booking.
- New copy, except four strings: "Price your home" (the estimator heading and the hero button), "Sample photo", "Illustration, not a client's home." and the video button's "Pause background video" label.
- A config switch to turn the model off per client.

## 18. Risks

| Risk | Response |
|---|---|
| The SVG floor blurs or misaligns under perspective | First task is a throwaway spike that proves alignment and sharpness before anything else is built. Fallback: a top-down rest pose. |
| Generated people look uncanny | Multiple variants, owner picks. Fallback: the slot's placeholder. |
| Before and after stills do not align | Use a crossfade instead of the sweep for that room. |
| Weak GPUs | Load gates and the frame-time watchdog. |

## 19. Phases

| Phase | Work | Verified by |
|---|---|---|
| 2. Foundation | Branch from `main` in a separate worktree; record baseline; alignment spike; tokens; `motion.ts`; scene primitive; photo slots and carried-over photos; budget tool; documents | `npm test`, `npm run e2e`, `npm run budget`, `npm run photos:status`, Lighthouse |
| 3. Hero and estimator | `HeroScene`; price line; estimator card; `model.ts`; `scene3d.ts`; fallbacks | Estimator e2e with model on and off; alignment check; unit tests |
| 4. Sections | Trust, services, room stage, reviews, team, process, areas and offices, FAQ and close; one section per commit | That section's e2e step and axe in both themes |
| 5. Responsive and performance | Encode media; load gating; measure against baseline | Numbers reported side by side |
| 6. QA | Full suite; the brief's checklist; WebKit and Firefox through Playwright where installed | A report listing only what was run; real iOS Safari needs the owner's device |
