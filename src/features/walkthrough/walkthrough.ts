/**
 * Walk-through request for facility and property managers (/offices).
 * Pure parts: the field rules and the lead the form creates. Wiring: binds
 * every [data-walkthrough-form] with the shared core/forms behaviour.
 */
import { bindSimpleForm } from '@/core/forms';
import { formatPhone } from '@/core/format';
import { getLeadRepository, type LeadInput } from '@/core/leads';
import { auPhone, email, minLength, normalisePhone, oneOf, postcode, required, type Rules } from '@/core/leads/validation';
import { business } from '@/config/business';

export const FLOOR_AREAS = ['Under 200 m²', '200–500 m²', '500–1,000 m²', 'Over 1,000 m²'] as const;
export const FREQUENCIES = ['Every weekday', '2 or 3 times a week', 'Weekly', 'Fortnightly', 'Not sure yet'] as const;

export const WALKTHROUGH_SUCCESS = "Walk-through requested. We'll call you within 1 business day to book a time.";

export type WalkthroughPayload = {
  company: string;
  siteAddress: string;
  floorArea: string;
  frequency: string;
  preferredTimes: string;
};

/** In form order, so the error summary reads top to bottom. */
export function walkthroughRules(): Rules {
  return {
    company: [required('Enter your company name')],
    firstName: [required('Enter your first name')],
    lastName: [required('Enter your last name')],
    phone: [auPhone('Enter a mobile or landline, like 0412 345 678')],
    email: [email('Enter an email address, like sam@example.com')],
    siteAddress: [minLength(5, "Enter the site's street address")],
    suburb: [required("Enter the site's suburb")],
    postcode: [postcode('Enter a 4-digit postcode')],
    floorArea: [oneOf(FLOOR_AREAS, 'Choose the approximate floor area')],
    frequency: [oneOf(FREQUENCIES, 'Choose how often you need cleaning')],
  };
}

/** A walk-through is a reply to an enquiry: no marketing consent is asked for or assumed. */
export function buildWalkthroughInput(
  values: Record<string, string>,
  ctx: { clientRef: string; consentAt: string },
): LeadInput<WalkthroughPayload> {
  const v = (name: string) => (values[name] ?? '').trim();
  const phone = normalisePhone(v('phone'));
  return {
    kind: 'walkthrough',
    contact: {
      firstName: v('firstName'),
      lastName: v('lastName'),
      phone: phone ? formatPhone(phone) : v('phone'), // "0412 345 678", the same as a booking
      email: v('email'),
    },
    suburb: v('suburb'),
    postcode: v('postcode'),
    consent: { terms: false, marketingSms: false, marketingEmail: false, at: ctx.consentAt }, // an enquiry: no terms or marketing shown
    payload: {
      company: v('company'),
      siteAddress: v('siteAddress'),
      floorArea: v('floorArea'),
      frequency: v('frequency'),
      preferredTimes: v('preferredTimes'),
    },
    clientRef: ctx.clientRef,
  };
}

export function initWalkthroughForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-walkthrough-form]').forEach((form) => {
    bindSimpleForm(form, {
      rules: walkthroughRules(),
      toInput: buildWalkthroughInput,
      repo: getLeadRepository(),
      success: WALKTHROUGH_SUCCESS,
      fallbackPhone: business.phone,
    });
  });
}
