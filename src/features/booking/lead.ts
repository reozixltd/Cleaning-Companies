/**
 * The booking request as data: the rules each step must pass, and the lead
 * that gets stored. Pure; the form values arrive as strings (core/forms.ts).
 */
import { formatPhone } from '@/core/format';
import { findArea, normaliseQuery, type AreaEntry } from '@/core/geo';
import type { LeadInput } from '@/core/leads/types';
import { auPhone, checked, email, minLength, normalisePhone, postcode, required, type Rule, type Rules } from '@/core/leads/validation';
import { booking, type WindowId } from '@/config/booking';
import type { Quote } from '@/domain/quote';
import type { Selection } from '@/domain/selection';
import { STEP_IDS, windowIdFrom, type StepId } from './state';

export type AccessMethod = 'home' | 'key' | 'code';

/** How we get in, in the visitor's words. The hint is shown under the option. */
export const ACCESS_OPTIONS: { id: AccessMethod; label: string; hint: string }[] = [
  { id: 'home', label: 'Someone will be home', hint: "We'll text when your cleaner is on the way." },
  { id: 'key', label: "We'll leave a key or use a lockbox", hint: 'Keys get a coded tag with no name or address on it.' },
  { id: 'code', label: "There's a door code", hint: 'Codes are kept with your booking and deleted when your service ends.' },
];

/** A type alias (not an interface) so it fits the repository's `Record<string, unknown>` payload. */
export type BookingPayload = {
  selection: Selection;
  quote: Quote;
  /** `YYYY-MM-DD` in the business's time zone. */
  day: string;
  windowId: WindowId;
  access: { method: AccessMethod; detail: string; parking: string; notes: string };
  pets: { has: boolean; note: string };
  address: string;
};

export interface BookingContext {
  selection: Selection;
  quote: Quote;
  consentAt: string;
  clientRef: string;
}

const isOn = (v: string | undefined) => v === 'on' || v === 'true';
const needsDetail = (method: string) => method === 'key' || method === 'code';

export function buildBookingInput(form: Record<string, string>, ctx: BookingContext): LeadInput<BookingPayload> {
  const v = (key: string) => (form[key] ?? '').trim();
  const method = (ACCESS_OPTIONS.some((o) => o.id === v('method')) ? v('method') : 'home') as AccessMethod;
  const hasPets = v('pets') === 'yes';
  return {
    kind: 'booking',
    contact: { firstName: v('firstName'), lastName: v('lastName'), phone: formatPhone(normalisePhone(v('phone')) ?? v('phone')), email: v('email') },
    suburb: v('suburb'),
    postcode: v('postcode'),
    consent: { terms: isOn(form.terms), marketingSms: isOn(form.marketingSms), marketingEmail: isOn(form.marketingEmail), at: ctx.consentAt },
    payload: {
      selection: ctx.selection,
      quote: ctx.quote,
      day: v('day'),
      windowId: windowIdFrom(v('window'), booking),
      access: { method, detail: needsDetail(method) ? v('detail') : '', parking: v('parking'), notes: v('notes') },
      pets: { has: hasPets, note: hasPets ? v('petsNote') : '' },
      address: v('address'),
    },
    clientRef: ctx.clientRef,
  };
}

const inArea =
  (areas: readonly AreaEntry[]): Rule =>
  (value) => {
    const match = findArea(value, areas);
    if (match.status === 'in') return null;
    if (match.status === 'out') return `We don't clean in ${match.query} yet. Call us and we'll see what we can do.`;
    return 'Check the spelling of your suburb';
  };

/**
 * The postcode must be one the typed suburb has in the area list. Postcodes can
 * be shared (4034 is Aspley, Carseldine, Geebung and Zillmere), so any of the
 * suburb's entries will do. Until the suburb itself is in the area, its own
 * message says what to fix and the postcode only needs its shape.
 */
const postcodeFitsSuburb =
  (areas: readonly AreaEntry[]): Rule =>
  (value, all) => {
    const match = findArea(all.suburb ?? '', areas);
    if (match.status !== 'in' || match.matches.some((a) => a.postcode === value.trim())) return null;
    const typedName = normaliseQuery(all.suburb ?? '') !== '';
    return typedName ? `Check the postcode for ${match.matches[0].suburb}` : 'Check the postcode matches your suburb';
  };

/** Step 4: who you are and where we're cleaning. */
export function bookingRules(areas: readonly AreaEntry[]): Rules {
  return {
    firstName: [required('Enter your first name')],
    lastName: [required('Enter your last name')],
    phone: [auPhone('Enter a mobile or landline, like 0412 345 678')],
    email: [email('Enter an email address, like sam@example.com')],
    address: [minLength(5, 'Enter your street address')],
    suburb: [required('Enter your suburb'), inArea(areas)],
    postcode: [postcode('Enter a 4-digit postcode'), postcodeFitsSuburb(areas)],
    terms: [checked('Agree to the service terms to send your request')],
  };
}

const detailRule: Rule = (value, all) => {
  if (!needsDetail(all.method) || value.trim()) return null;
  return all.method === 'code' ? 'Enter the door code' : "Tell us where we'll find the key or lockbox";
};

/** Steps 2 and 3. Step 1 always passes (the selection is normalised), and step 5 only sends. */
export function stepRules(step: StepId): Rules {
  if (step === 'when') return { day: [required('Choose a day')], window: [required('Choose an arrival time')] };
  if (step === 'access') return { method: [required("Choose how we'll get in")], detail: [detailRule] };
  return {};
}

export function rulesFor(step: StepId, areas: readonly AreaEntry[]): Rules {
  return step === 'you' ? bookingRules(areas) : stepRules(step);
}

/** The first step with something missing, or null when the request is ready to send. */
export function firstIncomplete(values: Record<string, string>, areas: readonly AreaEntry[]): StepId | null {
  for (const step of STEP_IDS) {
    const rules = rulesFor(step, areas);
    for (const [field, fieldRules] of Object.entries(rules)) {
      if (fieldRules.some((rule) => rule(values[field] ?? '', values))) return step;
    }
  }
  return null;
}
