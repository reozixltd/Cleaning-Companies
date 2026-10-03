import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { business } from '@/config/business';
import { navigation } from '@/config/navigation';
import { messages, MESSAGE_VARIABLES } from '@/config/messages';
import { pricing, SERVICE_IDS, FREQUENCIES, ADD_ON_IDS } from '@/config/pricing';
import { rooms, ROOM_KINDS } from '@/config/rooms';
import { booking } from '@/config/booking';

const strings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
};

describe('config', () => {
  it('every area with a page has a content file', () => {
    const pages = business.areas.filter((a) => a.page);
    expect(pages.length).toBe(4);
    for (const a of pages) expect(existsSync(`src/content/areas/${a.page}.md`), a.page).toBe(true);
  });

  it('Kedron is not a covered suburb (the demo uses it for the out-of-area answer)', () => {
    expect(business.areas.map((a) => a.suburb)).not.toContain('Kedron');
  });

  it('message templates use known variables only', () => {
    for (const m of messages) {
      for (const [, key] of m.body.matchAll(/\{(\w+)\}/g)) expect(MESSAGE_VARIABLES, `${m.id}: {${key}}`).toContain(key);
      if (m.channel === 'sms') expect(m.body, m.id).toContain('{businessName}');
      if (m.marketing) expect(m.body, m.id).toContain('{optOut}');
    }
  });

  it('every room has every checklist level', () => {
    for (const kind of ROOM_KINDS) {
      expect(rooms.rooms[kind].every.length, kind).toBeGreaterThan(0);
      expect(rooms.rooms[kind].deep.length, kind).toBeGreaterThan(0);
    }
  });

  it('pricing covers every service, frequency and add-on', () => {
    expect(Object.keys(pricing.multiplier).sort()).toEqual([...SERVICE_IDS].sort());
    expect(Object.keys(pricing.discount).sort()).toEqual([...FREQUENCIES].sort());
    expect(Object.keys(pricing.addOns).sort()).toEqual([...ADD_ON_IDS].sort());
  });

  it('booking windows are well formed', () => {
    for (const w of booking.windows) expect(w.start < w.end, w.id).toBe(true);
    expect(booking.leadDays).toBeLessThan(booking.horizonDays);
  });

  it('copy rules', () => {
    const allowed = new Set(['ABN', 'GST', 'QLD', 'REIQ', 'NDIS', 'WHS', 'SMS', 'STOP']);
    for (const s of strings([business, navigation, messages])) {
      expect(s, s).not.toMatch(/[·→]/);
      for (const [caps] of s.matchAll(/\b[A-Z]{3,}\b/g)) expect(allowed, `${caps} in "${s}"`).toContain(caps);
    }
  });
});
