/**
 * The booking page's address: which step, the selection, and the chosen day and
 * window and how we get in, so the back button, a refresh or a shared link land
 * in the same place. Contact details, notes and door codes never go in the URL.
 * `step=sent` marks the success screen; a fresh load of it starts again at step 1.
 */
import type { PricingConfig } from '@/config/pricing';
import { fromParams, toParams, type RoomLimits, type Selection } from '@/domain/selection';
import { STEP_IDS, type StepId } from './state';

export interface BookingUrlState {
  step: StepId;
  /** The success screen was showing (history entry pushed after sending). */
  sent: boolean;
  /** Null when the link carries no selection (fall back to the saved one). */
  selection: Selection | null;
  day: string;
  window: string;
  access: string;
}

const SELECTION_KEYS = ['service', 'bed', 'bath', 'study', 'laundry', 'freq', 'extras'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z][a-z-]{0,23}$/;
const ACCESS = ['home', 'key', 'code'];

export function readBookingUrl(search: string, pricing: PricingConfig, max: RoomLimits): BookingUrlState {
  const p = new URLSearchParams(search);
  const step = p.get('step') as StepId | 'sent';
  const day = p.get('day') ?? '';
  const window = p.get('window') ?? '';
  const access = p.get('access') ?? '';
  return {
    step: STEP_IDS.includes(step as StepId) ? (step as StepId) : 'home',
    sent: step === 'sent',
    selection: SELECTION_KEYS.some((k) => p.has(k)) ? fromParams(search, pricing, max) : null,
    day: DATE.test(day) ? day : '',
    window: ID.test(window) ? window : '',
    access: ACCESS.includes(access) ? access : '',
  };
}

type SearchState = { step: StepId | 'sent'; selection: Selection } & Partial<Record<'day' | 'window' | 'access', string>>;

export function bookingSearch(state: SearchState): string {
  let search = `?step=${state.step}&${toParams(state.selection)}`;
  if (state.day) search += `&day=${encodeURIComponent(state.day)}`;
  if (state.window) search += `&window=${encodeURIComponent(state.window)}`;
  if (state.access) search += `&access=${encodeURIComponent(state.access)}`;
  return search;
}
