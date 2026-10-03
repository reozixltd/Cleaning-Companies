# Clearday Cleaning Demo Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Clearday Home Cleaning demo site (Astro, static) for the Cleaning Companies sales kit: floor-plan price calculator, booking request flow, offices walk-through, content pages, and an owner console with message-timeline previews.

**Architecture:** A static Astro 5 site in the Trades conventions. Industry-neutral code lives in `src/core/`. Cleaning-specific pure logic shared by several features lives in `src/domain/`. Each `src/features/*` folder owns one behaviour's components and DOM wiring. Pages and sections compose features. All per-client values sit in `src/config/`, `src/content/` and `src/styles/tokens.css`. A boundary checker enforces the import direction in `npm test`.

**Tech Stack:** Astro ^5.18.2, TypeScript (astro/tsconfigs/strict), @astrojs/sitemap, @astrojs/check, Vitest + jsdom, Playwright (chromium at `/opt/pw-browsers/chromium`), @axe-core/playwright, @fontsource-variable/schibsted-grotesk, Node 22.

**Spec:** `docs/spec.md` (v0.1, approved 3 October 2026). Task 1 records four refinements to it (below).

**Port source:** `reozixltd/trades-construction` (public; clone with `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/reozixltd/trades-construction /tmp/trades`). "Port" in a step means: copy the named file, change only what the step lists, keep its tests passing.

## Spec refinements (Task 1 writes these into `docs/spec.md` §4)

1. **New `src/domain/` folder.** The spec puts `quote()` in `features/pricing` and URL helpers in `features/booking`, but the plan feature, booking feature and price tags all need them, and features may not import each other. Shared cleaning logic therefore lives in `src/domain/`: `selection.ts`, `quote.ts`, `checklist.ts`, `events.ts`, `describe.ts`. Features talk to each other only through `domain/events.ts` (a typed DOM event), never by import.
2. **`Lead.history` instead of `Lead.notes`.** The Trades shape (`history: LeadEvent[]` of status changes and notes, each timestamped) is kept, because the message timeline needs the time a booking was confirmed.
3. **`ScheduledMessage.sendAt` may be `null`** (not yet known, e.g. before confirmation), and `skippedReason` adds `'status-changed'` for walk-through follow-ups after the owner acts.
4. **`MessageTemplate.condition?: 'one-off'`** limits the rebook offer to one-off bookings.

## Global Constraints

- Astro `^5.18.2`; TypeScript strict via `"extends": "astro/tsconfigs/strict"`; path alias `@/*` → `src/*`; no UI framework, no Tailwind, plain CSS on tokens.
- Import direction: `pages → layouts | sections → features → domain → core`. `config/` and `content/` are readable by everything except `core/`. `domain/` may import `core/` and **types** from `config/`. A feature never imports another feature.
- Raw colour values (`#hex`, `rgb(`, `hsl(`) appear only in `src/styles/tokens.css`.
- Only `src/core/storage.ts` and `src/layouts/ThemeBoot.astro` (pre-paint inline script) may reference `localStorage` or `sessionStorage`.
- Storage keys are namespaced `clearday:v1:<name>`.
- All dates and times are computed in `Australia/Brisbane` (UTC+10, no daylight saving), never the device time zone.
- Money: AUD, GST included, whole dollars, displayed as `$179`.
- Demo identity: trading name "Clearday Home Cleaning", legal name "Clearday Cleaning Services Pty Ltd", ABN `00 000 000 000`, phone `07 5550 1234`, mobile `0491 570 110`, email `hello@clearday.example`, console login `owner@demo.clearday` / `demo1234`.
- UI copy: sentence case; no all-caps text; no text above headings acting as eyebrows; no `→` on buttons; no middle-dot (`·`) strings; numbered markers only on "How a booking works" and the `/book` steps.
- Accessibility: WCAG 2.2 AA, visible focus, 44px targets with 8px spacing, every control labelled, `prefers-reduced-motion` respected.
- Performance: page JavaScript ≤ 30 KB gzipped per page; hero image preloaded; fonts self-hosted.
- Source files aim for ≤ 150 lines; split when a file grows past that.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Qu6pqocsTFdXhr2TrHhHWz
  ```

## Review Focus

1. **Hand-edited or stale `/book` URLs** (`?bedrooms=99&service=pool&frequency=daily`): the page loads with values clamped to the allowed ranges and unknown values replaced by defaults; nothing throws. Test in Task 8 (`fromParams clamps and defaults`).
2. **Visitor near midnight or on a device in another time zone**: the day picker offers days counted from today in Brisbane, not the device's today. Test in Task 10 (`availableDays uses Brisbane date`).
3. **Suburb typed in real-world forms** ("chermside qld 4032 ", "4034" shared by four suburbs, "Mt" vs "Mount"): case, state and spacing are ignored; a shared postcode answers "in area"; an unknown name answers "out" rather than "invalid". Test in Task 5 (`findArea handles real-world input`).
4. **Double submit** (double-click, or back button after success then send again): one lead, not two. Test in Task 3 (`create with the same clientRef returns the existing lead`), and the send button is disabled while sending (Task 16).
5. **Storage blocked or full** (private window, quota): the booking still shows a clear outcome. A failed save shows the phone fallback with the details still on screen, never a silent success. Test in Task 3 (`create throws when the write fails`) and Task 16 smoke step (`storage failure shows the phone fallback`).

---

## File map

```
src/core/            storage.ts format.ts paths.ts theme.ts geo.ts schema.ts photos.ts forms.ts
                     leads/{types,repository,local-repository,validation,csv,index}.ts
                     console/{shell,inbox,dom}.ts
                     ui/{Button,Field,ErrorSummary,Icon,Badge,Photo,Placeholder}.astro ui/icons.ts
src/domain/          selection.ts quote.ts checklist.ts events.ts describe.ts
src/config/          business.ts pricing.ts booking.ts rooms.ts messages.ts navigation.ts photo-slots.ts
src/content/         services/*.md areas/*.md policies/*.md reviews.json faqs.json team.json
src/content.config.ts
src/features/plan/          layout.ts FloorPlan.astro plan.ts
src/features/pricing/       PriceTag.astro BookingTag.astro price-tag.ts
src/features/booking/       state.ts steps/{Home,When,Access,You,Check}.astro BookingForm.astro booking.ts lead.ts
src/features/messages/      schedule.ts render.ts MessagePreview.astro timeline.ts
src/features/areas/         SuburbCheck.astro CoverageMap.astro suburb-check.ts
src/features/walkthrough/   WalkthroughForm.astro walkthrough.ts
src/features/forms/         WaitlistForm.astro ApplicationForm.astro
src/sections/        Hero TrustRow RoomChecklist ServicesList Reviews Vetting HowItWorks Coverage OfficesBand Faq CtaBand PageHeader
src/layouts/         BaseLayout ThemeBoot Seo Header Footer DemoRibbon MobileBookingBar site.ts
src/pages/           index book prices offices about faq careers refer terms privacy accessibility 404
                     services/{index,[slug]} areas/{index,[slug]} console/{index.astro,_app.ts,_sample-leads.ts,_detail.ts}
src/styles/          tokens.css global.css console.css
tests/unit/          *.test.ts      tests/e2e/smoke.mjs    tests/fixtures/boundaries/**
tools/               boundaries.mjs check-boundaries.mjs js-budget.mjs shot.mjs photo-brief.mjs
docs/                spec.md customising.md design-system.md photo-brief.md
```

---

### Task 1: Project scaffold and spec refinements

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `README.md`, `src/pages/index.astro` (temporary "Clearday" heading), `tests/unit/smoke.test.ts`
- Modify: `docs/spec.md` (§4.1 file tree, §4.2 rules, §4.3 table, §4.4 types: the four refinements above; bump status to v0.2)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `check` (`astro check`), `test` (`node tools/check-boundaries.mjs && vitest run`, the first half added in Task 2), `e2e` (`node tests/e2e/smoke.mjs`), `photos:status`, `budget` (`node tools/js-budget.mjs`).

- [ ] **Step 1:** Write `package.json` with name `clearday-cleaning`, `"type": "module"`, the scripts above (`test` = `vitest run` until Task 2), dependencies `astro@^5.18.2`, `@astrojs/sitemap`, `@fontsource-variable/schibsted-grotesk`; devDependencies `@astrojs/check`, `typescript@^5.9`, `vitest`, `jsdom`, `playwright`, `@axe-core/playwright`. Copy `tsconfig.json` and `vitest.config.ts` from Trades, changing `include` to `['tests/unit/**/*.test.ts']`. `astro.config.mjs`: `site: 'https://cleaning.reozix.com'`, `trailingSlash: 'always'`, sitemap filtering out `/console/`.
- [ ] **Step 2:** Write `tests/unit/smoke.test.ts` asserting `1 + 1 === 2`, run `npm install && npm test`. Expected: 1 passed.
- [ ] **Step 3:** Run `npm run build`. Expected: `dist/index.html` exists.
- [ ] **Step 4:** Edit `docs/spec.md` with the four refinements; `README.md` gets the quick-start block (install, dev, test, check, build, preview, e2e) and a pointer to `docs/customising.md`.
- [ ] **Step 5:** Commit: `chore: scaffold Astro project and record spec refinements`.

---

### Task 2: Boundary checker

**Files:**
- Create: `tools/boundaries.mjs`, `tools/check-boundaries.mjs`, `tests/unit/boundaries.test.ts`, `tests/fixtures/boundaries/{ok,bad}/src/**` (small `.ts`/`.astro`/`.css` files)
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `findViolations(rootDir: string): Violation[]` where `Violation = { file: string; rule: RuleId; detail: string }` and `RuleId = 'core-imports-outside' | 'domain-imports-feature' | 'feature-imports-feature' | 'section-imports-page' | 'storage-outside-core' | 'raw-colour-outside-tokens'`. CLI prints one line per violation and exits 1 when any exist.

- [ ] **Step 1: Write the failing tests** in `tests/unit/boundaries.test.ts`:
  - `ok fixture has no violations` → `findViolations('tests/fixtures/boundaries/ok')` equals `[]`.
  - `flags each rule once` → for the `bad` fixture, the sorted list of `rule` values equals all six `RuleId`s. The fixture has `src/core/a.ts` importing `@/config/business`, `src/domain/x.ts` importing `@/features/plan/layout`, `src/features/plan/p.ts` importing `../booking/state`, `src/sections/S.astro` importing `@/pages/index.astro`, `src/features/booking/b.ts` containing `localStorage.getItem`, and `src/sections/T.astro` containing `color: #ff0000`.
  - `allows type-only config imports from domain` → `src/domain/ok.ts` with `import type { PricingConfig } from '@/config/pricing'` in the `ok` fixture produces no violation.
- [ ] **Step 2:** Run `npx vitest run tests/unit/boundaries.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `findViolations` in `tools/boundaries.mjs`: walk `src/` for `.ts`, `.mjs`, `.astro`, `.css`; resolve `@/` and relative specifiers to a top-level folder (`core`, `domain`, `features/<name>`, `sections`, `layouts`, `pages`, `config`, `content`, `styles`); apply the Global Constraints rules. Value imports of `config` from `domain` are allowed too (domain reads pricing defaults); only `core` → `config` is forbidden. Exemptions: `src/core/storage.ts`, `src/layouts/ThemeBoot.astro` for storage; `src/styles/tokens.css` for colours. `tools/check-boundaries.mjs` calls it on `.` and prints/exit-codes.
- [ ] **Step 4:** Run the test. Expected: PASS. Set `"test": "node tools/check-boundaries.mjs && vitest run"`; run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(tools): enforce import boundaries in npm test`.

---

### Task 3: Core storage, format and leads

**Files:**
- Create (ported from Trades `src/lib/`): `src/core/storage.ts`, `src/core/format.ts`, `src/core/paths.ts`, `src/core/leads/{types,repository,local-repository,csv,index}.ts`
- Test: `tests/unit/storage.test.ts`, `tests/unit/format.test.ts`, `tests/unit/repository.test.ts`, `tests/unit/csv.test.ts` (port and adapt Trades' tests)

**Interfaces:**
- Produces:
  - `storage.ts`: unchanged API (`KeyValueStorage`, `createMemoryStorage`, `getStorage`, `isStoragePersistent`, `readJson`, `writeJson`) plus `getSessionStorage(): KeyValueStorage` with the same fallback behaviour.
  - `format.ts`: `formatMoney(n: number): string` (`179` → `"$179"`), `formatDay(iso: string): string` (`"2026-10-09"` → `"Fri 9 Oct"`), `todayIn(timeZone: string, now: Date): string` (`YYYY-MM-DD`), `formatPhoneHref(phone: string): string` (`"07 5550 1234"` → `"tel:+61755501234"`).
  - `leads/types.ts`: `LEAD_KINDS = ['booking','walkthrough','application','waitlist'] as const`, `LeadKind`, `LEAD_STATUSES = ['new','confirmed','declined','done'] as const`, `LeadStatus`, `STATUS_LABELS`, `KIND_LABELS`, `Contact { firstName; lastName; phone; email }`, `Consent { terms; marketingSms; marketingEmail; at }`, `LeadInput<P = Record<string, unknown>> { kind; contact; suburb; postcode; consent; payload: P; clientRef: string }`, `LeadEvent { at; type: 'status' | 'note'; value }`, `Lead<P> extends LeadInput<P> { id; status; createdAt; history: LeadEvent[] }`.
  - `repository.ts`: `LeadRepository { create(input): Promise<Lead>; list(filter?: { kind?: LeadKind; status?: LeadStatus }): Promise<Lead[]>; get(id); updateStatus(id, status); addNote(id, note); clear() }`, `RateLimitError`.
  - `local-repository.ts`: `LocalLeadRepository(storage, now?)`, keys `clearday:v1:leads`, `clearday:v1:submits`; `seed(leads)`. No photo handling.
  - `csv.ts`: `leadsToCsv(leads, columns?: CsvColumn[]): string` with `CsvColumn = { header: string; value: (l: Lead) => string }`; default columns ID, Received, Kind, Status, First name, Last name, Phone, Email, Suburb, Postcode, Marketing SMS, Marketing email, Notes. Formula-injection guard kept.
  - `index.ts`: `getLeadRepository()`, `seedDemoLeads(leads)`, re-exports.

- [ ] **Step 1: Write the failing tests** (in addition to the ported ones, adapted to the new `Lead` shape):
  - `create with the same clientRef returns the existing lead` → two `create` calls with `clientRef: 'r1'` return equal `id`s and `list()` has length 1.
  - `create throws when the write fails` → with a storage whose `setItem` throws, `create` rejects with `/Could not save/`.
  - `list filters by kind and status` → seeded 3 leads (booking/new, booking/confirmed, walkthrough/new); `list({ kind: 'booking' })` has 2, `list({ status: 'new' })` has 2, sorted newest first.
  - `formatDay` → `'2026-10-09'` gives `'Fri 9 Oct'`; `todayIn('Australia/Brisbane', new Date('2026-10-08T15:30:00Z'))` gives `'2026-10-09'`.
- [ ] **Step 2:** Run `npx vitest run tests/unit`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Port the files, applying the interface changes above. `create` checks `clientRef` before the rate limit and returns the stored lead when it matches.
- [ ] **Step 4:** Run `npm test`. Expected: PASS, including boundaries.
- [ ] **Step 5:** Commit: `feat(core): storage, formatting and lead repository`.

---

### Task 4: Core validation

**Files:**
- Create: `src/core/leads/validation.ts`
- Test: `tests/unit/validation.test.ts`

**Interfaces:**
- Produces: `type Rule = (value: string, all: Record<string, string>) => string | null` (returns the error message or null); `type Rules = Record<string, Rule[]>`; `type FieldErrors = Record<string, string>`; `validate(input: Record<string, string>, rules: Rules): { ok: boolean; errors: FieldErrors }` (first failing rule per field wins); rule builders `required(msg)`, `minLength(n, msg)`, `maxLength(n, msg)`, `email(msg)`, `auPhone(msg)`, `postcode(msg)`, `checked(msg)` (value `'on'` or `'true'`), `oneOf(values, msg)`; `normalisePhone(raw): string | null` (ported unchanged); `isLikelySpam({ honeypot, startedAt, now })` (ported unchanged).

- [ ] **Step 1: Write the failing tests:**
  - `validate returns the first failing message per field` → `validate({ name: '' }, { name: [required('Enter your first name'), minLength(2, 'Too short')] })` gives `errors.name === 'Enter your first name'` and `ok === false`.
  - `auPhone accepts mobiles, landlines and +61` → `'0412 345 678'`, `'07 5550 1234'`, `'+61 7 5550 1234'` pass; `'12345'`, `'+44 20 7946 0000'` fail.
  - `postcode requires four digits` → `'4032'` passes, `'403'`, `'40320'`, `'abcd'` fail.
  - `checked accepts on and true only` → `'on'`, `'true'` pass, `''` fails.
  - Port the Trades `normalisePhone` and spam tests.
- [ ] **Step 2:** Run `npx vitest run tests/unit/validation.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement in `src/core/leads/validation.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): rule-based form validation`.

---

### Task 5: Core geo, schema, theme and photos

**Files:**
- Create: `src/core/geo.ts`, `src/core/schema.ts`, `src/core/theme.ts`, `src/core/photos.ts`
- Test: `tests/unit/geo.test.ts`, `tests/unit/schema.test.ts`, `tests/unit/theme.test.ts`

**Interfaces:**
- Produces:
  - `geo.ts`: `AreaEntry { suburb: string; postcode: string; page?: string; lat?: number; lng?: number }`; `Match { status: 'in' | 'out' | 'invalid'; query: string; matches: AreaEntry[] }` (`query` = the cleaned suburb name in title case, or the postcode); `normaliseQuery(raw)` (port, Trades `areas.ts`, plus `mt` → `mount`); `findArea(raw: string, areas: readonly AreaEntry[]): Match`; `projectPoints(...)` (port unchanged from Trades `geo.ts`).
  - `schema.ts`: `localBusinessSchema(b: BusinessFacts): object` where `BusinessFacts = { name; legalName; type: string; url; phone; email; abn; areas: string[]; hours: { days: string[]; opens: string; closes: string }[]; rating?: { value: number; count: number } }` (`@type` = `b.type`, `areaServed` = list of `{ '@type': 'Place', name }`, `aggregateRating` only when `rating` is given); `serviceSchema({ name, description, provider, areas, priceFrom })` (`offers.priceCurrency: 'AUD'`); `faqSchema(items: { q: string; a: string }[])`.
  - `theme.ts`: `resolveTheme({ param, stored, configured, allowed, demoMode }): string` — returns `param` if demoMode and `param ∈ allowed`, else `stored` if demoMode and `stored ∈ allowed`, else `configured`.
  - `photos.ts`: `getPhoto(slot: string): ImageMetadata | undefined` and `hasPhoto(slot)`, using `import.meta.glob('/src/assets/photos/*.{jpg,jpeg,png,webp,avif}')` as in Trades, without importing config.

- [ ] **Step 1: Write the failing tests:**
  - `findArea handles real-world input` → areas `[{suburb:'Chermside',postcode:'4032'},{suburb:'Aspley',postcode:'4034'},{suburb:'Geebung',postcode:'4034'},{suburb:'Mount Gravatt',postcode:'4122'}]`: `' chermside qld 4032 '` → `status 'in'`, `matches[0].suburb 'Chermside'`; `'4034'` → `'in'` with 2 matches; `'Mt Gravatt'` → `'in'`; `'Kedron'` → `'out'` with `query 'Kedron'`; `''` and `'x'` → `'invalid'`.
  - `localBusinessSchema omits rating when not given` and `includes aggregateRating when given` (`ratingValue 4.9`, `reviewCount 212`).
  - `faqSchema maps q and a` → `mainEntity[0].acceptedAnswer.text` equals the answer.
  - `resolveTheme` → `{param:'eucalyptus',stored:null,configured:'floorplan',allowed:['floorplan','eucalyptus'],demoMode:true}` gives `'eucalyptus'`; same with `demoMode:false` gives `'floorplan'`; `param:'neon'` falls back to stored, then configured.
- [ ] **Step 2:** Run `npx vitest run tests/unit/geo.test.ts tests/unit/schema.test.ts tests/unit/theme.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the four modules. `findArea`: a typed name wins over a postcode; title-case the cleaned name for `query`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): area lookup, JSON-LD builders, theme resolution, photo lookup`.

---

### Task 6: Tokens, global CSS, fonts and UI primitives

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/core/ui/{Button,Field,ErrorSummary,Icon,Badge,Photo,Placeholder}.astro`, `src/core/ui/icons.ts`, `src/pages/dev/ui.astro` (kitchen-sink page, `noindex`, excluded from sitemap)
- Modify: `astro.config.mjs` (sitemap filter also excludes `/dev/`)

**Interfaces:**
- Produces tokens (CSS custom properties, both themes on `[data-theme]`): `--color-paper --color-ink --color-ink-muted --color-room --color-highlight --color-line --color-surface --color-on-ink --color-success --color-success-soft --color-warning --color-warning-soft --color-danger --color-danger-soft --color-focus`; `--font-sans`; type `--text-14 --text-16 --text-18 --text-22 --text-28 --text-36 --text-hero` (`clamp(2.5rem, 5vw, 3.5rem)`); `--body-size: 17px`, `--leading-body: 1.6`, `--measure: 68ch`; space `--space-1`…`--space-8` (4, 8, 12, 16, 24, 32, 48, 64 px); `--radius-control: 6px`; `--wall: 2px`; `--hairline: 1px`; `--target: 44px`; `--dur-fill: 180ms`.
- Theme values: `floorplan` and `eucalyptus` exactly as spec §7.1. `--color-on-ink: #FFFFFF`. `--color-focus` = ink in `floorplan`, ink in `eucalyptus` (3px outline, 2px offset).
- Components: `Button` props `{ href?: string; variant?: 'primary' | 'secondary' | 'quiet'; type?: 'button' | 'submit'; size?: 'md' | 'lg' }`; `Field` props `{ name; label; type?; required?; autocomplete?; hint?; inputmode? }` renders label, input, hint and an error slot `[data-error-for=name]`; `ErrorSummary` renders an empty `role="alert" tabindex="-1"` list filled by scripts; `Icon` props `{ name: IconName; size?: number }` (inline SVG from `icons.ts`, 24×24 stroke icons: `phone`, `menu`, `close`, `check`, `plus`, `minus`, `home`, `shield`, `star`, `clock`, `key`, `map-pin`, `building`, `calendar`); `Photo` props `{ slot: string; alt: string; ratio?; sizes?; priority?; label? }` (port, alt passed in); `Placeholder` props `{ label: string; ratio?: string }` drawn as a plan-paper panel with a 2px dashed line border and the label.

- [ ] **Step 1:** Write `tokens.css` (all raw values) and `global.css` (reset, `body` uses `--body-size`, `--leading-body`, headings 700 with `letter-spacing: -0.02em` only on `h1, .display`; `:focus-visible` outline; `.visually-hidden`; `.skip-link`; `@media (prefers-reduced-motion: reduce) { * { transition: none !important } }`). Import the Fontsource variable font in `global.css`.
- [ ] **Step 2:** Port or write the seven components using only tokens. Button min-height `var(--target)`; primary = ink fill with on-ink text; secondary = 1px ink border; quiet = underlined text button.
- [ ] **Step 3:** Build `src/pages/dev/ui.astro` showing every component in both themes (two wrappers with `data-theme`).
- [ ] **Step 4:** Run `npm test && npm run check && npm run build`. Expected: all pass; the boundary checker reports no raw colours outside tokens.
- [ ] **Step 5:** Run `npm run preview &` then `node tools/shot.mjs /dev/ui/ 375 ui-375.png` and `… 1280 ui-1280.png` (port `tools/shot.mjs` from Trades). Check: focus rings visible, buttons 44px tall, no text below 14px. Commit: `feat(ui): design tokens, themes and primitives`.

---

### Task 7: Config and content

**Files:**
- Create: `src/config/{business,pricing,booking,rooms,messages,navigation,photo-slots}.ts`, `src/content.config.ts`, `src/content/services/{regular,deep,end-of-lease,move-in}.md`, `src/content/areas/{chermside,aspley,albany-creek,everton-park}.md`, `src/content/policies/{terms,privacy,accessibility}.md`, `src/content/{reviews,faqs,team}.json`
- Test: `tests/unit/config.test.ts`

**Interfaces:**
- Produces (types exported from each config file alongside values):
  - `business.ts`: `ThemeName = 'floorplan' | 'eucalyptus'`; `business = { demoMode: true, theme: 'floorplan', themes: ['floorplan','eucalyptus'], tradingName, legalName, abn, founded: 2016, phone: '07 5550 1234', mobile: '0491 570 110', email: 'hello@clearday.example', url: 'https://cleaning.reozix.com', schemaType: 'HouseCleaning', hours: [{ label: 'Monday to Friday', days: ['Mo','Tu','We','Th','Fr'], opens: '07:00', closes: '17:00' }, { label: 'Saturday', days: ['Sa'], opens: '08:00', closes: '12:00' }], insurance: { short: '$20M public liability', long: 'Public liability insurance of $20 million' }, bonded: false, policeChecked: 'Every cleaner holds a current national police check', guarantee: { short: '24-hour re-clean promise', long: "If we missed something, tell us within 24 hours and we'll come back and re-clean it free." }, rating: { value: 4.9, count: 212 }, base: { lat: -27.366, lng: 153.017 }, areas: AreaEntry[] , timeZone: 'Australia/Brisbane', confirmPromise: 'within 2 business hours', reviewLink: 'https://g.page/r/clearday-demo/review' }`. `areas` = Chermside 4032 (page `chermside`, -27.385, 153.030), Aspley 4034 (page `aspley`, -27.366, 153.017), Carseldine 4034 (-27.348, 153.019), Geebung 4034 (-27.372, 153.047), Zillmere 4034 (-27.360, 153.040), Bridgeman Downs 4035 (-27.355, 152.990), Albany Creek 4035 (page `albany-creek`, -27.350, 152.968), Everton Park 4053 (page `everton-park`, -27.403, 152.988), Stafford 4053 (-27.410, 153.010), McDowall 4053 (-27.382, 152.990), Bald Hills 4036 (-27.320, 153.010), Strathpine 4500 (-27.304, 152.990). Kedron is deliberately not listed.
  - `pricing.ts`: `ServiceId`, `Frequency`, `AddOnId` (spec §4.4); `PricingConfig = { base: number; perExtraBedroom: number; perExtraBathroom: number; study: number; laundry: number; multiplier: Record<ServiceId, number>; discount: Record<Frequency, number>; oneOffOnly: ServiceId[]; firstVisitAsDeep: boolean; addOns: Record<AddOnId, { label: string; price: number }> }`; values from spec §5 (`multiplier.regular = 1`, `discount.once = 0`, `oneOffOnly = ['end-of-lease','move-in']`); `SERVICE_LABELS`, `FREQUENCY_LABELS` (`'Just once' | 'Every week' | 'Every fortnight' | 'Every month'`).
  - `booking.ts`: `BookingConfig = { daysOff: number[] /* 0 = Sunday */; leadDays: 2; horizonDays: 14; windows: { id: 'morning' | 'afternoon'; label: string; arrive: string; start: string; end: string }[] }` with morning `start '08:00' end '10:00'`, afternoon `start '12:00' end '14:00'`, `daysOff: [0]`.
  - `rooms.ts`: `RoomKind`; `RoomsConfig = { plan: { width: 12; rows: { sleep: 5; wet: 3; living: 4 }; livingShare: 7 }; max: { bedrooms: 6; bathrooms: 4 }; rooms: Record<RoomKind, { label: string; every: string[]; deep: string[]; endOfLease: string[] }> }`. Each room kind gets 4–6 `every`, 2–4 `deep`, 1–3 `endOfLease` items in plain words.
  - `messages.ts`: `MessageTemplate` (spec §4.4 plus refinements) and `messages: MessageTemplate[]` with these bodies:
    - confirmation: `Hi {firstName}, your clean is confirmed for {date}, arriving {window}. {price} a visit. Reply to this text with any access notes. {businessName}`
    - reminder (visit, −24): `Hi {firstName}, a reminder that we're cleaning tomorrow, arriving {window}. Need to change it? Call us. {businessName}`
    - on-the-way (visit, 0): `Hi {firstName}, your cleaner is on the way and will arrive {window}. {businessName}`
    - review-request (visit, +6): `Thanks for having us, {firstName}. How did we go? A quick review helps a lot: {reviewLink} {businessName}`
    - rebook-offer (visit, +504, email, marketing, condition 'one-off'): `Hi {firstName}, it's been three weeks since your clean. Book a regular clean and save up to 15%. {optOut}`
    - walkthrough-day-2 / day-5 (created, +48 / +120, email, `appliesTo: 'walkthrough'`): short follow-ups offering a visit time.
  - `navigation.ts`: header `[Services /services/, Prices /prices/, Areas /areas/, Offices /offices/, About /about/]`; footer groups.
  - `photo-slots.ts`: slots `hero`, `service-regular`, `service-deep`, `service-end-of-lease`, `service-move-in`, `area-chermside`, `area-aspley`, `area-albany-creek`, `area-everton-park`, `founder`, `offices`, each with `alt`, `brief`, `search`, `orientation`. Briefs ask for finished rooms in daylight, no people presented as staff.
  - `content.config.ts`: `services` schema (`title`, `order`, `service: ServiceId`, `summary ≤ 200`, `suits`, `duration`, `faqs: {q,a}[] 3`, `ecoClaim?: { text; basis }` where `basis` is required when `ecoClaim` exists, `seoTitle`, `seoDescription ≤ 160`); `areas` (`suburb`, `postcode /^\d{4}$/`, `nearby: string[]`, `intro`, `seoDescription`); `policies` (`title`, `updated`); `reviews` (`name`, `suburb`, `date`, `rating 1–5`, `service`, `text ≤ 400`); `faqs` (`q`, `a`, `tags: ('home'|'booking'|'offices'|'keys'|'payment')[]`); `team` (`name`, `role`, `since`, `note`).

- [ ] **Step 1: Write the failing tests** in `tests/unit/config.test.ts`:
  - `every area with a page has a content file` → each `business.areas[].page` exists in `src/content/areas/`.
  - `message templates use known variables only` → every `{x}` in `messages[].body` is in `['firstName','date','window','price','businessName','reviewLink','optOut']`; every SMS body contains `{businessName}`; every `marketing: true` body contains `{optOut}`.
  - `every room has every checklist level` → each `rooms.rooms[kind]` has non-empty `every` and `deep`.
  - `pricing covers every service, frequency and add-on` → keys of `multiplier`, `discount`, `addOns` equal the id lists.
  - `copy rules` → no string value in `business`, `navigation`, `messages` contains `·`, `→`, or a run of 3+ capital letters other than `ABN`, `GST`, `QLD`, `REIQ`, `NDIS`, `WHS`, `SMS`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/config.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Write the config files and content. Reviews: 8 entries across the four areas and four services, dated within the last 6 months. FAQs: 12 entries covering keys and lockboxes, alarm codes, being home, pets, supplies and equipment, cancelling (48 hours), lockouts, payment, same cleaner, what if something's missed, insurance, offices. Team: founder plus 4 cleaners. Policies: terms (cancellation 48 h free, later $50 fee; lockout fee $60 after 20 minutes waiting; keys stored in a locked key safe, coded tags with no address; alarm codes stored with the booking and deleted when service ends; arrival windows; right to refuse unsafe work), privacy (what is collected, why, marketing consent separate and withdrawable, STOP and unsubscribe within 5 business days), accessibility (WCAG 2.2 AA target, contact for problems). End-of-lease service content mentions the REIQ exit-condition checklist and the 72-hour re-clean wording from spec §6.8 verbatim.
- [ ] **Step 4:** Run `npm test && npm run check && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(config): demo business, pricing, booking, rooms, messages and content`.

---

### Task 8: Domain selection and quote

**Files:**
- Create: `src/domain/selection.ts`, `src/domain/quote.ts`, `src/domain/events.ts`, `src/domain/describe.ts`
- Test: `tests/unit/selection.test.ts`, `tests/unit/quote.test.ts`, `tests/unit/events.test.ts`

**Interfaces:**
- Consumes: `PricingConfig`, `ServiceId`, `Frequency`, `AddOnId` (Task 7); `KeyValueStorage`, `readJson`, `writeJson` (Task 3).
- Produces:
  - `selection.ts`: `Selection` (spec §4.4); `DEFAULT_SELECTION = { service: 'regular', bedrooms: 3, bathrooms: 2, study: false, laundry: false, frequency: 'fortnightly', addOns: [] }`; `normalise(s: Partial<Selection>, pricing: PricingConfig, max: { bedrooms; bathrooms }): Selection` (clamps, defaults unknown ids, forces `'once'` for `oneOffOnly`, dedupes add-ons); `toParams(s): string` (`service=regular&bed=3&bath=2&study=0&laundry=1&freq=fortnightly&extras=oven,blinds`); `fromParams(search: string, pricing, max): Selection`; `loadSelection(storage, pricing, max): Selection | null` and `saveSelection(storage, s)` (key `clearday:v1:selection`).
  - `quote.ts`: `QuoteLine`, `Quote` (spec §4.4); `quote(s: Selection, p: PricingConfig): Quote`; `fromPrice(service: ServiceId, p: PricingConfig): number`.
  - `events.ts`: `SELECTION_EVENT = 'clearday:selection'`; `emitSelection(s: Selection, target?: EventTarget)`; `onSelection(cb: (s: Selection) => void, target?: EventTarget): () => void` (returns unsubscribe). Default target `document`.
  - `describe.ts`: `describeSelection(s, labels): string` → `"3 bed, 2 bath, fortnightly"` (one-off: `"3 bed, 2 bath, end of lease"`); `describeRooms(s): string` → `"3 bedrooms, 2 bathrooms, living, kitchen"`.

- [ ] **Step 1: Write the failing tests:**
  - `quote matches the spec worked example` → `quote(DEFAULT_SELECTION, pricing).perVisit === 179` and `.firstVisit === 318`.
  - `lines always sum to perVisit` → for every service × frequency × bedrooms 1–6 × bathrooms 1–4 × with/without `oven`, `sum(lines.amount) === perVisit`.
  - `add-ons are flat and undiscounted` → adding `oven` raises `perVisit` by exactly 65 for regular weekly.
  - `one-off services ignore frequency` → end-of-lease with `frequency: 'weekly'` quotes the same as with `'once'`, and `quote(...).frequency === 'once'`.
  - `firstVisit equals perVisit for one-off and when the rule is off`.
  - `end of lease 3 bed 2 bath` → `perVisit === 438`.
  - `fromPrice` → regular 110, deep 175, move-in 232, end-of-lease 284.
  - `fromParams clamps and defaults` → `'?bed=99&bath=0&service=pool&freq=daily&extras=oven,jacuzzi,oven'` gives `bedrooms 6`, `bathrooms 1`, `service 'regular'`, `frequency 'fortnightly'`, `addOns ['oven']`; `toParams` → `fromParams` round-trips `DEFAULT_SELECTION`.
  - `onSelection receives emitted selections and unsubscribes`.
  - `describeSelection` → `'3 bed, 2 bath, fortnightly'`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/selection.test.ts tests/unit/quote.test.ts tests/unit/events.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `quote` algorithm (spec §5): `rooms = base + (bed−1)·perExtraBedroom + (bath−1)·perExtraBathroom + (study ? study : 0) + (laundry ? laundry : 0)`; `freq = oneOffOnly.includes(service) ? 'once' : s.frequency`; `serviceLine = round(rooms · multiplier[service])`; `addOnTotal = Σ addOns price`; `perVisit = round(rooms · multiplier[service] · (1 − discount[freq]) + addOnTotal)`; lines = service line (label `"<Service> clean, <describeRooms>"`), a discount line `perVisit − serviceLine − addOnTotal` labelled `"<Frequency> saving"` only when `freq` discount > 0, then one line per add-on; `firstVisit = firstVisitAsDeep && freq !== 'once' ? round(rooms · multiplier.deep + addOnTotal) : perVisit`. `fromPrice` = min `perVisit` over allowed frequencies for `{ bed 1, bath 1, study false, laundry false, addOns [] }`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(domain): selection, quote and selection events`.

---

### Task 9: Floor plan layout

**Files:**
- Create: `src/features/plan/layout.ts`
- Test: `tests/unit/layout.test.ts`

**Interfaces:**
- Consumes: `Selection` (Task 8); `RoomsConfig` (Task 7).
- Produces: `PlanRoom` (spec §4.4); `layout(s: Selection, rooms: RoomsConfig): { width: number; height: number; rooms: PlanRoom[] }`.

- [ ] **Step 1: Write the failing tests:**
  - `rooms tile the plan with no gaps or overlaps` → for all 96 combinations (bedrooms 1–6, bathrooms 1–4, study, laundry): no two rects overlap (positive-area intersection), and `Σ w·h === width·height`.
  - `ids are unique and labels follow the pattern` → ids `bed-1…bed-n`, `bath-1…bath-n`, `living`, `kitchen`, `study`, `laundry`, `add-bedroom`, `add-bathroom`, `add-study`, `add-laundry` as applicable; labels `Bed 1`, `Bath 1`, `Living`, `Kitchen`, `Study`, `Laundry`, `Add a bedroom`, `Add a bathroom`, `Add a study`, `Add a laundry`.
  - `available slots appear only below the maximum` → 6 bedrooms has no `add-bedroom`; 4 bathrooms has no `add-bathroom`; `study: true` has `study` and no `add-study`.
  - `living and kitchen are always included`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/layout.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the algorithm: three rows stacked top to bottom with heights `rows.sleep`, `rows.wet`, `rows.living`, all `width` wide. Sleep row: included bedrooms, then `add-bedroom` if below max, split equally across the width. Wet row: included bathrooms, `add-bathroom` if below max, then `laundry` or `add-laundry`, then `study` or `add-study`, split equally. Living row: `living` width `livingShare`, `kitchen` the rest. Included rooms get `state: 'included'`, add slots `'available'`. Rounding: keep fractional widths (SVG handles them); the tests compare with a 1e-9 tolerance.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(plan): generated floor plan layout`.

---

### Task 10: Booking state and days

**Files:**
- Create: `src/features/booking/state.ts`
- Test: `tests/unit/booking-state.test.ts`

**Interfaces:**
- Consumes: `BookingConfig` (Task 7); `todayIn`, `formatDay` (Task 3).
- Produces: `Day { date: string; label: string }`; `availableDays(today: string, cfg: BookingConfig): Day[]` (dates from `today + leadDays` to `today + horizonDays` inclusive, skipping `daysOff`, date arithmetic on `YYYY-MM-DD` in UTC); `visitStart(date: string, windowId, cfg): string` (ISO with `+10:00`, e.g. `'2026-10-09T08:00:00+10:00'`); `STEP_IDS = ['home','when','access','you','check'] as const`; `nextStep(current)` / `prevStep(current)`.

- [ ] **Step 1: Write the failing tests:**
  - `availableDays skips Sundays and respects lead and horizon` → today `'2026-10-03'` (Saturday): first day `'2026-10-05'` (Monday), last day `'2026-10-17'`, no Sundays, 11 days.
  - `availableDays uses Brisbane date` → `availableDays(todayIn('Australia/Brisbane', new Date('2026-10-03T14:30:00Z')), cfg)[0].date === '2026-10-06'` (14:30Z is 00:30 Sunday 4 October in Brisbane, so the first day is Tuesday the 6th).
  - `empty when every day is off` → `daysOff [0..6]` gives `[]`.
  - `visitStart` → `visitStart('2026-10-09','afternoon',cfg) === '2026-10-09T12:00:00+10:00'`.
  - `step order` → `nextStep('home') === 'when'`, `nextStep('check') === 'check'`, `prevStep('home') === 'home'`.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement in `state.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(booking): available days and step state`.

---

### Task 11: Message render and schedule

**Files:**
- Create: `src/features/messages/render.ts`, `src/features/messages/schedule.ts`
- Test: `tests/unit/messages.test.ts`

**Interfaces:**
- Consumes: `Lead`, `LeadStatus` (Task 3); `MessageTemplate`, `messages` (Task 7); `formatDay`, `formatMoney` (Task 3). Visit details arrive through `ScheduleContext`; this feature imports nothing from `features/booking`.
- Produces:
  - `render(body: string, vars: Record<string, string>): string` — replaces each `{key}`; unknown keys are left as written.
  - `ScheduledMessage { templateId; channel; sendAt: string | null; text: string; skippedReason?: 'no-consent' | 'not-confirmed' | 'status-changed' }`.
  - `ScheduleContext { now: string; businessName: string; reviewLink: string; optOut: { sms: string; email: string }; visit?: { startIso: string; windowLabel: string; dayLabel: string; priceLabel: string; oneOff: boolean } }`.
  - `schedule(lead: Lead, templates: readonly MessageTemplate[], ctx: ScheduleContext): ScheduledMessage[]` sorted by `sendAt` (nulls last).

- [ ] **Step 1: Write the failing tests:**
  - `render replaces known keys and keeps unknown` → `render('Hi {firstName} {x}', { firstName: 'Sam' }) === 'Hi Sam {x}'`.
  - `confirmed booking gets four messages at the right times` → booking confirmed at `2026-10-05T09:00:00+10:00`, visit `2026-10-09T08:00:00+10:00`, no marketing consent: templates `confirmation` (sendAt = the confirmation event time), `reminder` (`2026-10-08T08:00:00+10:00`), `on-the-way` (`2026-10-09T08:00:00+10:00`), `review-request` (`2026-10-09T14:00:00+10:00`); each `text` contains `'Clearday Home Cleaning'`; none has `skippedReason`. The rebook offer is absent because the booking is fortnightly.
  - `new booking shows messages waiting for confirmation` → status `'new'`: confirmation has `sendAt null` and `skippedReason 'not-confirmed'`.
  - `marketing messages need consent` → one-off booking without `marketingEmail`: rebook offer present with `skippedReason 'no-consent'`; with consent: present without a reason and its text ends with the email opt-out line.
  - `declined booking has no messages` → `[]`.
  - `walk-through follow-ups stop once the owner acts` → walkthrough created `2026-10-01T10:00:00+10:00`, status `'new'`: two emails at +48 h and +120 h; status `'confirmed'`: both carry `skippedReason 'status-changed'`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/messages.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Confirmation time = latest `history` event with `type 'status'` and `value 'confirmed'`. Visit-based messages need `ctx.visit`; without it they are omitted. Times are ISO strings with `+10:00` (add hours to the Date and format in Brisbane time).
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(messages): template rendering and message timeline`.

---

### Task 12: Page shell

**Files:**
- Create: `src/layouts/{BaseLayout,ThemeBoot,Seo,Header,Footer,DemoRibbon,MobileBookingBar}.astro`, `src/layouts/site.ts`, `src/sections/PageHeader.astro`, `tests/e2e/smoke.mjs`
- Modify: `src/pages/index.astro` (uses BaseLayout)

**Interfaces:**
- Consumes: `business`, `navigation` (Task 7); `resolveTheme` (Task 5); `localBusinessSchema` (Task 5); `formatPhoneHref` (Task 3); `Button`, `Icon` (Task 6).
- Produces: `BaseLayout` props `{ title: string; description: string; schema?: object | object[]; noindex?: boolean; bare?: boolean }`, sets `<html lang="en-AU" data-theme>`; `PageHeader` props `{ title: string; intro?: string }`; `MobileBookingBar` markup with `[data-booking-bar]` (hidden until a selection exists, filled by Task 13's `price-tag.ts`) and a call link. `smoke.mjs` exports nothing; it runs `step(name, fn)` checks against `process.argv[2] ?? 'http://localhost:4321'`, prints ✓/✗ and exits 1 on any failure (port the Trades harness).

- [ ] **Step 1: Write the failing e2e steps** in `tests/e2e/smoke.mjs`:
  - `home has one h1, a tap-to-call link and the ABN in the footer` → `h1` count 1; `header a[href="tel:+61755501234"]` visible at 1280px; footer text matches `/ABN 00 000 000 000/` and `/Clearday Cleaning Services Pty Ltd/`.
  - `demo ribbon shows in demo mode` → `[data-demo-ribbon]` visible.
  - `theme switches with ?theme=eucalyptus and persists for the session` → `html[data-theme]` is `eucalyptus` on `/?theme=eucalyptus` and still on `/` after; a fresh context gets `floorplan`.
- [ ] **Step 2:** Run `npm run build && (npm run preview &) && sleep 2 && npm run e2e`. Expected: FAIL.
- [ ] **Step 3:** Implement. `Seo.astro` writes title, description, canonical URL (`new URL(Astro.url.pathname, business.url)`), Open Graph title/description, `noindex` when asked, and JSON-LD; `BaseLayout` passes `localBusinessSchema` with `rating` only when `business.demoMode` is false. `ThemeBoot.astro` is an `is:inline` script with `define:vars` for allowed themes and demo mode that applies `resolveTheme`'s rule before paint (a 6-line inline copy; the unit-tested `resolveTheme` stays the source of truth and a comment points to it) and stores the param in `sessionStorage` key `clearday:v1:theme`. Header: logo wordmark (text + small plan glyph SVG), nav, phone, **Book a clean**; below 1024px a menu button toggles the nav (`site.ts`, `aria-expanded`). Footer: legal name, ABN, phone, email, hours, suburb list, links to terms, privacy, accessibility, careers, refer. DemoRibbon: "Sample business. Prices, reviews and messages are examples."
- [ ] **Step 4:** Run the e2e again. Expected: the three steps pass.
- [ ] **Step 5:** Commit: `feat(layout): page shell, theme boot and smoke harness`.

---

### Task 13: Floor plan calculator, price tags and suburb check (hero)

**Files:**
- Create: `src/features/plan/{FloorPlan.astro,plan.ts}`, `src/features/pricing/{PriceTag.astro,BookingTag.astro,price-tag.ts}`, `src/features/areas/{SuburbCheck.astro,suburb-check.ts}`, `src/sections/{Hero,TrustRow}.astro`
- Modify: `src/pages/index.astro`, `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: `layout` (Task 9); `quote`, `normalise`, `toParams`, `loadSelection`, `saveSelection`, `emitSelection`, `onSelection`, `describeSelection` (Task 8); `findArea` (Task 5); config (Task 7).
- Produces: `FloorPlan` props `{ mode: 'edit' | 'read'; id: string }`; renders an `<svg>` (viewBox from `layout`) plus a controls block: bedroom and bathroom steppers (`button` "Remove a bedroom" / "Add a bedroom, 3 selected", live `aria-live="polite"` count), study and laundry toggles (`aria-pressed`), frequency radio group, an "Add extras" disclosure with add-on checkboxes, and a text equivalent (`describeRooms`). Every room is an SVG `<g data-room-id="<id>" class="room room--<state>">` with a `<rect>` and a `<text>` label; available rooms also get `role="button" tabindex="0" aria-label="Add a bedroom"` and respond to click, Enter and Space. The hero section has `id="plan"`. `plan.ts` re-renders the SVG from `layout()` on change, calls `saveSelection` and `emitSelection`. `price-tag.ts` subscribes with `onSelection`, writes `[data-price-per-visit]`, `[data-price-first-visit]` (hidden when equal), `[data-price-summary]`, updates the "Choose a time" link `href` to `/book/?<toParams>`, and shows `[data-booking-bar]`. `BookingTag` on desktop sits in the hero and, once the hero leaves the viewport (`IntersectionObserver`), a copy pins under the header (`position: sticky`); `[data-booking-bar]` and the pinned tag are not rendered on `/book/`.
- Room fill transition: `fill` on `.room--included` transitions over `var(--dur-fill)`.

- [ ] **Step 1: Write the failing e2e steps:**
  - `hero plan prices the default home` → on `/` in a fresh context, `[data-price-per-visit]` text is `$179`, `[data-price-first-visit]` contains `$318`, and `[data-price-summary]` reads `3 bed, 2 bath, fortnightly`.
  - `adding a bedroom updates the plan and price` → click "Add a bedroom"; `[data-room-id="bed-4"]` exists; price text differs from before.
  - `keyboard can add a room` → focus the `add-bathroom` room, press Enter; `[data-room-id="bath-3"]` exists.
  - `Choose a time carries the selection` → link `href` contains `bed=4` and `freq=fortnightly`.
  - `suburb check answers in and out` → type `4032`, submit: result text `We clean in Chermside.`; type `Kedron`: `We don't clean in Kedron yet.` and the waitlist link to `/areas/#waitlist` is shown.
  - `mobile booking bar appears after a change` → at 375px, after clicking "Add a bedroom", `[data-booking-bar]` is visible and contains a `tel:` link.
- [ ] **Step 2:** Rebuild, run e2e. Expected: the new steps FAIL.
- [ ] **Step 3:** Implement the components and wiring; compose `Hero` (left: h1 "Your home, priced room by room.", one supporting line, `SuburbCheck`; right: `FloorPlan mode="edit"` and `PriceTag`) and `TrustRow` (police check, insurance short, guarantee short, rating with "sample" label when `demoMode`, each with an `Icon`). Use `Photo slot="hero"` only as a background-free supporting image below the plan on desktop if a file exists; otherwise omit (no placeholder in the hero).
- [ ] **Step 4:** Rebuild, run `npm test && npm run e2e`. Expected: PASS. Take `shot.mjs` screenshots of `/` at 375 and 1280 and check the plan reads as a plan (walls 2px ink, included rooms yellow, available rooms dashed).
- [ ] **Step 5:** Commit: `feat(home): floor plan calculator, price tags and suburb check`.

---

### Task 14: Home page sections

**Files:**
- Create: `src/sections/{RoomChecklist,ServicesList,Reviews,Vetting,HowItWorks,Coverage,OfficesBand,Faq,CtaBand}.astro`, `src/features/areas/CoverageMap.astro`, `src/domain/checklist.ts`
- Test: `tests/unit/checklist.test.ts`
- Modify: `src/pages/index.astro`, `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: `FloorPlan mode="read"` (Task 13), `rooms` config, `projectPoints` (Task 5), content collections (Task 7), `fromPrice` (Task 8).
- Produces: `checklistFor(kind: RoomKind, service: ServiceId, rooms: RoomsConfig): string[]` — regular: `every`; deep and move-in: `every + deep`; end-of-lease: `every + deep + endOfLease`. `RoomChecklist` renders the read-only plan plus one `<details>`-free panel per room kind generated at build time for each service (`data-room-kind`, `data-service`); a tiny inline script shows the panel for the clicked room and the current selection's service (listens with `onSelection`). `Coverage` uses `CoverageMap` (SVG dots from `projectPoints`, base marker, suburb names) and a suburb list linking to area pages. `Faq` props `{ tag: string; limit?: number }` renders `<details>` items. `CtaBand` props `{ title: string; text?: string }` with Book a clean + phone.

- [ ] **Step 1: Write the failing tests:**
  - Unit `checklistFor builds on each level` → end-of-lease list for `kitchen` starts with the `every` items and has length `every + deep + endOfLease`; regular equals `every`.
  - E2E `room checklist follows the clicked room` → on `/`, clicking `#whats-included [data-room-id="kitchen"]` shows a panel whose heading is `Kitchen`.
  - E2E `services list links to every service page with a from price` → four links under `#services`, each with text matching `/from \$\d+/`.
  - E2E `reviews show name, suburb and date` → at least 3 `[data-review]` items each containing a `<time datetime>`.
  - E2E `how a booking works is an ordered list of 4` → `#how ol > li` count 4.
- [ ] **Step 2:** Run unit and e2e. Expected: FAIL.
- [ ] **Step 3:** Implement the sections and compose the home page in the order of spec §6.1. Services, reviews and team are lists or rows (no card grids). Vetting copy: police check, interview and paid trial clean, employed not subcontracted, same cleaner each visit when possible, founder note with `Photo slot="founder"`.
- [ ] **Step 4:** Run `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(home): checklist, services, reviews, vetting, steps, coverage, offices band, FAQ`.

---

### Task 15: Content pages

**Files:**
- Create: `src/pages/services/{index,[slug]}.astro`, `src/pages/areas/{index,[slug]}.astro`, `src/pages/{prices,about,faq,terms,privacy,accessibility,careers,refer,404}.astro`, `src/features/forms/{WaitlistForm,ApplicationForm}.astro`, `src/core/forms.ts`
- Test: `tests/unit/forms.test.ts`
- Modify: `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: content collections, `checklistFor`, `fromPrice`, `quote`, `serviceSchema`, `faqSchema`, `localBusinessSchema`, `validate` + rule builders, `getLeadRepository`, `findArea`.
- Produces (`src/core/forms.ts`, industry-neutral): `formValues(form): Record<string, string>` (unchecked checkboxes give `''`); `showErrors(form, errors: FieldErrors, summary: HTMLElement)` (writes each `[data-error-for]`, sets `aria-invalid`, fills the summary with links to fields, focuses it); `clearErrors(form, summary)`; `bindSimpleForm(form, opts: { rules: Rules; toInput: (values: Record<string, string>) => LeadInput; repo: LeadRepository; success: string; fallbackPhone: string })` — validates a field on blur and all on submit, disables the button while sending, creates the lead, replaces the form with the success text, shows `We couldn't save your request. Call us on <fallbackPhone>.` on failure.
- Page content: services pages per spec §6.8 (end-of-lease adds the REIQ checklist as a list and a "Print this checklist" link to `?print` that the print stylesheet handles); `/prices` table of `fromPrice` per service, frequency discounts and add-on prices, plus "What changes the price" (rooms, frequency, add-ons, condition) and the first-visit rule in one sentence; area pages with intro, nearby suburbs, two reviews from that suburb (fallback: any two), a `FloorPlan mode="edit"` mini calculator is not repeated (link to `/#plan` instead); `/areas/` has the coverage map, the full list and `WaitlistForm` at `#waitlist`; `/careers` has pay range sentence ("From $32 an hour plus travel time", sample), requirements (police check, right to work, own car), steps, `ApplicationForm` (name, phone, email, suburb, availability, experience) creating an `application` lead; `/refer` shows rules ("Your friend gets $20 off their first clean; you get $20 off your next one after their first visit") and a random 6-character referral code generated once and saved under `clearday:v1:referral-code`, with a copy button; `/about` founder story, team list, vetting steps, insurance and police-check facts; `/faq` all FAQs grouped by tag with `faqSchema`; policy pages render the Markdown.

- [ ] **Step 1: Write the failing e2e steps:**
  - `every page has one h1, the ABN and no horizontal scroll at 375 and 1280` for `/`, `/services/`, all four service pages, `/prices/`, `/areas/`, all four area pages, `/offices/` (added in Task 17; include it then), `/about/`, `/faq/`, `/careers/`, `/refer/`, `/terms/`, `/privacy/`, `/accessibility/`.
  - `end-of-lease page has the REIQ checklist and re-clean promise` → text matches `/REIQ/` and `/within 72 hours/`.
  - `waitlist form creates a waitlist lead` → submit on `/areas/#waitlist` with Kedron details; success text visible; reading `localStorage['clearday:v1:leads']` shows one lead with `kind 'waitlist'`.
  - `careers form validates then submits` → submit empty: error summary focused and lists `Enter your first name`; fill and submit: success text.
  - `JSON-LD present` → home has `HouseCleaning` and no `aggregateRating` (demo mode), `/faq/` has `FAQPage`, a service page has `Service`.
  - Unit `formValues reads unchecked boxes as empty` and `showErrors links each message to its field` (jsdom: summary contains `a[href="#field-email"]` and receives focus).
- [ ] **Step 2:** Rebuild and run e2e. Expected: FAIL.
- [ ] **Step 3:** Implement the pages and forms.
- [ ] **Step 4:** Run `npm test && npm run check && npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(pages): services, prices, areas, about, faq, policies, careers, refer`.

---

### Task 16: Booking request flow

**Files:**
- Create: `src/features/booking/{BookingForm.astro,booking.ts,lead.ts}`, `src/features/booking/steps/{Home,When,Access,You,Check}.astro`, `src/pages/book.astro`
- Test: `tests/unit/booking-lead.test.ts`
- Modify: `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: `fromParams`, `normalise`, `quote`, `describeSelection`, `onSelection`, `emitSelection` (Task 8); `availableDays`, `visitStart`, `STEP_IDS`, `nextStep`, `prevStep` (Task 10); `validate`, rule builders, `getLeadRepository`, `RateLimitError` (Tasks 3–4); `findArea`, `todayIn` (Tasks 3, 5); `showErrors`, `clearErrors` (Task 15, `core/forms.ts`). The success-screen preview is built in `pages/book.astro`'s script, which may import both `initBooking` and `render` + `messages` because pages compose features; `booking.ts` calls `onSent(lead)` for it.
- Produces:
  - `lead.ts`: `BookingPayload { selection: Selection; quote: Quote; day: string; windowId: 'morning' | 'afternoon'; access: { method: 'home' | 'key' | 'code'; detail: string; parking: string; notes: string }; pets: { has: boolean; note: string }; address: string }`; `buildBookingInput(form: Record<string, string>, ctx: { selection; quote; consentAt: string; clientRef: string }): LeadInput<BookingPayload>`; `bookingRules(areas: AreaEntry[]): Rules` (step-4 fields: `firstName` required "Enter your first name", `lastName` required "Enter your last name", `phone` auPhone "Enter a mobile or landline, like 0412 345 678", `email` email "Enter an email address, like sam@example.com", `address` minLength 5 "Enter your street address", `suburb` must be in area "We don't clean in {suburb} yet. Call us and we'll see what we can do.", `postcode` postcode "Enter a 4-digit postcode", `terms` checked "Agree to the service terms to send your request"), and `stepRules(step)` for `when` (`day`, `window` required) and `access` (`method` required; `detail` required when method is `code` or `key`).
  - `booking.ts`: `initBooking(root: HTMLElement, deps: { repo: LeadRepository; config: {...}; onSent: (lead) => void })` — step navigation with `history.pushState` (`?step=when&…selection params`), restores the step on load and `popstate`, renders the booking tag summary in step 5, disables the send button while sending, generates `clientRef` once per page load.

- [ ] **Step 1: Write the failing tests:**
  - Unit `buildBookingInput carries consent flags and timestamp` → `marketingSms: 'on'` maps to `true`, missing `marketingEmail` maps to `false`, `consent.at` equals `ctx.consentAt`, `kind 'booking'`, payload `quote.perVisit` equals the passed quote.
  - Unit `bookingRules rejects suburbs outside the area` → suburb `Kedron` gives `errors.suburb === "We don't clean in Kedron yet. Call us and we'll see what we can do."`.
  - Unit `access detail required for key and code only`.
  - E2E `book from the hero selection` → from `/` add a bedroom, click Choose a time; `/book/` step 1 shows `4 bed, 2 bath, fortnightly`; continue; pick the first day and Morning; continue; choose "Someone will be home"; continue; fill contact with suburb `Chermside` postcode `4032`, tick terms; continue; step 5 shows the price; send; success heading `Booking request sent` and text `We'll confirm by SMS within 2 business hours`; a demo preview of the confirmation text containing `Clearday Home Cleaning`.
  - E2E `back button returns to the previous step with values kept`.
  - E2E `step 4 errors are summarised and focused` → continue with empty fields: focused `[role=alert]` lists 6 errors with links to fields.
  - E2E `marketing boxes start unticked`.
  - E2E `storage failure shows the phone fallback` → in a context with `localStorage.setItem` overridden to throw (`page.addInitScript`), complete the flow; the page shows `We couldn't save your request. Call us on 07 5550 1234` and the step-4 fields still hold their values.
  - E2E `double click sends one request` → double-click Send; `clearday:v1:leads` has one booking.
- [ ] **Step 2:** Run unit tests and e2e. Expected: FAIL.
- [ ] **Step 3:** Implement. When `availableDays` is empty, step 2 shows "No times are open in the next 14 days. Call us and we'll find one." with the phone link. Copy on step 2: "Pick a day that suits. This is a request: we'll confirm the exact time by SMS." Step 3 options: "Someone will be home", "We'll leave a key or use a lockbox", "There's a door code" (with "Codes are kept with your booking and deleted when your service ends."). Step 4 links `/terms/` in the terms label. Each step's Continue validates that step only.
- [ ] **Step 4:** Run `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(booking): five-step booking request`.

---

### Task 17: Offices page and walk-through request

**Files:**
- Create: `src/features/walkthrough/{WalkthroughForm.astro,walkthrough.ts}`, `src/pages/offices.astro`
- Test: `tests/unit/walkthrough.test.ts`
- Modify: `tests/e2e/smoke.mjs` (add `/offices/` to the all-pages step)

**Interfaces:**
- Consumes: `bindSimpleForm` (Task 15, `core/forms.ts`), core validation and repository; `Photo slot="offices"`.
- Produces: `walkthroughRules(): Rules` (company, first and last name, phone, email, site address, approximate floor area `oneOf(['Under 200 m²','200–500 m²','500–1,000 m²','Over 1,000 m²'])`, frequency wanted, preferred visit times optional); `buildWalkthroughInput(form, ctx)` → `LeadInput` with `kind 'walkthrough'`.

- [ ] **Step 1: Write the failing tests:**
  - Unit `walkthrough input carries site details` → payload has `company`, `floorArea`, `frequency`, `siteAddress`.
  - Unit `floor area must be one of the options`.
  - E2E `offices walk-through submits` → fill and send on `/offices/`; success text `Walk-through requested. We'll call you within 1 business day to book a time.`; one `walkthrough` lead stored.
  - E2E `offices page has no homeowner prices` → page text does not match `/\$\d+ a visit/`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `/offices`: h1 "Office and commercial cleaning", facilities served list (offices, medical and dental suites, strata common areas, gyms, childcare), pricing factors list, compliance list (insurance certificate on request, police-checked staff, WHS procedures, `bonded` sentence only when true), how a walk-through works (3 numbered steps), the form, and FAQs tagged `offices`.
- [ ] **Step 4:** Run `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(offices): commercial page and walk-through request`.

---

### Task 18: Owner console

**Files:**
- Create: `src/core/console/{shell,inbox,dom}.ts`, `src/features/messages/{MessagePreview.astro,timeline.ts}`, `src/pages/console/{index.astro,_app.ts,_sample-leads.ts,_detail.ts}`, `src/styles/console.css`
- Test: `tests/unit/console.test.ts`, `tests/unit/sample-leads.test.ts`
- Modify: `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: repository, CSV, storage (Task 3); `schedule`, `render` (Task 11); `visitStart`, booking config (Task 10/7); `describeSelection` (Task 8); `KIND_LABELS`, `STATUS_LABELS`.
- Produces:
  - `core/console/dom.ts`: `el(tag, attrs, ...children)` that sets text with `textContent` only (never `innerHTML`).
  - `core/console/shell.ts`: `initShell(root, { credentials: { email; password }; sessionKey: string; onSignedIn: () => void })` and `signOut()`.
  - `core/console/inbox.ts`: `renderInbox(list: HTMLElement, leads: Lead[], opts: { selectedId: string | null; describe: (l: Lead) => string; onSelect: (id) => void })`; `filterLeads(leads, { kind?: LeadKind | 'all'; status?: LeadStatus | 'all' })`.
  - `features/messages/timeline.ts`: `renderTimeline(container: HTMLElement, items: ScheduledMessage[], opts: { demoMode: boolean })` — each row shows channel, formatted send time or "Waits for confirmation", the text, the skip reason in words ("No marketing consent", "Waits for confirmation", "Stopped: you've already replied"), and "Preview, not sent" when `demoMode`.
  - `_sample-leads.ts`: `sampleLeads(now: Date): Lead[]` — 7 leads per spec §6.6 with dates relative to `now` so visits are always in the future, one booking with marketing consent and one-off frequency (shows the rebook offer).
  - `_detail.ts`: renders the selected lead: contact, suburb, kind-specific summary (booking: `describeSelection`, day, window, access with door codes masked as `••••` until "Show code" is clicked, quote lines), consent record ("Marketing SMS: yes, 5 Oct 9:02am"), history, note form, actions Confirm / Decline / Mark done (only the actions valid for the status), and the timeline.

- [ ] **Step 1: Write the failing tests:**
  - Unit `el sets text, never HTML` → `el('p', {}, '<img src=x onerror=alert(1)>').innerHTML` equals `'&lt;img src=x onerror=alert(1)&gt;'`.
  - Unit `filterLeads by kind and status`.
  - Unit `sample leads are valid and future-dated` → 7 leads, unique ids, every booking's `day` is after `now`, kinds include all four.
  - E2E `console sign-in, confirm and timeline` → `/console/` shows the demo credentials; sign in; inbox lists ≥ 7 leads; open the booking sent in Task 16's step (submit one first in this step via `/book/`); press Confirm; timeline shows 4 SMS rows each with `Preview, not sent`; status reads Confirmed.
  - E2E `console filters by kind` → choose Walk-throughs: every row's kind label is Walk-through.
  - E2E `CSV export downloads` → download event fires with a `.csv` filename.
  - E2E `wrong password shows an error` → `Use the demo email and password shown above.`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `_app.ts` composes shell, inbox, detail and timeline; seeds sample leads once per browser (flag key `clearday:v1:seeded`). Two buttons: "Clear leads" (empties the inbox, which then shows "Booking requests will appear here. Send one from the booking page to see how it looks.") and "Load sample leads" (re-seeds). Console uses `BaseLayout bare`.
- [ ] **Step 4:** Run `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(console): owner inbox with message timeline previews`.

---

### Task 19: Eucalyptus theme check, docs and photo brief

**Files:**
- Create: `docs/customising.md`, `docs/design-system.md`, `docs/photo-brief.md`, `docs/photo-credits.md`, `tools/photo-brief.mjs` (port)
- Modify: `README.md`, `src/styles/tokens.css` (only if the contrast check below fails)
- Test: `tests/unit/contrast.test.ts`

**Interfaces:**
- Produces: `contrast(hexA, hexB): number` helper inside the test file (WCAG relative luminance formula).

- [ ] **Step 1: Write the failing test** `tokens meet AA in both themes` → parse `tokens.css` for each theme; assert `contrast(ink, paper) ≥ 4.5`, `contrast(ink-muted, paper) ≥ 4.5`, `contrast(ink-muted, surface) ≥ 4.5`, `contrast(ink, highlight) ≥ 4.5`, `contrast(ink, room) ≥ 4.5`, `contrast(on-ink, ink) ≥ 4.5`, `contrast(focus, paper) ≥ 3`.
- [ ] **Step 2:** Run. Expected: FAIL until the helper exists, then PASS or a named failing pair; fix only the failing token value and note it in `design-system.md`.
- [ ] **Step 3:** Write `customising.md` (the spec §5 table as "you want to change… → edit…", plus how to add a theme, add a service, add an area, add a room kind, change message wording, go live with `demoMode: false`, implement `HttpLeadRepository`); `design-system.md` (token list with roles, type scale, layout rules, the one-bold-element rule, the anti-template list from spec §7.5, component props); `photo-brief.md` generated by `npm run photos:status`; `README.md` "Where things live" table.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `docs: customising guide, design system and photo brief`.

---

### Task 20: Quality pass

**Files:**
- Create: `tools/js-budget.mjs`
- Modify: `tests/e2e/smoke.mjs`, any component the checks below flag

**Interfaces:**
- Produces: `node tools/js-budget.mjs` — for each HTML file in `dist/`, sums gzipped bytes of its `<script src>` files (and inline module scripts) and exits 1 if any page exceeds 30,720 bytes, printing the top three pages.

- [ ] **Step 1: Write the failing e2e steps:**
  - `axe finds no serious or critical issues` on `/`, `/book/` (step 1 and step 4), `/offices/`, `/console/` (signed in), in both themes, using `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`.
  - `tap targets are at least 44px` → every visible `a, button, input, select, [role=button]` in `header`, `.hero`, `[data-booking-bar]`, `#book-form` has a bounding box height ≥ 44 (inline text links in paragraphs excluded).
  - `reduced motion removes the room fill transition` → with `reducedMotion: 'reduce'`, computed `transition-duration` on `.room--included` is `0s`.
  - `hero image is preloaded when present` → if `src/assets/photos/hero.*` exists, `link[rel=preload][as=image]` is in the head; otherwise the step logs "no hero photo" and passes.
- [ ] **Step 2:** Run `npm run build && npm run budget && npm run e2e`. Expected: any failures listed.
- [ ] **Step 3:** Fix each failure in the owning component. Then take screenshots of `/`, `/book/`, `/offices/`, `/console/` at 375 and 1280 in both themes and review them against spec §7.5; fix any template tells found.
- [ ] **Step 4:** Run the full suite: `npm test && npm run check && npm run build && npm run budget && npm run e2e`. Expected: all pass.
- [ ] **Step 5:** If a Lighthouse CLI is available (`npx lighthouse --version`), run it on `/` and `/book/` at mobile settings against the preview and record the performance scores (target 90+); if not, record in the build notes that the JS budget and image checks stood in for it. Update `docs/spec.md` status to "v0.2, built" with a short "Build notes" section listing anything that differed from the spec. Commit: `chore: accessibility, budget and visual review pass`.
