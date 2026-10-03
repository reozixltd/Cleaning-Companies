/** Plain-words summaries of a selection, used in price tags, the booking tag and the console. */
import { FREQUENCY_SHORT, SERVICE_SHORT } from '@/config/pricing';
import type { Selection } from './selection';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 bed, 2 bath, fortnightly"; one-off: "3 bed, 2 bath, end of lease". */
export function describeSelection(s: Selection): string {
  const rooms = `${s.bedrooms} bed, ${s.bathrooms} bath`;
  if (s.service === 'regular') return `${rooms}, ${FREQUENCY_SHORT[s.frequency]}`;
  if (s.frequency === 'once') return `${rooms}, ${SERVICE_SHORT[s.service]}`;
  return `${rooms}, ${SERVICE_SHORT[s.service]}, ${FREQUENCY_SHORT[s.frequency]}`;
}

/** "3 bedrooms, 2 bathrooms, living, kitchen[, study][, laundry]" */
export function describeRooms(s: Selection): string {
  const parts = [plural(s.bedrooms, 'bedroom'), plural(s.bathrooms, 'bathroom'), 'living', 'kitchen'];
  if (s.study) parts.push('study');
  if (s.laundry) parts.push('laundry');
  return parts.join(', ');
}
