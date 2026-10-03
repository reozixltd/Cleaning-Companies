/**
 * Form wiring shared by every simple lead form (waitlist, careers, walk-through).
 * Industry-neutral: rules, messages and the lead shape come from the caller.
 *
 *   - validates a field when it loses focus, and every field on submit
 *   - clears a field's error the moment it is fixed (see clearFixedErrors)
 *   - error summary with links to the fields, focused so screen readers hear it
 *   - one clientRef per page load, so a double click or a retry stores one lead
 *   - send button disabled while sending
 *   - success replaces the form, and only once the lead is stored; failure keeps
 *     the details and offers the phone
 *   - a filled honeypot is dropped quietly; a send faster than a person could type
 *     (autofill can be) is held once with a message, and the next press saves
 */
import { spamSignal, validate, type FieldErrors, type Rules } from './leads/validation';
import type { LeadInput } from './leads/types';
import type { LeadRepository } from './leads/repository';

/** Every named field as a string; unchecked checkboxes are ''. */
export function formValues(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name) continue;
    if (el.type === 'checkbox') values[el.name] = el.checked ? 'on' : '';
    else if (el.type === 'radio') {
      if (el.checked) values[el.name] = el.value;
      else values[el.name] ??= '';
    } else values[el.name] = el.value;
  }
  return values;
}

/** Writes (or clears) one field's inline error and its aria-invalid. The summary is left alone. */
export function setFieldError(form: HTMLFormElement, name: string, message: string | null): void {
  const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  const field = form.querySelector<HTMLElement>(`[id="field-${name}"]`);
  if (slot) {
    slot.textContent = message ?? '';
    slot.hidden = !message;
  }
  if (message) field?.setAttribute('aria-invalid', 'true');
  else field?.removeAttribute('aria-invalid');
}

/**
 * Clears a field's error the moment the visitor fixes it (on input or change),
 * instead of waiting for blur. Two reasons:
 *   - people see straight away that the fix worked
 *   - an error that disappears on blur shrinks the form under the pointer, so
 *     a press on the send button can land on empty space and nothing is sent
 * It only ever clears; new errors still wait for blur or submit.
 * Pass a function when the rules change while the form is open (a step form):
 * it is read at each edit.
 */
export function clearFixedErrors(form: HTMLFormElement, rules: Rules | (() => Rules)): void {
  const rulesNow = typeof rules === 'function' ? rules : () => rules;
  const onEdit = (e: Event) => {
    const name = (e.target as HTMLInputElement | null)?.name;
    const fieldRules = name ? rulesNow()[name] : undefined;
    if (!name || !fieldRules) return;
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (!slot || slot.hidden) return;
    if (validate(formValues(form), { [name]: fieldRules }).errors[name]) return;
    setFieldError(form, name, null);
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
}

export function showErrors(form: HTMLFormElement, errors: FieldErrors, summary: HTMLElement): void {
  const list = summary.querySelector('ul')!;
  list.replaceChildren();
  for (const [name, message] of Object.entries(errors)) {
    setFieldError(form, name, message);
    const link = document.createElement('a');
    link.href = `#field-${name}`;
    link.textContent = message;
    const item = document.createElement('li');
    item.append(link);
    list.append(item);
  }
  summary.hidden = false;
  summary.focus();
}

export function clearErrors(form: HTMLFormElement, summary: HTMLElement): void {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((slot) => setFieldError(form, slot.dataset.errorFor!, null));
  summary.hidden = true;
  summary.querySelector('ul')?.replaceChildren();
}

export function newClientRef(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Shows (or clears) a "couldn't save" message above the submit button. */
export function showFailure(form: HTMLFormElement, message: string | null): void {
  let alert = form.querySelector<HTMLElement>('[data-form-failure]');
  if (!message) return alert?.remove();
  if (!alert) {
    alert = document.createElement('p');
    alert.setAttribute('role', 'alert');
    alert.dataset.formFailure = '';
    alert.className = 'form-failure';
    form.querySelector('button[type="submit"]')?.before(alert);
  }
  alert.textContent = message;
}

export interface SimpleFormOptions {
  rules: Rules;
  toInput: (values: Record<string, string>, ctx: { clientRef: string; consentAt: string }) => LeadInput;
  repo: LeadRepository;
  success: string;
  fallbackPhone: string;
}

export function bindSimpleForm(form: HTMLFormElement, opts: SimpleFormOptions): void {
  const summary = form.querySelector<HTMLElement>('[data-error-summary]')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const startedAt = Date.now();
  const clientRef = newClientRef();
  let sending = false;
  let askedAgain = false;

  form.noValidate = true;
  clearFixedErrors(form, opts.rules);
  for (const name of Object.keys(opts.rules)) {
    const field = form.querySelector<HTMLElement>(`[id="field-${name}"]`);
    field?.addEventListener('blur', () => {
      const { errors } = validate(formValues(form), { [name]: opts.rules[name] });
      setFieldError(form, name, errors[name] ?? null);
    });
  }

  const done = () => {
    const note = document.createElement('div');
    note.className = 'form-done';
    note.setAttribute('role', 'status');
    note.tabIndex = -1;
    const p = document.createElement('p');
    p.textContent = opts.success;
    note.append(p);
    form.replaceWith(note);
    note.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const values = formValues(form);
    const signal = spamSignal({ honeypot: values.website ?? '', startedAt, now: Date.now() });
    if (signal === 'honeypot') return done();

    const { ok, errors } = validate(values, opts.rules);
    if (!ok) return showErrors(form, errors, summary);
    clearErrors(form, summary);
    // Too fast for a person, but autofill can be that fast: hold the first such send
    // and say so, never a success for something not stored. The next press saves.
    if (signal === 'too-fast' && !askedAgain) {
      askedAgain = true;
      return showFailure(form, 'Not sent yet. Check your details, then send again.');
    }
    showFailure(form, null);

    sending = true;
    if (button) button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await opts.repo.create(opts.toInput(values, { clientRef, consentAt: new Date().toISOString() }));
      done();
    } catch {
      showFailure(form, `We couldn't save your request. Call us on ${opts.fallbackPhone} and we'll sort it out now.`);
    } finally {
      sending = false;
      if (button) button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
