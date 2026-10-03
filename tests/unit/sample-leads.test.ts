import { describe, expect, it } from 'vitest';
import { loadSampleLeads, sampleLeads, type BookingPayload } from '@/pages/console/_sample-leads';
import { LEADS_KEY, LocalLeadRepository } from '@/core/leads/local-repository';
import { createMemoryStorage, type KeyValueStorage } from '@/core/storage';
import { quote } from '@/domain/quote';
import { normalise } from '@/domain/selection';
import { pricing } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { business } from '@/config/business';
import { formatPhone, todayIn } from '@/core/format';
import { normalisePhone } from '@/core/leads/validation';
import { LEAD_KINDS, LEAD_STATUSES } from '@/core/leads/types';

const NOW = new Date('2026-10-03T03:00:00Z');
const leads = sampleLeads(NOW);
const bookings = leads.filter((l) => l.kind === 'booking');
const payload = (l: (typeof leads)[number]) => l.payload as unknown as BookingPayload;

describe('sampleLeads', () => {
  it('has 7 leads with unique ids and client refs', () => {
    expect(leads).toHaveLength(7);
    expect(new Set(leads.map((l) => l.id)).size).toBe(7);
    expect(new Set(leads.map((l) => l.clientRef)).size).toBe(7);
    expect(leads.every((l) => Array.isArray(l.history) && l.clientRef.length > 0)).toBe(true);
  });

  it('covers all four kinds with 4 bookings, 1 walk-through, 1 application and 1 waitlist', () => {
    const count = (k: string) => leads.filter((l) => l.kind === k).length;
    expect([...new Set(leads.map((l) => l.kind))].sort()).toEqual([...LEAD_KINDS].sort());
    expect([count('booking'), count('walkthrough'), count('application'), count('waitlist')]).toEqual([4, 1, 1, 1]);
  });

  it('puts bookings in different statuses, one of them new', () => {
    expect(new Set(bookings.map((b) => b.status)).size).toBeGreaterThanOrEqual(3);
    expect(bookings.some((b) => b.status === 'new')).toBe(true);
    expect(leads.every((l) => LEAD_STATUSES.includes(l.status))).toBe(true);
  });

  it('dates every booking visit after now (Brisbane date)', () => {
    const today = todayIn(business.timeZone, NOW);
    for (const b of bookings) {
      expect(payload(b).day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(payload(b).day > today).toBe(true);
      expect(['morning', 'afternoon']).toContain(payload(b).windowId);
    }
  });

  it('prices every booking with the real quote', () => {
    for (const b of bookings) {
      const { selection, quote: q } = payload(b);
      expect(normalise(selection, pricing, rooms.max)).toEqual(selection);
      expect(q).toEqual(quote(selection, pricing));
    }
  });

  it('has a one-off booking with marketing email consent, so the rebook offer shows', () => {
    const oneOff = bookings.find((b) => payload(b).quote.frequency === 'once' && b.consent.marketingEmail);
    expect(oneOff).toBeDefined();
    expect(oneOff!.status).not.toBe('declined');
  });

  it('records status history for every lead that moved past new', () => {
    for (const l of leads.filter((x) => x.status !== 'new')) {
      expect(l.history.some((h) => h.type === 'status' && h.value === l.status)).toBe(true);
    }
  });

  it('never dates anything after now, and is newest first', () => {
    const times = leads.map((l) => Date.parse(l.createdAt));
    expect(times.every((t) => t <= NOW.getTime())).toBe(true);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    for (const l of leads) for (const h of l.history) expect(Date.parse(h.at)).toBeLessThanOrEqual(NOW.getTime());
  });

  it('stores phones the way the forms do, so the CSV export uses one format', () => {
    for (const lead of leads) {
      const expected = lead.kind === 'waitlist' ? '' : formatPhone(normalisePhone(lead.contact.phone) ?? '');
      expect(lead.contact.phone, lead.id).toBe(expected);
    }
  });

  it('uses suburbs from the service area for bookings and walk-throughs', () => {
    const served = new Set(business.areas.map((a) => a.suburb));
    for (const l of leads.filter((x) => x.kind === 'booking' || x.kind === 'walkthrough')) expect(served.has(l.suburb)).toBe(true);
  });

  it('keeps visits after now even late on a Saturday night', () => {
    const late = new Date('2026-10-03T13:59:00Z'); // 11:59pm Saturday in Brisbane
    const today = todayIn(business.timeZone, late);
    for (const b of sampleLeads(late).filter((l) => l.kind === 'booking')) {
      expect(payload(b).day > today).toBe(true);
      expect(new Date(`${payload(b).day}T00:00:00Z`).getUTCDay()).not.toBe(0);
    }
  });
});

describe('loadSampleLeads', () => {
  /** Memory storage that refuses the leads write once `full` is set, like a browser out of quota. */
  function setup() {
    const memory = createMemoryStorage();
    const state = { full: false };
    const storage: KeyValueStorage = {
      getItem: (k) => memory.getItem(k),
      setItem: (k, v) => {
        if (state.full && k === LEADS_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        memory.setItem(k, v);
      },
      removeItem: (k) => memory.removeItem(k),
    };
    const repo = new LocalLeadRepository(storage, () => NOW.getTime());
    const store = { list: () => repo.list(), seed: (l: typeof leads) => repo.seed(l) };
    const own = () =>
      repo.create({
        kind: 'booking',
        contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570110', email: 'sam@example.com' },
        suburb: 'Chermside',
        postcode: '4032',
        consent: { terms: true, marketingSms: false, marketingEmail: false, at: NOW.toISOString() },
        payload: {},
        clientRef: 'own-1',
      });
    return { repo, store, own, memory, state };
  }

  it("keeps the owner's own requests and swaps in one fresh set of samples", async () => {
    const { repo, store, own } = setup();
    await loadSampleLeads(store, NOW);
    const mine = await own();
    await loadSampleLeads(store, new Date(NOW.getTime() + 60_000));
    const ids = (await repo.list()).map((l) => l.id);
    expect(ids).toContain(mine.id);
    expect(ids).toHaveLength(leads.length + 1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never loses the owner's requests when the write fails (storage full)", async () => {
    const { repo, store, own, memory, state } = setup();
    await loadSampleLeads(store, NOW);
    const mine = await own();
    const before = memory.getItem(LEADS_KEY);
    state.full = true;
    await expect(loadSampleLeads(store, NOW)).rejects.toThrow(/Could not load sample leads/);
    expect(memory.getItem(LEADS_KEY)).toBe(before);
    expect((await repo.list()).map((l) => l.id)).toContain(mine.id);
  });
});
