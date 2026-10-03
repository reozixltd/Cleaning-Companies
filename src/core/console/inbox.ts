/**
 * The console's lead list. Industry-neutral: the caller says how to summarise a
 * lead (`describe`) and how its status badge looks (`badge`).
 */
import { formatDateTime } from '../format';
import { KIND_LABELS, STATUS_LABELS, type Lead, type LeadKind, type LeadStatus } from '../leads/types';
import { el } from './dom';

export interface InboxFilter {
  kind?: LeadKind | 'all';
  status?: LeadStatus | 'all';
}

/** Keeps the order it was given (the repository lists newest first). */
export function filterLeads(leads: readonly Lead[], { kind = 'all', status = 'all' }: InboxFilter): Lead[] {
  return leads.filter((l) => (kind === 'all' || l.kind === kind) && (status === 'all' || l.status === status));
}

export interface InboxOptions {
  selectedId: string | null;
  describe: (lead: Lead) => string;
  onSelect: (id: string) => void;
  timeZone: string;
  isUnread?: (lead: Lead) => boolean;
  badge?: (lead: Lead) => Node;
}

function row(lead: Lead, opts: InboxOptions): HTMLLIElement {
  const unread = opts.isUnread?.(lead) ?? false;
  const name = `${lead.contact.firstName} ${lead.contact.lastName}`.trim() || 'No name given';
  const place = [lead.suburb, lead.postcode].filter(Boolean).join(' ');
  return el(
    'li',
    {},
    el(
      'button',
      {
        type: 'button',
        class: 'inbox-row',
        'data-lead-id': lead.id,
        'aria-current': lead.id === opts.selectedId ? 'true' : undefined,
        'data-unread': unread,
        onClick: () => opts.onSelect(lead.id),
      },
      el(
        'span',
        { class: 'inbox-row__top' },
        unread && el('span', { class: 'inbox-row__dot', 'aria-hidden': 'true' }),
        unread && el('span', { class: 'visually-hidden' }, 'Unread: '),
        el('span', { class: 'inbox-row__name' }, name),
        el('time', { class: 'inbox-row__time', datetime: lead.createdAt }, formatDateTime(lead.createdAt, opts.timeZone)),
      ),
      el('span', { class: 'inbox-row__about' }, opts.describe(lead)),
      el(
        'span',
        { class: 'inbox-row__meta' },
        el('span', { 'data-kind-label': '' }, KIND_LABELS[lead.kind] ?? lead.kind),
        place && el('span', { class: 'inbox-row__place' }, place),
        opts.badge ? opts.badge(lead) : el('span', { class: 'inbox-row__status' }, STATUS_LABELS[lead.status] ?? lead.status),
      ),
    ),
  );
}

export function renderInbox(list: HTMLElement, leads: readonly Lead[], opts: InboxOptions): void {
  list.replaceChildren(...leads.map((lead) => row(lead, opts)));
}
