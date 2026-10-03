/**
 * How a price adds up (spec §5):
 *   rooms     = base + extra bedrooms + extra bathrooms + study + laundry
 *   per visit = rooms × service multiplier × (1 − frequency discount) + add-ons
 *   first     = rooms × deep multiplier + add-ons, for recurring plans when firstVisitAsDeep
 * Rounded to whole dollars once. The saving line absorbs rounding so the lines always add up.
 */
import { FREQUENCY_SHORT, SERVICE_LABELS, type Frequency, type PricingConfig, type ServiceId } from '@/config/pricing';
import { describeRooms } from './describe';
import { DEFAULT_SELECTION, type Selection } from './selection';

export interface QuoteLine {
  label: string;
  /** Whole AUD, GST included. Negative for savings. */
  amount: number;
}

export interface Quote {
  lines: QuoteLine[];
  perVisit: number;
  firstVisit: number;
  frequency: Frequency;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function roomsPrice(s: Selection, p: PricingConfig): number {
  return (
    p.base +
    (s.bedrooms - 1) * p.perExtraBedroom +
    (s.bathrooms - 1) * p.perExtraBathroom +
    (s.study ? p.study : 0) +
    (s.laundry ? p.laundry : 0)
  );
}

export function quote(s: Selection, p: PricingConfig): Quote {
  const frequency: Frequency = p.oneOffOnly.includes(s.service) ? 'once' : s.frequency;
  const rooms = roomsPrice(s, p);
  const serviceAmount = Math.round(rooms * p.multiplier[s.service]);
  const addOns = s.addOns.map((id) => ({ label: p.addOns[id].label, amount: p.addOns[id].price }));
  const addOnTotal = addOns.reduce((t, a) => t + a.amount, 0);
  const perVisit = Math.round(rooms * p.multiplier[s.service] * (1 - p.discount[frequency]) + addOnTotal);

  const lines: QuoteLine[] = [{ label: `${SERVICE_LABELS[s.service]}, ${describeRooms(s)}`, amount: serviceAmount }];
  if (p.discount[frequency] > 0) {
    lines.push({ label: `${capitalise(FREQUENCY_SHORT[frequency])} saving`, amount: perVisit - serviceAmount - addOnTotal });
  }
  lines.push(...addOns);

  const firstVisit =
    p.firstVisitAsDeep && frequency !== 'once' ? Math.round(rooms * p.multiplier.deep + addOnTotal) : perVisit;

  return { lines, perVisit, firstVisit, frequency };
}

/** The lowest per-visit price for the smallest home (1 bed, 1 bath, no extras). */
export function fromPrice(service: ServiceId, p: PricingConfig): number {
  const frequencies = p.oneOffOnly.includes(service) ? (['once'] as Frequency[]) : (Object.keys(p.discount) as Frequency[]);
  const minimal = { ...DEFAULT_SELECTION, service, bedrooms: 1, bathrooms: 1, study: false, laundry: false, addOns: [] };
  return Math.min(...frequencies.map((frequency) => quote({ ...minimal, frequency }, p).perVisit));
}
