# Cleaning Companies Demo Site: Spec

Status: v0.2, built (3 October 2026). Approved; refined during planning (§4 `domain/`, lead history, message timing types; §7.4 motion after the Emil Kowalski skills review). §15 lists where the build differs.
Owner: Reozix. Reviewers: Roby (technical scope), Rownak (delivery and cost), final approver (positioning and pricing)
Inputs: the research doc *Cleaning Company Website: Requirements, Standards & Build Checklist* (including its "Gaps found on cross-check" section), the Trades & Construction demo (`reozixltd/trades-construction`) for conventions, and the brainstorming decisions recorded in §2

---

## 1. Goal

Build the Cleaning Companies demo site for the Industry Sales Kit, so a partner can show a cleaning business owner a real, working site on a phone in about 3 minutes, and then show the same site in that owner's colours.

Done means:

1. Every **Must** from the research checklist works in the demo (traceability in §10).
2. A homeowner can get an exact price and send a booking request without a phone call, with trust proof next to the button.
3. The owner side shows what each booking request triggers: inbox, confirm or decline, and previews of the confirmation, reminder, on-the-way and review-request messages.
4. A developer re-skins it for a real client by editing `src/config/`, `src/content/`, `src/styles/tokens.css` and photos only. No component edits.
5. The design does not read as a template or as AI-generated (§7.5 lists the checks).
6. The code is modular and tested: dependency direction is enforced by a test, and all business logic is pure and unit-tested.

Non-goals: payments, real calendar availability, sending real SMS or email, real authentication, a blog, gift-card purchase, client login and live chat (§11).

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Sales-kit demo with a fictional brand** | Partners show it to prospects, then it is re-skinned per client. |
| D2 | **Homes first, offices second** | The residential booking flow is the hero. Offices get a separate page and voice (`/offices`) with a walk-through request, because the research found mixed homeowner and facility-manager copy loses commercial buyers. |
| D3 | **Instant price + request a time** | The visitor gets an exact price from rooms, frequency and add-ons, picks a preferred day and morning or afternoon window, and sends a request the owner confirms. No payment and no fake "confirmed slot". Works fully as a static site. |
| D4 | **Owner console with message previews** | Shows the automation story partners pitch: each booking produces a visible message timeline. Messages are previews labelled "not sent". |
| D5 | **New repo in the Trades conventions, with a `core/` boundary** | Same stack and patterns as Trades (Astro 5, TypeScript strict, static output, config-first, content collections, tokens, `LeadRepository`). Industry-neutral code lives in `src/core/` and never imports cleaning code, so it can later move into a shared package without edits. Trades is not changed. |
| D6 | **Astro 5 + TypeScript strict + plain CSS on tokens** | Matches Trades (its D1, D2). Near-zero JS by default; scoped component CSS. |
| D7 | **Visual direction: "Floor plan"** | The home is drawn as a plan; rooms fill as the visitor picks them, and the price builds beside it. The conversion tool is also the distinctive brand moment. Chosen over "Care label" and "Daylight" (§7). |
| D8 | **Demo business: "Clearday Home Cleaning", Brisbane north, QLD** | Brisbane lets the end-of-lease page follow the REIQ exit-condition checklist, a strong Australian niche from the research, and keeps it out of the Trades demo's market. Phone numbers use ACMA fictional ranges (`07 5550 xxxx`, `0491 570 xxx`); ABN is an obviously fake `00 000 000 000`. |
| D9 | **Sample data is visibly sample** | `demoMode: true` shows a ribbon, labels the rating, reviews and stats "sample", and marks message previews "not sent". Same rule as Trades D9. |
| D10 | **Demo prices are drafts pending approval** | AUD, GST-inclusive, labelled "sample prices" in demo mode. Final numbers are the approver's call (§12). |
| D11 | **Generated floor plan** | The plan is computed from room counts by a pure, tested function, not drawn by hand, so it fits any home and any client. |
| D12 | **One alternate theme ships** | `eucalyptus` proves re-skinning. In demo mode `?theme=eucalyptus` switches it live for a partner pitch. |

## 3. Information architecture

```
/                       Home (layout in §6.1)
/book                   Booking request, 5 steps (§6.2)
/services/              All services
/services/[slug]        regular, deep, end-of-lease, move-in
/prices                 Price table and what changes the price
/areas/                 Coverage map and suburb list
/areas/[slug]           One page per main suburb (4 in the demo)
/offices                Commercial cleaning: pricing factors, compliance, walk-through request
/about                  Founder, team, how cleaners are vetted
/faq                    Keys and access, cancelling, pets, supplies, payment
/careers                Clean with us: pay, hours, requirements, apply form
/refer                  Refer a friend: rules, reward and the visitor's referral code (no form collecting a friend's details)
/terms                  Service terms: cancellation, lockout, keys and alarm codes, arrival window, right to refuse
/privacy                Privacy policy and marketing-consent notice
/accessibility          Accessibility statement (WCAG 2.2 AA target)
/console/               Owner console (client-side app, demo sign-in)
/404
```

Header: logo, Services, Prices, Areas, Offices, About, phone (tap to call), **Book a clean**.
Footer: legal name, ABN, phone, email, hours, suburbs served, policy links, accessibility statement, careers, refer.
Mobile: header shows logo, call icon and menu; a sticky **booking tag** bar appears once the visitor has a selection (§6.3).

## 4. Architecture

### 4.1 File structure

```
clearday-cleaning/
├─ src/
│  ├─ core/            Industry-neutral. Imports nothing outside src/core.
│  │  ├─ leads/         types.ts, repository.ts, local-repository.ts, validation.ts, csv.ts, index.ts
│  │  ├─ console/       shell: demo-auth.ts, inbox.ts, detail-frame.ts, csv-export.ts, dom.ts
│  │  ├─ ui/            Button, Field, ErrorSummary, Icon (+ icons.ts), Badge, Photo, Placeholder
│  │  └─ format.ts  geo.ts  schema.ts  storage.ts  analytics.ts  paths.ts
│  ├─ config/          The per-client surface
│  │  ├─ business.ts    name, legal name, ABN, phones, email, hours, areas, insurance, guarantee, theme, demoMode
│  │  ├─ pricing.ts     room rates, service multipliers, frequency discounts, add-ons, first-visit rule
│  │  ├─ booking.ts     days off, time windows, lead time, booking horizon, confirm promise
│  │  ├─ rooms.ts       room types, plan sizes, and what is cleaned in each room per service
│  │  ├─ messages.ts    SMS and email templates and when each fires
│  │  ├─ navigation.ts
│  │  └─ photo-slots.ts
│  ├─ content/         Schema-checked at build (src/content.config.ts)
│  │  ├─ services/*.md  areas/*.md  policies/*.md
│  │  └─ reviews.json  faqs.json  team.json
│  ├─ domain/          Cleaning logic shared by several features: selection.ts, quote.ts, checklist.ts, events.ts, describe.ts
│  ├─ features/        Cleaning-specific. Each folder: its own pure logic, components, thin DOM wiring
│  │  ├─ plan/          layout.ts, FloorPlan.astro, plan.ts
│  │  ├─ pricing/       PriceTag.astro, BookingTag.astro, price-tag.ts
│  │  ├─ booking/       state.ts, lead.ts, steps/*.astro, booking.ts
│  │  ├─ messages/      schedule.ts, render.ts, MessagePreview.astro, console-panel.ts
│  │  ├─ areas/         SuburbCheck.astro, CoverageMap.astro, suburb-check.ts
│  │  └─ walkthrough/   WalkthroughForm.astro, walkthrough.ts
│  ├─ sections/        Page bands built from features + core/ui
│  ├─ layouts/         BaseLayout, Header, Footer, MobileBookingBar, DemoRibbon, Seo
│  ├─ pages/
│  ├─ styles/          tokens.css (the only raw values), global.css
│  └─ content.config.ts
├─ public/             favicon.svg, fonts/ (self-hosted, subset)
├─ tests/              unit/*.test.ts, e2e/smoke.mjs
├─ tools/              check-boundaries.mjs, photo-brief.mjs
└─ docs/               spec.md, customising.md, design-system.md
```

### 4.2 Dependency rules

Imports point one way: `pages → layouts | sections → features → domain → core`. `config/` and `content/` are read by everything except `core/`. Features never import each other; when one feature needs to react to another (the price tag reacting to the floor plan), they communicate through the typed `clearday:selection` DOM event in `domain/events.ts`.

| Rule | Enforced by |
|---|---|
| `src/core/**` imports only from `src/core/**`, npm packages and `astro:*` | `tools/check-boundaries.mjs`, run inside `npm test` |
| A feature never imports another feature; shared cleaning logic goes to `domain/`, industry-neutral code to `core/` | same |
| `domain/` never imports `features/` | same |
| No raw colour values outside `styles/tokens.css` | same |
| `sections/` never import `pages/` or `layouts/` | same |
| `domain/` and features never import `sections/`, `layouts/` or `pages/`; `layouts/` never import `sections/` or `pages/` | same (added in the build, §15) |
| Components contain no raw hex, px font sizes or client-specific strings | code review; `design-system.md` lists the token names |
| Nothing but `core/storage.ts` (and the pre-paint theme script in `layouts/ThemeBoot.astro`) touches `localStorage` or `sessionStorage` | `check-boundaries.mjs` greps for them |

`core/` receives client data as arguments. For example, `geo.findArea(input, areas)` takes the area list instead of importing `config/business.ts`.

### 4.3 Logic and DOM

Every behaviour splits into a pure module (data in, data out, unit-tested) and a thin wiring script (reads the DOM, calls the pure module, writes the DOM). Wiring scripts hold no business rules.

| Pure module | Signature (shape) | Wiring |
|---|---|---|
| `domain/quote.ts` | `quote(selection, pricing) → Quote` | `plan.ts`, `price-tag.ts`, `booking.ts` |
| `domain/selection.ts` | `fromParams(search) → Selection`, `toParams(selection) → string`, `normalise()` | `plan.ts`, `booking.ts` |
| `features/plan/layout.ts` | `layout(selection, rooms) → PlanRoom[]` | `plan.ts` |
| `features/booking/state.ts` | `nextStep(step)`, `availableDays(today, booking) → Day[]`, `visitStart(day, window)` | `booking.ts` |
| `features/messages/schedule.ts` | `schedule(lead, messages, now) → ScheduledMessage[]` | `console-panel.ts` |
| `features/messages/render.ts` | `render(template, vars) → string` | `console-panel.ts` |
| `core/leads/validation.ts` | `validate(input, rules) → FieldErrors` | `booking.ts`, `walkthrough.ts`, careers form |
| `core/geo.ts` | `findArea(input, areas) → Match` | `suburb-check.ts` |

Small files: aim for under about 150 lines. A file that grows past that is split.

### 4.4 Data types

```ts
// domain/selection.ts and domain/quote.ts (ids are declared in config/pricing.ts)
type ServiceId = 'regular' | 'deep' | 'end-of-lease' | 'move-in';
type Frequency = 'once' | 'weekly' | 'fortnightly' | 'monthly';
type AddOnId = 'oven' | 'fridge' | 'interior-windows' | 'balcony' | 'blinds';

interface Selection {
  service: ServiceId;
  bedrooms: number;        // 1–6
  bathrooms: number;       // 1–4
  study: boolean;
  laundry: boolean;
  frequency: Frequency;    // end-of-lease and move-in are always 'once'
  addOns: AddOnId[];
}

interface QuoteLine { label: string; amount: number }   // whole AUD, GST included
interface Quote {
  lines: QuoteLine[];
  perVisit: number;        // recurring price, or the one-off price
  firstVisit: number;      // equals perVisit unless the first-visit rule applies
  frequency: Frequency;
}

// features/plan
interface PlanRoom {
  id: string;              // 'bed-1', 'bath-2', 'living', 'kitchen', 'study', 'laundry'
  kind: 'bedroom' | 'bathroom' | 'living' | 'kitchen' | 'study' | 'laundry';
  label: string;
  x: number; y: number; w: number; h: number;   // plan units
  state: 'included' | 'available';             // available = dashed "add this room" slot
}

// core/leads (shared with Trades' shape, extended by kind)
type LeadKind = 'booking' | 'walkthrough' | 'application' | 'waitlist';
type LeadStatus = 'new' | 'confirmed' | 'declined' | 'done';
interface Lead {
  id: string; kind: LeadKind; status: LeadStatus; createdAt: string;
  contact: { firstName: string; lastName: string; phone: string; email: string };
  suburb: string; postcode: string;
  consent: { terms: boolean; marketingSms: boolean; marketingEmail: boolean; at: string };
  payload: Record<string, unknown>;  // booking: Selection + Quote + day + window + access; walkthrough: site details
  clientRef: string;                  // one per form load, so a double submit stores one lead
  history: { at: string; type: 'status' | 'note'; value: string }[];  // status changes and notes (Trades shape)
}

// features/messages
interface MessageTemplate {
  id: 'confirmation' | 'reminder' | 'on-the-way' | 'review-request' | 'walkthrough-day-2' | 'walkthrough-day-5' | 'rebook-offer';
  channel: 'sms' | 'email';
  marketing: boolean;      // true = only sent with matching consent
  appliesTo: LeadKind;
  trigger: { on: 'confirmed' | 'visit' | 'created'; offsetHours: number };
  condition?: 'one-off';   // only for one-off bookings (the rebook offer)
  body: string;            // '{firstName}', '{date}', '{window}', '{price}', '{businessName}', '{reviewLink}', '{optOut}'
}
interface ScheduledMessage { templateId: string; channel: 'sms' | 'email'; sendAt: string | null; text: string; skippedReason?: 'no-consent' | 'not-confirmed' | 'status-changed' }
```

### 4.5 Storage

`LeadRepository` (from Trades) gets `kind` filtering. The demo uses `LocalLeadRepository` through `core/storage.ts`, namespaced `clearday:v1:*`. Production swaps in an `HttpLeadRepository` returned from `getLeadRepository()`; no form or console code changes. Message sending in production happens server-side from the same templates; the site never sends messages itself.

## 5. Configuration surface

These files are the whole per-client surface. `docs/customising.md` turns this table into a step-by-step guide.

| You want to change… | Edit |
|---|---|
| Name, legal name, ABN, phones, email, hours, insurance, guarantee wording, demo mode, theme | `config/business.ts` |
| Suburbs served, postcodes, map points | `areas` in `config/business.ts` + `content/areas/*.md` |
| Prices, discounts, add-ons, first-visit rule | `config/pricing.ts` |
| Days off, time windows, how far ahead people can book, confirm promise | `config/booking.ts` |
| Rooms on the plan and what is cleaned in each | `config/rooms.ts` |
| Message wording and timing | `config/messages.ts` |
| Services, area pages, policies | Markdown in `content/` |
| Reviews, FAQs, team | `content/*.json` |
| Colours, fonts, spacing, radius | `styles/tokens.css` |
| Photos | Drop `<slot>.jpg` into `src/assets/photos/`; `npm run photos:status` lists gaps |

Sample `config/pricing.ts` values (drafts, D10):

| Item | Value |
|---|---|
| Regular clean base (1 bed, 1 bath, living, kitchen) | $129 |
| Each extra bedroom / bathroom | $20 / $30 |
| Study / laundry | $12 / $10 |
| Service multiplier: deep, move-in, end-of-lease | 1.6, 1.8, 2.2 |
| Frequency discount: weekly, fortnightly, monthly | 15%, 10%, 5% |
| First visit of a recurring plan priced as a deep clean | on (`firstVisitAsDeep: true`) |
| Add-ons: oven, inside fridge, interior windows, balcony, blinds | $65, $35, $55, $30, $45 |
| How it adds up | Rooms subtotal × service multiplier × (1 − frequency discount), then add-ons at their flat price |
| First visit (when the rule is on) | The same home priced as a deep clean, no frequency discount, plus add-ons |
| Rounding | To the nearest whole dollar, once, at the end |

Worked example: 3 bed, 2 bath, regular, fortnightly = (129 + 2×20 + 30) × 0.9 = $179 a visit; first visit 199 × 1.6 = $318.

Sample `config/booking.ts`: Monday–Saturday, windows "Morning, arrive 8–10am" and "Afternoon, arrive 12–2pm", earliest day = 2 days ahead, horizon 14 days, confirm promise "within 2 business hours".

## 6. Key behaviours

### 6.1 Home page

1. Header (§3).
2. Hero: a photo of a clean home fills the first screen; on screens 768px and wider a silent video loop fades in over it, with a pause button. In front of it a solid card holds the headline "Your home, priced room by room.", one supporting line, the live price, **Choose a time** and **Price your home**, which jumps to the estimator. On phones the photo sits above the card. With no `hero` photo the card stands alone on the page background.
3. Estimator ("Price your home"), two columns (stacked on mobile), drawn from 768px as a raised card that overlaps a photo hero's lower edge from 1024px:
   - Left: the heading, the suburb check and the controls.
   - Right: the floor plan calculator. Steppers for bedrooms and bathrooms, toggles for study and laundry, a frequency choice, and add-ons behind "Add extras". Included rooms are filled tile yellow; dashed "available" slots can be clicked to add a room. The price tag beside the plan shows per-visit and, when different, first-visit price. **Choose a time** opens `/book` with the selection in the URL. On screens 768px and wider the plan stands up into a 3D model of the home as it scrolls into view (§7.4).
4. Trust row: police-checked staff, public liability amount, re-clean promise, Google rating (labelled sample in demo mode). Values from `config/business.ts`.
5. Services: Regular, Deep, End of lease, Move in as photo cards, two across from 900px, each with a photo, one line, "from" price and a link. On a fine pointer a card leans a few degrees toward the pointer.
6. What's included, room by room: the same plan in read-only mode; selecting a room shows its checklist from `config/rooms.ts` for the chosen service. Beside the plan is a before-and-after stage for the kitchen, bathroom, bedroom and living room (§7.4, §9): the room before a clean, an action beat, a sweep that uncovers the room after, and the finished room with a **Book a clean** button. A room without both pictures has no stage.
7. Reviews: quote cards (named, dated, star rating, no photos or faces) beside a **Book a clean** button.
8. Team, "Who comes to your home": vetting steps, same cleaner each visit, a team picture, and the founder's picture and note. In the demo each picture is a generated illustration marked "Sample photo" (§9).
9. How a booking works, numbered because it is a real sequence: choose a time, we confirm by SMS, reminder the day before, a review link after. A line runs past the four steps as the section scrolls.
10. Where we clean: coverage map and suburb list, linking to area pages.
11. Offices band: a photo, one line to facility managers and **Request a walk-through**.
12. FAQ (5 questions from `faqs.json` tagged `home`).
13. Closing band: a solid card over a picture of the home, holding the live price and the phone number. Without the `closing` picture it is the plain band. The pinned booking tag steps aside while this band, the hero's price or the estimator is on screen.
14. Footer.

### 6.2 Booking request (`/book`)

Five steps on one page, progressively revealed; the back button and the URL keep state, and a refresh keeps the visitor's place.

1. **Your home**: service, rooms, frequency, add-ons, pets (yes/no + note). End-of-lease and move-in fix frequency to "once".
2. **When**: day picker from `availableDays()`; morning or afternoon window. Copy says this is a request.
3. **Access**: someone home / key or lockbox / door code (with a note that codes are stored with the booking), parking, notes.
4. **You**: first and last name, mobile, email, street address, suburb and postcode (must be inside the area; the postcode must be one of that suburb's, or "Check the postcode for <Suburb>"), three consents:
   - "I agree to the service terms" (required, links `/terms`)
   - "Send me offers and reminders to rebook by SMS" (optional, unticked)
   - "Send me offers by email" (optional, unticked)
5. **Check and send**: the booking tag summary, the quote lines, and **Send booking request**.

Success screen: "Booking request sent. We'll confirm by SMS within 2 business hours.", a summary, and (demo mode) a preview of the confirmation SMS the visitor would receive.

### 6.3 Booking tag

Once a selection exists, a compact tag follows the visitor: "3 bed, 2 bath, fortnightly, $179 a visit" with **Choose a time**. Desktop: inside the hero and the estimator, then pinned under the header once both have scrolled off screen. Mobile: a sticky bar at the bottom (replacing Trades' call bar, with a call icon beside it). It never covers form fields on `/book`.

### 6.4 Suburb check and areas

`findArea()` accepts a suburb name or postcode. Results:

- In area: "We clean in Chermside." plus a link to the area page if one exists.
- Not in area: "We don't clean in Kedron yet." plus an optional "Tell me when you do" form (stored as a `waitlist` lead, so the owner sees demand by suburb).
- Unrecognised: "Check the spelling or try a postcode."

### 6.5 Offices

Copy written for facility and property managers. Sections: facilities served, pricing factors (floor area, floor types, frequency, hours, consumables) instead of prices, compliance (insurance certificate on request, police-checked staff, WHS, certifications only if real), and a walk-through request form (company, contact, site address, approximate floor area, frequency wanted, preferred visit times). Creates a `walkthrough` lead.

### 6.6 Owner console (`/console`)

Demo sign-in shown on the page (`owner@demo.clearday` / `demo1234`), as in Trades.

- Inbox: all leads, newest first, filter by kind and status, unread marker.
- Detail: contact, selection and quote (bookings), access notes, consent record with timestamp, notes.
- Actions: Confirm, Decline, Mark done, add note, export CSV.
- Message timeline: `schedule()` output for the lead. Each row shows channel, send time and rendered text. Rows that would not send show why ("No marketing consent", "Waits for confirmation"). In demo mode every row carries "Preview, not sent".
- Sample data: 7 seeded leads (4 bookings in different statuses, 1 walk-through, 1 job application, 1 waitlist) so the console never opens empty.

### 6.7 Message timeline rules

| Message | Channel | Fires | Consent needed |
|---|---|---|---|
| Confirmation | SMS | On confirm | No (transactional) |
| Reminder | SMS | 24 h before the visit window | No |
| On the way | SMS | Visit day, at the window start | No |
| Review request | SMS | 6 h after the arrival window opens (configurable) | No |
| Rebook offer | Email | 21 days after a one-off visit | Marketing email |
| Walk-through follow-up | Email | Day 2 and day 5 after the request, if still `new` | No (reply to an enquiry) |

Every SMS ends with the business name; marketing messages also include `{optOut}` ("Reply STOP to opt out"). Timings and wording come from `config/messages.ts`.

### 6.8 Service pages

Each `/services/[slug]` page: photo, who it suits, the room-by-room checklist for that service (from `config/rooms.ts`), "from" price, how long it usually takes, 3 FAQs and **Book this clean** (opens `/book` with the service preselected). End of lease adds the REIQ exit-condition checklist as a downloadable list and its re-clean promise in plain words: "If your property manager flags something we cleaned, we come back within 72 hours and re-clean it free. We can't promise the agent's decision, only our clean."

### 6.9 Errors and empty states

- Fields validate on blur; on submit, a focusable error summary lists each error with a link to its field (Trades pattern).
- Storage failure on submit: "We couldn't save your request. Call us on 07 5550 1234 and we'll book it now." The entered details stay on screen.
- Storage blocked entirely (memory only): the booking success screen adds "This browser couldn't keep a copy of your request. Call us on 07 5550 1234 to be sure we have it."
- A simple form sent within 3 seconds of the page loading is held once ("Not sent yet. Check your details, then send again."); the next press saves it. A filled honeypot is dropped quietly.
- No available days (all blocked by config): step 2 says "No times are open in the next 14 days. Call us and we'll find one."
- Console with no leads after the demo is cleared: "Booking requests will appear here. Send one from the booking page to see how it looks."

## 7. Design system

Full token reference goes in `docs/design-system.md`. Raw values live only in `src/styles/tokens.css`.

### 7.1 Colour (theme `floorplan`, default)

| Token | Hex | Role |
|---|---|---|
| `--color-paper` | `#F4F7F8` | Page canvas |
| `--color-ink` | `#17323F` | Text, plan walls, primary button fill |
| `--color-ink-muted` | `#4E6874` | Secondary text (AA on paper and white) |
| `--color-room` | `#DCEBE9` | Unselected rooms, quiet panels |
| `--color-highlight` | `#F2C14E` | Selected rooms and the price tag only; always with ink text, never as a text colour |
| `--color-line` | `#9FB6BF` | Hairlines (decorative) |
| `--color-field-border` | `#6F8F9B` | Text field outlines, 3:1 on paper and surface (added in the build, §15) |
| `--color-surface` | `#FFFFFF` | Form surfaces |

Semantic success, warning and danger tokens follow the Trades set, checked for AA against paper.

Theme `eucalyptus` (D12): paper `#F5F7F2`, ink `#1E3B30`, room `#DDE8DA`, highlight `#9CC5E8`. Theme selection: `theme` in `config/business.ts`; in demo mode only, `?theme=` overrides it for the session.

### 7.2 Type

- Schibsted Grotesk (variable, 400–700), self-hosted, Latin subset. One family.
- Scale: 14, 16, 18, 22, 28, 36; hero headline `clamp(2.5rem, 5vw, 3.5rem)`.
- Body 17px, line height 1.6, line length up to 68ch.
- Headlines 700 with negative tracking (−0.02em); nothing else uses that treatment.
- Sentence case everywhere, left-aligned throughout.

### 7.3 Layout and shape

- 12-column grid at ≥1024px, single column below 768px, 16px side gutter on mobile.
- The plan is the one bold element: 2px ink "walls" are the only heavy lines on the site. Elsewhere: hairlines and white space.
- Corners: 0 on the plan, 6px on controls and photos.
- Services are photo cards (two across from 900px) and reviews are quote cards, both on `--color-surface` with the soft shadow. Nothing else on the home page is a card grid; team and the process are rows.

### 7.4 Motion

- When a room is added, its fill transitions to highlight in about 180ms. User-triggered only.
- Press feedback on buttons: `scale(0.97)` on `:active`, 160ms, custom ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`). Only `transform`, `opacity` and colours are transitioned, never `all`.
- Scroll-linked motion is limited to named moments, moves only `transform`, `translate` and `opacity`, and never takes over scrolling: no wheel or touch listeners, no snapping. With a photo, from 768px, the home hero's photo scales from 1 to 1.12 and its card rises as the hero leaves the screen: `src/layouts/motion.ts` sets `--p` (0 to 1) on `[data-progress]` elements and CSS does the rest. The same `--p` makes service photos drift inside their cards, review cards drift at their own rates, the line through "How a booking works" fill, and the offices and closing pictures settle to full size. The estimator's plan tilts into a 3D model as it arrives; `scene3d.ts` follows the scroll position itself.
- Reveal: a block marked `data-reveal` fades and rises once, the first time it shows (500ms; `--i` staggers a row). It is hidden only under `html.motion`, which `layouts/motion.ts` sets after marking the blocks already on screen as shown, so nothing on the first screen fades and a page where the script never runs reads in full. The hidden state and every scroll-driven style sit under `.motion` and inside `@media screen`, so print shows every block finished.
- The room stage in "What's included" is played by scroll: before, action, sweep and after begin at 0.3, 0.6 and 0.9 of its progress. It pins in place for the scroll only at 1024px and wider, on screens at least 780px tall, with no reduced-motion preference and once its script is running; otherwise it plays as it crosses the screen. Without JavaScript and under reduced motion a visitor sees the finished room, its caption and the booking button. On screens under 768px the action beat is a still and the clip is never requested.
- No hover lifts. The one pointer-following effect is the service cards' lean (at most 4°) with a soft sheen on the photo. Any hover style is gated by `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion: reduce` removes movement (the press scale, Reveal, scroll-linked motion, the stage's pinning and sweep, background video and the 3D model) and keeps the short colour fade, which helps people see what changed. Bare pages (`body.is-bare`, the console) get none of it, and `/book/` has no decorative motion and never loads three.js or video.

### 7.5 Anti-template checks (review before done)

- No all-caps labels, no eyebrow text above headings, no 01/02/03 markers except the booking sequence, no "→" on buttons, no single highlighted word in headlines.
- No middle-dot meta strings in UI copy.
- No sky-blue + sparkle "cleaning" clichés, no stock "smiling cleaner with spray bottle" hero.
- No identical-card grids with the same shadow beyond the home page's two: services (told apart by photo) and reviews (by quote).
- Copy names things the way a homeowner would; buttons say what happens ("Send booking request", not "Submit").

### 7.6 Quality floor

WCAG 2.2 AA: contrast, visible focus, 44px targets with 8px spacing, labelled fields, keyboard-operable plan (rooms and steppers are real buttons with labels such as "Add a bedroom, 3 selected"), plan has a text equivalent ("3 bedrooms, 2 bathrooms, living, kitchen"). Works at 375px with no horizontal scroll.

## 8. SEO, compliance, performance

- Per-page title and description from content; `LocalBusiness` (`HouseCleaning` subtype) JSON-LD with `areaServed`, hours and phone from `config/business.ts`; `Service` JSON-LD on service pages; `FAQPage` on `/faq`. Aggregate rating only when `demoMode` is false.
- Sitemap via `@astrojs/sitemap`; canonical URLs; 404 page.
- Prices shown as full GST-inclusive amounts ("from $129, GST included").
- No unqualified eco claims. If a client uses eco products, the service copy names the product or certification (ACCC guidance).
- Terms page carries the cancellation (48 h), lockout, key and alarm-code policies; the booking step links to it before sending.
- Marketing consent is separate, unticked and recorded with a timestamp (Spam Act).
- Accessibility statement page names WCAG 2.2 AA as the target and gives a contact for problems.
- Performance budget: hero photo preloaded as the LCP image, AVIF/WebP via `astro:assets`, page JS under 30 KB gzipped, plus at most 150 KB that loads only through a dynamic `import()` (the home page's 3D model, which screens narrower than 768px never download), videos 1920×1080 with no audio (H.264 MP4 at most 2.5 MB, VP9 WebM at most 1.5 MB) that screens narrower than 768px never request, fonts self-hosted with `font-display: swap`. Mobile Lighthouse performance 90+ on home and `/book`.

## 9. Photos

Uses the Trades photo-slot system: each slot (hero, services, rooms, areas, team, founder, offices, closing) shows a labelled placeholder until `<slot>.jpg` exists in `src/assets/photos/`. `docs/photo-brief.md` lists every slot with the shot wanted. Demo photos are licence-free stock or generated pictures of rooms (results). Pictures of people follow the people rule: in the demo they are generated illustrations (cleaners working or arriving, one founder portrait), each marked "Sample photo" on the page; never a face on a review, never a child, never a real person presented as staff, founder or client. The one real street photograph (Chermside, credited) has a single passer-by far away and seen from behind. A live client replaces every one with real photographs before going live. "Before" pictures show an ordinary week, and the stage always carries "Illustration, not a client's home." Credits go in `docs/photo-credits.md`.

## 10. Checklist traceability (all Musts)

| Research item | Where it lives |
|---|---|
| Click-to-call phone on every page | `layouts/Header.astro`, `layouts/MobileBookingBar.astro` (phone from `business.ts`) |
| Quote/booking above the fold, dual CTAs | `sections/HeroScene.astro` (Choose a time, Price your home), `sections/Estimator.astro` + `features/plan/FloorPlan.astro` (Choose a time) and Header (Book a clean, phone) |
| Service area stated clearly | `features/areas/SuburbCheck.astro` in the estimator, `sections/Coverage.astro`, `/areas/*` |
| Pricing signal | `features/pricing/PriceTag.astro`, `/prices`, "from" prices on services |
| Trust row next to the CTA | `sections/TrustRow.astro` |
| Real reviews with names and dates | `sections/Reviews.astro` from `content/reviews.json` |
| Mobile-first and fast | §7.6, §8 budget, e2e overflow and size checks |
| Insured, police-checked, ABN, guarantee | `config/business.ts` → TrustRow, Footer, `/about`, JSON-LD |
| Bond only if held | `business.bonded: boolean`; the word "bonded" renders only when true |
| Separate residential and commercial paths | `/offices` + `sections/OfficesBand.astro` |
| Booking-to-review automation | `features/messages/*`, console timeline (§6.6, §6.7) |
| Service policies and terms | `content/policies/terms.md` → `/terms`, linked from booking step 4 |
| Spam Act consent | Booking step 4 consents, `Lead.consent`, `schedule()` consent rules |
| Accessibility standard | §7.6, `/accessibility`, axe scan in e2e |
| Eco claims | §8; `services/*.md` schema has optional `ecoClaim` that requires a `basis` field |
| LocalBusiness schema, area pages | `core/schema.ts`, `/areas/[slug]` |
| HTTPS, privacy policy | host config (documented in `customising.md`), `/privacy` |

Shoulds included: one page per service, room-by-room checklists, real-team slots, recurring plans, careers, refer a friend, end-of-lease REIQ page. Not included: gift cards, client portal, live chat, blog (§11).

## 11. Out of scope / planned

Payments and deposits; real availability and calendar sync; real SMS/email sending and an SMS provider; real authentication; client login and portal; gift-card purchase; live chat; blog; CMS editing from the console; multilingual pages.

## 12. Open questions

1. Demo prices (§5) need the approver's sign-off before partners use them.
2. Which SMS provider the production version would use (shared open question with Trades).
3. Whether to add an NDIS cleaning service page for Australian prospects (left out to keep scope down).
4. Source of demo photos: licence-free stock of rooms, or a small shoot.

## 13. Testing

| Layer | What | Tool |
|---|---|---|
| Unit | `quote()`: every rule, discounts, first-visit rule, rounding, once-only services | Vitest |
| Unit | `layout()`: every combination of 1–6 bedrooms × 1–4 bathrooms × study × laundry fits the plan with no overlaps or gaps; labels unique | Vitest |
| Unit | `schedule()`: timings, consent skips, walk-through follow-ups stop once status changes | Vitest |
| Unit | `state.ts`: URL round-trip, `availableDays()` with days off and horizon | Vitest |
| Unit | `validate()`, `findArea()`, `render()`, CSV, repository | Vitest |
| Structure | Dependency rules (§4.2) | `tools/check-boundaries.mjs` in `npm test` |
| Types | Strict TS, content schemas | `astro check` |
| End to end | Home: pick 3 bed / 2 bath / fortnightly → Choose a time → complete `/book` → success. Console: sign in, open the booking, confirm, see four message previews. Offices walk-through submits. | Playwright smoke (`npm run e2e`) |
| Layout | No horizontal overflow at 375px and 1280px on every page | Playwright in the smoke run |
| Accessibility | axe scan on `/`, `/book`, `/offices`, `/console` with no serious or critical issues | `@axe-core/playwright` |
| Other browsers | The home page prices, reveals every block and finishes the room stage in Firefox and WebKit at 1280 and 390 wide; a browser that is not installed is reported as skipped | Playwright (`tests/e2e/browsers.e2e.mjs`) |
| Visual | Screenshots of home and `/book` at both widths, reviewed against §7.5 | `tools/shot.mjs` (from Trades) |

## 14. Setting up a real client

1. `config/business.ts`: every field, `demoMode: false`, pick a theme or add one in `tokens.css`.
2. `config/pricing.ts`, `booking.ts`, `rooms.ts`, `messages.ts`: the client's rules and wording.
3. Replace `content/` Markdown and JSON with real services, areas, reviews, FAQs, team and policies.
4. Drop real photos into `src/assets/photos/`; check `npm run photos:status`.
5. Production storage and messaging: implement `HttpLeadRepository` and send messages server-side from `config/messages.ts`.
6. Run `npm test`, `npm run check`, `npm run build`, `npm run e2e` before deploying.

## 15. Build notes

Where the built site differs from this spec, and what the quality pass measured. Each difference has a ruling in the build ledger with its reasoning.

- **Hero photo.** The first build had none, because the floor plan was the hero. The cinematic redesign (`docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md`) brings back the `hero` slot and adds `hero-portrait` for phones (12 slots at that point). The hero's still loads eagerly with `fetchpriority="high"`, as do the photos that open service, area, offices and about pages.
- **Photos.** The photo slots are 24 of 24 filled (`npm run photos:status`). The home page has a hero photo and clip, the eight room stills and the kitchen clip (`action-kitchen`, with its two stills), the founder and team pictures, the offices photo and the closing picture. The room stage lives in `src/features/stage/`; the living room fades instead of sweeping because its two stills are not from one camera position.
- **Other browsers.** `tests/e2e/browsers.e2e.mjs` loads the home page in Firefox and WebKit at 1280 and 390 wide, prices a change, scrolls the whole page and checks that every reveal block shows, the stage finishes and nothing scrolls sideways. A browser Playwright does not have installed is reported as skipped, never as passed. `node tools/page-weight.mjs <url>` prints what the home page transfers.
- **Reduced motion** keeps short colour fades (the room fill) and removes movement (button press scale), following the Emil Kowalski motion rules adopted in §7.4.
- **Text fields** use a separate `--color-field-border` token so their outline reaches 3:1 (WCAG 1.4.11); `--color-line` stays for decorative hairlines. A new theme must set both.
- **End-to-end tests** are one file per area (`tests/e2e/*.e2e.mjs`, run by `npm run e2e`) instead of one smoke file, plus `journey.e2e.mjs` (price on home, request on `/book/`, confirm in the console) and `quality.e2e.mjs` (axe, contrast of borders and focus rings, 44px targets, motion, photo loading).
- **Booking URL** also carries the chosen day, window, access method and step (never contact details or codes), so Back and refresh return to the right step. A link to a later step opens at the first unfinished one.
- **Blocked storage**: when the browser refuses storage entirely (blocked cookies, a sandboxed frame), the site falls back to memory for the page and keeps working, and the booking success screen says this browser couldn't keep a copy, with the phone number.
- **Arrival windows** are read through `windowIdFrom()` everywhere, so a third window is a config change only.
- **Owner console** draws the message timeline in `features/messages/timeline.ts`; there is no `MessagePreview` component. Sample leads have ids starting `S-`, and loading samples keeps the owner's own requests in a single write, so a full device loses nothing. A stored quote that doesn't add up is re-priced from the selection; one-off cleans show "Total"; applications show the right-to-work, car and licence tick.
- **Lead data**: every form stores phone numbers in one format ("0412 345 678"). Structured data (JSON-LD) is escaped so client text can't break the page. The import checker also blocks features and `domain/` importing sections, layouts or pages, and layouts importing sections or pages.
- **Forms** clear a field's error as soon as it is fixed (every form, booking included, through `core/forms.ts`); a too-fast first send is held with a message rather than faked as a success; the waitlist turns away suburbs already covered; the careers form also asks for a mobile number and a right-to-work, car and licence tick box.
- **Offices** has no mobile booking bar (it shows homeowner prices).
- **Consent record**: only the booking form shows terms and marketing boxes. Enquiry forms (walk-through, waitlist, careers) record no agreement, and the console shows "not asked" for them rather than a timestamped agreement.

Measured on 11 October 2026 on a fresh build (local preview):

| Check | Result |
|---|---|
| Unit tests | 340 passing in 40 files, boundaries clean |
| Types | `astro check`: 0 errors, 0 warnings, 0 hints |
| End to end | 12 files, 188 steps passing, none skipped, including Firefox and WebKit at 1280 and 390 wide (4 of 4). Run with all 24 photo slots filled. Chromium was Playwright's own build, launched headless with no extra flags |
| Accessibility | axe (WCAG 2.0 to 2.2 A/AA tags): no serious or critical issues on `/`, `/book/` (steps 1 and 4, with errors), `/offices/`, `/console/` in both themes at 375 and 1280 |
| JavaScript | Heaviest page 16.1 KB gzipped (`/console/`), `/book/` 15.8 KB, `/` 13.7 KB plus 130.8 KB that loads only through `import()`; budgets 30 KB and 150 KB (`npm run budget`) |
| Kitchen clip | `action-kitchen.mp4` 1,106,976 bytes (limit 2,500,000); `action-kitchen.webm` 723,771 bytes (limit 1,500,000) |
| Home page transfer | 375 wide: 104 KB at load, 250 KB after scrolling the whole page. 1280 wide: 1117 KB at load, 2085 KB after scrolling the whole page (`node tools/page-weight.mjs`) |
| Lighthouse mobile | Performance and accessibility only, median of three runs, headless Chromium with no extra flags: home 98 and 100 (LCP 2.0 s, CLS 0.026, TBT 0 ms); `/book/` 98 and 100 (LCP 1.7 s, CLS 0.074, TBT 0 ms). Lighthouse attributes both layout shifts to the web font loading (the hero section on home, `main` on `/book/`) |

The Lighthouse figures use its phone profile, which is narrower than 768px, so none of them includes the 3D model, the desktop hero clip or the pinned room stage. The model's start-up cost and frame rate on a desktop have not been measured. A real iPhone, a screen reader and 200% zoom have not been tried.
