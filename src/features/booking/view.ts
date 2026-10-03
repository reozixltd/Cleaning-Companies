/**
 * Writes the booking page: which step is open, the day tiles, the price in the
 * step and the tag, the recaps, and the check and success summaries. Text only
 * (textContent), never HTML, because some of it is what the visitor typed.
 */
import { formatMoney } from '@/core/format';
import { describeSelection } from '@/domain/describe';
import type { Quote } from '@/domain/quote';
import type { Selection } from '@/domain/selection';
import { lineAmount, priceText, stepRecap, whenText, type RecapContext, type SummaryRow } from './recap';
import { STEP_IDS, type Day, type StepId } from './state';

const each = <T extends Element = HTMLElement>(root: ParentNode, sel: string, fn: (el: T) => void) =>
  root.querySelectorAll<T>(sel).forEach(fn);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};

export function renderDays(root: HTMLElement, days: Day[], chosen: string): void {
  const host = root.querySelector<HTMLElement>('[data-days]')!;
  root.querySelector<HTMLElement>('[data-no-days]')!.hidden = days.length > 0;
  host.hidden = days.length === 0;
  host.replaceChildren(
    ...days.map((d) => {
      const [weekday, ...date] = d.label.split(' ');
      const label = el('label', '', 'segment segment--tall');
      const input = Object.assign(el('input'), { type: 'radio', name: 'day', value: d.date, checked: d.date === chosen });
      label.append(input, el('span', weekday), ' ', el('span', date.join(' '), 'segment__sub'));
      return label;
    }),
  );
}

export function showStep(root: HTMLElement, current: StepId): void {
  const at = STEP_IDS.indexOf(current);
  each(root, '[data-book-step]', (li) => {
    const i = STEP_IDS.indexOf(li.dataset.bookStep as StepId);
    const state = i < at ? 'done' : i === at ? 'current' : 'upcoming';
    li.dataset.state = state;
    if (state === 'current') li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
    li.querySelector<HTMLElement>('[data-step-body]')!.hidden = state !== 'current';
    li.querySelector<HTMLElement>('[data-recap]')!.hidden = state !== 'done';
    li.querySelector<HTMLElement>('[data-edit]')!.hidden = state !== 'done';
  });
}

export function showPrice(root: HTMLElement, s: Selection, q: Quote): void {
  each(root, '[data-book-summary]', (n) => (n.textContent = describeSelection(s)));
  each(root, '[data-book-price]', (n) => (n.textContent = priceText(q)));
  each(root, '[data-book-first]', (n) => (n.textContent = formatMoney(q.firstVisit)));
  each(root, '[data-book-first-row]', (n) => (n.hidden = q.firstVisit === q.perVisit));
}

export function showRecaps(root: HTMLElement, values: Record<string, string>, ctx: RecapContext): void {
  each(root, '[data-book-step]', (li) => {
    li.querySelector('[data-recap]')!.textContent = stepRecap(li.dataset.bookStep as StepId, values, ctx);
  });
  const when = whenText(values, ctx.booking);
  each(root, '[data-tag-when]', (n) => {
    n.textContent = when;
    n.hidden = !when;
  });
}

export function fillRows(list: HTMLElement, rows: SummaryRow[]): void {
  list.replaceChildren(
    ...rows.map((r) => {
      const row = el('div');
      row.dataset.row = r.id;
      row.append(el('dt', r.label), el('dd', r.value));
      return row;
    }),
  );
}

export function fillLines(root: HTMLElement, q: Quote): void {
  root.querySelector('[data-check-lines]')!.replaceChildren(
    ...q.lines.map((line) => {
      const row = el('tr');
      const th = el('th', line.label);
      th.scope = 'row';
      row.append(th, el('td', lineAmount(line.amount)));
      return row;
    }),
  );
  root.querySelector('[data-check-total-label]')!.textContent = q.frequency === 'once' ? 'Total' : 'A visit';
  root.querySelector('[data-check-total]')!.textContent = formatMoney(q.perVisit);
  root.querySelector('[data-check-first]')!.textContent = formatMoney(q.firstVisit);
  root.querySelector<HTMLElement>('[data-check-first-row]')!.hidden = q.firstVisit === q.perVisit;
}

/** Error-summary links focus the field itself (the first option of a group) without adding history entries. */
export function focusField(form: HTMLFormElement, id: string): void {
  const target = form.querySelector<HTMLElement>(`[id="${id}"]`);
  if (!target) return;
  const focusable = target.matches('input, select, textarea')
    ? target
    : (target.querySelector<HTMLElement>('input:checked') ?? target.querySelector<HTMLElement>('input') ?? target);
  focusable.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'center' });
}
