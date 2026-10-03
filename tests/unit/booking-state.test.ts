import { describe, expect, it } from 'vitest';
import { STEP_IDS, availableDays, nextStep, prevStep, visitStart, windowIdFrom } from '@/features/booking/state';
import { booking, type WindowId } from '@/config/booking';
import { todayIn } from '@/core/format';

describe('availableDays', () => {
  it('skips Sundays and respects lead and horizon', () => {
    const days = availableDays('2026-10-03', booking);
    expect(days[0]).toEqual({ date: '2026-10-05', label: 'Mon 5 Oct' });
    expect(days.at(-1)?.date).toBe('2026-10-17');
    expect(days.some((d) => d.label.startsWith('Sun'))).toBe(false);
    expect(days).toHaveLength(12);
  });

  it('uses Brisbane date', () => {
    const today = todayIn('Australia/Brisbane', new Date('2026-10-03T14:30:00Z'));
    expect(today).toBe('2026-10-04');
    expect(availableDays(today, booking)[0].date).toBe('2026-10-06');
  });

  it('crosses month and year ends', () => {
    const days = availableDays('2026-12-28', booking);
    expect(days[0].date).toBe('2026-12-30');
    expect(days.at(-1)?.date).toBe('2027-01-11');
  });

  it('is empty when every day is off', () => {
    expect(availableDays('2026-10-03', { ...booking, daysOff: [0, 1, 2, 3, 4, 5, 6] })).toEqual([]);
  });
});

describe('visitStart', () => {
  it('gives the window start in Brisbane time', () => {
    expect(visitStart('2026-10-09', 'afternoon', booking)).toBe('2026-10-09T12:00:00+10:00');
    expect(visitStart('2026-10-09', 'morning', booking)).toBe('2026-10-09T08:00:00+10:00');
  });

  it('uses the business time zone, including daylight saving', () => {
    expect(visitStart('2026-10-09', 'morning', booking, 'Australia/Sydney')).toBe('2026-10-09T08:00:00+11:00');
    expect(visitStart('2026-07-09', 'morning', booking, 'Australia/Sydney')).toBe('2026-07-09T08:00:00+10:00');
  });
});

describe('steps', () => {
  it('step order', () => {
    expect(STEP_IDS).toEqual(['home', 'when', 'access', 'you', 'check']);
    expect(nextStep('home')).toBe('when');
    expect(nextStep('check')).toBe('check');
    expect(prevStep('when')).toBe('home');
    expect(prevStep('home')).toBe('home');
  });
});

describe('windowIdFrom', () => {
  const evening = { id: 'evening' as WindowId, label: 'Evening, arrive 5–7pm', arrive: '5–7pm', start: '17:00', end: '19:00' };
  const withEvening = { ...booking, windows: [...booking.windows, evening] };

  it('keeps any window the config lists, so a new window needs no code change', () => {
    expect(windowIdFrom('afternoon', booking)).toBe('afternoon');
    expect(windowIdFrom('evening', withEvening)).toBe('evening');
  });

  it('falls back to the first window for anything else', () => {
    expect(windowIdFrom('midnight', booking)).toBe('morning');
    expect(windowIdFrom('', booking)).toBe('morning');
  });
});
