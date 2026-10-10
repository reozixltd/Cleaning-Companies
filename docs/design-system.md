# Design system

This is the reference for anyone changing how the site looks: tokens, type, layout, shape, motion, components and the import rules that keep it consistent. To set the site up for a client, start with [`customising.md`](customising.md).

Every raw value (colour, size, space, duration) lives in `src/styles/tokens.css`. Components use `var(--…)` only. `npm test` fails if a raw colour appears anywhere else (see [Import boundaries](#import-boundaries)).

## Colour

Two themes ship. `floorplan` is the default: its block is `:root, [data-theme='floorplan']`, so it applies even before a theme is set. `eucalyptus` proves the re-skin. Both set the same tokens.

| Token | `floorplan` | `eucalyptus` | Role |
|---|---|---|---|
| `--color-paper` | `#f4f7f8` | `#f5f7f2` | Page canvas, empty plan rooms |
| `--color-ink` | `#17323f` | `#1e3b30` | Text, plan walls, primary button fill, rules |
| `--color-ink-hover` | `#0e2430` | `#142a22` | Primary button on hover |
| `--color-ink-muted` | `#4e6874` | `#4c6458` | Secondary text, captions, hints |
| `--color-room` | `#dcebe9` | `#dde8da` | Living and kitchen on the plan, quiet panels, photo placeholders |
| `--color-highlight` | `#f2c14e` | `#9cc5e8` | Selected rooms and the price tag only. Always with ink text, never as a text colour |
| `--color-line` | `#9fb6bf` | `#a9bca9` | Hairlines, panel edges, dashed add-a-room slots (decorative, so no contrast minimum) |
| `--color-field-border` | `#6f8f9b` | `#728f72` | Text field outlines (inputs, selects, text areas, the suburb check). 3:1 on paper and surface, WCAG 1.4.11 |
| `--color-surface` | `#ffffff` | `#ffffff` | Form fields and controls |
| `--color-on-ink` | `#ffffff` | `#ffffff` | Text on ink (primary buttons, demo ribbon) |
| `--color-focus` | `#17323f` | `#1e3b30` | Focus ring (3px solid, 2px offset) |
| `--color-shade` | `rgb(23 50 63 / 0.08)` | `rgb(30 59 48 / 0.08)` | Hover wash on secondary and quiet buttons |
| `--color-shadow` | `rgb(23 50 63 / 0.12)` | `rgb(30 59 48 / 0.12)` | Shadows: the two elevation steps and the pinned booking tag |

Semantic colours are shared by every theme (the plain `:root` block):

| Token | Value | Role |
|---|---|---|
| `--color-success` | `#1f6b4a` | Confirmed badges, "request sent" box border |
| `--color-success-soft` | `#e3f1ea` | Background behind success text |
| `--color-warning` | `#7a4f00` | "Waits for confirmation" badges |
| `--color-warning-soft` | `#fbf0d6` | Background behind warning text |
| `--color-danger` | `#b3261e` | Field errors, error summary, "couldn't save" message |
| `--color-danger-soft` | `#fbe9e7` | Background behind error text |
| `--color-star` | `#7a4f00` | Filled rating stars |

Rules for using colour:

- Highlight marks what the visitor chose or can act on: included bedrooms, bathrooms, study and laundry on the estimator's plan, the chosen room on the checklist plan, the price tag, the pinned booking tag, suburbs with their own page on the coverage map, the `highlight` badge, and the filled room in the logo. Don't add it anywhere else: if everything is yellow, the plan stops standing out.
- Text on highlight is always `--color-ink`. Never put `--color-ink-muted` on highlight: it drops to about 3.5:1.
- Living and kitchen use `--color-room`, not highlight: they are always included, so they are not a choice.
- Status always pairs the strong colour with its `-soft` background, or sits on paper.

### Contrast check

`tests/unit/contrast.test.ts` runs in `npm test`. It reads `tokens.css`, finds every `[data-theme]` block (so a new client theme is checked automatically), works out the colours each theme ends up with, and checks these pairs with the WCAG 2.x relative-luminance formula. It also fails if a theme listed in `business.themes` has no block.

| Pair (text or mark / background) | Needs | `floorplan` | `eucalyptus` | Result |
|---|---|---|---|---|
| ink / paper | 4.5 | 12.47 | 11.30 | pass |
| ink-muted / paper | 4.5 | 5.49 | 5.95 | pass |
| ink-muted / surface | 4.5 | 5.91 | 6.42 | pass |
| ink-muted / room | 4.5 | 4.81 | 5.08 | pass |
| ink / highlight | 4.5 | 8.00 | 6.71 | pass |
| ink / room | 4.5 | 10.93 | 9.65 | pass |
| on-ink / ink | 4.5 | 13.42 | 12.18 | pass |
| on-ink / ink-hover | 4.5 | 15.99 | 15.17 | pass |
| focus / paper | 3 | 12.47 | 11.30 | pass |
| focus / highlight | 3 | 8.00 | 6.71 | pass |
| field-border / paper | 3 | 3.21 | 3.31 | pass |
| field-border / surface | 3 | 3.45 | 3.57 | pass |
| success / success-soft | 4.5 | 5.53 | 5.53 | pass |
| warning / warning-soft | 4.5 | 6.29 | 6.29 | pass |
| danger / danger-soft | 4.5 | 5.58 | 5.58 | pass |
| danger / paper | 4.5 | 6.07 | 6.06 | pass |
| star / paper | 3 | 6.62 | 6.61 | pass |

Focus rings, field outlines and filled stars are non-text graphics, so they need 3:1 (WCAG 1.4.11). The stars also carry their meaning in text (`role="img"`, `aria-label="Rated 5 out of 5"`). Everything else is text and needs 4.5:1.

The same test also fails if a theme block leaves out any colour the default theme sets, because a missing token would silently fall back to the floor plan colour. If a pair fails after you edit a theme, change only the failing token, keep its hue, and darken or lighten it until the test passes.

### Contrast the browser tests check

Axe can't measure two things, so `tests/e2e/quality.e2e.mjs` measures them in the built pages, in both themes:

- **Field outlines** on the suburb check and every booking field reach 3:1 against the field's own fill and the page around it. Text fields use `--color-field-border`, not `--color-line`, so hairlines stay light.
- **Focus rings** on the demo ribbon, header links and header buttons reach 3:1 against what they sit on. The ribbon is ink, so its links switch the ring to `--color-on-ink`.

## Type

One family: Schibsted Grotesk Variable (400 to 700), self-hosted through `@fontsource-variable/schibsted-grotesk` (imported at the top of `src/styles/global.css`), with system fallbacks in `--font-sans`.

| Token | Size | Used for |
|---|---|---|
| `--text-14` | 14px | Smallest text: captions, the demo ribbon, badges, the mobile bar summary |
| `--text-16` | 16px | Buttons, hints, field errors, footer |
| `--body-size` | 17px | Body text |
| `--text-18` | 18px | Section intros, lead lines, review quotes, h4 |
| `--text-22` | 22px | h3, the logo wordmark, stepper counts |
| `--text-28` | 28px | h2 |
| `--text-36` | 36px | Step numbers in "How a booking works" |
| `--text-hero` | `clamp(2.5rem, 5vw, 3.5rem)` | h1, `.display`, the price on the price tag |

- Body: `--leading-body` 1.6, line length up to `--measure` (68ch) on paragraphs.
- Headings: weight 700, `--leading-tight` 1.1, `text-wrap: balance`.
- `--tracking-display` (−0.02em) is used only on h1, `.display`, the price-tag amount and the logo wordmark.
- Weights: `--weight-regular` 400, `--weight-medium` 500 (labels, buttons), `--weight-bold` 700.
- Prices and counts use `.tabular` (tabular figures) so they don't jump as they change.
- Sentence case everywhere, left-aligned throughout. Nothing is set in capitals.
- Text is never smaller than `--text-14`. The exception is SVG labels on the floor plan and coverage map: they are set in px (15 to 20px) in drawing units, so they shrink with the drawing on a phone. `FloorPlan.astro` enlarges them below 600px to compensate. That is the one place px font sizes appear in components.

## Space and layout

| Token | Value |
|---|---|
| `--space-1` … `--space-8` | 4, 8, 12, 16, 24, 32, 48, 64 px |
| `--gutter` | 16px below 768px, 32px from 768px |
| `--page-max` | 75rem (1200px) |
| `--target` | 44px, the minimum tap target |

- `.wrap` centres content at `--page-max` with `--gutter` on each side. `.band` gives a section 48px of vertical padding, 64px from 1024px.
- Single column below 768px with a 16px side gutter. Everything must work at 375px (and 320px) with no horizontal scroll.
- From 1024px the layout follows a 12-column grid (spec §7.3). There is no grid utility class: each section sets its own `grid-template-columns`. Estimator: `5fr 6fr` from 1024px. Reviews: `4fr 7fr` from 900px. Room checklist: `5fr 4fr` from 900px. Vetting: text beside a 320px founder column. Coverage: two equal columns. Most bands pair a wide column with a narrow one, all left-aligned.
- Breakpoints in use: 480px (plan segments go four across), 600px (plan labels stop being enlarged), 768px (header shows the phone number and Book a clean, the mobile booking bar goes away, step lists go four across), 900px (two-column bands), 1024px (header navigation, two-column estimator), 1200px (trust row four across).
- Targets are at least 44px with at least 8px between them.

## Shape: one bold element

The floor plan is the one bold element on the site. Everything else stays quiet so the plan reads as the thing to use.

- `--wall` (2px) is the only heavy line weight. The plan's walls use it, and the outer wall of the house is drawn at 4px. Outside the plan, 2px ink rules work like walls between parts of a page: the top of the services list, the FAQ list, each booking step and the footer, above and below the offices band, beside each review, and along the top of the mobile booking bar. Status boxes (error summary, form outcomes) and photo placeholders also use `--wall`, in their own colours. The current header link and a hovered service title get a 2px underline.
- Everything else is a 1px `--hairline` in `--color-line`, or white space.
- Before adding another 2px line, check it divides the page the way a wall would. If it only decorates, use a hairline.
- Corners: 0 on the plan (rooms and walls are square; the dashed add-a-room slot inside a room has a slight corner so it reads as a button). `--radius-control` (6px) on buttons, fields, photos, placeholders, badges, the price tag and the booking tag.
- Elevation has two steps, both built from `--color-shadow`. `--shadow-2` lifts the home hero card and the estimator card, so they read as standing in front of the photo. `--shadow-1` is for a small control that sits on a photo (the video pause button). The pinned booking tag keeps its own shadow. Nothing else casts one.
- Services, reviews and team are lists or rows, never grids of identical cards.

## Motion

A few named moments move, and everything else responds quickly or not at all. These rules follow Emil Kowalski's design-engineering guidance.

| What | How | Where |
|---|---|---|
| A room is added | Its fill fades from paper to its colour in about 180ms with `--ease-out` | `fadeIn()` in `src/features/plan/plan.ts` (Web Animations API) |
| A button is pressed | `transform: scale(0.97)` on `:active` over `--dur-press` (160ms) with `--ease-out`. Plan stepper buttons use 0.94 | `Button`, plan segments and steppers, suburb check button, mobile bar |
| A colour changes | `background-color`, `border-color`, `color` or `fill` over `--dur-colour` (150ms) | Buttons, fields, plan segments and rooms |
| The home hero leaves the screen (with a photo, from 768px) | Its photo scales 1 to 1.12; its card rises 6% of its own height and stays solid. Driven by `--p` | `HeroScene`, `src/layouts/motion.ts` |
| The estimator arrives | The plan tilts from flat to a three-quarter view and its walls rise. A room added later rises in 180ms | `src/features/plan/scene3d.ts` |
| A background video starts | It fades in over its still in `--dur-scene` (900ms) | `Scene` |

- `--ease-out` is `cubic-bezier(0.23, 1, 0.32, 1)`: a strong ease-out, so a response starts at once and settles.
- Transitions name their properties (`transform`, `opacity`, colours). Never `transition: all`.
- The room fade runs only for pointer actions. A room added with the keyboard (Enter or Space on a dashed slot, or a stepper activated from the keyboard, where `event.detail === 0`) appears with no fade, because animating a keyboard action only slows it down.
- The fade's 180ms and its curve are written in `fadeIn()`. `--dur-fill` records the value but is not read by it, so change both together.
- Hover styles exist only inside `@media (hover: hover) and (pointer: fine)`, so touch screens never get a stuck hover state. No hover lifts or shadows.
- Scroll-linked motion is opt-in. Mark an element `data-progress` and `motion.ts` gives it `--p`: 0 where it first shows, 1 where it has left the top of the screen. Use `--p` for `transform` and `opacity` only. The pinned booking tag appears and disappears without animating.
- `prefers-reduced-motion: reduce` removes movement: `global.css` cuts CSS animations and smooth scrolling, each component removes its press scale, and `motion.ts`, the background video and the 3D model never start. The short colour fades stay, because they show what changed without moving anything.

## Mobile baseline

These live in `src/styles/global.css` and `src/layouts/BaseLayout.astro`. Keep them when you add components.

- Inputs, selects and textareas are at least 16px (`font-size: max(16px, 1rem)`), so iOS doesn't zoom into a field.
- The viewport meta has `viewport-fit=cover` and `interactive-widget=resizes-content`. The mobile booking bar pads its bottom with `env(safe-area-inset-bottom)` so it clears the home indicator.
- No tap highlight (`-webkit-tap-highlight-color: transparent`). Links, buttons, labels and summaries use `touch-action: manipulation`, which removes the double-tap zoom delay. Buttons can't be text-selected.
- `[hidden] { display: none !important; }`: the `hidden` attribute always wins, even over a component's own `display`. Scripts show and hide things with `el.hidden`, never with classes.
- `text-size-adjust: 100%` stops phones resizing text on rotate.
- Every interactive element is at least `--target` (44px) high.

## Anti-template checks

Review every page against these before calling it done (spec §7.5). The copy rules are also checked for config strings by `tests/unit/config.test.ts`.

- No all-caps labels, no eyebrow text above headings, no 01/02/03 markers except the booking sequence ("How a booking works" and the `/book` steps), no "→" on buttons, no single highlighted word in headlines.
- No middle-dot (`·`) meta strings in UI copy.
- No sky-blue and sparkle "cleaning" clichés, no stock "smiling cleaner with spray bottle" hero.
- No identical-card grids with the same shadow.
- Copy names things the way a homeowner would; buttons say what happens ("Send booking request", not "Submit").

## Components

### Core UI (`src/core/ui/`)

Industry-neutral primitives. They take everything as props and read no config.

| Component | Props | Notes |
|---|---|---|
| `Button` | `href?`, `variant?: 'primary' \| 'secondary' \| 'quiet'` (default primary), `size?: 'md' \| 'lg'`, `type?: 'button' \| 'submit'`, `icon?: IconName`, `block?: boolean`, plus any `<a>`/`<button>` attribute | A link when `href` is set, otherwise a button. Primary is ink with on-ink text, secondary an ink outline, quiet an underlined text button with a full-size target |
| `Field` | `name`, `label`, `type?: 'text' \| 'email' \| 'tel' \| 'textarea' \| 'select' \| 'number'`, `required?`, `autocomplete?`, `inputmode?`, `hint?`, `options?: { value, label }[]`, `value?`, `placeholder?`, `maxlength?` | Input id is `field-<name>`. Writes "(optional)" after the label when not required. Errors go in `[data-error-for=<name>]` |
| `ErrorSummary` | `title?` (default "Check these and try again:") | Empty `role="alert"` box, hidden until `core/forms.ts` fills it with links to the fields and focuses it |
| `Icon` | `name: IconName`, `size?` (20), `label?`, `class?` | 24×24 outline icons from `icons.ts`. Decorative unless `label` is set. To add one, add a path to `icons.ts` |
| `Badge` | `tone?: 'neutral' \| 'success' \| 'warning' \| 'highlight'` | Short status label |
| `Photo` | `slot`, `alt`, `ratio?` ('4 / 3'), `sizes?`, `priority?`, `label?`, `class?` | AVIF and WebP `<Picture>` when `src/assets/photos/<slot>.*` exists, otherwise `Placeholder` |
| `Scene` | `slot`, `portrait?`, `video?`, `alt?` (''), `priority?` | A backdrop that fills its positioned parent: a still, and a silent loop from `public/media/<video>.webm`/`.mp4` that `scene.ts` attaches only on screens 768px and wider, with motion allowed, Save-Data off and a connection better than 3G. A parent can set `--scene-scale` and `--scene-pause-bottom` |
| `Placeholder` | `label`, `ratio?` | Room-coloured panel with a dashed border saying what photo goes there |

Icons available: `phone`, `menu`, `close`, `check`, `plus`, `minus`, `home`, `shield`, `star`, `clock`, `key`, `map-pin`, `building`, `calendar`, `chevron-down`, `mail`, `copy`, `pause`, `play`. `/dev/ui/` (`src/pages/dev/ui.astro`) shows every primitive in both themes. It is not linked and not indexed.

### Features (`src/features/`)

| Component | Props | Notes |
|---|---|---|
| `plan/FloorPlan` | `id`, `mode: 'edit' \| 'read'`, `title`, `selected?` | The plan drawing, generated by `layout()` and `renderPlanSvg()`. Edit mode: dashed slots add rooms. Read mode: rooms are buttons that announce `clearday:room` (`ROOM_EVENT`) for the checklist |
| `plan/PlanControls` | `id` (same as its `FloorPlan`) | Type of clean, bedroom and bathroom steppers, study and laundry toggles, how often, "Add extras" |
| `pricing/PriceTag` | none | Per-visit price, first-visit price when different, Choose a time |
| `pricing/PriceLine` | none; default slot for extra actions | The same price hooks as `PriceTag` in a compact block, for the home hero |
| `pricing/BookingTag` | none | Desktop only: a compact tag pinned under the header once the hero's price and the estimator are both off screen |
| `areas/SuburbCheck` | none | "Check your suburb" form. Uses the fixed id `suburb-input`, so one per page |
| `areas/CoverageMap` | none | SVG map of `business.areas` around `business.base`. Larger dots are suburbs with a page |
| `booking/BookingForm` | none | The five-step request on `/book/`, built from `booking/steps/{Step,Home,When,Access,You,Check}`. Below 1024px the price sits inside step 1; from 1024px it is a sticky tag beside the steps |
| `walkthrough/WalkthroughForm` | none | Offices walk-through request on `/offices/` |
| `forms/WaitlistForm` | none | "Tell me when you clean in my suburb"; turns away suburbs already covered |
| `forms/ApplicationForm` | none | Careers application |
| `referral/ReferralCode` | none | A 6-character code saved on the visitor's device, with a Copy button |

The waitlist, careers and booking forms all use field ids `field-<name>`, so put one form per page. The console's message timeline is drawn by `features/messages/timeline.ts` (DOM, not a component): filled squares for messages that will send, dashed outlines for ones waiting on something.

The edit plan's 3D model is not a component. `plan.ts` loads `plan/scene3d.ts` (the only file that imports three.js) when the screen is 768px or wider, motion is allowed, Save-Data is off and WebGL2 exists. `plan/model.ts` turns the plan into wall and furniture boxes; the SVG drawing itself is the floor, so every room stays a real, focusable element.

Price displays are wired by `data-*` hooks, so a price can sit anywhere on a page and `price-tag.ts` keeps it current:

| Hook | Gets |
|---|---|
| `data-price-per-visit` | `$179` |
| `data-price-unit` | "a visit", or "one visit" for one-off cleans |
| `data-price-first-visit` / `data-price-first-visit-row` | First-visit price, and its row (hidden when it equals the per-visit price) |
| `data-price-summary` | "3 bed, 2 bath, fortnightly" |
| `data-choose-time` | A link whose `href` becomes `/book/?<selection>` |
| `data-booking-bar`, `data-booking-tag` | Shown once the visitor has a selection |

### Layouts (`src/layouts/`)

| Component | Props | Notes |
|---|---|---|
| `BaseLayout` | `title`, `description`, `schema?`, `noindex?`, `bare?`, `bookingBar?` (default true) | Head, theme, ribbon, header, main, footer, mobile bar. `bare` hides the marketing chrome (the console). `bookingBar: false` hides the mobile bar (`/book` and `/offices`, which must not show homeowner prices) |
| `Seo` | `title`, `description`, `schema?`, `noindex?` | Title, canonical, Open Graph, JSON-LD |
| `ThemeBoot` | none | Sets `data-theme` before first paint |
| `Header`, `Footer`, `Logo`, `DemoRibbon`, `MobileBookingBar` | none | Read `config/business.ts` and `config/navigation.ts` |

### Sections (`src/sections/`)

Page bands built from features and core UI.

| Section | Props |
|---|---|
| `HeroScene` | none (the first screen: backdrop, headline card, live price, Choose a time, Price your home) |
| `Estimator` | none (the calculator: heading, suburb check, plan, price tag, controls) |
| `TrustRow` | none |
| `RoomChecklist` | none |
| `ServicesList` | none |
| `Reviews` | `suburb?` (show that suburb's reviews first), `limit?` (3) |
| `Vetting` | none |
| `HowItWorks` | none |
| `Coverage` | none |
| `OfficesBand` | none |
| `Faq` | `tag: 'home' \| 'booking' \| 'offices' \| 'keys' \| 'payment'`, `limit?`, `title?`, `more?` (link to `/faq/`, default true) |
| `CtaBand` | `title`, `text?` |
| `PageHeader` | `title`, `intro?`, default slot |
| `SectionHead` | `id`, `title`, `intro?` |

## Import boundaries

Imports point one way:

```
pages → layouts | sections → features → domain → core
```

`config/` and `content/` are read by everything except `core/`. Features never import each other. When one needs to react to another, they talk through the typed `clearday:selection` DOM event in `src/domain/events.ts` (the price tag listens to the floor plan this way).

`tools/check-boundaries.mjs` runs first in `npm test` and scans every `.ts`, `.mjs`, `.astro` and `.css` file under `src/`. It follows `@/…` and relative imports. npm packages and `astro:*` modules are ignored.

| Rule id | Means | Fix |
|---|---|---|
| `core-imports-outside` | A file in `src/core/` imports from outside `src/core/` | Pass the value in as an argument (`findArea(input, business.areas)`), or move the code out of `core/` |
| `domain-imports-feature` | `src/domain/` imports from `src/features/` | Move the shared code into `domain/` |
| `feature-imports-feature` | One feature imports another | Move shared logic to `domain/` (cleaning) or `core/` (industry-neutral), or emit a DOM event |
| `section-imports-page` | A section imports from `pages/` or `layouts/` | Pass the value in as a prop |
| `domain-imports-upward` | `src/domain/` imports from `sections/`, `layouts/` or `pages/` | Pass the value in as an argument |
| `feature-imports-upward` | A feature imports from `sections/`, `layouts/` or `pages/` | Pass the value in as a prop or argument, or move the code into the feature |
| `layout-imports-page` | A layout imports from `pages/` or `sections/` | Pass the value in as a prop, or render the band from the page through a slot |
| `storage-outside-core` | `localStorage` or `sessionStorage` appears outside `src/core/storage.ts` and `src/layouts/ThemeBoot.astro` | Use `getStorage()`, `getSessionStorage()`, `readJson()` and `writeJson()`. The check matches the word anywhere, comments included |
| `raw-colour-outside-tokens` | A hex colour in a CSS colour property or `fill`/`stroke`/`color` attribute, or any `rgb()`/`hsl()`, outside `src/styles/tokens.css` | Add a token to `tokens.css` and use `var(--color-…)` |

Output when something breaks (one line per problem: file, rule id, detail), and `npm test` stops before Vitest runs:

```
src/features/plan/p.ts: feature-imports-feature (imports ../booking/state)
src/sections/T.astro: raw-colour-outside-tokens (use a token from styles/tokens.css)

2 boundary violation(s).
```

On success it prints `Boundaries: ok`. Run it alone with `node tools/check-boundaries.mjs`. The rules are in `tools/boundaries.mjs`, tested against the fixture trees in `tests/fixtures/boundaries/`.

Not checked by the tool, so check in review: no px font sizes (except SVG labels, above) and no client-specific strings in components.
