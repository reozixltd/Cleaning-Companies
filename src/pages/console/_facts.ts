/**
 * What the detail panel says about one lead, by kind. Lead data is visitor
 * input, so every value goes through el() as text.
 */
import { business } from '@/config/business';
import { el, fromTemplate } from '@/core/console/dom';
import { formatDateTime, formatDay, formatMoney } from '@/core/format';
import type { Consent, Lead, LeadKind, LeadStatus } from '@/core/leads/types';
import { describeSelection } from '@/domain/describe';
import { readBooking, windowFor, type BookingPayload } from './_booking';

export type Action = { status: LeadStatus; label: string; tone: 'primary' | 'secondary' };

/** Only the moves that make sense from where the request is now. */
export function actionsFor(status: LeadStatus): Action[] {
  if (status === 'new') return [{ status: 'confirmed', label: 'Confirm', tone: 'primary' }, { status: 'declined', label: 'Decline', tone: 'secondary' }];
  if (status === 'confirmed') return [{ status: 'done', label: 'Mark done', tone: 'primary' }, { status: 'declined', label: 'Decline', tone: 'secondary' }];
  return [];
}

/**
 * "Marketing SMS: yes, Mon 5 Oct, 9:02am". Only bookings show terms and
 * marketing boxes; enquiries say so instead of implying an agreement.
 */
export function consentLines(c: Consent, timeZone: string, kind: LeadKind): string[] {
  if (kind !== 'booking') return ['Service terms: not asked (enquiry)', 'Marketing: not asked'];
  const when = c.at ? `, ${formatDateTime(c.at, timeZone)}` : '';
  return [`Service terms: ${c.terms ? 'agreed' : 'not agreed'}${when}`, `Marketing SMS: ${c.marketingSms ? 'yes' : 'no'}${when}`, `Marketing email: ${c.marketingEmail ? 'yes' : 'no'}${when}`];
}

const ACCESS_LABELS: Record<BookingPayload['access']['method'], string> = {
  home: 'Someone will be home',
  key: 'Key or lockbox',
  code: 'Door code',
};

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** The careers form's required tick box. Unticked or missing never reads as a yes. */
const ticked = (v: unknown) => (v === true ? 'Yes' : v === false ? 'Not confirmed' : 'Not recorded');

/** dt/dd pairs; empty values are left out. */
export function facts(rows: [string, string | Node | null | undefined][]): HTMLDListElement {
  const kept = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  return el('dl', { class: 'facts' }, kept.map(([k, v]) => el('div', { class: 'facts__row' }, el('dt', {}, k), el('dd', {}, v as string | Node))));
}

/** A door code stays hidden until the owner asks to see it. */
function doorCode(code: string): HTMLElement {
  const value = el('span', { class: 'code__value tabular' });
  const toggle = fromTemplate<HTMLButtonElement>('btn-quiet', 'Show code');
  toggle.classList.add('code__toggle');
  toggle.setAttribute('aria-expanded', 'false');
  const draw = (shown: boolean) => {
    value.replaceChildren(shown ? code : el('span', { 'aria-hidden': 'true' }, '••••'), shown ? '' : el('span', { class: 'visually-hidden' }, 'Code hidden'));
    toggle.setAttribute('aria-expanded', String(shown));
    (toggle.querySelector('[data-tpl-text]') ?? toggle).textContent = shown ? 'Hide code' : 'Show code';
  };
  toggle.addEventListener('click', () => draw(toggle.getAttribute('aria-expanded') !== 'true'));
  draw(false);
  return el('span', { class: 'code', 'data-door-code': '' }, value, toggle);
}

function access(b: BookingPayload): HTMLElement {
  const { method, detail } = b.access;
  if (method === 'code' && detail) return el('span', {}, `${ACCESS_LABELS.code}: `, doorCode(detail));
  return el('span', {}, ACCESS_LABELS[method], detail ? `: ${detail}` : '');
}

/** Worded like the booking check step: a one-off clean has a total, a plan has a price a visit. */
function quoteBlock(b: BookingPayload): HTMLElement {
  const q = b.quote;
  return el(
    'div',
    { class: 'quote', 'data-quote': '' },
    el('ul', { class: 'quote__lines', role: 'list' }, q.lines.map((l) => el('li', {}, el('span', {}, l.label), el('span', { class: 'tabular' }, formatMoney(l.amount))))),
    el('p', { class: 'quote__total' }, el('span', {}, q.frequency === 'once' ? 'Total' : 'A visit'), el('strong', { class: 'tabular' }, formatMoney(q.perVisit))),
    q.firstVisit !== q.perVisit && el('p', { class: 'quote__first' }, el('span', {}, 'First visit, as a deep clean'), el('strong', { class: 'tabular' }, formatMoney(q.firstVisit))),
    el('p', { class: 'quote__note' }, business.demoMode ? 'GST included. Sample prices.' : 'GST included.'),
  );
}

function bookingFacts(lead: Lead): HTMLElement[] {
  const b = readBooking(lead);
  if (!b) return [el('p', { class: 'muted' }, 'This booking has no visit details.')];
  return [
    facts([
      ['Home', describeSelection(b.selection)],
      ['Visit', `${formatDay(b.day)}, arrive ${windowFor(b.windowId).arrive}`],
      ['Address', [b.address, lead.suburb, lead.postcode].filter(Boolean).join(', ')],
      ['Access', access(b)],
      ['Parking', b.access.parking],
      ['Access notes', b.access.notes],
      ['Pets', b.pets.has ? `Yes${b.pets.note ? `: ${b.pets.note}` : ''}` : 'No'],
    ]),
    quoteBlock(b),
  ];
}

/** The kind-specific summary under the detail header. */
export function summaryFor(lead: Lead): HTMLElement[] {
  const p = (lead.payload ?? {}) as Record<string, unknown>;
  const where = [lead.suburb, lead.postcode].filter(Boolean).join(' ');
  if (lead.kind === 'booking') return bookingFacts(lead);
  if (lead.kind === 'walkthrough') {
    return [facts([['Company', text(p.company)], ['Site', text(p.siteAddress) || where], ['Floor area', text(p.floorArea)], ['Frequency', text(p.frequency)], ['Best times to visit', text(p.preferredTimes)], ['Notes', text(p.notes)]])];
  }
  if (lead.kind === 'application') {
    return [facts([['Lives in', where], ['Availability', text(p.availability)], ['Right to work, car and licence', ticked(p.rightToWorkCarLicence)], ['Experience', text(p.experience)]])];
  }
  return [facts([['Suburb wanted', text(p.suburb) || where], ['Postcode', lead.postcode]])];
}
