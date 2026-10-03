import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay, formatMoney, formatPhone, formatPhoneHref, todayIn, zonedIso } from '@/core/format';

describe('format', () => {
  it('formatMoney shows whole dollars', () => {
    expect(formatMoney(179)).toBe('$179');
    expect(formatMoney(1284)).toBe('$1,284');
  });

  it('formatDay gives a short weekday date', () => {
    expect(formatDay('2026-10-09')).toBe('Fri 9 Oct');
  });

  it('todayIn uses the given time zone, not the device', () => {
    expect(todayIn('Australia/Brisbane', new Date('2026-10-08T15:30:00Z'))).toBe('2026-10-09');
    expect(todayIn('Australia/Brisbane', new Date('2026-10-08T13:30:00Z'))).toBe('2026-10-08');
  });

  it('formatPhoneHref builds an international tel: link', () => {
    expect(formatPhoneHref('07 5550 1234')).toBe('tel:+61755501234');
  });

  it('formatPhone groups mobiles and landlines', () => {
    expect(formatPhone('0491570110')).toBe('0491 570 110');
    expect(formatPhone('0755501234')).toBe('07 5550 1234');
    expect(formatPhone('13 00 00')).toBe('13 00 00');
  });

  it('zonedIso writes local time with the zone offset', () => {
    expect(zonedIso(new Date('2026-10-04T23:00:00Z'), 'Australia/Brisbane')).toBe('2026-10-05T09:00:00+10:00');
    expect(zonedIso(new Date('2026-10-04T23:00:00Z'), 'Australia/Sydney')).toBe('2026-10-05T10:00:00+11:00');
  });

  it('formatDateTime is short and readable', () => {
    expect(formatDateTime('2026-10-05T09:02:00+10:00', 'Australia/Brisbane')).toBe('Mon 5 Oct, 9:02am');
  });
});
