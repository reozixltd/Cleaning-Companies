/**
 * The selected request: who, what, consent, the owner's actions, the messages
 * it triggers, and notes. Rebuilt from the lead on every change.
 */
import { business } from '@/config/business';
import { el, fromTemplate } from '@/core/console/dom';
import { formatDateTime, formatPhone, formatPhoneHref } from '@/core/format';
import { KIND_LABELS, STATUS_LABELS, type Lead, type LeadStatus } from '@/core/leads/types';
import { renderTimeline } from '@/features/messages/timeline';
import { messagesFor } from './_booking';
import { actionsFor, consentLines, summaryFor } from './_facts';

export interface DetailHandlers {
  onStatus: (id: string, status: LeadStatus) => void;
  onNote: (id: string, note: string) => void;
  onBack: () => void;
}

export function statusBadge(status: LeadStatus): HTMLElement {
  const badge = fromTemplate(`badge-${status}`, STATUS_LABELS[status] ?? status);
  badge.dataset.statusBadge = status;
  return badge;
}

const section = (title: string, ...body: (Node | false | null)[]) =>
  el('section', { class: 'detail__section' }, el('h3', { class: 'detail__h' }, title), ...body);

function history(lead: Lead): HTMLOListElement {
  const item = (at: string, text: string, kind: string) =>
    el('li', { class: `history__item history__item--${kind}` }, el('time', { datetime: at }, formatDateTime(at, business.timeZone)), el('span', {}, text));
  return el(
    'ol',
    { class: 'history', role: 'list' },
    item(lead.createdAt, `${KIND_LABELS[lead.kind]} request received`, 'status'),
    lead.history.map((h) =>
      item(h.at, h.type === 'status' ? `Marked ${(STATUS_LABELS[h.value as LeadStatus] ?? h.value).toLowerCase()}` : h.value, h.type),
    ),
  );
}

function noteForm(lead: Lead, handlers: DetailHandlers): HTMLFormElement {
  const id = `note-${lead.id}`;
  const input = el('input', { id, name: 'note', type: 'text', maxlength: 500, autocomplete: 'off', class: 'note__input' });
  const button = fromTemplate<HTMLButtonElement>('btn-secondary', 'Add note');
  button.type = 'submit';
  const form = el('form', { class: 'note' }, el('label', { for: id, class: 'note__label' }, 'Add a note'), el('div', { class: 'note__row' }, input, button));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (value) handlers.onNote(lead.id, value);
  });
  return form;
}

function actions(lead: Lead, handlers: DetailHandlers): HTMLElement | null {
  const list = actionsFor(lead.status);
  if (!list.length) return null;
  return el(
    'div',
    { class: 'detail__actions', role: 'group', 'aria-label': 'Update this request' },
    list.map((a) => {
      const button = fromTemplate<HTMLButtonElement>(`btn-${a.tone}`, a.label);
      button.dataset.action = a.status;
      button.addEventListener('click', () => handlers.onStatus(lead.id, a.status));
      return button;
    }),
  );
}

export function renderDetail(panel: HTMLElement, lead: Lead, handlers: DetailHandlers, now: Date = new Date()): void {
  const name = `${lead.contact.firstName} ${lead.contact.lastName}`.trim() || 'No name given';
  const back = fromTemplate<HTMLButtonElement>('btn-quiet', 'Back to the list');
  back.classList.add('detail__back');
  back.addEventListener('click', handlers.onBack);

  const timeline = el('div', { 'data-timeline': '' });
  const scheduled = messagesFor(lead, now);
  const sendsMessages = lead.kind === 'booking' || lead.kind === 'walkthrough';
  if (scheduled.length) renderTimeline(timeline, scheduled, { demoMode: business.demoMode, timeZone: business.timeZone });
  else timeline.append(el('p', { class: 'muted' }, lead.status === 'declined' ? 'Declined, so no messages go out.' : 'No messages for this request.'));

  const parts: (Node | null | false)[] = [
    back,
    el(
      'header',
      { class: 'detail__head' },
      el('h2', { class: 'detail__name', tabindex: '-1', 'data-detail-name': '' }, name),
      statusBadge(lead.status),
      el('p', { class: 'detail__ref' }, `${KIND_LABELS[lead.kind]} from ${[lead.suburb, lead.postcode].filter(Boolean).join(' ')}, received ${formatDateTime(lead.createdAt, business.timeZone)}`),
    ),
    el(
      'p',
      { class: 'detail__contact' },
      lead.contact.phone && el('a', { href: formatPhoneHref(lead.contact.phone) }, formatPhone(lead.contact.phone)),
      lead.contact.email && el('a', { href: `mailto:${lead.contact.email}` }, lead.contact.email),
    ),
    actions(lead, handlers),
    section('Request', ...summaryFor(lead)),
    sendsMessages && section('Messages this request triggers', timeline),
    section('Consent', el('ul', { class: 'consent', role: 'list' }, consentLines(lead.consent, business.timeZone, lead.kind).map((line) => el('li', {}, line)))),
    section('Notes and history', noteForm(lead, handlers), history(lead)),
  ];
  panel.replaceChildren(...parts.filter((p): p is Node => Boolean(p)));
}
