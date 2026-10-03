import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindSimpleForm, clearErrors, formValues, setFieldError, showErrors } from '@/core/forms';
import { required } from '@/core/leads/validation';
import type { Lead, LeadInput } from '@/core/leads/types';
import type { LeadRepository } from '@/core/leads/repository';

function setup() {
  document.body.innerHTML = `
    <div data-form-host>
      <form>
        <div data-error-summary hidden tabindex="-1"><p>Check these</p><ul></ul></div>
        <input id="field-firstName" name="firstName" aria-describedby="field-firstName-error" />
        <p data-error-for="firstName" id="field-firstName-error" hidden></p>
        <input id="field-email" name="email" />
        <p data-error-for="email" hidden></p>
        <input id="field-terms" name="terms" type="checkbox" />
        <input name="website" class="hp" />
        <button type="submit">Send</button>
      </form>
    </div>`;
  const form = document.querySelector('form')!;
  return { form, summary: form.querySelector<HTMLElement>('[data-error-summary]')! };
}

const fakeRepo = (create: (i: LeadInput) => Promise<Lead>) => ({ create }) as unknown as LeadRepository;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('formValues', () => {
  it('reads unchecked boxes as empty and checked as on', () => {
    const { form } = setup();
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
    expect(formValues(form)).toMatchObject({ firstName: 'Sam', terms: '' });
    (form.elements.namedItem('terms') as HTMLInputElement).checked = true;
    expect(formValues(form).terms).toBe('on');
  });
});

describe('showErrors / clearErrors', () => {
  it('links each message to its field and focuses the summary', () => {
    const { form, summary } = setup();
    showErrors(form, { firstName: 'Enter your first name', email: 'Enter an email' }, summary);
    expect(summary.hidden).toBe(false);
    expect(document.activeElement).toBe(summary);
    const links = [...summary.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.textContent]);
    expect(links).toEqual([
      ['#field-firstName', 'Enter your first name'],
      ['#field-email', 'Enter an email'],
    ]);
    const err = form.querySelector<HTMLElement>('[data-error-for="firstName"]')!;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('Enter your first name');
    expect(form.querySelector('#field-firstName')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('renders messages as text, not HTML', () => {
    const { form, summary } = setup();
    showErrors(form, { firstName: '<img src=x onerror=alert(1)>' }, summary);
    expect(summary.querySelector('img')).toBeNull();
  });

  it('setFieldError writes and clears one field without touching the summary', () => {
    const { form, summary } = setup();
    setFieldError(form, 'email', 'Enter an email');
    const slot = form.querySelector<HTMLElement>('[data-error-for="email"]')!;
    expect([slot.hidden, slot.textContent]).toEqual([false, 'Enter an email']);
    expect(form.querySelector('#field-email')!.getAttribute('aria-invalid')).toBe('true');
    expect(summary.hidden).toBe(true);
    setFieldError(form, 'email', null);
    expect([slot.hidden, slot.textContent]).toEqual([true, '']);
    expect(form.querySelector('#field-email')!.hasAttribute('aria-invalid')).toBe(false);
  });

  it('clearErrors hides everything again', () => {
    const { form, summary } = setup();
    showErrors(form, { firstName: 'x' }, summary);
    clearErrors(form, summary);
    expect(summary.hidden).toBe(true);
    expect(form.querySelector('#field-firstName')!.hasAttribute('aria-invalid')).toBe(false);
    expect(form.querySelector<HTMLElement>('[data-error-for="firstName"]')!.hidden).toBe(true);
  });
});

describe('bindSimpleForm', () => {
  const base = { rules: { firstName: [required('Enter your first name')] }, success: 'Thanks, we got it.', fallbackPhone: '07 5550 1234' };
  let now = 0;
  beforeEach(() => {
    now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  it('shows errors and does not save an invalid form', async () => {
    const { form } = setup();
    const create = vi.fn();
    bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
    now = 10_000;
    form.requestSubmit();
    await flush();
    expect(create).not.toHaveBeenCalled();
    expect(form.querySelector<HTMLElement>('[data-error-summary]')!.hidden).toBe(false);
  });

  it('validates a field when it loses focus', () => {
    const { form } = setup();
    bindSimpleForm(form, { ...base, repo: fakeRepo(vi.fn()), toInput: () => ({}) as LeadInput });
    const input = form.querySelector<HTMLInputElement>('#field-firstName')!;
    input.dispatchEvent(new Event('blur'));
    expect(form.querySelector<HTMLElement>('[data-error-for="firstName"]')!.textContent).toBe('Enter your first name');
  });

  it('clears a field error as soon as the field is fixed, before it loses focus', async () => {
    const { form } = setup();
    bindSimpleForm(form, { ...base, repo: fakeRepo(vi.fn()), toInput: () => ({}) as LeadInput });
    now = 10_000;
    form.requestSubmit();
    await flush();
    const slot = form.querySelector<HTMLElement>('[data-error-for="firstName"]')!;
    expect(slot.hidden).toBe(false);
    const input = form.querySelector<HTMLInputElement>('#field-firstName')!;
    input.value = 'Sam';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(slot.hidden).toBe(true);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('saves once with the mapped input and shows the success text', async () => {
    const { form } = setup();
    const create = vi.fn(async (i: LeadInput) => ({ ...i, id: 'L-1' }) as Lead);
    const toInput = vi.fn((v: Record<string, string>) => ({ kind: 'waitlist', clientRef: 'x', payload: { name: v.firstName } }) as unknown as LeadInput);
    bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput });
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
    now = 10_000;
    form.requestSubmit();
    form.requestSubmit();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({ payload: { name: 'Sam' } });
    expect(document.querySelector('[data-form-host]')!.textContent).toContain('Thanks, we got it.');
  });

  it('gives each bound form a clientRef that survives retries', async () => {
    const { form } = setup();
    const refs: string[] = [];
    const create = vi.fn(async (i: LeadInput) => {
      refs.push(i.clientRef);
      throw new Error('full');
    });
    bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: (_v, ctx) => ({ clientRef: ctx.clientRef }) as LeadInput });
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
    now = 10_000;
    form.requestSubmit();
    await flush();
    form.requestSubmit();
    await flush();
    expect(refs).toHaveLength(2);
    expect(refs[0]).toBe(refs[1]);
    expect(refs[0].length).toBeGreaterThan(8);
  });

  it('shows the phone fallback and keeps the details when saving fails', async () => {
    const { form } = setup();
    const create = vi.fn(async () => {
      throw new Error('quota');
    });
    bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
    now = 10_000;
    form.requestSubmit();
    await flush();
    expect(form.querySelector('[role="alert"]')?.textContent).toContain("We couldn't save your request. Call us on 07 5550 1234");
    expect((form.elements.namedItem('firstName') as HTMLInputElement).value).toBe('Sam');
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('quietly drops bot submissions', async () => {
    const { form } = setup();
    const create = vi.fn();
    bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
    (form.elements.namedItem('website') as HTMLInputElement).value = 'spam.example';
    now = 10_000;
    form.requestSubmit();
    await flush();
    expect(create).not.toHaveBeenCalled();
    expect(document.querySelector('[data-form-host]')!.textContent).toContain('Thanks, we got it.');
  });

  describe('a send within 3 seconds of load (browser autofill can do that)', () => {
    const host = () => document.querySelector('[data-form-host]')!;
    const alertText = (form: HTMLFormElement) => form.querySelector('[role="alert"]')?.textContent;

    it('stores nothing and never shows the success message; it asks the visitor to send again', async () => {
      const { form } = setup();
      const create = vi.fn(async (i: LeadInput) => ({ ...i, id: 'L-1' }) as Lead);
      bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
      (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
      now = 1_000;
      form.requestSubmit();
      await flush();
      expect(create).not.toHaveBeenCalled();
      expect(host().textContent).not.toContain('Thanks, we got it.');
      expect(form.isConnected).toBe(true);
      expect(alertText(form)).toBe('Not sent yet. Check your details, then send again.');
      expect((form.elements.namedItem('firstName') as HTMLInputElement).value).toBe('Sam');
    });

    it('stores the request on the next press, however soon, and only then shows success', async () => {
      const { form } = setup();
      const create = vi.fn(async (i: LeadInput) => ({ ...i, id: 'L-1' }) as Lead);
      bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
      (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
      now = 1_000;
      form.requestSubmit();
      await flush();
      now = 1_500;
      form.requestSubmit();
      await flush();
      expect(create).toHaveBeenCalledTimes(1);
      expect(host().textContent).toContain('Thanks, we got it.');
    });

    it('shows field errors first when the form is incomplete', async () => {
      const { form } = setup();
      const create = vi.fn();
      bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
      now = 1_000;
      form.requestSubmit();
      await flush();
      expect(create).not.toHaveBeenCalled();
      expect(form.querySelector<HTMLElement>('[data-error-summary]')!.hidden).toBe(false);
      expect(alertText(form)).toBeUndefined();
    });

    it('still drops a bot quietly when the hidden field is filled', async () => {
      const { form } = setup();
      const create = vi.fn();
      bindSimpleForm(form, { ...base, repo: fakeRepo(create), toInput: () => ({}) as LeadInput });
      (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Sam';
      (form.elements.namedItem('website') as HTMLInputElement).value = 'spam.example';
      now = 500;
      form.requestSubmit();
      await flush();
      expect(create).not.toHaveBeenCalled();
      expect(host().textContent).toContain('Thanks, we got it.');
    });
  });
});
