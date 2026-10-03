# Clearday Home Cleaning — Cleaning Companies demo site

The Reozix demo site for the **Cleaning Companies** industry kit: a static Astro 5 + TypeScript site with a floor-plan price calculator, a booking request flow, an offices walk-through request and an owner console that previews the messages each booking triggers.

The spec is [`docs/spec.md`](docs/spec.md). To set the site up for a real client, follow [`docs/customising.md`](docs/customising.md).

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # import-boundary check + unit tests (Vitest)
npm run check      # Astro + TypeScript type check
npm run build      # static output in dist/
npm run preview &  # serve dist/ on :4321
npm run e2e        # Playwright smoke test against the preview
npm run budget     # per-page JavaScript size check (after a build)
npm run photos:status  # which photo slots are filled; add -- --write to refresh docs/photo-brief.md
```

## Where things live

A client re-skin edits only the files in this table. [`docs/customising.md`](docs/customising.md) walks through each one.

| You want to change… | Edit |
|---|---|
| Name, legal name, ABN, phones, email, hours, insurance, guarantee wording, demo mode, theme | `src/config/business.ts` |
| Suburbs served, postcodes, map points | `areas` in `src/config/business.ts` + `src/content/areas/*.md` |
| Prices, discounts, add-ons, first-visit rule | `src/config/pricing.ts` |
| Days off, time windows, how far ahead people can book | `src/config/booking.ts` |
| Rooms on the plan and what is cleaned in each | `src/config/rooms.ts` |
| Message wording and timing | `src/config/messages.ts` |
| Header and footer links | `src/config/navigation.ts` |
| Services, area pages, policies | Markdown in `src/content/` |
| Reviews, FAQs, team | `src/content/*.json` |
| Colours, fonts, spacing, radius | `src/styles/tokens.css` ([`docs/design-system.md`](docs/design-system.md)) |
| Photos | Save `<slot>.jpg` in `src/assets/photos/`; `npm run photos:status` lists gaps ([`docs/photo-brief.md`](docs/photo-brief.md)) |
| Production lead storage | `src/core/leads/index.ts` |

## How the code is organised

| Folder | Holds | May import |
|---|---|---|
| `src/core/` | Industry-neutral code: storage, formatting, validation, leads, JSON-LD, UI primitives | Only `src/core/` |
| `src/domain/` | Cleaning logic several features share: the selection, the quote, checklists, the selection event | `core/`, `config/`, `content/` |
| `src/features/` | One behaviour per folder (`plan`, `pricing`, `booking`, `messages`, `areas`, …): its pure logic, components and DOM wiring | `domain/`, `core/`, `config/`, `content/`. Never another feature |
| `src/sections/` | Page bands built from features and core UI | Features and below |
| `src/layouts/` | The page shell: head, theme, header, footer, mobile booking bar | Features and below |
| `src/pages/` | Routes that compose layouts and sections | Anything |

Imports point one way: `pages → layouts | sections → features → domain → core`. `config/` and `content/` hold the per-client data and are read by everything except `core/`. Features never import each other; they react to each other through the typed `clearday:selection` DOM event in `src/domain/events.ts`. Business rules sit in pure modules with unit tests; the scripts that touch the page only read the DOM, call those modules and write the result.

`tools/check-boundaries.mjs` enforces these rules at the start of `npm test`, along with two more: raw colours only in `src/styles/tokens.css`, and browser storage only through `src/core/storage.ts`. [`docs/design-system.md`](docs/design-system.md#import-boundaries) explains its output.

## Tests

- `tests/unit/*.test.ts`: Vitest (jsdom), run by `npm test`. Includes the colour contrast check for every theme in `tokens.css`.
- `tests/e2e/`: Playwright against a running preview.
  - `harness.mjs` is the shared harness: it launches Chromium, gives each `step()` a fresh browser context, and prints ✓ or ✗ per step.
  - One `*.e2e.mjs` file per area of the site (for example `home.e2e.mjs`), so work on different pages never edits the same test file.
  - `run.mjs` runs every file: `node tests/e2e/run.mjs [baseUrl] [filter]`. `baseUrl` defaults to `http://localhost:4321`; `filter` runs only files whose name contains it (`node tests/e2e/run.mjs http://localhost:4321 home`). `STEP=<regex>` runs only matching steps. `npm run e2e` is the same with the defaults.
- `tools/shot.mjs <path> <width> <out.png>`: a screenshot of the preview for visual review (`SHOT_BASE` changes the base URL).
