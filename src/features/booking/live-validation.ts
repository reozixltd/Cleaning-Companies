/**
 * Field-by-field feedback between Continue presses:
 *   - a field already marked wrong clears as soon as its value is right, choices
 *     (radios, boxes) included (core/forms.ts clearFixedErrors, with the open step's rules)
 *   - a text field is checked when it loses focus
 * A blur check that runs while a finger or mouse is still pressed would move
 * the page under the press (an error message appears or goes), so the tap would
 * land on something else. Those checks wait until the press is over.
 */
import { clearFixedErrors, formValues, setFieldError } from '@/core/forms';
import { validate, type Rules } from '@/core/leads/validation';

export function bindLiveValidation(form: HTMLFormElement, rulesNow: () => Rules): void {
  let pressing = false;
  const settle = () => (pressing = false);
  document.addEventListener('pointerdown', () => (pressing = true), true);
  document.addEventListener('pointerup', settle, true);
  document.addEventListener('pointercancel', settle, true);

  const check = (name: string) => {
    const rules = rulesNow()[name];
    if (!rules) return;
    setFieldError(form, name, validate(formValues(form), { [name]: rules }).errors[name] ?? null);
  };

  /** Runs now, or after the click that is under way has landed. */
  const afterPress = (fn: () => void) => {
    if (!pressing) return fn();
    let queued = false;
    const run = () => {
      if (queued) return;
      queued = true;
      setTimeout(fn, 0);
    };
    document.addEventListener('pointerup', run, { capture: true, once: true });
    document.addEventListener('pointercancel', run, { capture: true, once: true });
  };

  const isChoice = (el: HTMLInputElement) => el.type === 'checkbox' || el.type === 'radio';
  const flagged = (name: string) => form.querySelector(`[id="field-${name}"][aria-invalid]`) !== null;

  clearFixedErrors(form, rulesNow);

  form.addEventListener('focusout', (e) => {
    const el = e.target as HTMLInputElement;
    if (!el.name || isChoice(el)) return;
    if (!el.value.trim() && !flagged(el.name)) return;
    afterPress(() => check(el.name));
  });
}
