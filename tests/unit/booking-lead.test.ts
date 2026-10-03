import { describe, expect, it } from 'vitest';
import { bookingRules, buildBookingInput, firstIncomplete, rulesFor, stepRules } from '@/features/booking/lead';
import { validate } from '@/core/leads/validation';
import { business } from '@/config/business';
import { pricing } from '@/config/pricing';
import { quote } from '@/domain/quote';
import { DEFAULT_SELECTION } from '@/domain/selection';

const areas = business.areas;
const q = quote(DEFAULT_SELECTION, pricing);
const ctx = { selection: DEFAULT_SELECTION, quote: q, consentAt: '2026-10-03T09:02:00.000Z', clientRef: 'ref-1' };

const you = {
  firstName: 'Sam',
  lastName: 'Citizen',
  phone: '0412 345 678',
  email: 'sam@example.com',
  address: '12 Gympie Road',
  suburb: 'Chermside',
  postcode: '4032',
  terms: 'on',
  marketingSms: '',
  marketingEmail: '',
};
const filled: Record<string, string> = {
  ...you,
  day: '2026-10-06',
  window: 'morning',
  method: 'home',
  detail: '',
  parking: '',
  notes: '',
  pets: 'no',
  petsNote: '',
};

describe('buildBookingInput', () => {
  it('carries consent flags and timestamp', () => {
    const { marketingEmail: _omitted, ...rest } = filled;
    const input = buildBookingInput({ ...rest, marketingSms: 'on' }, ctx);
    expect(input.kind).toBe('booking');
    expect(input.consent).toEqual({ terms: true, marketingSms: true, marketingEmail: false, at: ctx.consentAt });
    expect(input.payload.quote.perVisit).toBe(q.perVisit);
    expect(input.payload.selection).toEqual(DEFAULT_SELECTION);
    expect(input.clientRef).toBe('ref-1');
  });

  it('maps the visit, access, pets and contact', () => {
    const input = buildBookingInput(
      {
        ...filled,
        firstName: '  Sam ',
        phone: '+61412345678',
        window: 'afternoon',
        method: 'code',
        detail: ' 4821 ',
        parking: 'Driveway or visitor park',
        notes: 'Gate sticks',
        pets: 'yes',
        petsNote: 'Friendly dog',
      },
      ctx,
    );
    expect(input.contact).toEqual({ firstName: 'Sam', lastName: 'Citizen', phone: '0412 345 678', email: 'sam@example.com' });
    expect(input.suburb).toBe('Chermside');
    expect(input.postcode).toBe('4032');
    expect(input.payload).toMatchObject({
      day: '2026-10-06',
      windowId: 'afternoon',
      access: { method: 'code', detail: '4821', parking: 'Driveway or visitor park', notes: 'Gate sticks' },
      pets: { has: true, note: 'Friendly dog' },
      address: '12 Gympie Road',
    });
  });

  it('drops the key or code detail and pet note when they no longer apply', () => {
    const input = buildBookingInput({ ...filled, method: 'home', detail: '4821', pets: 'no', petsNote: 'Old note' }, ctx);
    expect(input.payload.access.detail).toBe('');
    expect(input.payload.pets).toEqual({ has: false, note: '' });
  });
});

describe('bookingRules', () => {
  it('accepts a complete form', () => {
    expect(validate(filled, bookingRules(areas)).ok).toBe(true);
  });

  it('lists every missing field with its message', () => {
    const { errors } = validate({}, bookingRules(areas));
    expect(errors).toEqual({
      firstName: 'Enter your first name',
      lastName: 'Enter your last name',
      phone: 'Enter a mobile or landline, like 0412 345 678',
      email: 'Enter an email address, like sam@example.com',
      address: 'Enter your street address',
      suburb: 'Enter your suburb',
      postcode: 'Enter a 4-digit postcode',
      terms: 'Agree to the service terms to send your request',
    });
  });

  it('rejects suburbs outside the area', () => {
    const { errors } = validate({ ...filled, suburb: 'Kedron' }, bookingRules(areas));
    expect(errors.suburb).toBe("We don't clean in Kedron yet. Call us and we'll see what we can do.");
  });

  it('accepts suburbs typed the way people type them', () => {
    expect(validate({ ...filled, suburb: ' chermside qld ' }, bookingRules(areas)).errors.suburb).toBeUndefined();
    expect(validate({ ...filled, suburb: 'x' }, bookingRules(areas)).errors.suburb).toBe('Check the spelling of your suburb');
  });

  it('rejects a postcode outside the area', () => {
    const { errors } = validate({ ...filled, suburb: 'Chermside', postcode: '9999' }, bookingRules(areas));
    expect(errors.postcode).toBe('Check the postcode for Chermside');
    expect(firstIncomplete({ ...filled, postcode: '9999' }, areas)).toBe('you');
  });

  it('rejects an area postcode that belongs to a different suburb', () => {
    const { errors } = validate({ ...filled, suburb: ' chermside qld ', postcode: '4034 ' }, bookingRules(areas));
    expect(errors.postcode).toBe('Check the postcode for Chermside');
  });

  it('accepts every suburb that shares a postcode', () => {
    for (const suburb of ['Aspley', 'Carseldine', 'Geebung', 'zillmere']) {
      expect(validate({ ...filled, suburb, postcode: '4034' }, bookingRules(areas)).ok, suburb).toBe(true);
    }
  });

  it('leaves the postcode alone while the suburb itself needs fixing', () => {
    const { errors } = validate({ ...filled, suburb: 'Kedron', postcode: '4031' }, bookingRules(areas));
    expect(errors.suburb).toBe("We don't clean in Kedron yet. Call us and we'll see what we can do.");
    expect(errors.postcode).toBeUndefined();
    expect(validate({ ...filled, suburb: '', postcode: '9999' }, bookingRules(areas)).errors.postcode).toBeUndefined();
  });

  it('asks for the postcode to match when the suburb was typed as a postcode', () => {
    expect(validate({ ...filled, suburb: '4034', postcode: '4032' }, bookingRules(areas)).errors.postcode).toBe(
      'Check the postcode matches your suburb',
    );
  });
});

describe('stepRules', () => {
  it('when needs a day and a window', () => {
    expect(validate({ day: '', window: '' }, stepRules('when')).errors).toEqual({
      day: 'Choose a day',
      window: 'Choose an arrival time',
    });
    expect(validate({ day: '2026-10-06', window: 'morning' }, stepRules('when')).ok).toBe(true);
  });

  it('access detail required for key and code only', () => {
    const rules = stepRules('access');
    expect(validate({ method: '' }, rules).errors.method).toBe("Choose how we'll get in");
    expect(validate({ method: 'home', detail: '' }, rules).ok).toBe(true);
    expect(validate({ method: 'key', detail: '' }, rules).errors.detail).toBe("Tell us where we'll find the key or lockbox");
    expect(validate({ method: 'code', detail: ' ' }, rules).errors.detail).toBe('Enter the door code');
    expect(validate({ method: 'code', detail: '4821' }, rules).ok).toBe(true);
  });

  it('home and check have nothing to validate; you uses the booking rules', () => {
    expect(stepRules('home')).toEqual({});
    expect(stepRules('check')).toEqual({});
    expect(Object.keys(rulesFor('you', areas))).toEqual(Object.keys(bookingRules(areas)));
    expect(Object.keys(rulesFor('when', areas))).toEqual(['day', 'window']);
  });
});

describe('firstIncomplete', () => {
  it('finds the first step with something missing', () => {
    expect(firstIncomplete({}, areas)).toBe('when');
    expect(firstIncomplete({ ...filled, method: '' }, areas)).toBe('access');
    expect(firstIncomplete({ ...filled, email: 'nope' }, areas)).toBe('you');
  });

  it('is null when every step is complete', () => {
    expect(firstIncomplete(filled, areas)).toBeNull();
  });
});
