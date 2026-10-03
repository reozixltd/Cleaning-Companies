/**
 * Wires the booking request. Holds the selection, moves between the five steps
 * (each Continue checks only its own step), keeps the URL in step so back, refresh
 * and shared links work, and sends one lead per page load. Rules live in lead.ts,
 * words in recap.ts, DOM writing in view.ts.
 */
import { clearErrors, formValues, newClientRef, showErrors } from '@/core/forms';
import { todayIn } from '@/core/format';
import { validate } from '@/core/leads/validation';
import { getStorage } from '@/core/storage';
import { emitSelection } from '@/domain/events';
import { quote } from '@/domain/quote';
import { DEFAULT_SELECTION, loadSelection, normalise, saveSelection, type Selection } from '@/domain/selection';
import { firstIncomplete, rulesFor } from './lead';
import { bindLiveValidation } from './live-validation';
import { bindControls, syncControls } from './selection-controls';
import { sendBooking, type BookingDeps } from './send';
import { STEP_IDS, availableDays, type StepId } from './state';
import { bookingSearch, readBookingUrl } from './url';
import { focusField, renderDays, showPrice, showRecaps, showStep } from './view';

export type { BookingDeps, SentBooking } from './send';

export function initBooking(root: HTMLElement, deps: BookingDeps): void {
  const { business, pricing, booking, rooms } = deps.config;
  const storage = deps.storage ?? getStorage();
  const form = root.querySelector<HTMLFormElement>('[data-book-form]')!;
  const controls = root.querySelector<HTMLElement>('[data-selection-controls]')!;
  const panel = (id: StepId) => root.querySelector<HTMLElement>(`[data-book-step="${id}"]`)!;
  const summary = (id: StepId) => panel(id).querySelector<HTMLElement>('[data-error-summary]')!;
  const radio = (name: string, value: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  const ctx = () => ({ selection: s, quote: quote(s, pricing), pricing, booking });
  const areas = business.areas;
  const clientRef = newClientRef();

  const url = readBookingUrl(location.search, pricing, rooms.max);
  let s: Selection = url.selection ?? loadSelection(storage, pricing, rooms.max) ?? DEFAULT_SELECTION;
  let step: StepId = 'home';

  const days = availableDays(todayIn(business.timeZone, (deps.now ?? (() => new Date()))()), booking);
  renderDays(root, days, url.day);
  if (!days.length) panel('when').querySelectorAll<HTMLElement>('#field-window, [data-next]').forEach((n) => (n.hidden = true));
  for (const [name, value] of [['window', url.window], ['method', url.access]]) {
    const input = value ? radio(name, value) : null;
    if (input) input.checked = true;
  }

  const syncUrl = (mode: 'push' | 'replace', at: StepId | 'sent' = step) => {
    const v = formValues(form);
    const search = bookingSearch({ step: at, selection: s, day: v.day, window: v.window, access: v.method });
    history[mode === 'push' ? 'pushState' : 'replaceState']({ booking: at }, '', search);
  };

  const refresh = () => {
    const v = formValues(form);
    showPrice(root, s, quote(s, pricing));
    showRecaps(root, v, ctx());
    panel('home').querySelector<HTMLElement>('[data-pets-note]')!.hidden = v.pets !== 'yes';
    const method = v.method;
    panel('access').querySelector<HTMLElement>('[data-access-detail]')!.hidden = method !== 'key' && method !== 'code';
    const label = form.querySelector('label[for="field-detail"]');
    if (label) label.textContent = method === 'code' ? 'Door code' : 'Where will the key or lockbox be?';
  };

  const show = (next: StepId, opts: { focus: boolean }) => {
    step = next;
    send.reset();
    showStep(root, step);
    if (step === 'check') send.fill(formValues(form), ctx());
    if (!opts.focus) return;
    const li = panel(step);
    li.querySelector<HTMLElement>('h2')!.focus({ preventScroll: true });
    const top = li.getBoundingClientRect().top;
    if (top < 72 || top > innerHeight * 0.6) li.scrollIntoView({ block: 'start' });
  };

  /** Validates one step; shows its errors and returns false when something is missing. */
  const check = (id: StepId): boolean => {
    const { ok, errors } = validate(formValues(form), rulesFor(id, areas));
    clearErrors(form, summary(id));
    if (!ok) showErrors(form, errors, summary(id));
    return ok;
  };

  const advance = () => {
    if (!check(step)) return;
    const missing = firstIncomplete(formValues(form), areas);
    show(missing && STEP_IDS.indexOf(missing) > STEP_IDS.indexOf(step) ? missing : 'check', { focus: true });
    syncUrl('push');
  };

  const update = (next: Partial<Selection>) => {
    s = normalise({ ...s, ...next }, pricing, rooms.max);
    syncControls(controls, s, pricing, rooms.max);
    refresh();
    saveSelection(storage, s);
    emitSelection(s);
    syncUrl('replace');
  };

  const send = sendBooking(root, form, deps, {
    values: () => formValues(form),
    selection: () => s,
    clientRef,
    blocked: () => {
      const missing = firstIncomplete(formValues(form), areas);
      if (missing) {
        show(missing, { focus: false });
        check(missing);
        syncUrl('push');
      }
      return missing !== null;
    },
    onDone: () => syncUrl('push', 'sent'),
  });

  // Start where the link asked, unless an earlier step still needs something.
  const missing = firstIncomplete(formValues(form), areas);
  const start = missing && STEP_IDS.indexOf(missing) < STEP_IDS.indexOf(url.step) ? missing : url.step;
  update({});
  show(start, { focus: false });
  syncUrl('replace');

  bindControls(controls, () => s, update, pricing);
  root.querySelectorAll<HTMLButtonElement>('[data-next]').forEach((b) => b.addEventListener('click', advance));
  root.addEventListener('click', (e) => {
    const edit = (e.target as Element).closest<HTMLButtonElement>('[data-edit]');
    if (edit) {
      show(edit.dataset.edit as StepId, { focus: true });
      syncUrl('push');
    }
    const link = (e.target as Element).closest<HTMLAnchorElement>('[data-error-summary] a');
    if (link) {
      e.preventDefault();
      focusField(form, link.hash.slice(1));
    }
  });

  form.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.name) return;
    refresh();
    if (['day', 'window', 'method'].includes(input.name)) syncUrl('replace');
  });
  bindLiveValidation(form, () => rulesFor(step, areas));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (step === 'check') send.submit();
    else advance();
  });

  addEventListener('popstate', () => {
    const at = readBookingUrl(location.search, pricing, rooms.max);
    if (at.sent && send.done()) return send.showDone();
    send.hideDone();
    const gap = firstIncomplete(formValues(form), areas);
    show(gap && STEP_IDS.indexOf(gap) < STEP_IDS.indexOf(at.step) ? gap : at.step, { focus: true });
    syncUrl('replace');
  });
}
