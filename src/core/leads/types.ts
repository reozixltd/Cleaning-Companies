/** Lead domain types shared by every form, the repository and the console. Industry-neutral. */

export const LEAD_KINDS = ['booking', 'walkthrough', 'application', 'waitlist'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const KIND_LABELS: Record<LeadKind, string> = {
  booking: 'Booking',
  walkthrough: 'Walk-through',
  application: 'Job application',
  waitlist: 'Waitlist',
};

export const LEAD_STATUSES = ['new', 'confirmed', 'declined', 'done'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  declined: 'Declined',
  done: 'Done',
};

export interface Contact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface Consent {
  terms: boolean;
  marketingSms: boolean;
  marketingEmail: boolean;
  /** When the visitor gave (or declined) consent. */
  at: string;
}

export interface LeadInput<P = Record<string, unknown>> {
  kind: LeadKind;
  contact: Contact;
  suburb: string;
  postcode: string;
  consent: Consent;
  payload: P;
  /** One per form load, so a double submit stores one lead. */
  clientRef: string;
}

export interface LeadEvent {
  at: string;
  type: 'status' | 'note';
  value: string;
}

export interface Lead<P = Record<string, unknown>> extends LeadInput<P> {
  id: string;
  status: LeadStatus;
  createdAt: string;
  history: LeadEvent[];
}
