/** Wires the job application form to core/forms: validation, saving and outcomes. */
import { bindSimpleForm } from '@/core/forms';
import { getLeadRepository } from '@/core/leads';
import { business } from '@/config/business';
import { applicationInput, applicationRules } from './lead-inputs';

export function initApplicationForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-application-form]').forEach((form) => {
    const rules = applicationRules();
    bindSimpleForm(form, {
      rules,
      toInput: applicationInput,
      repo: getLeadRepository(),
      success: form.dataset.success ?? '',
      fallbackPhone: business.phone,
    });
  });
}
