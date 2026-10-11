# Customising the site for a client

This guide is for a developer turning the Clearday demo into a real cleaning company's site. Most of the work is in four places: `src/config/`, `src/content/`, `src/styles/tokens.css` and `src/assets/photos/`. Where a change needs more than that, this guide names the file.

Work through it in order. After each section, run:

```bash
npm test        # import rules, the colour contrast check and the unit tests
npm run check   # types and content schemas
npm run dev     # look at it on http://localhost:4321
```

Type errors are useful here. Most config files are typed, so a missing price or label shows up in `npm run check` with the file and line to fix.

## Where things live

| You want to change… | Edit |
|---|---|
| Name, legal name, ABN, phones, email, hours, insurance, guarantee wording, rating, demo mode, theme | `src/config/business.ts` |
| Suburbs served, postcodes, map points, base location | `areas` and `base` in `src/config/business.ts` |
| Area pages (one per main suburb) | `src/content/areas/<slug>.md` + `page: '<slug>'` on the suburb in `business.areas` |
| Prices, frequency discounts, add-ons, first-visit rule, service and frequency names | `src/config/pricing.ts` |
| Days off, arrival windows, how far ahead people can book | `src/config/booking.ts` |
| How soon you promise to confirm a booking | `confirmPromise` in `src/config/business.ts` |
| Rooms on the plan, plan proportions, room limits, what is cleaned in each room | `src/config/rooms.ts` |
| SMS and email wording, timing and consent rules | `src/config/messages.ts` |
| Header and footer links | `src/config/navigation.ts` |
| Photo slots: alt text, brief, search terms | `src/config/photo-slots.ts` |
| Service pages | `src/content/services/<id>.md` |
| Terms, privacy and accessibility pages | `src/content/policies/{terms,privacy,accessibility}.md` |
| Reviews | `src/content/reviews.json` |
| Questions and answers | `src/content/faqs.json` |
| Founder and team | `src/content/team.json` |
| Content rules (required fields, lengths) | `src/content.config.ts` (rarely; see [Services](#add-or-remove-a-service)) |
| Colours, spacing, radius, motion timing | `src/styles/tokens.css` |
| Font | `--font-sans` in `src/styles/tokens.css` + the Fontsource import at the top of `src/styles/global.css` |
| Browser tab icon | `public/favicon.svg` |
| Photos | Save `<slot>.jpg` in `src/assets/photos/`; `npm run photos:status` lists the gaps |
| Production lead storage | `src/core/leads/index.ts` (see [Production lead storage](#production-lead-storage)) |
| Live site address | Automatic on Vercel; otherwise `SITE_URL` or the fallback in `astro.config.mjs` (see below) |

## Start with the business facts

Open `src/config/business.ts` and replace every value. The header, footer, trust row, JSON-LD, mobile bar, messages and the forms' "call us" fallback all read their facts from here, so they can never disagree. (A few sentences are still written in components; see [Wording that lives in components](#wording-that-lives-in-components).)

| Field | What it is | Example |
|---|---|---|
| `demoMode` | Demo ribbon, "sample" labels, theme switching. Set `false` for a real client | `false` |
| `theme` | The theme the site uses | `'floorplan'` |
| `themes` | Themes a partner can switch between in demo mode. Every name needs a block in `tokens.css` | `['floorplan']` |
| `tradingName` | The name customers know: page titles, the logo's label, JSON-LD and `{businessName}` in messages | `'Brightside Home Cleaning'` |
| `shortName` | The logo wordmark and "Call …" labels | `'Brightside'` |
| `legalName` | Footer and JSON-LD | `'Brightside Services Pty Ltd'` |
| `abn` | Footer and JSON-LD, spaced as on the ABN register | `'12 345 678 901'` |
| `founded` | Year the business started | `2014` |
| `phone` | Main number, written how you want it shown. Tap-to-call links are built from it | `'07 3123 4567'` |
| `mobile` | Second number | `'0400 123 456'` |
| `email` | Contact email | `'hello@brightside.com.au'` |
| `schemaType` | schema.org type for JSON-LD | `'HouseCleaning'` |
| `region` | The area in copy ("12 suburbs across Brisbane north") and the home page title | `'Logan'` |
| `state` | State abbreviation | `'QLD'` |
| `timeZone` | IANA time zone for booking days and message times | `'Australia/Brisbane'` |
| `hours` | Opening hours: a label, schema.org day codes (`Mo`…`Su`) and 24-hour times | see the file |
| `insurance.short` / `.long` | Trust row title and sentence | `'$20M public liability'` |
| `bonded` | Only `true` with an active fidelity bond. The word "bonded" appears nowhere unless it is | `false` |
| `policeChecked` | Trust row and vetting sentence | `'Every cleaner holds a current national police check'` |
| `guarantee.short` / `.long` | Re-clean promise in the trust row | |
| `rating` | `value`, `count`, `source`. Must be the client's real, current rating (see below) | `{ value: 4.8, count: 96, source: 'Google' }` |
| `confirmPromise` | How soon a booking request is confirmed, used after "We'll confirm by SMS" | `'within 2 business hours'` |
| `reviewLink` | Where the review-request SMS sends people | the client's Google review link |
| `base` | Where the team is based: the square on the coverage map | `{ suburb: 'Aspley', lat: -27.366, lng: 153.017 }` |
| `areas` | Every suburb served (see [Areas](#areas-and-area-pages)) | |

The site's address (canonical links, the sitemap, sharing links and structured data) is worked out when the site is built, by `tools/site-url.mjs`:

1. `SITE_URL`, if you set it as an environment variable, wins.
2. On Vercel, the project's production address is used automatically: the `*.vercel.app` link until you assign a domain, then that domain on the next deploy.
3. Otherwise (a local build), the fallback in `astro.config.mjs`. Change it to the client's domain.

### What `demoMode: false` changes

- The demo ribbon (and its colour switcher) disappears.
- `?theme=` in the address is ignored. The site always uses `business.theme`.
- "Sample prices." under the price tag and "(sample)" beside the rating go.
- The trust row says "Read them on Google." instead of "Sample rating for this demo."
- `business.rating` is published in the `LocalBusiness` JSON-LD as `aggregateRating`. Only publish a rating that is real and current. If the client has no public rating, the rating item in `src/sections/TrustRow.astro` and the score in `src/sections/Reviews.astro` have to come out (a component change).
- The booking success screen stops showing a preview of the confirmation SMS.
- In the owner console (`/console`), message rows stop saying "Preview, not sent". The console itself is still a demo (see [Going live](#going-live-checklist)).

### Copy rules

`tests/unit/config.test.ts` checks every string in `business.ts`, `navigation.ts` and `messages.ts`: no `·`, no `→`, and no runs of three or more capitals except `ABN`, `GST`, `QLD`, `REIQ`, `NDIS`, `WHS`, `SMS` and `STOP`. If the client's name contains an acronym, add it to the `allowed` list in that test.

## Themes

Two themes ship: `floorplan` (navy ink, yellow highlight) and `eucalyptus` (green ink, blue highlight). To use one, set `theme` in `business.ts`.

### Add a client theme

1. In `src/styles/tokens.css`, copy the `[data-theme='eucalyptus']` block and rename it:

   ```css
   [data-theme='harbour'] {
     --color-paper: #f7f6f2;
     --color-ink: #1f2a44;
     --color-ink-hover: #141c30;
     --color-ink-muted: #4f5a6e;
     --color-room: #e6e8ee;
     --color-highlight: #f4b9a0;
     --color-line: #aab1bf;
     --color-field-border: #6b768c;   /* text field outlines: 3:1 on paper and surface */
     --color-surface: #ffffff;
     --color-on-ink: #ffffff;
     --color-focus: #1f2a44;
     --color-shade: rgb(31 42 68 / 0.08);  /* ink at 8% */
     --color-shadow: rgb(31 42 68 / 0.12); /* ink at 12% */
   }
   ```

   Set all thirteen tokens; the contrast test fails if a theme leaves one out, since it would quietly fall back to the floor plan colour. `--color-line` is for decorative hairlines and can be light; `--color-field-border` outlines text fields and must reach 3:1 against both `--color-paper` and `--color-surface`. Write colours as hex (the contrast test reads hex), except `--color-shade` and `--color-shadow`, which are the ink colour as `rgb()` with transparency. The other tokens (semantic colours, type, space, radius, motion) are shared by every theme in the plain `:root` block further down the file. To change one for a client, edit it there: a value set in a theme block above it would be overridden.

2. In `src/config/business.ts`, add the name to `ThemeName` and use it:

   ```ts
   export type ThemeName = 'floorplan' | 'eucalyptus' | 'harbour';
   // …
   theme: 'harbour' as ThemeName,
   themes: ['harbour'] as ThemeName[],
   ```

3. Run `npm test`. `tests/unit/contrast.test.ts` finds the new block by its selector and checks it for WCAG AA. It also fails if a name in `themes` has no block. The table in [`design-system.md`](design-system.md#contrast-check) lists the pairs. If one fails, adjust that token's lightness and keep its hue.
4. Recolour `public/favicon.svg`. It holds the floorplan colours as hex, because a favicon can't read CSS variables.
5. To see the new theme beside the others, add its name to the `themes` list in `src/pages/dev/ui.astro` and open `/dev/ui/`.

How to choose colours: ink must be dark enough for body text on paper (4.5:1); highlight must be light enough for ink text on it; room is a quiet tint of paper; line is a mid-tone for hairlines. Highlight is reserved for what the visitor picks on the plan and the price, so choose the client's brand accent for it.

### How `?theme=` works

Only in demo mode. `/?theme=eucalyptus` applies that theme (if it is in `business.themes`) and remembers it for the browser tab, so a partner can show a prospect "your colours" across every page. The demo ribbon's colour links do the same. A theme not in the list is ignored. With `demoMode: false`, the parameter and the remembered choice are both ignored.

The theme is set before the first paint by an inline script in `src/layouts/ThemeBoot.astro`, so there is no flash of the default colours. Its rule is the same as `resolveTheme()` in `src/core/theme.ts`, which is unit-tested. The ribbon shows display names for the two shipped themes; any other theme shows its id.

### Font

The site uses one family, Schibsted Grotesk, self-hosted. To change it, install a Fontsource variable package, replace the import at the top of `src/styles/global.css`, and update `--font-sans` in `tokens.css`:

```bash
npm install @fontsource-variable/inter
```

```css
/* src/styles/global.css */
@import '@fontsource-variable/inter';
```

```css
/* src/styles/tokens.css */
--font-sans: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

## Prices and the first-visit rule

All numbers are in `src/config/pricing.ts`: AUD, GST included, whole dollars. The calculation itself is in `src/domain/quote.ts`, and you don't need to touch it.

| Field | Demo value | Meaning |
|---|---|---|
| `base` | 129 | A regular clean of 1 bedroom, 1 bathroom, living and kitchen |
| `perExtraBedroom` / `perExtraBathroom` | 20 / 30 | Each bedroom and bathroom after the first |
| `study` / `laundry` | 12 / 10 | When the home has one |
| `multiplier` | regular 1, deep 1.6, move-in 1.8, end-of-lease 2.2 | Service price relative to a regular clean. Keep `regular` at 1 |
| `discount` | once 0, weekly 0.15, fortnightly 0.1, monthly 0.05 | Fraction off the rooms price for recurring visits |
| `oneOffOnly` | end-of-lease, move-in | Services that are always a single visit; their frequency is fixed to "once" |
| `firstVisitAsDeep` | `true` | Price the first visit of a recurring plan as a deep clean |
| `addOns` | oven 65, fridge 35, inside windows 55, balcony 30, blinds 45 | Flat price and label for each extra |

How a price adds up:

1. Rooms subtotal = `base` + extra bedrooms + extra bathrooms + study + laundry.
2. Per visit = rooms × service `multiplier` × (1 − frequency `discount`) + add-ons.
3. First visit, when `firstVisitAsDeep` is on and the plan is recurring = rooms × `multiplier.deep` + add-ons. No frequency discount.
4. Rounded to whole dollars once, at the end.

Add-ons are never discounted and are charged on the first visit too.

Worked example (the demo's default home): 3 bedrooms, 2 bathrooms, regular, fortnightly.

- Rooms: 129 + 2 × 20 + 1 × 30 = 199
- Per visit: 199 × 1 × (1 − 0.1) = 179.1, so **$179 a visit**
- First visit: 199 × 1.6 = 318.4, so **$318**

The quote shows this as "Regular clean, 3 bedrooms, 2 bathrooms, living, kitchen $199", then "Fortnightly saving −$20". The saving line absorbs any rounding, so the lines always add up to the total.

With `firstVisitAsDeep: false`, the first visit costs the same as every other visit and the price tag hides the first-visit line.

The "from" prices on the services list and on `/prices` are worked out from these numbers: the smallest home (1 bed, 1 bath, no extras) at its cheapest frequency. Regular is 129 × 0.85 = $110.

Two places repeat a number in words, so change them with the prices:

- The rebook-offer email in `messages.ts` says "save up to 15%", which is the weekly discount.
- `src/features/pricing/PriceTag.astro` explains the first visit as "priced as a deep clean so we start from clean".

Frequencies: removing one (for example monthly) means taking it out of `FREQUENCIES`, `discount`, `FREQUENCY_LABELS` and `FREQUENCY_SHORT`; the plan's "How often" buttons drop it on their own. Keep `fortnightly` unless you also change `DEFAULT_SELECTION` in `src/domain/selection.ts`. Adding a new frequency also needs a button in `src/features/plan/PlanControls.astro`, which keeps its own button order and short names.

## Add or remove a service

Service ids are declared once, in `SERVICE_IDS` in `src/config/pricing.ts`. The types then tell you what else is needed.

### Add a service (for example `spring`)

1. `src/config/pricing.ts`: add `'spring'` to `SERVICE_IDS`, then give it a `multiplier`, a `SERVICE_LABELS` entry ("Spring clean") and a `SERVICE_SHORT` entry ("spring clean", used in "3 bed, 2 bath, spring clean"). `npm run check` lists these three until they exist. If it is always a single visit, add it to `oneOffOnly`.
2. `src/content.config.ts`: add `'spring'` to the `service` enum in both the `services` and the `reviews` schemas.
3. `src/content/services/spring.md`: copy `regular.md` and rewrite it. Front matter:

   | Field | Rule |
   |---|---|
   | `title` | Page heading |
   | `order` | Position in the services list |
   | `service` | The id, `spring` |
   | `summary` | One or two sentences, at most 200 characters |
   | `suits` | Who it is for |
   | `duration` | "3 to 5 hours for most homes" |
   | `faqs` | Exactly 3 `{ q, a }` |
   | `ecoClaim` | Optional. If present, `basis` must name the product or certification (ACCC guidance on green claims) |
   | `seoTitle`, `seoDescription` | Search title, and a description of at most 160 characters |

   The Markdown body is the page's opening text. The file name is the page address: `/services/spring/`.
4. `src/config/photo-slots.ts`: add a `service-spring` slot. The services list reads the photo's alt text from it, so the build fails without one.
5. `src/features/plan/PlanControls.astro`: add a short button label to its `short` map (`spring: 'Spring'`), or the plan's "Type of clean" button is blank. The buttons sit four to a row, so a fifth wraps onto a new row.
6. `src/config/navigation.ts`: add the page to the footer's "Cleaning" links.
7. Checklists: a new service gets the `every` and `deep` lists for each room. Only `end-of-lease` adds the `endOfLease` items. That rule is in `src/domain/checklist.ts`.

### Remove a service (for example `move-in`)

1. Remove the id from `SERVICE_IDS`, `multiplier`, `SERVICE_LABELS`, `SERVICE_SHORT` and `oneOffOnly`.
2. Remove it from both enums in `src/content.config.ts`.
3. Delete `src/content/services/move-in.md`, the `service-move-in` photo slot, its footer link, and any reviews in `reviews.json` with `"service": "move-in"`.
4. Run `npm run check`. After steps 1 to 3, removing `move-in` leaves type errors only in unit tests that use it as an example (see [Tests that pin demo values](#tests-that-pin-demo-values)). If step 2 was missed, the error points at `src/sections/ServicesList.astro`. Removing `end-of-lease` also breaks `src/domain/checklist.ts`, which has the end-of-lease rule, and drops the REIQ exit-condition checklist that the end-of-lease service page adds.

## Areas and area pages

Every suburb served is one entry in `areas` in `src/config/business.ts`:

```ts
{ suburb: 'Chermside', postcode: '4032', page: 'chermside', lat: -27.385, lng: 153.03 },
{ suburb: 'Geebung', postcode: '4034', lat: -27.372, lng: 153.047 },
```

- `suburb` and `postcode` drive the suburb check and the booking form's area check. Case, state and spacing don't matter to the check, and "Mt" matches "Mount". A postcode shared by several suburbs answers "in area" for all of them. Get each postcode right: the booking form refuses a postcode that isn't the typed suburb's ("Check the postcode for Chermside").
- `lat` and `lng` place the dot on the coverage map. Approximate is fine. `base` is the square.
- `page` links the suburb to its own page. Leave it out for suburbs without one.

### Add an area page

1. Add `page: 'albion'` to the suburb's entry in `business.areas`.
2. Create `src/content/areas/albion.md`:

   ```markdown
   ---
   suburb: Albion
   postcode: '4010'
   nearby:
     - Ascot
     - Wooloowin
   intro: "One or two sentences about cleaning in Albion, in the client's words."
   seoDescription: "House cleaning in Albion 4010: regular, deep, end of lease and move-in cleans."
   ---

   A short paragraph for the page body.
   ```

   `postcode` is quoted and must be four digits. `nearby` needs at least two suburbs and may include ones you don't serve. `seoDescription` is at most 160 characters. The page lives at `/areas/albion/`, and shows reviews from that suburb first.
3. Add an `area-albion` slot to `src/config/photo-slots.ts`, like the four demo area slots.

To remove an area page, delete its Markdown file, take `page` off the suburb, and remove its photo slot.

## Rooms and checklists

`src/config/rooms.ts` holds what can change per client without code:

| Field | Meaning |
|---|---|
| `rooms.<kind>.label` | Room name in checklist headings |
| `rooms.<kind>.every` | What a regular clean does in that room |
| `rooms.<kind>.deep` | Added for deep and move-in cleans |
| `rooms.<kind>.endOfLease` | Added on top for end of lease |
| `max.bedrooms`, `max.bathrooms` | Highest counts on the plan (demo: 6 and 4) |
| `plan.width`, `plan.rows`, `plan.livingShare` | The plan's proportions in plan units: three rows (bedrooms, then bathrooms with laundry and study, then living and kitchen) and the share of the bottom row living takes |

Write checklist items the way a homeowner says them: "Clean inside the microwave", not "Microwave sanitation".

The six room kinds (bedroom, bathroom, living, kitchen, study, laundry) are part of the code, not the config. Each one has a count or switch in the visitor's selection, a price, a place on the plan and a control. Adding a kind (for example a media room) or removing one (for example no study option) is a code change in:

- `src/config/rooms.ts`: `ROOM_KINDS` and the checklists
- `src/config/pricing.ts`: a price field on `PricingConfig`
- `src/domain/selection.ts`: the field on `Selection`, `normalise()`, `toParams()` and `fromParams()`
- `src/domain/quote.ts`: `roomsPrice()`
- `src/domain/describe.ts`: the room summary
- `src/features/plan/layout.ts`: which row it sits in
- `src/features/plan/svg.ts`: its short slot label
- `src/features/plan/plan.ts` and `PlanControls.astro`: its control
- `tests/unit/layout.test.ts`: the combinations it checks

## Add-ons

Add-ons are config only. To add one, add its id to `ADD_ON_IDS` and an entry to `addOns` in `src/config/pricing.ts`:

```ts
export const ADD_ON_IDS = ['oven', 'fridge', 'interior-windows', 'balcony', 'blinds', 'walls'] as const;
// …
walls: { label: 'Spot-clean walls', price: 40 },
```

The "Add extras" list, the quote lines, the booking summary and the URL all pick it up. Ids go into booking links (`extras=oven,walls`), so use short lowercase words with hyphens. To remove one, delete it from both places.

## Booking days and windows

`src/config/booking.ts`:

| Field | Demo value | Meaning |
|---|---|---|
| `daysOff` | `[0]` | Days with no cleans: 0 is Sunday, 6 is Saturday. `[0, 6]` closes weekends |
| `leadDays` | 2 | The earliest day offered, counted from today |
| `horizonDays` | 14 | The latest day offered, counted from today |
| `windows` | morning, afternoon | Arrival windows |

Each window has an `id`, a `label` for the day picker ("Morning, arrive 8–10am"), `arrive` for messages ("8–10am"), and `start` and `end` in 24-hour time. `start` is when the window opens: the reminder, on-the-way and review-request messages are timed from it.

Days are counted in the business's time zone (`business.timeZone`), never the visitor's device, so someone booking at 11:30pm sees the right days. If every day is blocked, the booking page says no times are open and shows the phone number.

Changing the windows' times and labels is config only. A third window needs its id added to `WindowId` in the same file and an entry in `windows`; the booking form, the stored request and the console all read the list through `windowIdFrom()` in `src/features/booking/state.ts`, so nothing else changes. Any value that isn't in the list is read as the first window.

For a client outside Queensland, set `business.timeZone` (for example `'Australia/Sydney'`; daylight saving is handled). `visitStart()` in `src/features/booking/state.ts` falls back to Brisbane when it isn't given a time zone, so search for `visitStart(` and check every call passes `business.timeZone`.

## Message wording and timing

`src/config/messages.ts` lists every SMS and email a lead triggers. The owner console shows them as a timeline for each lead. The site never sends them: in production a server sends them from these same templates (see [Production lead storage](#production-lead-storage)).

| Field | Meaning |
|---|---|
| `id` | Which message. To add a new one, add its id to the `MessageTemplate['id']` union too |
| `label` | Name shown in the console |
| `channel` | `'sms'` or `'email'` |
| `marketing` | `true` = only sent to people who ticked the matching marketing box |
| `appliesTo` | Lead kind: `'booking'`, `'walkthrough'`, `'application'` or `'waitlist'` |
| `trigger.on` | What the timing counts from: `'confirmed'` (when the owner pressed Confirm), `'visit'` (when the arrival window opens) or `'created'` (when the request came in) |
| `trigger.offsetHours` | Hours after that moment; negative means before |
| `condition` | `'one-off'` = only for single-visit bookings |
| `body` | The text, with `{variables}` |

The demo timeline:

| Message | Channel | When | Consent needed |
|---|---|---|---|
| Confirmation | SMS | On confirm (`confirmed`, 0) | No, it's transactional |
| Reminder | SMS | 24 hours before the window (`visit`, −24) | No |
| On the way | SMS | When the window opens (`visit`, 0) | No |
| Review request | SMS | 6 hours after the window opens (`visit`, 6) | No |
| Rebook offer | Email | 21 days after a one-off visit (`visit`, 504) | Marketing email |
| Walk-through follow-ups | Email | 2 and 5 days after the request (`created`, 48 and 120), only while it is still new | No, it answers an enquiry |

To send the review request 3 hours after arrival instead, set its `offsetHours` to 3.

Variables (unknown ones are left as typed, so a typo shows in the console preview):

| Variable | Becomes |
|---|---|
| `{firstName}` | The person's first name |
| `{date}` | Visit day, "Fri 9 Oct" |
| `{window}` | The window's `arrive` text, "8–10am" |
| `{price}` | Per-visit price, "$179" |
| `{businessName}` | `business.tradingName` |
| `{reviewLink}` | `business.reviewLink` |
| `{optOut}` | The opt-out line for the channel, from `OPT_OUT` in the same file |

Rules (Spam Act 2003). `tests/unit/config.test.ts` checks the first three:

- Only the variables above.
- Every SMS includes `{businessName}`, so the person knows who it's from.
- Every message with `marketing: true` includes `{optOut}`. The SMS line is "Reply STOP to opt out."; the email line promises to stop within 5 business days.
- Marketing needs consent. The booking form's two marketing boxes start unticked and are recorded with a timestamp. Without the matching box, the console shows the message as "No marketing consent" and a production sender must skip it.
- Every marketing message must say who sent it and how to contact them. The SMS rule above covers texts. The demo's rebook email relies on the sending name and address, so make sure the production sender uses the business's name and a monitored reply address, or add `{businessName}` to the body.

Who gets what: a new booking's messages all wait for confirmation; a declined booking gets none; walk-through follow-ups stop once the owner changes the lead's status.

## Reviews, questions, team and policies

| File | Each entry | Notes |
|---|---|---|
| `src/content/reviews.json` | `id`, `name`, `suburb`, `date` (`YYYY-MM-DD`), `rating` (1–5), `service` (a service id or `offices`), `text` (at most 400 characters) | The home page shows the newest three. Area pages show that suburb's first |
| `src/content/faqs.json` | `id`, `q`, `a`, `tags` (one or more of `home`, `booking`, `offices`, `keys`, `payment`) | The home page shows the first five tagged `home`. `/faq/` groups all of them |
| `src/content/team.json` | `id`, `name`, `role`, `since` (year), `note` | The founder entry must keep `"id": "mel"`: the "Who comes to your home" section looks it up by that id. Change the name, keep the id |
| `src/content/policies/*.md` | Front matter `title`, `description` (at most 160 characters), `updated` (date), then Markdown | `terms.md` holds the cancellation, lockout, key and alarm-code rules; `privacy.md` what is collected and how consent works; `accessibility.md` the WCAG target and a contact |

For a live client:

- Reviews must be real customers' words, used with permission. Never keep the demo reviews.
- The terms and privacy pages hold fees and legal commitments. The client (and their adviser) must approve the wording.
- `npm run check` and `npm run build` fail on a missing field or a value that breaks the rules above, and say which file.

## Wording that lives in components

A few sentences are written in components rather than config. Each is a claim about how the business works, so check it is true for the client and edit the file if not:

| File | Wording |
|---|---|
| `src/sections/Vetting.astro` | Police checks "renewed every three years"; "an interview and a paid trial clean"; "employees, not subcontractors, covered by our insurance and workers' compensation"; same cleaner each visit |
| `src/sections/HowItWorks.astro` | "Missed something? We come back within 24 hours." (matches the demo guarantee) |
| `src/sections/ServicesList.astro` | "Every price includes GST, supplies and equipment." |
| `src/sections/Coverage.astro` | "all within 20 minutes of our base" |
| `src/sections/OfficesBand.astro` | "send insurance certificates on request" |
| `src/sections/TrustRow.astro` | "Police-checked cleaners" |
| `src/features/pricing/PriceTag.astro` | "priced as a deep clean so we start from clean" |
| `src/features/pricing/PriceLine.astro` | The same "priced as a deep clean so we start from clean" line, in the home hero |
| `src/pages/index.astro` | The home page description mentions "Brisbane's north" |

The other pages (`/offices`, `/careers`, `/refer`, `/about`, `/book` and the end-of-lease service page) carry more of the same kind: the certificate turnaround, the careers pay range, the referral reward, the REIQ checklist, the 72-hour re-clean promise and the "Nothing to pay now" line beside the booking button. Read each page for claims before launch.

## Photos

Every photo has a named slot in `src/config/photo-slots.ts` with its alt text, a brief, search terms and an orientation. To fill a slot, save the image as `src/assets/photos/<slot>.jpg` (or `.jpeg`, `.png`, `.webp`, `.avif`, lower case). Until then the slot shows a labelled placeholder, so the site never has a broken image. The build makes AVIF and WebP copies at several widths.

```bash
npm run photos:status              # which slots are filled, and the brief for each
npm run photos:status -- --write   # also rewrite docs/photo-brief.md
```

The status also lists files that match no slot, such as a misspelt name or an upper-case `.JPG`.

- A live client uses their own photos.
- Demo photos of rooms are licence-free or generated. Pictures of people follow one rule: in the demo they are generated illustrations (cleaners working or arriving, one founder portrait), each marked "Sample photo" on the page while `demoMode` is on; never a face on a review, never a child, never a real person presented as staff, founder or client. The one real street photograph (`area-chermside`, credited in [`photo-credits.md`](photo-credits.md)) has a single passer-by far away and seen from behind. "Before" pictures show an ordinary week. Replace every image of a person with a real photograph before a real business goes live.
- Record every file in [`photo-credits.md`](photo-credits.md). Remove the demo rows when the client's photos go in.
- To change what a slot asks for, edit its `brief`, `search` and `alt`, then run `--write`.

### The home hero: a still and a video

The hero's backdrop is a `Scene` (`src/core/ui/Scene.astro`): a still, and optionally a silent loop over it.

- `src/assets/photos/hero.jpg`: the wide still, 2880×1620. Keep the left 40% calm, because the headline card sits there.
- `src/assets/photos/hero-portrait.jpg`: the upright crop phones get, 1440×2560. Without it phones get the wide still, cropped.
- `public/media/hero-loop.mp4` and `public/media/hero-loop.webm`: the loop, 1920×1080, no audio, at most 2.5 MB and 1.5 MB. Its first frame should match the still. Encode a source clip with:

```bash
ffmpeg -i source.mp4 -an -map_metadata -1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -level:v 4.0 -movflags +faststart public/media/hero-loop.mp4
ffmpeg -i source.mp4 -an -map_metadata -1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 public/media/hero-loop.webm
```

With no `hero.jpg` the hero is its card alone. With no clip it is the still alone. The video is never requested on screens under 768px, under reduced motion, with Save-Data on, or on a 2G or 3G connection. `public/media/sample.*` is a two-second test clip for `/dev/ui/`; leave it in place.

### The closing picture

The `closing` slot (`src/assets/photos/closing.jpg`, 2400×1350) is the backdrop of the home page's closing band, where a solid card holds the live price and the phone number. Keep the left of the picture calm, because the card sits there. Without the file the home page's closing band is the plain band, which is also what inner pages use.

### Room stage

"What we clean, room by room" has a before-and-after stage (`src/features/stage/RoomStage.astro`) beside the plan. It reads eight stills from `src/assets/photos/`, 1920×1080 each:

- `room-kitchen-before`, `room-kitchen-after`
- `room-bath-before`, `room-bath-after`
- `room-bed-before`, `room-bed-after`
- `room-living-before`, `room-living-after`

Shoot or generate each pair from the same position, with the same framing, so the sweep lines up. A pair that is not from one camera position needs `fade: true` on its room in `src/features/stage/RoomStage.astro` (the living room has it), and then "after" fades in instead of sweeping. A room without both files has no stage: the checklist is all it shows, and with no rooms at all the stage is left out. "Before" pictures show an ordinary week. The stage's caption reads "Illustration, not a client's home.".

The kitchen also has an action beat, a clip that plays between "before" and the sweep. To replace it, put the clip in `public/media/` as `action-kitchen.mp4` and `action-kitchen.webm`, 1920×1080, no audio, 8 seconds (it loops during its beat), at most 2.5 MB and 1.5 MB, with two stills in `src/assets/photos/`: `action-kitchen.jpg`, the clip's first frame (its poster, which should match `room-kitchen-before`), and `action-kitchen-still.jpg`, the frame phones show instead of the clip (under 768px the clip is never requested). Encode a source clip with:

```bash
VF="scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p"
ffmpeg -y -loglevel error -i source.mp4 -t 8 -an -map_metadata -1 -vf "$VF" -c:v libx264 -preset slow -crf 26 -level:v 4.0 -movflags +faststart public/media/action-kitchen.mp4
ffmpeg -y -loglevel error -i source.mp4 -t 8 -an -map_metadata -1 -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 public/media/action-kitchen.webm
ffmpeg -y -loglevel error -i source.mp4 -frames:v 1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 src/assets/photos/action-kitchen.jpg
ffmpeg -y -loglevel error -ss 4 -i source.mp4 -frames:v 1 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" -q:v 2 src/assets/photos/action-kitchen-still.jpg
```

If a file is over its limit, raise its `-crf` by 2 and encode again. Take the second still from the moment the cleaner is mid-wipe (4 seconds in, here). While `demoMode` is on the clip carries the "Sample photo" mark, because it shows a generated person.

## Production lead storage

In the demo, every form saves into the visitor's own browser (`LocalLeadRepository`). That's enough to show the flow, but no real request ever reaches the business. A live site needs a lead API and a repository that calls it. The booking success line "This browser couldn't keep a copy…" only appears with `LocalLeadRepository` when storage is blocked, so it disappears on its own once the HTTP repository is in place.

Forms and the console depend only on this interface, from `src/core/leads/repository.ts`:

```ts
export interface LeadRepository {
  create(input: LeadInput): Promise<Lead>;
  /** Newest first. */
  list(filter?: LeadFilter): Promise<Lead[]>;
  get(id: string): Promise<Lead | null>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead>;
  addNote(id: string, note: string): Promise<Lead>;
  clear(): Promise<void>;
}
```

`LeadInput`, `Lead`, `LeadKind` and `LeadStatus` are in `src/core/leads/types.ts`.

1. Write `src/core/leads/http-repository.ts`. It lives in `core/`, so it can't import config: pass the API address in.

   ```ts
   import { RateLimitError, type LeadFilter, type LeadRepository } from './repository';
   import type { Lead, LeadInput, LeadStatus } from './types';

   export class HttpLeadRepository implements LeadRepository {
     constructor(private readonly api: string) {}

     private async request(path: string, init: RequestInit = {}): Promise<Response> {
       const res = await fetch(`${this.api}${path}`, {
         ...init,
         credentials: 'include', // the owner's session cookie, for the console calls
         headers: { 'Content-Type': 'application/json', ...init.headers },
       });
       if (res.status === 429) throw new RateLimitError();
       return res;
     }

     private async json<T>(path: string, init?: RequestInit): Promise<T> {
       const res = await this.request(path, init);
       if (!res.ok) throw new Error(`Lead API ${res.status}`);
       return (await res.json()) as T;
     }

     create(input: LeadInput): Promise<Lead> {
       return this.json('/leads', { method: 'POST', body: JSON.stringify(input) });
     }

     list(filter: LeadFilter = {}): Promise<Lead[]> {
       const q = new URLSearchParams();
       if (filter.kind) q.set('kind', filter.kind);
       if (filter.status) q.set('status', filter.status);
       return this.json(`/leads?${q}`);
     }

     async get(id: string): Promise<Lead | null> {
       const res = await this.request(`/leads/${encodeURIComponent(id)}`);
       if (res.status === 404) return null;
       if (!res.ok) throw new Error(`Lead API ${res.status}`);
       return (await res.json()) as Lead;
     }

     updateStatus(id: string, status: LeadStatus): Promise<Lead> {
       return this.json(`/leads/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) });
     }

     addNote(id: string, note: string): Promise<Lead> {
       return this.json(`/leads/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
     }

     async clear(): Promise<void> {
       throw new Error('Clearing leads is a demo feature.');
     }
   }
   ```

2. Return it from `getLeadRepository()` in `src/core/leads/index.ts`. Forms and the console get their repository only from this function, so nothing else changes:

   ```ts
   import { HttpLeadRepository } from './http-repository';

   const api = import.meta.env.PUBLIC_LEADS_API;
   let http: HttpLeadRepository | null = null;

   export function getLeadRepository(): LeadRepository {
     if (!api) return local(); // dev and demo builds keep the browser store
     http ??= new HttpLeadRepository(api);
     return http;
   }
   ```

   Set `PUBLIC_LEADS_API=https://api.example.com` in the host's build settings (or a `.env` file). `seedDemoLeads()` stays on the local store, because only the demo console uses it.

3. What the API must do, because the site relies on it:

   - **One lead per `clientRef`.** Each form load sends a new `clientRef`. If a request arrives with one already stored, return the stored lead instead of creating another. This is what stops a double click or a retry from booking twice.
   - **Reject failures.** `create()` must throw when the lead isn't stored. The forms then keep the visitor's details on screen and show the phone number. A silent success loses the booking.
   - **Answer 429 when rate-limited.** The repository turns that into `RateLimitError`, and the form tells the visitor to call.
   - **Validate again.** Use the same rules as the browser (`src/core/leads/validation.ts` is plain TypeScript and can run on the server).
   - **Keep the consent record** (`consent.terms`, `marketingSms`, `marketingEmail` and `consent.at`) exactly as sent.
   - **Protect everything except `create`.** `list`, `get`, `updateStatus` and `addNote` are owner actions and need real sign-in.

4. Send messages on the server from the same templates. When a lead is created or changes status, call `schedule(lead, messages, ctx)` from `src/features/messages/schedule.ts` with `messages` from `src/config/messages.ts`. It returns each message with its rendered text and `sendAt` time. Queue those without a `skippedReason`, and re-run it when the status changes (confirming sets the confirmation time; declining cancels everything). Fill the context from the same config the site uses:

   ```ts
   const ctx = {
     now: new Date().toISOString(),
     timeZone: business.timeZone,
     businessName: business.tradingName,
     reviewLink: business.reviewLink,
     optOut: OPT_OUT,
     visit, // from the booking payload: start time, window, day and price labels, one-off or not
   };
   ```

   The SMS provider must handle STOP replies: mark the person's marketing consent false so the next `schedule()` skips marketing for them.

## Tests that pin demo values

Some tests check the demo's numbers and names on purpose, so a change is never accidental. After re-skinning, these fail until you update the expected values to the client's. Keep each test and change the number.

| File | Pins |
|---|---|
| `tests/unit/quote.test.ts` | $179 / $318 worked example, $438 end of lease, +$65 oven, "from" prices 110 / 175 / 232 / 284, line labels |
| `tests/unit/booking-state.test.ts` | Sundays off, 2 days' lead, 14-day horizon (12 days offered) |
| `tests/unit/messages.test.ts` | Message order, times and the confirmation wording |
| `tests/unit/layout.test.ts` | Plan width 12, rows 4 / 3 / 3, living 7 units wide, up to 6 bedrooms and 4 bathrooms |
| `tests/unit/selection.test.ts`, `checklist.test.ts` | Service and add-on ids used as examples |
| `tests/unit/config.test.ts` | Four area pages; Kedron not served; the allowed capitals |
| `tests/unit/contrast.test.ts` | The `floorplan` and `eucalyptus` blocks exist and `floorplan` is the `:root` default. Leaving both blocks in `tokens.css` costs nothing; if you delete them, change this one check |
| `tests/e2e/*.e2e.mjs` | Phone link, ABN, prices ($197 for the 4-bedroom journey), Chermside 4032 in area, Kedron out of area, 12 map points, the console sign-in, the sample lead ids (`S-…`) |

The rule checks must pass unchanged: the colour pairs in the contrast test, the boundary rules, message consent and opt-out rules, and "quote lines always add up to the total".

## Going live checklist

Content and config:

- [ ] Every field in `src/config/business.ts` is the client's, and `demoMode` is `false`.
- [ ] The live domain is assigned in Vercel (or `SITE_URL` is set on another host), and a page's canonical link shows it.
- [ ] Theme chosen or added, contrast test passing, `public/favicon.svg` recoloured.
- [ ] Prices, booking days, windows and messages are the client's, and the client has approved them.
- [ ] Services, area pages, reviews, FAQs, team and policies replaced. No demo reviews, no sample rating.
- [ ] Wording in components checked ([Wording that lives in components](#wording-that-lives-in-components)).
- [ ] `npm run photos:status` shows every slot filled with the client's photos; `docs/photo-credits.md` updated.
- [ ] Replace every picture of a person (`founder`, `team`, the kitchen clip and its two stills) with real photographs or remove them.

Data and privacy:

- [ ] `HttpLeadRepository` in place and `PUBLIC_LEADS_API` set. A test booking, walk-through, job application and waitlist request each arrive in the client's system.
- [ ] Messages send from the server, marketing only with consent, STOP handled.
- [ ] `/console` removed (delete `src/pages/console/`) or behind real sign-in. The demo console prints its password on the page and reads only the browser's own storage.
- [ ] `src/pages/dev/` deleted (the component sheet; already hidden from search, but not needed live).
- [ ] `/privacy` describes what this client collects, why, who sees it, how long they keep it (door and alarm codes included), and how to withdraw consent.

Hosting:

- [ ] HTTPS only: the host redirects `http://` to `https://` and the certificate covers the domain with and without `www`. The site is static (`dist/`), so any static host works.
- [ ] Turn on HSTS at the host once HTTPS works.

Checks, all green:

```bash
npm test             # boundaries, contrast, unit tests
npm run check        # types and content schemas
npm run build        # static site in dist/
npm run budget       # JavaScript per page: 30 KB gzipped eager, 150 KB lazy
npm run preview &    # serve dist/ on :4321
npm run e2e          # Playwright smoke tests, axe scan, overflow checks
```

Then run the end-to-end tests against the real preview deployment as well:

```bash
node tests/e2e/run.mjs https://preview.brightside.com.au
```
