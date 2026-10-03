import { describe, expect, it } from 'vitest';
import { fromPrice, quote } from '@/domain/quote';
import { DEFAULT_SELECTION, type Selection } from '@/domain/selection';
import { ADD_ON_IDS, FREQUENCIES, SERVICE_IDS, pricing } from '@/config/pricing';

const sel = (over: Partial<Selection> = {}): Selection => ({ ...DEFAULT_SELECTION, ...over });

describe('quote', () => {
  it('matches the spec worked example', () => {
    const q = quote(DEFAULT_SELECTION, pricing);
    expect(q.perVisit).toBe(179);
    expect(q.firstVisit).toBe(318);
    expect(q.frequency).toBe('fortnightly');
  });

  it('lines always sum to perVisit', () => {
    for (const service of SERVICE_IDS)
      for (const frequency of FREQUENCIES)
        for (let bedrooms = 1; bedrooms <= 6; bedrooms++)
          for (let bathrooms = 1; bathrooms <= 4; bathrooms++)
            for (const addOns of [[], ['oven']] as const) {
              const q = quote(sel({ service, frequency, bedrooms, bathrooms, addOns: [...addOns] }), pricing);
              const sum = q.lines.reduce((t, l) => t + l.amount, 0);
              expect(sum, `${service} ${frequency} ${bedrooms}/${bathrooms} ${addOns}`).toBe(q.perVisit);
            }
  });

  it('add-ons are flat and undiscounted', () => {
    const base = quote(sel({ frequency: 'weekly' }), pricing).perVisit;
    expect(quote(sel({ frequency: 'weekly', addOns: ['oven'] }), pricing).perVisit).toBe(base + 65);
  });

  it('one-off services ignore frequency', () => {
    const weekly = quote(sel({ service: 'end-of-lease', frequency: 'weekly' }), pricing);
    const once = quote(sel({ service: 'end-of-lease', frequency: 'once' }), pricing);
    expect(weekly).toEqual(once);
    expect(weekly.frequency).toBe('once');
  });

  it('firstVisit equals perVisit for one-off and when the rule is off', () => {
    const once = quote(sel({ frequency: 'once' }), pricing);
    expect(once.firstVisit).toBe(once.perVisit);
    const off = quote(DEFAULT_SELECTION, { ...pricing, firstVisitAsDeep: false });
    expect(off.firstVisit).toBe(off.perVisit);
  });

  it('end of lease 3 bed 2 bath', () => {
    expect(quote(sel({ service: 'end-of-lease' }), pricing).perVisit).toBe(438);
  });

  it('labels the lines in plain words', () => {
    const q = quote(sel({ addOns: ['oven'] }), pricing);
    expect(q.lines.map((l) => l.label)).toEqual([
      'Regular clean, 3 bedrooms, 2 bathrooms, living, kitchen',
      'Fortnightly saving',
      'Inside the oven',
    ]);
    expect(q.lines.map((l) => l.amount)).toEqual([199, -20, 65]);
  });

  it('every add-on has a price line', () => {
    const q = quote(sel({ addOns: [...ADD_ON_IDS] }), pricing);
    expect(q.lines).toHaveLength(2 + ADD_ON_IDS.length);
  });

  it('fromPrice gives the cheapest minimal home for each service', () => {
    expect(fromPrice('regular', pricing)).toBe(110);
    expect(fromPrice('deep', pricing)).toBe(175);
    expect(fromPrice('move-in', pricing)).toBe(232);
    expect(fromPrice('end-of-lease', pricing)).toBe(284);
  });
});
