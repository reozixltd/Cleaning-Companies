/**
 * Prices (AUD, GST included). Draft demo values pending approval (spec D10).
 * How a price adds up lives in src/domain/quote.ts; this file holds only the numbers.
 */
export const SERVICE_IDS = ['regular', 'deep', 'end-of-lease', 'move-in'] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const FREQUENCIES = ['once', 'weekly', 'fortnightly', 'monthly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const ADD_ON_IDS = ['oven', 'fridge', 'interior-windows', 'balcony', 'blinds'] as const;
export type AddOnId = (typeof ADD_ON_IDS)[number];

export interface PricingConfig {
  /** Regular clean of 1 bedroom, 1 bathroom, living and kitchen. */
  base: number;
  perExtraBedroom: number;
  perExtraBathroom: number;
  study: number;
  laundry: number;
  multiplier: Record<ServiceId, number>;
  /** Fraction off the rooms price for recurring visits. */
  discount: Record<Frequency, number>;
  /** Services that are always a single visit. */
  oneOffOnly: ServiceId[];
  /** Price the first visit of a recurring plan as a deep clean. */
  firstVisitAsDeep: boolean;
  addOns: Record<AddOnId, { label: string; price: number }>;
}

export const pricing: PricingConfig = {
  base: 129,
  perExtraBedroom: 20,
  perExtraBathroom: 30,
  study: 12,
  laundry: 10,
  multiplier: { regular: 1, deep: 1.6, 'move-in': 1.8, 'end-of-lease': 2.2 },
  discount: { once: 0, weekly: 0.15, fortnightly: 0.1, monthly: 0.05 },
  oneOffOnly: ['end-of-lease', 'move-in'],
  firstVisitAsDeep: true,
  addOns: {
    oven: { label: 'Inside the oven', price: 65 },
    fridge: { label: 'Inside the fridge', price: 35 },
    'interior-windows': { label: 'Inside windows and tracks', price: 55 },
    balcony: { label: 'Balcony or patio', price: 30 },
    blinds: { label: 'Blinds', price: 45 },
  },
};

export const SERVICE_LABELS: Record<ServiceId, string> = {
  regular: 'Regular clean',
  deep: 'Deep clean',
  'end-of-lease': 'End of lease clean',
  'move-in': 'Move-in clean',
};

/** Shown in summaries: "3 bed, 2 bath, fortnightly". */
export const SERVICE_SHORT: Record<ServiceId, string> = {
  regular: 'regular',
  deep: 'deep clean',
  'end-of-lease': 'end of lease',
  'move-in': 'move-in',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: 'Just once',
  weekly: 'Every week',
  fortnightly: 'Every fortnight',
  monthly: 'Every month',
};

export const FREQUENCY_SHORT: Record<Frequency, string> = {
  once: 'one-off',
  weekly: 'weekly',
  fortnightly: 'fortnightly',
  monthly: 'monthly',
};
