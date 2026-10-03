import { describe, expect, it } from 'vitest';
import { checked, required } from '@/core/leads/validation';
import { clearFixedErrors } from '@/core/forms';

function setup() {
  document.body.innerHTML = `
    <form>
      <input id="field-firstName" name="firstName" aria-invalid="true" />
      <p data-error-for="firstName">Enter your first name</p>
      <input id="field-email" name="email" />
      <p data-error-for="email" hidden></p>
      <input id="field-terms" name="terms" type="checkbox" aria-invalid="true" />
      <p data-error-for="terms">Tick the box</p>
    </form>`;
  const form = document.querySelector('form')!;
  clearFixedErrors(form, {
    firstName: [required('Enter your first name')],
    email: [required('Enter your email')],
    terms: [checked('Tick the box')],
  });
  return form;
}

const slot = (form: HTMLFormElement, name: string) => form.querySelector<HTMLElement>(`[data-error-for="${name}"]`)!;
const field = (form: HTMLFormElement, name: string) => form.querySelector<HTMLInputElement>(`#field-${name}`)!;

describe('clearFixedErrors', () => {
  it('hides an error as soon as the field is fixed, so blur has nothing left to move', () => {
    const form = setup();
    field(form, 'firstName').value = 'Sam';
    field(form, 'firstName').dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot(form, 'firstName').hidden).toBe(true);
    expect(slot(form, 'firstName').textContent).toBe('');
    expect(field(form, 'firstName').hasAttribute('aria-invalid')).toBe(false);
  });

  it('clears a ticked checkbox on change', () => {
    const form = setup();
    field(form, 'terms').checked = true;
    field(form, 'terms').dispatchEvent(new Event('change', { bubbles: true }));
    expect(slot(form, 'terms').hidden).toBe(true);
  });

  it('keeps the error while the field is still wrong', () => {
    const form = setup();
    field(form, 'firstName').value = '  ';
    field(form, 'firstName').dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot(form, 'firstName').hidden).toBe(false);
    expect(field(form, 'firstName').getAttribute('aria-invalid')).toBe('true');
  });

  it('can read the rules at each edit, for forms whose rules follow a step', () => {
    document.body.innerHTML = `
      <form>
        <input id="field-firstName" name="firstName" aria-invalid="true" />
        <p data-error-for="firstName">Enter your first name</p>
      </form>`;
    const form = document.querySelector('form')!;
    let rules = {};
    clearFixedErrors(form, () => rules);
    field(form, 'firstName').value = 'Sam';
    field(form, 'firstName').dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot(form, 'firstName').hidden).toBe(false);
    rules = { firstName: [required('Enter your first name')] };
    field(form, 'firstName').dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot(form, 'firstName').hidden).toBe(true);
  });

  it('never shows a new error while someone is typing', () => {
    const form = setup();
    field(form, 'email').dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot(form, 'email').hidden).toBe(true);
    expect(field(form, 'email').hasAttribute('aria-invalid')).toBe(false);
  });
});
