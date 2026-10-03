/**
 * Business facts: the main file to edit per client. Every fact shown on the
 * site (name, ABN, phones, hours, areas, insurance, guarantee) comes from here,
 * so the header, footer, trust row, schema and forms can never disagree.
 *
 * Demo values: phone numbers use ACMA's fictional ranges, the ABN is fake,
 * and the rating is a sample (shown labelled, never in JSON-LD while demoMode is on).
 */
import type { AreaEntry } from '@/core/geo';

export type ThemeName = 'floorplan' | 'eucalyptus';

export interface OpeningHours {
  label: string;
  /** schema.org day codes. */
  days: string[];
  opens: string;
  closes: string;
}

export const business = {
  /** Shows the sample-business ribbon and labels sample data. Set false for a real client. */
  demoMode: true as boolean,
  theme: 'floorplan' as ThemeName,
  themes: ['floorplan', 'eucalyptus'] as ThemeName[],

  tradingName: 'Clearday Home Cleaning',
  shortName: 'Clearday',
  legalName: 'Clearday Cleaning Services Pty Ltd',
  abn: '00 000 000 000',
  founded: 2016,
  phone: '07 5550 1234',
  mobile: '0491 570 110',
  email: 'hello@clearday.example',
  schemaType: 'HouseCleaning',
  region: 'Brisbane north',
  state: 'QLD',
  timeZone: 'Australia/Brisbane',

  hours: [
    { label: 'Monday to Friday', days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], opens: '07:00', closes: '17:00' },
    { label: 'Saturday', days: ['Sa'], opens: '08:00', closes: '12:00' },
  ] satisfies OpeningHours[],

  insurance: { short: '$20M public liability', long: 'Public liability insurance of $20 million' },
  /** Only true with an active fidelity bond: the word "bonded" appears nowhere unless this is true. */
  bonded: false as boolean,
  policeChecked: 'Every cleaner holds a current national police check',
  guarantee: {
    short: '24-hour re-clean promise',
    long: "If we missed something, tell us within 24 hours and we'll come back and re-clean it free.",
  },
  rating: { value: 4.9, count: 212, source: 'Google' },
  confirmPromise: 'within 2 business hours',
  reviewLink: 'https://g.page/r/clearday-demo/review',

  /** Where the team is based: the coverage map's home marker. */
  base: { suburb: 'Aspley', lat: -27.366, lng: 153.017 },

  /** Suburbs served. `page` links a suburb to its page in src/content/areas. Coordinates are approximate. */
  areas: [
    { suburb: 'Chermside', postcode: '4032', page: 'chermside', lat: -27.385, lng: 153.03 },
    { suburb: 'Aspley', postcode: '4034', page: 'aspley', lat: -27.366, lng: 153.017 },
    { suburb: 'Carseldine', postcode: '4034', lat: -27.348, lng: 153.019 },
    { suburb: 'Geebung', postcode: '4034', lat: -27.372, lng: 153.047 },
    { suburb: 'Zillmere', postcode: '4034', lat: -27.36, lng: 153.04 },
    { suburb: 'Bridgeman Downs', postcode: '4035', lat: -27.355, lng: 152.99 },
    { suburb: 'Albany Creek', postcode: '4035', page: 'albany-creek', lat: -27.35, lng: 152.968 },
    { suburb: 'Everton Park', postcode: '4053', page: 'everton-park', lat: -27.403, lng: 152.988 },
    { suburb: 'Stafford', postcode: '4053', lat: -27.41, lng: 153.01 },
    { suburb: 'McDowall', postcode: '4053', lat: -27.382, lng: 152.99 },
    { suburb: 'Bald Hills', postcode: '4036', lat: -27.32, lng: 153.01 },
    { suburb: 'Strathpine', postcode: '4500', lat: -27.304, lng: 152.99 },
  ] satisfies AreaEntry[],
};

export type Business = typeof business;
