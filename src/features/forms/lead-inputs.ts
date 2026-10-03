/**
 * Rules and lead mapping for the two simple forms: the suburb waitlist and the
 * job application. Pure: the scripts read the DOM, these decide.
 */
import { formatPhone } from '@/core/format';
import { findArea, type AreaEntry } from '@/core/geo';
import type { LeadInput } from '@/core/leads/types';
import {
  auPhone,
  checked,
  email,
  maxLength,
  normalisePhone,
  oneOf,
  postcode,
  required,
  type Rule,
  type Rules,
} from '@/core/leads/validation';

type Values = Record<string, string>;
interface Ctx {
  clientRef: string;
  consentAt: string;
}

export const AVAILABILITY = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekdays-saturday', label: 'Weekdays and Saturday mornings' },
  { value: 'school-hours', label: 'School hours only' },
  { value: 'part-time', label: 'A few days a week' },
] as const;

const SUBURB_MAX = 60;

const firstName = [required('Enter your first name'), maxLength(40, 'Keep your first name under 40 characters')];
const emailRules = [required('Enter your email address'), email('Enter an email address like name@example.com')];
const suburbRules = [required('Enter your suburb'), maxLength(SUBURB_MAX, 'Keep the suburb under 60 characters')];
const postcodeRules = [postcode('Enter your 4-digit postcode')];

/** The waitlist is for suburbs we don't clean yet; a covered suburb gets pointed to booking. */
const notCovered =
  (areas: readonly AreaEntry[]): Rule =>
  (v) => {
    const match = findArea(v, areas);
    return match.status === 'in' ? `We already clean in ${match.matches[0].suburb}, so you can book a clean now.` : null;
  };

export function waitlistRules(areas: readonly AreaEntry[]): Rules {
  return {
    firstName,
    email: emailRules,
    suburb: [...suburbRules, notCovered(areas)],
    postcode: postcodeRules,
  };
}

/** "  kedron qld " → "Kedron" (the name the owner sees grouped in the console). */
const suburbName = (raw: string) => findArea(raw, []).query || raw.trim();

/** Enquiry forms show no terms or marketing boxes, so nothing is recorded as agreed. */
const noMarketing = (at: string) => ({ terms: false, marketingSms: false, marketingEmail: false, at });

export function waitlistInput(v: Values, ctx: Ctx): LeadInput {
  return {
    kind: 'waitlist',
    contact: { firstName: v.firstName.trim(), lastName: '', phone: '', email: v.email.trim() },
    suburb: suburbName(v.suburb),
    postcode: v.postcode.trim(),
    consent: noMarketing(ctx.consentAt),
    payload: {},
    clientRef: ctx.clientRef,
  };
}

export function applicationRules(): Rules {
  return {
    firstName,
    lastName: [required('Enter your last name'), maxLength(40, 'Keep your last name under 40 characters')],
    phone: [required('Enter a phone number we can call'), auPhone('Enter an Australian phone number, like 0412 345 678')],
    email: emailRules,
    suburb: suburbRules,
    postcode: postcodeRules,
    availability: [oneOf(AVAILABILITY.map((a) => a.value), 'Choose when you can work')],
    experience: [maxLength(1000, 'Keep this under 1,000 characters')],
    requirements: [checked('Tick to confirm you have the right to work, a car and a licence')],
  };
}

export function applicationInput(v: Values, ctx: Ctx): LeadInput {
  const phone = normalisePhone(v.phone);
  return {
    kind: 'application',
    contact: {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: phone ? formatPhone(phone) : v.phone.trim(), // "0412 345 678", the same as a booking
      email: v.email.trim(),
    },
    suburb: suburbName(v.suburb),
    postcode: v.postcode.trim(),
    consent: noMarketing(ctx.consentAt),
    payload: {
      availability: AVAILABILITY.find((a) => a.value === v.availability)?.label ?? v.availability,
      experience: v.experience.trim(),
      rightToWorkCarLicence: v.requirements === 'on',
    },
    clientRef: ctx.clientRef,
  };
}

/** `?suburb=Kedron` (from the suburb check) fills the waitlist; a bare postcode fills the postcode. */
export function prefillFromSearch(search: string): { suburb?: string; postcode?: string } {
  const raw = (new URLSearchParams(search).get('suburb') ?? '').trim().slice(0, SUBURB_MAX);
  if (!raw) return {};
  return /^\d{4}$/.test(raw) ? { postcode: raw } : { suburb: raw };
}
