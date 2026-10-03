import { describe, expect, it } from 'vitest';
import { lineAmount, priceText, stepRecap, summaryRows } from '@/features/booking/recap';
import { booking } from '@/config/booking';
import { pricing } from '@/config/pricing';
import { quote } from '@/domain/quote';
import { DEFAULT_SELECTION, type Selection } from '@/domain/selection';

const ctxFor = (selection: Selection) => ({ selection, quote: quote(selection, pricing), pricing, booking });
const ctx = ctxFor(DEFAULT_SELECTION);

const values: Record<string, string> = {
  day: '2026-10-06',
  window: 'morning',
  method: 'home',
  detail: '',
  parking: '',
  notes: '',
  pets: 'no',
  petsNote: '',
  firstName: 'Sam',
  lastName: 'Citizen',
  phone: '0412 345 678',
  email: 'sam@example.com',
  address: '12 Gympie Road',
  suburb: 'Chermside',
  postcode: '4032',
  marketingSms: '',
  marketingEmail: '',
};

const row = (rows: { id: string; value: string }[], id: string) => rows.find((r) => r.id === id)?.value;

describe('priceText', () => {
  it('says a visit for plans and just the price for one-off cleans', () => {
    expect(priceText(ctx.quote)).toBe('$179 a visit');
    expect(priceText(ctxFor({ ...DEFAULT_SELECTION, service: 'end-of-lease', frequency: 'once' }).quote)).toBe('$438');
  });
});

describe('lineAmount', () => {
  it('writes savings with a real minus sign', () => {
    expect(lineAmount(199)).toBe('$199');
    expect(lineAmount(-20)).toBe('−$20');
  });
});

describe('stepRecap', () => {
  it('sums up each finished step in one line', () => {
    expect(stepRecap('home', values, ctx)).toBe('3 bed, 2 bath, fortnightly, $179 a visit');
    expect(stepRecap('when', values, ctx)).toBe('Tue 6 Oct, morning, arrive 8–10am');
    expect(stepRecap('access', values, ctx)).toBe('Someone will be home');
    expect(stepRecap('you', values, ctx)).toBe('Sam Citizen, 0412 345 678');
    expect(stepRecap('check', values, ctx)).toBe('');
  });

  it('is empty when a step has nothing yet', () => {
    expect(stepRecap('when', {}, ctx)).toBe('');
    expect(stepRecap('access', {}, ctx)).toBe('');
  });
});

describe('summaryRows', () => {
  it('lists what, when, access and contact in plain words', () => {
    const rows = summaryRows(values, ctx);
    expect(row(rows, 'clean')).toBe('Regular clean, every fortnight');
    expect(row(rows, 'rooms')).toBe('3 bedrooms, 2 bathrooms, living, kitchen');
    expect(row(rows, 'when')).toBe('Tue 6 Oct, morning, arrive 8–10am');
    expect(row(rows, 'access')).toBe('Someone will be home');
    expect(row(rows, 'pets')).toBe('No pets');
    expect(row(rows, 'address')).toBe('12 Gympie Road, Chermside 4032');
    expect(row(rows, 'offers')).toBe('None');
    expect(row(rows, 'extras')).toBeUndefined();
    expect(row(rows, 'parking')).toBeUndefined();
  });

  it('names extras, parking, notes, pets and offers when given', () => {
    const rows = summaryRows(
      { ...values, parking: 'Street parking nearby', notes: 'Gate sticks', pets: 'yes', petsNote: 'Friendly dog', marketingSms: 'on' },
      ctxFor({ ...DEFAULT_SELECTION, addOns: ['oven', 'blinds'] }),
    );
    expect(row(rows, 'extras')).toBe('Inside the oven, Blinds');
    expect(row(rows, 'parking')).toBe('Street parking nearby');
    expect(row(rows, 'notes')).toBe('Gate sticks');
    expect(row(rows, 'pets')).toBe('Friendly dog');
    expect(row(rows, 'offers')).toBe('By SMS');
  });

  it('shows where the key is but never repeats a door code', () => {
    expect(row(summaryRows({ ...values, method: 'key', detail: 'Lockbox by the side gate' }, ctx), 'access')).toBe(
      "We'll leave a key or use a lockbox: Lockbox by the side gate",
    );
    const code = row(summaryRows({ ...values, method: 'code', detail: '4821' }, ctx), 'access');
    expect(code).toBe("There's a door code (kept with your booking)");
    expect(code).not.toContain('4821');
  });
});
