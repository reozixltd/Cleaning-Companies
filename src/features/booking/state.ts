/**
 * Booking-step state: which days can be picked, when a visit starts, and the
 * order of the five steps. Dates are `YYYY-MM-DD` strings in the business's time zone;
 * date arithmetic runs in UTC so the device's time zone never shifts a day.
 */
import { formatDay, utcOffset } from '@/core/format';
import type { BookingConfig, WindowId } from '@/config/booking';

export interface Day {
  date: string;
  label: string;
}

const DAY_MS = 86_400_000;

function addDays(date: string, n: number): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS);
}

/** The window a stored or submitted value names, or the first window when it names none. */
export function windowIdFrom(value: string, cfg: BookingConfig): WindowId {
  return cfg.windows.find((w) => w.id === value)?.id ?? cfg.windows[0].id;
}

/** Days from today + leadDays to today + horizonDays inclusive, minus days off. */
export function availableDays(today: string, cfg: BookingConfig): Day[] {
  const days: Day[] = [];
  for (let offset = cfg.leadDays; offset <= cfg.horizonDays; offset++) {
    const d = addDays(today, offset);
    if (cfg.daysOff.includes(d.getUTCDay())) continue;
    const date = d.toISOString().slice(0, 10);
    days.push({ date, label: formatDay(date) });
  }
  return days;
}

/** ISO time the arrival window opens, in the business's local time. */
export function visitStart(date: string, windowId: WindowId, cfg: BookingConfig, timeZone = 'Australia/Brisbane'): string {
  const window = cfg.windows.find((w) => w.id === windowId) ?? cfg.windows[0];
  return `${date}T${window.start}:00${utcOffset(new Date(`${date}T02:00:00Z`), timeZone)}`;
}

export const STEP_IDS = ['home', 'when', 'access', 'you', 'check'] as const;
export type StepId = (typeof STEP_IDS)[number];

export function nextStep(step: StepId): StepId {
  return STEP_IDS[Math.min(STEP_IDS.indexOf(step) + 1, STEP_IDS.length - 1)];
}

export function prevStep(step: StepId): StepId {
  return STEP_IDS[Math.max(STEP_IDS.indexOf(step) - 1, 0)];
}
