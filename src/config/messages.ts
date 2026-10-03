/**
 * Messages each lead triggers, previewed in the owner console.
 * {variables} are filled by src/features/messages/render.ts. Every SMS ends with
 * the business name; marketing messages need consent and must include {optOut} (Spam Act).
 */
import type { LeadKind } from '@/core/leads/types';

export const MESSAGE_VARIABLES = ['firstName', 'date', 'window', 'price', 'businessName', 'reviewLink', 'optOut'] as const;

export interface MessageTemplate {
  id: 'confirmation' | 'reminder' | 'on-the-way' | 'review-request' | 'rebook-offer' | 'walkthrough-day-2' | 'walkthrough-day-5';
  label: string;
  channel: 'sms' | 'email';
  /** True = only sent when the person ticked the matching marketing box. */
  marketing: boolean;
  appliesTo: LeadKind;
  /** When it fires: hours after confirmation, the visit start, or the request. */
  trigger: { on: 'confirmed' | 'visit' | 'created'; offsetHours: number };
  /** 'one-off' = only for single-visit bookings. */
  condition?: 'one-off';
  body: string;
}

export const messages: MessageTemplate[] = [
  {
    id: 'confirmation',
    label: 'Booking confirmed',
    channel: 'sms',
    marketing: false,
    appliesTo: 'booking',
    trigger: { on: 'confirmed', offsetHours: 0 },
    body: 'Hi {firstName}, your clean is confirmed for {date}, arriving {window}. {price} a visit. Reply to this text with any access notes. {businessName}',
  },
  {
    id: 'reminder',
    label: 'Reminder the day before',
    channel: 'sms',
    marketing: false,
    appliesTo: 'booking',
    trigger: { on: 'visit', offsetHours: -24 },
    body: "Hi {firstName}, a reminder that we're cleaning tomorrow, arriving {window}. Need to change it? Call us. {businessName}",
  },
  {
    id: 'on-the-way',
    label: 'On the way',
    channel: 'sms',
    marketing: false,
    appliesTo: 'booking',
    trigger: { on: 'visit', offsetHours: 0 },
    body: 'Hi {firstName}, your cleaner is on the way and will arrive {window}. {businessName}',
  },
  {
    id: 'review-request',
    label: 'Review request',
    channel: 'sms',
    marketing: false,
    appliesTo: 'booking',
    trigger: { on: 'visit', offsetHours: 6 },
    body: 'Thanks for having us, {firstName}. How did we go? A quick review helps a lot: {reviewLink} {businessName}',
  },
  {
    id: 'rebook-offer',
    label: 'Rebook offer',
    channel: 'email',
    marketing: true,
    appliesTo: 'booking',
    trigger: { on: 'visit', offsetHours: 504 },
    condition: 'one-off',
    body: "Hi {firstName}, it's been three weeks since your clean. Book a regular clean and save up to 15%. {optOut}",
  },
  {
    id: 'walkthrough-day-2',
    label: 'Walk-through follow-up',
    channel: 'email',
    marketing: false,
    appliesTo: 'walkthrough',
    trigger: { on: 'created', offsetHours: 48 },
    body: "Hi {firstName}, following up on your walk-through request. Reply with two times that suit and we'll lock one in. {businessName}",
  },
  {
    id: 'walkthrough-day-5',
    label: 'Second walk-through follow-up',
    channel: 'email',
    marketing: false,
    appliesTo: 'walkthrough',
    trigger: { on: 'created', offsetHours: 120 },
    body: "Hi {firstName}, we'd still like to see the site and price it properly. Reply or call us when it suits. {businessName}",
  },
];

/** Opt-out lines appended through {optOut}. */
export const OPT_OUT = {
  sms: 'Reply STOP to opt out.',
  email: 'Unsubscribe: reply with "unsubscribe" and we\'ll stop within 5 business days.',
};
