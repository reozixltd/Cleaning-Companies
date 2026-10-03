/**
 * The message timeline for one lead: which templates fire, when, with what
 * text, and why any of them wouldn't send. Pure; visit details come in through
 * the context, so this module needs nothing from the booking feature.
 */
import { zonedIso } from '@/core/format';
import type { Lead } from '@/core/leads/types';
import type { MessageTemplate } from '@/config/messages';
import { render } from './render';

export interface ScheduledMessage {
  templateId: MessageTemplate['id'];
  label: string;
  channel: 'sms' | 'email';
  /** Local ISO time it sends, or null when it can't be known yet. */
  sendAt: string | null;
  text: string;
  skippedReason?: 'no-consent' | 'not-confirmed' | 'status-changed';
}

export interface ScheduleContext {
  now: string;
  timeZone: string;
  businessName: string;
  reviewLink: string;
  optOut: { sms: string; email: string };
  visit?: { startIso: string; windowLabel: string; dayLabel: string; priceLabel: string; oneOff: boolean };
}

const HOUR_MS = 3_600_000;

function confirmedAt(lead: Lead): string | null {
  const events = lead.history.filter((h) => h.type === 'status' && h.value === 'confirmed');
  return events.at(-1)?.at ?? null;
}

function baseTime(t: MessageTemplate, lead: Lead, ctx: ScheduleContext): string | null {
  if (t.trigger.on === 'created') return lead.createdAt;
  if (t.trigger.on === 'visit') return ctx.visit?.startIso ?? null;
  return confirmedAt(lead);
}

export function schedule(lead: Lead, templates: readonly MessageTemplate[], ctx: ScheduleContext): ScheduledMessage[] {
  if (lead.status === 'declined') return [];
  const out: ScheduledMessage[] = [];

  for (const t of templates) {
    if (t.appliesTo !== lead.kind) continue;
    if (t.trigger.on === 'visit' && !ctx.visit) continue;
    if (t.condition === 'one-off' && !ctx.visit?.oneOff) continue;

    const text = render(t.body, {
      firstName: lead.contact.firstName,
      date: ctx.visit?.dayLabel ?? '',
      window: ctx.visit?.windowLabel ?? '',
      price: ctx.visit?.priceLabel ?? '',
      businessName: ctx.businessName,
      reviewLink: ctx.reviewLink,
      optOut: ctx.optOut[t.channel],
    });
    const message: ScheduledMessage = { templateId: t.id, label: t.label, channel: t.channel, sendAt: null, text };

    const waitsForConfirmation = lead.kind === 'booking' && lead.status === 'new';
    const base = waitsForConfirmation ? null : baseTime(t, lead, ctx);
    if (base) message.sendAt = zonedIso(new Date(Date.parse(base) + t.trigger.offsetHours * HOUR_MS), ctx.timeZone);

    if (waitsForConfirmation || !base) message.skippedReason = 'not-confirmed';
    else if (t.trigger.on === 'created' && lead.status !== 'new') message.skippedReason = 'status-changed';
    else if (t.marketing && !(t.channel === 'sms' ? lead.consent.marketingSms : lead.consent.marketingEmail)) {
      message.skippedReason = 'no-consent';
    }
    out.push(message);
  }

  return out.sort((a, b) => (a.sendAt ? Date.parse(a.sendAt) : Infinity) - (b.sendAt ? Date.parse(b.sendAt) : Infinity));
}
