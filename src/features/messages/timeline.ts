/**
 * Draws schedule() output as a timeline: one row per message with its channel,
 * when it sends, the exact text, and why it wouldn't send. In demo mode every
 * row says it is a preview. Text goes in with textContent only.
 */
import { el } from '@/core/console/dom';
import { formatDateTime } from '@/core/format';
import type { ScheduledMessage } from './schedule';

export const SKIP_REASONS: Record<NonNullable<ScheduledMessage['skippedReason']>, string> = {
  'no-consent': 'No marketing consent',
  'not-confirmed': 'Waits for confirmation',
  'status-changed': "Stopped: you've already replied",
};

export const CHANNEL_LABELS: Record<ScheduledMessage['channel'], string> = { sms: 'SMS', email: 'Email' };

export interface TimelineOptions {
  demoMode: boolean;
  timeZone: string;
}

function row(m: ScheduledMessage, opts: TimelineOptions): HTMLLIElement {
  const reason = m.skippedReason ? SKIP_REASONS[m.skippedReason] : null;
  // With no send time, "Waits for confirmation" stands in the time slot and is the reason too.
  const waiting = !m.sendAt && m.skippedReason === 'not-confirmed';
  const when = m.sendAt
    ? el('time', { class: 'timeline__when', 'data-send-at': '', datetime: m.sendAt }, formatDateTime(m.sendAt, opts.timeZone))
    : el('span', { class: 'timeline__when', 'data-send-at': '', 'data-skip-reason': waiting }, 'Waits for confirmation');
  const note = reason && !waiting ? el('span', { class: 'timeline__reason', 'data-skip-reason': '' }, reason) : null;

  return el(
    'li',
    { class: 'timeline__row', 'data-message': m.templateId, 'data-channel': m.channel, 'data-skipped': Boolean(m.skippedReason) },
    el(
      'p',
      { class: 'timeline__head' },
      el('span', { class: 'timeline__channel', 'data-channel-label': '' }, CHANNEL_LABELS[m.channel]),
      el('span', { class: 'timeline__label' }, m.label),
      when,
    ),
    el('p', { class: 'timeline__text', 'data-message-text': '' }, m.text),
    (note || opts.demoMode) &&
      el('p', { class: 'timeline__notes' }, note, opts.demoMode && el('span', { class: 'timeline__preview', 'data-preview-label': '' }, 'Preview, not sent')),
  );
}

export function renderTimeline(container: HTMLElement, items: readonly ScheduledMessage[], opts: TimelineOptions): void {
  if (!items.length) {
    container.replaceChildren(el('p', { class: 'timeline__empty' }, 'No messages for this request.'));
    return;
  }
  container.replaceChildren(el('ol', { class: 'timeline', role: 'list' }, items.map((m) => row(m, opts))));
}
