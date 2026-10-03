import { describe, expect, it } from 'vitest';
import { validate } from '@/core/leads/validation';
import { FLOOR_AREAS, FREQUENCIES, buildWalkthroughInput, walkthroughRules } from '@/features/walkthrough/walkthrough';

const filled = {
  company: ' Northside Dental ',
  firstName: ' Priya ',
  lastName: 'Shah',
  phone: '0491 570 110',
  email: 'priya@example.com',
  siteAddress: '12 Gympie Road, Level 2',
  suburb: 'Chermside',
  postcode: '4032',
  floorArea: '200–500 m²',
  frequency: FREQUENCIES[0],
  preferredTimes: 'Tuesday after 5pm',
  website: '',
};

const ctx = { clientRef: 'ref-1', consentAt: '2026-10-03T09:00:00.000Z' };

describe('walkthroughRules', () => {
  it('accepts a complete request', () => {
    expect(validate(filled, walkthroughRules())).toEqual({ ok: true, errors: {} });
  });

  it('asks for every required field in plain words', () => {
    const { errors } = validate({}, walkthroughRules());
    expect(errors).toEqual({
      company: 'Enter your company name',
      firstName: 'Enter your first name',
      lastName: 'Enter your last name',
      phone: 'Enter a mobile or landline, like 0412 345 678',
      email: 'Enter an email address, like sam@example.com',
      siteAddress: "Enter the site's street address",
      suburb: "Enter the site's suburb",
      postcode: 'Enter a 4-digit postcode',
      floorArea: 'Choose the approximate floor area',
      frequency: 'Choose how often you need cleaning',
    });
  });

  it('leaves preferred visit times optional', () => {
    const { errors } = validate({ ...filled, preferredTimes: '' }, walkthroughRules());
    expect(errors.preferredTimes).toBeUndefined();
  });

  it('only accepts one of the floor area options', () => {
    expect(FLOOR_AREAS).toEqual(['Under 200 m²', '200–500 m²', '500–1,000 m²', 'Over 1,000 m²']);
    for (const floorArea of FLOOR_AREAS) expect(validate({ ...filled, floorArea }, walkthroughRules()).ok).toBe(true);
    expect(validate({ ...filled, floorArea: '350 m²' }, walkthroughRules()).errors.floorArea).toBe('Choose the approximate floor area');
  });

  it('only accepts one of the frequency options', () => {
    expect(validate({ ...filled, frequency: 'Hourly' }, walkthroughRules()).errors.frequency).toBe('Choose how often you need cleaning');
  });
});

describe('buildWalkthroughInput', () => {
  it('carries the site details in the payload', () => {
    const input = buildWalkthroughInput(filled, ctx);
    expect(input.kind).toBe('walkthrough');
    expect(input.payload).toEqual({
      company: 'Northside Dental',
      siteAddress: '12 Gympie Road, Level 2',
      floorArea: '200–500 m²',
      frequency: FREQUENCIES[0],
      preferredTimes: 'Tuesday after 5pm',
    });
  });

  it('maps the contact, suburb and postcode, trimmed', () => {
    const input = buildWalkthroughInput(filled, ctx);
    expect(input.contact).toEqual({ firstName: 'Priya', lastName: 'Shah', phone: '0491 570 110', email: 'priya@example.com' });
    expect(input.suburb).toBe('Chermside');
    expect(input.postcode).toBe('4032');
  });

  it('stores the phone in the same spaced form as a booking', () => {
    expect(buildWalkthroughInput({ ...filled, phone: '+61 7 5550 1234' }, ctx).contact.phone).toBe('07 5550 1234');
    expect(buildWalkthroughInput({ ...filled, phone: '0491570110' }, ctx).contact.phone).toBe('0491 570 110');
  });

  it('keeps a phone it cannot read as typed, trimmed', () => {
    expect(buildWalkthroughInput({ ...filled, phone: ' +44 20 7946 0000 ' }, ctx).contact.phone).toBe('+44 20 7946 0000');
  });

  it('records the enquiry without any marketing consent', () => {
    const input = buildWalkthroughInput(filled, ctx);
    expect(input.consent).toEqual({ terms: false, marketingSms: false, marketingEmail: false, at: ctx.consentAt });
    expect(input.clientRef).toBe('ref-1');
  });
});
