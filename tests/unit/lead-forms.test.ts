import { describe, expect, it } from 'vitest';
import { validate } from '@/core/leads/validation';
import type { AreaEntry } from '@/core/geo';
import {
  AVAILABILITY,
  applicationInput,
  applicationRules,
  prefillFromSearch,
  waitlistInput,
  waitlistRules,
} from '@/features/forms/lead-inputs';

const areas: AreaEntry[] = [
  { suburb: 'Chermside', postcode: '4032', page: 'chermside' },
  { suburb: 'Aspley', postcode: '4034' },
];
const ctx = { clientRef: 'ref-1', consentAt: '2026-10-03T09:00:00.000Z' };

describe('waitlist', () => {
  const filled = { firstName: 'Sam', email: 'sam@example.com', suburb: 'Kedron', postcode: '4031', website: '' };

  it('asks for every field in plain words', () => {
    const { errors } = validate({}, waitlistRules(areas));
    expect(errors).toEqual({
      firstName: 'Enter your first name',
      email: 'Enter your email address',
      suburb: 'Enter your suburb',
      postcode: 'Enter your 4-digit postcode',
    });
  });

  it('accepts a suburb we do not clean yet', () => {
    expect(validate(filled, waitlistRules(areas)).ok).toBe(true);
  });

  it('turns away a suburb we already clean, by name or postcode', () => {
    expect(validate({ ...filled, suburb: 'chermside' }, waitlistRules(areas)).errors.suburb).toBe(
      'We already clean in Chermside, so you can book a clean now.',
    );
    expect(validate({ ...filled, suburb: '4034' }, waitlistRules(areas)).errors.suburb).toMatch(/We already clean in Aspley/);
  });

  it('rejects a malformed email and postcode', () => {
    const { errors } = validate({ ...filled, email: 'sam@', postcode: '403' }, waitlistRules(areas));
    expect(errors.email).toBe('Enter an email address like name@example.com');
    expect(errors.postcode).toBe('Enter your 4-digit postcode');
  });

  it('maps to a waitlist lead with the suburb tidied and no marketing consent', () => {
    const input = waitlistInput({ ...filled, firstName: ' Sam ', suburb: ' kedron qld ', email: ' sam@example.com ' }, ctx);
    expect(input).toEqual({
      kind: 'waitlist',
      contact: { firstName: 'Sam', lastName: '', phone: '', email: 'sam@example.com' },
      suburb: 'Kedron',
      postcode: '4031',
      consent: { terms: false, marketingSms: false, marketingEmail: false, at: ctx.consentAt },
      payload: {},
      clientRef: 'ref-1',
    });
  });
});

describe('job application', () => {
  const filled = {
    firstName: 'Ana',
    lastName: 'Silva',
    phone: '0412 345 678',
    email: 'ana@example.com',
    suburb: 'Zillmere',
    postcode: '4034',
    availability: AVAILABILITY[0].value,
    experience: 'Two years with a hotel housekeeping team.',
    requirements: 'on',
    website: '',
  };

  it('lists every missing field, first name first', () => {
    const { errors } = validate({}, applicationRules());
    expect(Object.keys(errors)[0]).toBe('firstName');
    expect(errors).toMatchObject({
      firstName: 'Enter your first name',
      lastName: 'Enter your last name',
      phone: 'Enter a phone number we can call',
      email: 'Enter your email address',
      suburb: 'Enter your suburb',
      postcode: 'Enter your 4-digit postcode',
      availability: 'Choose when you can work',
      requirements: 'Tick to confirm you have the right to work, a car and a licence',
    });
    expect(errors.experience).toBeUndefined();
  });

  it('accepts a complete application', () => {
    expect(validate(filled, applicationRules()).ok).toBe(true);
  });

  it('rejects a phone number that is not Australian and an unknown availability', () => {
    const { errors } = validate({ ...filled, phone: '12345', availability: 'nights' }, applicationRules());
    expect(errors.phone).toBe('Enter an Australian phone number, like 0412 345 678');
    expect(errors.availability).toBe('Choose when you can work');
  });

  it('keeps experience notes to a sensible length', () => {
    expect(validate({ ...filled, experience: 'x'.repeat(1001) }, applicationRules()).errors.experience).toBe(
      'Keep this under 1,000 characters',
    );
  });

  it('maps to an application lead with the phone formatted like a booking and the work details', () => {
    const input = applicationInput({ ...filled, phone: '0412345678' }, ctx);
    expect(input).toEqual({
      kind: 'application',
      contact: { firstName: 'Ana', lastName: 'Silva', phone: '0412 345 678', email: 'ana@example.com' },
      suburb: 'Zillmere',
      postcode: '4034',
      consent: { terms: false, marketingSms: false, marketingEmail: false, at: ctx.consentAt },
      payload: {
        availability: AVAILABILITY[0].label,
        experience: 'Two years with a hotel housekeeping team.',
        rightToWorkCarLicence: true,
      },
      clientRef: 'ref-1',
    });
  });

  it('formats an international or landline number, and keeps one it cannot read as typed, trimmed', () => {
    expect(applicationInput({ ...filled, phone: '+61 412 345 678' }, ctx).contact.phone).toBe('0412 345 678');
    expect(applicationInput({ ...filled, phone: '(07) 5550 1234' }, ctx).contact.phone).toBe('07 5550 1234');
    expect(applicationInput({ ...filled, phone: ' 12345 ' }, ctx).contact.phone).toBe('12345');
  });
});

describe('prefillFromSearch', () => {
  it('reads a suburb name from the link', () => {
    expect(prefillFromSearch('?suburb=Kedron')).toEqual({ suburb: 'Kedron' });
    expect(prefillFromSearch('?suburb=Mount%20Gravatt')).toEqual({ suburb: 'Mount Gravatt' });
  });

  it('puts a postcode in the postcode field', () => {
    expect(prefillFromSearch('?suburb=4031')).toEqual({ postcode: '4031' });
  });

  it('ignores missing, empty and oversized values', () => {
    expect(prefillFromSearch('')).toEqual({});
    expect(prefillFromSearch('?suburb=%20%20')).toEqual({});
    expect(prefillFromSearch(`?suburb=${'a'.repeat(200)}`).suburb).toHaveLength(60);
  });
});
