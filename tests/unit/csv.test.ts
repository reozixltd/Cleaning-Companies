import { describe, expect, it } from 'vitest';
import { leadsToCsv } from '@/core/leads/csv';
import type { Lead } from '@/core/leads/types';

const lead: Lead = {
  id: 'L-1',
  kind: 'booking',
  status: 'confirmed',
  createdAt: '2026-10-03T00:00:00.000Z',
  contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570110', email: 'sam@example.com' },
  suburb: 'Chermside',
  postcode: '4032',
  consent: { terms: true, marketingSms: true, marketingEmail: false, at: '2026-10-03T00:00:00.000Z' },
  payload: {},
  clientRef: 'r',
  history: [{ at: '2026-10-03T01:00:00.000Z', type: 'note', value: 'Line one, with comma\nLine two' }],
};

describe('leadsToCsv', () => {
  it('writes a header and one quoted row per lead', () => {
    const [header, row] = leadsToCsv([lead]).split('\r\n');
    expect(header).toBe('"ID","Received","Kind","Status","First name","Last name","Phone","Email","Suburb","Postcode","Marketing SMS","Marketing email","Notes"');
    expect(row).toContain('"Booking","Confirmed","Sam","Lee"');
    expect(row).toContain('"Yes","No"');
  });

  it('keeps commas and newlines inside quotes', () => {
    expect(leadsToCsv([lead])).toContain('"Line one, with comma\nLine two"');
  });

  it('neutralises spreadsheet formulas', () => {
    const csv = leadsToCsv([{ ...lead, contact: { ...lead.contact, firstName: '=HYPERLINK("x")' } }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('accepts custom columns', () => {
    expect(leadsToCsv([lead], [{ header: 'Kind', value: (l) => l.kind }])).toBe('"Kind"\r\n"booking"');
  });
});
