/**
 * Reads a booking lead's payload and turns it into the console's views of it:
 * the inbox line, the visit details, and the message schedule. Pages compose
 * features, so this is where the booking and messages features meet.
 *
 * Payloads come from browser storage, so they are read defensively: the
 * selection is normalised and the quote recomputed if it's missing or malformed.
 */
import { booking, type BookingWindow, type WindowId } from '@/config/booking';
import { business } from '@/config/business';
import { messages, OPT_OUT } from '@/config/messages';
import { FREQUENCIES, pricing, type Frequency } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { formatDay, formatMoney, zonedIso } from '@/core/format';
import type { Lead } from '@/core/leads/types';
import { describeSelection } from '@/domain/describe';
import { quote, type Quote } from '@/domain/quote';
import { normalise, type Selection } from '@/domain/selection';
import type { BookingPayload } from '@/features/booking/lead';
import { visitStart, windowIdFrom } from '@/features/booking/state';
import { schedule, type ScheduleContext, type ScheduledMessage } from '@/features/messages/schedule';

/** Defined once, by the booking form that stores it. */
export type { BookingPayload };

const text = (v: unknown) => (typeof v === 'string' ? v : '');
const record = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const money = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The quote as it was priced when the visitor booked, or null unless it has
 * the shape of a Quote and every amount the console shows is a real number.
 * Copied field by field, so nothing else in the payload rides along.
 */
function storedQuote(v: unknown): Quote | null {
  const q = record(v);
  const lines = Array.isArray(q.lines) ? q.lines.map(record) : [];
  if (!lines.length || !lines.every((l) => typeof l.label === 'string' && money(l.amount))) return null;
  if (!money(q.perVisit) || !money(q.firstVisit) || !FREQUENCIES.includes(q.frequency as Frequency)) return null;
  return {
    lines: lines.map((l) => ({ label: l.label as string, amount: l.amount as number })),
    perVisit: q.perVisit,
    firstVisit: q.firstVisit,
    frequency: q.frequency as Frequency,
  };
}

export function readBooking(lead: Lead): BookingPayload | null {
  if (lead.kind !== 'booking') return null;
  const p = record(lead.payload);
  const day = text(p.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const selection = normalise(record(p.selection) as Partial<Selection>, pricing, rooms.max);
  const access = record(p.access);
  const pets = record(p.pets);
  const method = ['home', 'key', 'code'].includes(text(access.method)) ? (text(access.method) as BookingPayload['access']['method']) : 'home';
  return {
    selection,
    quote: storedQuote(p.quote) ?? quote(selection, pricing),
    day,
    windowId: windowIdFrom(text(p.windowId), booking),
    access: { method, detail: text(access.detail), parking: text(access.parking), notes: text(access.notes) },
    pets: { has: pets.has === true, note: text(pets.note) },
    address: text(p.address),
  };
}

export function windowFor(id: WindowId): BookingWindow {
  return booking.windows.find((w) => w.id === id) ?? booking.windows[0];
}

export function visitFor(b: BookingPayload): NonNullable<ScheduleContext['visit']> {
  return {
    startIso: visitStart(b.day, b.windowId, booking, business.timeZone),
    windowLabel: windowFor(b.windowId).arrive,
    dayLabel: formatDay(b.day),
    priceLabel: formatMoney(b.quote.perVisit),
    oneOff: b.quote.frequency === 'once',
  };
}

export function messagesFor(lead: Lead, now: Date): ScheduledMessage[] {
  const b = readBooking(lead);
  const ctx: ScheduleContext = {
    now: zonedIso(now, business.timeZone),
    timeZone: business.timeZone,
    businessName: business.tradingName,
    reviewLink: business.reviewLink,
    optOut: OPT_OUT,
    visit: b ? visitFor(b) : undefined,
  };
  return schedule(lead, messages, ctx);
}

/** One line for the inbox row. */
export function describeLead(lead: Lead): string {
  const p = record(lead.payload);
  if (lead.kind === 'booking') {
    const b = readBooking(lead);
    return b ? `${describeSelection(b.selection)}. ${formatDay(b.day)}, ${windowFor(b.windowId).arrive}` : 'Booking request';
  }
  if (lead.kind === 'walkthrough') return [text(p.company), text(p.floorArea)].filter(Boolean).join(', ') || 'Walk-through request';
  if (lead.kind === 'application') return text(p.availability) || 'Wants to clean with us';
  return `Wants to hear when we clean in ${text(p.suburb) || lead.suburb || 'their suburb'}`;
}
