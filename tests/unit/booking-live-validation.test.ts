/**
 * Booking's field-by-field feedback between Continue presses. A check that runs
 * while a press is still down moves the page under it (the tap then missed the
 * terms box), so blur checks wait until the press is over.
 */
import { describe, expect, it } from 'vitest';
import { checked, minLength, required, type Rules } from '@/core/leads/validation';
import { bindLiveValidation } from '@/features/booking/live-validation';

const RULES: Rules = {
  firstName: [required('Enter your first name')],
  address: [minLength(5, 'Enter your street address')],
  terms: [checked('Agree to the service terms to send your request')],
  window: [required('Choose an arrival time')],
};

function setup(rulesNow: () => Rules = () => RULES) {
  document.body.innerHTML = `
    <form>
      <input id="field-firstName" name="firstName" />
      <p data-error-for="firstName" hidden></p>
      <input id="field-address" name="address" />
      <p data-error-for="address" hidden></p>
      <input id="field-terms" name="terms" type="checkbox" />
      <p data-error-for="terms" hidden></p>
      <fieldset id="field-window">
        <input type="radio" name="window" value="morning" />
        <input type="radio" name="window" value="afternoon" />
      </fieldset>
      <p data-error-for="window" hidden></p>
    </form>`;
  const form = document.querySelector('form')!;
  bindLiveValidation(form, rulesNow);
  return form;
}

const input = (form: HTMLFormElement, name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const error = (form: HTMLFormElement, name: string) => {
  const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`)!;
  return slot.hidden ? null : slot.textContent;
};
const invalid = (form: HTMLFormElement, name: string) => form.querySelector(`[id="field-${name}"]`)!.getAttribute('aria-invalid');
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const leave = (el: HTMLElement) => el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
const press = (kind: 'pointerdown' | 'pointerup') => document.dispatchEvent(new Event(kind));
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Marks a field wrong the way a Continue press does. */
function flag(form: HTMLFormElement, name: string, message: string) {
  const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`)!;
  slot.textContent = message;
  slot.hidden = false;
  form.querySelector(`[id="field-${name}"]`)!.setAttribute('aria-invalid', 'true');
}

describe('booking live validation', () => {
  it('checks a text field when it loses focus', () => {
    const form = setup();
    input(form, 'address').value = '12';
    leave(input(form, 'address'));
    expect(error(form, 'address')).toBe('Enter your street address');
    expect(invalid(form, 'address')).toBe('true');
  });

  it('says nothing about an empty field someone tabs past', () => {
    const form = setup();
    leave(input(form, 'firstName'));
    expect(error(form, 'firstName')).toBeNull();
    expect(invalid(form, 'firstName')).toBeNull();
  });

  it('clears a flagged field as soon as it is right, and never adds an error while typing', () => {
    const form = setup();
    flag(form, 'firstName', 'Enter your first name');
    type(input(form, 'firstName'), 'Sam');
    expect(error(form, 'firstName')).toBeNull();
    expect(invalid(form, 'firstName')).toBeNull();
    type(input(form, 'firstName'), '');
    expect(error(form, 'firstName')).toBeNull();
    type(input(form, 'address'), '12');
    expect(error(form, 'address')).toBeNull();
  });

  it('clears a flagged tick box or radio group when it changes', () => {
    const form = setup();
    flag(form, 'terms', 'Agree to the service terms to send your request');
    flag(form, 'window', 'Choose an arrival time');
    input(form, 'terms').checked = true;
    input(form, 'terms').dispatchEvent(new Event('change', { bubbles: true }));
    form.querySelector<HTMLInputElement>('[value="afternoon"]')!.checked = true;
    form.querySelector('[value="afternoon"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(error(form, 'terms')).toBeNull();
    expect(invalid(form, 'terms')).toBeNull();
    expect(error(form, 'window')).toBeNull();
    expect(invalid(form, 'window')).toBeNull();
  });

  it('waits until the press is over before a blur check shows or clears a message', async () => {
    const form = setup();
    input(form, 'address').value = '12';
    press('pointerdown');
    leave(input(form, 'address'));
    expect(error(form, 'address')).toBeNull();
    press('pointerup');
    expect(error(form, 'address')).toBeNull();
    await tick();
    expect(error(form, 'address')).toBe('Enter your street address');

    input(form, 'address').value = '12 Gympie Road';
    press('pointerdown');
    leave(input(form, 'address'));
    press('pointerup');
    expect(error(form, 'address')).toBe('Enter your street address');
    await tick();
    expect(error(form, 'address')).toBeNull();
  });

  it("uses the open step's rules, read at the moment of each check", () => {
    let rules: Rules = {};
    const form = setup(() => rules);
    input(form, 'address').value = '12';
    leave(input(form, 'address'));
    expect(error(form, 'address')).toBeNull();
    flag(form, 'firstName', 'Enter your first name');
    type(input(form, 'firstName'), 'Sam');
    expect(error(form, 'firstName')).toBe('Enter your first name');

    rules = RULES;
    leave(input(form, 'address'));
    expect(error(form, 'address')).toBe('Enter your street address');
    type(input(form, 'firstName'), 'Sam');
    expect(error(form, 'firstName')).toBeNull();
  });
});
