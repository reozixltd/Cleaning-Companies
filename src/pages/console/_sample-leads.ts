/**
 * Seven sample leads so the console never opens empty (spec §6.6). Dates are
 * relative to `now`, so visits are always in the future: 4 bookings (new,
 * confirmed one-off with marketing email consent, confirmed weekly, declined),
 * 1 walk-through, 1 job application and 1 waitlist request from outside the area.
 * loadSampleLeads() puts a fresh set in beside the owner's own requests.
 */
import { booking, type WindowId } from '@/config/booking';
import { business } from '@/config/business';
import { pricing } from '@/config/pricing';
import { todayIn } from '@/core/format';
import type { Lead, LeadEvent, LeadKind, LeadStatus } from '@/core/leads/types';
import { quote } from '@/domain/quote';
import { DEFAULT_SELECTION, type Selection } from '@/domain/selection';
import { availableDays } from '@/features/booking/state';
import type { BookingPayload } from './_booking';
import { SAMPLE_ID_PREFIX } from './_demo';

export type { BookingPayload } from './_booking';

const MIN = 60_000;
const DAY = 86_400_000;

interface Sample {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  /** Minutes before now. */
  ago: number;
  name: [string, string];
  phone: string;
  email: string;
  suburb: string;
  postcode: string;
  marketing?: { sms?: boolean; email?: boolean };
  payload: Record<string, unknown>;
  /** [minutes before now, event] */
  history?: [number, Pick<LeadEvent, 'type' | 'value'>][];
}

export function sampleLeads(now: Date): Lead[] {
  const today = todayIn(business.timeZone, now);
  const days = availableDays(today, booking).map((d) => d.date);
  /** The nth bookable day; if the config leaves too few, days after the last one (still in the future). */
  const dayAt = (n: number) =>
    days[n] ?? new Date(Date.parse(`${days.at(-1) ?? today}T00:00:00Z`) + (n - days.length + 1) * DAY).toISOString().slice(0, 10);
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MIN).toISOString();

  const visit = (
    selection: Partial<Selection>,
    day: number,
    windowId: WindowId,
    access: BookingPayload['access'],
    address: string,
    pets: BookingPayload['pets'] = { has: false, note: '' },
  ): Record<string, unknown> => {
    const s: Selection = { ...DEFAULT_SELECTION, ...selection };
    const payload: BookingPayload = { selection: s, quote: quote(s, pricing), day: dayAt(day), windowId, access, pets, address };
    return payload as unknown as Record<string, unknown>;
  };

  const samples: Sample[] = [
    {
      id: 'BK-PRIYA', kind: 'booking', status: 'new', ago: 25,
      name: ['Priya', 'Raman'], phone: '0491 570 156', email: 'priya.raman@example.com', suburb: 'Chermside', postcode: '4032',
      marketing: { sms: true },
      payload: visit(
        { addOns: ['oven'] }, 2, 'morning',
        { method: 'code', detail: '4821', parking: 'Visitor park out the front', notes: 'Second door on the left after the gate.' },
        '14 Banfield St', { has: true, note: 'Friendly kelpie, stays in the yard' },
      ),
    },
    {
      id: 'WT-NORTHSIDE', kind: 'walkthrough', status: 'new', ago: 2 * 60 + 10,
      name: ['Daniel', 'Okafor'], phone: '0491 570 313', email: 'daniel@northsidephysio.example', suburb: 'Geebung', postcode: '4034',
      payload: {
        company: 'Northside Physio', siteAddress: 'Unit 3, 40 Ellison Rd, Geebung', floorArea: '200–500 m²',
        frequency: 'Twice a week', preferredTimes: 'Weekdays after 6pm', notes: 'Two treatment rooms, a gym floor and a small kitchen.',
      },
    },
    {
      id: 'BK-MIA', kind: 'booking', status: 'confirmed', ago: 26 * 60,
      name: ['Mia', 'Nguyen'], phone: '0491 570 737', email: 'mia.nguyen@example.com', suburb: 'Aspley', postcode: '4034',
      marketing: { email: true },
      payload: visit(
        { service: 'end-of-lease', bedrooms: 2, bathrooms: 1, laundry: true, frequency: 'once', addOns: ['oven', 'blinds'] }, 0, 'morning',
        { method: 'key', detail: 'Collect from the property manager on Robinson Rd', parking: 'Street parking', notes: 'Final inspection is the day after.' },
        '7/22 Albany Creek Rd',
      ),
      history: [[22 * 60, { type: 'status', value: 'confirmed' }], [21 * 60, { type: 'note', value: 'Agent wants receipts for the oven and blinds.' }]],
    },
    {
      id: 'AP-GRACE', kind: 'application', status: 'new', ago: 2 * 24 * 60,
      name: ['Grace', 'Fifita'], phone: '0491 571 266', email: 'grace.fifita@example.com', suburb: 'Zillmere', postcode: '4034',
      payload: { availability: 'Weekdays, school hours', experience: 'Three years cleaning holiday rentals on the Sunshine Coast. Own car.', rightToWorkCarLicence: true },
    },
    {
      id: 'BK-BEN', kind: 'booking', status: 'confirmed', ago: 3 * 24 * 60 + 4 * 60,
      name: ['Ben', 'Carter'], phone: '0491 571 491', email: 'ben.carter@example.com', suburb: 'Stafford', postcode: '4053',
      payload: visit(
        { bedrooms: 4, bathrooms: 2, study: true, frequency: 'weekly' }, 1, 'afternoon',
        { method: 'home', detail: '', parking: 'Driveway is fine', notes: '' }, '31 Webster Rd',
      ),
      history: [[3 * 24 * 60 + 2 * 60, { type: 'status', value: 'confirmed' }], [3 * 24 * 60, { type: 'note', value: 'Asked for the same cleaner each week.' }]],
    },
    {
      id: 'BK-KATE', kind: 'booking', status: 'declined', ago: 4 * 24 * 60,
      name: ['Kate', 'Morrison'], phone: '0491 571 804', email: 'kate.morrison@example.com', suburb: 'Albany Creek', postcode: '4035',
      payload: visit(
        { service: 'deep', bedrooms: 3, bathrooms: 2, laundry: true, frequency: 'once', addOns: ['fridge'] }, 3, 'afternoon',
        { method: 'home', detail: '', parking: '', notes: 'Needs us finished by 1pm.' }, '9 Kenmore Cres',
      ),
      history: [
        [4 * 24 * 60 - 3 * 60, { type: 'note', value: 'A deep clean of this home takes about 5 hours. Called Kate, she will rebook for a morning.' }],
        [4 * 24 * 60 - 3 * 60 - 5, { type: 'status', value: 'declined' }],
      ],
    },
    {
      id: 'WL-LENA', kind: 'waitlist', status: 'new', ago: 6 * 24 * 60,
      name: ['Lena', 'Fischer'], phone: '', email: 'lena.fischer@example.com', suburb: 'Kedron', postcode: '4031',
      marketing: { email: true },
      payload: { suburb: 'Kedron' },
    },
  ];

  return samples.map((s) => ({
    id: `${SAMPLE_ID_PREFIX}${s.id}`,
    kind: s.kind,
    status: s.status,
    createdAt: at(s.ago),
    contact: { firstName: s.name[0], lastName: s.name[1], phone: s.phone, email: s.email },
    suburb: s.suburb,
    postcode: s.postcode,
    consent: { terms: s.kind === 'booking', marketingSms: s.marketing?.sms ?? false, marketingEmail: s.marketing?.email ?? false, at: at(s.ago) },
    payload: s.payload,
    clientRef: `sample-${s.id.toLowerCase()}`,
    history: (s.history ?? []).map(([ago, e]) => ({ ...e, at: at(ago) })),
  }));
}

/** What loading samples needs from the lead store. */
export interface SampleStore {
  list(): Promise<Lead[]>;
  /** Replaces every stored lead in one write; a failed write changes nothing. */
  seed(leads: Lead[]): Promise<void>;
}

/**
 * Keeps the owner's own requests and swaps in a fresh set of samples dated
 * from `now`. The new list goes in as one write, with no clearing first, so
 * a failed write (storage full) leaves the owner's requests where they were.
 */
export async function loadSampleLeads(store: SampleStore, now: Date): Promise<void> {
  const own = (await store.list()).filter((l) => !l.id.startsWith(SAMPLE_ID_PREFIX));
  await store.seed([...own, ...sampleLeads(now)]);
}
