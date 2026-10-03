/** Demo-only console settings. Production replaces the sign-in with real accounts. */
import type { LeadKind } from '@/core/leads/types';

export const DEMO_LOGIN = { email: 'owner@demo.clearday', password: 'demo1234' };

export const SESSION_KEY = 'clearday:v1:console-session';
/** Set once sample leads have been loaded in this browser, so clearing them sticks. */
export const SEEDED_KEY = 'clearday:v1:seeded';
/** Ids of leads the owner has opened (the inbox's unread marker). */
export const OPENED_KEY = 'clearday:v1:console-opened';

export const SAMPLE_ID_PREFIX = 'S-';

export const KIND_TABS: { id: LeadKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'booking', label: 'Bookings' },
  { id: 'walkthrough', label: 'Walk-throughs' },
  { id: 'application', label: 'Job applications' },
  { id: 'waitlist', label: 'Waitlist' },
];
