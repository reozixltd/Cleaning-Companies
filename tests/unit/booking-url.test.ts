import { describe, expect, it } from 'vitest';
import { bookingSearch, readBookingUrl } from '@/features/booking/url';
import { pricing } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { DEFAULT_SELECTION } from '@/domain/selection';

const read = (search: string) => readBookingUrl(search, pricing, rooms.max);

describe('readBookingUrl', () => {
  it('reads the step, selection, day and window', () => {
    const state = read('?step=access&service=deep&bed=4&bath=2&study=1&laundry=0&freq=monthly&day=2026-10-06&window=afternoon&access=code');
    expect(state.step).toBe('access');
    expect(state.access).toBe('code');
    expect(state.selection).toMatchObject({ service: 'deep', bedrooms: 4, study: true, frequency: 'monthly' });
    expect(state.day).toBe('2026-10-06');
    expect(state.window).toBe('afternoon');
  });

  it('has no selection when the link carries none', () => {
    expect(read('').selection).toBeNull();
    expect(read('?step=when').selection).toBeNull();
  });

  it('clamps hand-edited links and ignores junk', () => {
    const state = read('?step=payment&bed=99&service=pool&day=tomorrow&window=<b>&access=window');
    expect(state.step).toBe('home');
    expect(state.selection).toMatchObject({ bedrooms: 6, service: 'regular', frequency: 'fortnightly' });
    expect(state.day).toBe('');
    expect(state.window).toBe('');
    expect(state.access).toBe('');
  });
});

describe('bookingSearch', () => {
  it('puts the step first, then the selection, then the visit', () => {
    expect(bookingSearch({ step: 'when', selection: DEFAULT_SELECTION })).toBe(
      '?step=when&service=regular&bed=3&bath=2&study=0&laundry=0&freq=fortnightly',
    );
    const search = bookingSearch({ step: 'you', selection: DEFAULT_SELECTION, day: '2026-10-06', window: 'morning', access: 'key' });
    expect(search.endsWith('&day=2026-10-06&window=morning&access=key')).toBe(true);
  });

  it('round-trips through readBookingUrl', () => {
    const selection = { ...DEFAULT_SELECTION, bedrooms: 4, addOns: ['oven' as const] };
    const state = read(bookingSearch({ step: 'check', selection, day: '2026-10-09', window: 'afternoon', access: 'home' }));
    expect(state).toEqual({ step: 'check', sent: false, selection, day: '2026-10-09', window: 'afternoon', access: 'home' });
  });

  it('marks the success screen as sent and starts again at step 1 on a fresh load', () => {
    const state = read(bookingSearch({ step: 'sent', selection: DEFAULT_SELECTION }));
    expect(state.sent).toBe(true);
    expect(state.step).toBe('home');
    expect(read('?step=check').sent).toBe(false);
  });

  it('never carries door codes or contact details', () => {
    const search = bookingSearch({ step: 'check', selection: DEFAULT_SELECTION, access: 'code' });
    expect(search).not.toMatch(/detail|phone|email|name/);
  });
});
