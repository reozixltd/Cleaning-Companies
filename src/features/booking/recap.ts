/**
 * Plain-words summaries of a booking in progress: the one-line recap under each
 * finished step, and the rows on the check step and the success screen. Pure.
 */
import { formatDay, formatMoney, formatPhone } from '@/core/format';
import { normalisePhone } from '@/core/leads/validation';
import type { BookingConfig } from '@/config/booking';
import { FREQUENCY_LABELS, SERVICE_LABELS, type PricingConfig } from '@/config/pricing';
import { describeRooms, describeSelection } from '@/domain/describe';
import type { Quote } from '@/domain/quote';
import type { Selection } from '@/domain/selection';
import { ACCESS_OPTIONS } from './lead';
import type { StepId } from './state';

export interface RecapContext {
  selection: Selection;
  quote: Quote;
  pricing: PricingConfig;
  booking: BookingConfig;
}

export interface SummaryRow {
  id: string;
  label: string;
  value: string;
}

type Values = Record<string, string>;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const get = (v: Values, key: string) => (v[key] ?? '').trim();

/** "$179 a visit"; one-off cleans: "$438". */
export function priceText(q: Quote): string {
  return q.frequency === 'once' ? formatMoney(q.perVisit) : `${formatMoney(q.perVisit)} a visit`;
}

/** Savings use a real minus sign: "−$20". */
export function lineAmount(amount: number): string {
  return amount < 0 ? `−${formatMoney(-amount)}` : formatMoney(amount);
}

/** "Tue 6 Oct, morning, arrive 8–10am" */
export function whenText(v: Values, booking: BookingConfig): string {
  if (!get(v, 'day')) return '';
  const window = booking.windows.find((w) => w.id === get(v, 'window'));
  return window ? `${formatDay(get(v, 'day'))}, ${lowerFirst(window.label)}` : formatDay(get(v, 'day'));
}

const accessLabel = (v: Values) => ACCESS_OPTIONS.find((o) => o.id === get(v, 'method'))?.label ?? '';
const phoneText = (raw: string) => formatPhone(normalisePhone(raw) ?? raw);
const fullName = (v: Values) => `${get(v, 'firstName')} ${get(v, 'lastName')}`.trim();

export function stepRecap(step: StepId, v: Values, ctx: RecapContext): string {
  if (step === 'home') return `${describeSelection(ctx.selection)}, ${priceText(ctx.quote)}`;
  if (step === 'when') return whenText(v, ctx.booking);
  if (step === 'access') return accessLabel(v);
  if (step === 'you') return [fullName(v), phoneText(get(v, 'phone'))].filter(Boolean).join(', ');
  return '';
}

function accessText(v: Values): string {
  const method = get(v, 'method');
  if (method === 'code') return `${accessLabel(v)} (kept with your booking)`;
  if (method === 'key' && get(v, 'detail')) return `${accessLabel(v)}: ${get(v, 'detail')}`;
  return accessLabel(v);
}

function offersText(v: Values): string {
  const sms = get(v, 'marketingSms') === 'on';
  const mail = get(v, 'marketingEmail') === 'on';
  if (sms && mail) return 'By SMS and email';
  return sms ? 'By SMS' : mail ? 'By email' : 'None';
}

export function summaryRows(v: Values, ctx: RecapContext): SummaryRow[] {
  const s = ctx.selection;
  const often = ctx.quote.frequency === 'once' ? 'one visit' : FREQUENCY_LABELS[ctx.quote.frequency].toLowerCase();
  const rows: (SummaryRow | false)[] = [
    { id: 'clean', label: 'Clean', value: `${SERVICE_LABELS[s.service]}, ${often}` },
    { id: 'rooms', label: 'Rooms', value: describeRooms(s) },
    s.addOns.length > 0 && { id: 'extras', label: 'Extras', value: s.addOns.map((a) => ctx.pricing.addOns[a].label).join(', ') },
    { id: 'when', label: 'When', value: whenText(v, ctx.booking) },
    { id: 'access', label: 'Getting in', value: accessText(v) },
    !!get(v, 'parking') && { id: 'parking', label: 'Parking', value: get(v, 'parking') },
    !!get(v, 'notes') && { id: 'notes', label: 'Notes', value: get(v, 'notes') },
    { id: 'pets', label: 'Pets', value: get(v, 'pets') === 'yes' ? get(v, 'petsNote') || 'Yes' : 'No pets' },
    { id: 'name', label: 'Name', value: fullName(v) },
    { id: 'phone', label: 'Mobile', value: phoneText(get(v, 'phone')) },
    { id: 'email', label: 'Email', value: get(v, 'email') },
    { id: 'address', label: 'Address', value: `${get(v, 'address')}, ${get(v, 'suburb')} ${get(v, 'postcode')}` },
    { id: 'offers', label: 'Offers', value: offersText(v) },
  ];
  return rows.filter((r): r is SummaryRow => r !== false);
}

const DONE_ROWS = ['clean', 'rooms', 'extras', 'when', 'access', 'address'];

/** The success screen: what we'll clean, when, and the price. */
export function doneRows(v: Values, ctx: RecapContext): SummaryRow[] {
  const rows = summaryRows(v, ctx).filter((r) => DONE_ROWS.includes(r.id));
  const q = ctx.quote;
  const first = q.firstVisit !== q.perVisit ? `, first visit ${formatMoney(q.firstVisit)}` : '';
  return [...rows, { id: 'price', label: 'Price', value: `${priceText(q)}${first}` }];
}
