/** Wires the waitlist form: prefill from the link, then core/forms does validation, saving and outcomes. */
import { bindSimpleForm } from '@/core/forms';
import { getLeadRepository } from '@/core/leads';
import { business } from '@/config/business';
import { prefillFromSearch, waitlistInput, waitlistRules } from './lead-inputs';

export function initWaitlistForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-waitlist-form]').forEach((form) => {
    for (const [name, value] of Object.entries(prefillFromSearch(location.search))) {
      const input = form.querySelector<HTMLInputElement>(`[id="field-${name}"]`);
      if (input && !input.value) input.value = value;
    }
    const rules = waitlistRules(business.areas);
    bindSimpleForm(form, {
      rules,
      toInput: waitlistInput,
      repo: getLeadRepository(),
      success: form.dataset.success ?? '',
      fallbackPhone: business.phone,
    });
  });
}
