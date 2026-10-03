/**
 * The seam between the booking form (features/booking) and the owner console
 * (pages/console): whatever /book/ stores, the console must read back as is.
 */
import { describe, expect, it } from 'vitest';
import { buildBookingInput } from '@/features/booking/lead';
import { readBooking } from '@/pages/console/_booking';
import { pricing } from '@/config/pricing';
import { quote } from '@/domain/quote';
import type { Lead } from '@/core/leads/types';
import type { Selection } from '@/domain/selection';

const selection: Selection = { service: 'deep', bedrooms: 4, bathrooms: 2, study: true, laundry: false, frequency: 'once', addOns: ['oven'] };
const form: Record<string, string> = {
  firstName: 'Sam',
  lastName: 'Citizen',
  phone: '0412345678',
  email: 'sam@example.com',
  address: '12 Gympie Road',
  suburb: 'Chermside',
  postcode: '4032',
  terms: 'on',
  day: '2026-10-08',
  window: 'afternoon',
  method: 'code',
  detail: '4821',
  parking: 'Visitor bay 3',
  notes: 'Side gate sticks',
  pets: 'yes',
  petsNote: 'Friendly cat',
};

function asLead(input: ReturnType<typeof buildBookingInput>): Lead {
  return { ...input, id: 'BK-1', status: 'new', createdAt: '2026-10-03T00:00:00Z', history: [] };
}

describe('booking form to console', () => {
  it('the console reads back every field the booking form stores', () => {
    const input = buildBookingInput(form, { selection, quote: quote(selection, pricing), consentAt: '2026-10-03T00:00:00Z', clientRef: 'r' });
    const stored = JSON.parse(JSON.stringify(asLead(input))) as Lead;
    expect(readBooking(stored)).toEqual(input.payload);
  });
});
