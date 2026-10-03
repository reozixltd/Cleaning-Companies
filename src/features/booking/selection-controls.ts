/**
 * Step 1's controls: service, bedrooms and bathrooms, study and laundry, how
 * often, extras. Same behaviour as the floor plan's controls, kept here because
 * features don't import each other. Pure DOM; booking.ts owns the selection.
 */
import type { PricingConfig } from '@/config/pricing';
import { DEFAULT_SELECTION, type RoomLimits, type Selection } from '@/domain/selection';

export function syncControls(el: HTMLElement, s: Selection, pricing: PricingConfig, max: RoomLimits): void {
  for (const key of ['bedrooms', 'bathrooms'] as const) {
    const noun = key === 'bedrooms' ? 'bedroom' : 'bathroom';
    el.querySelector(`[data-count="${key}"]`)!.textContent = String(s[key]);
    const minus = el.querySelector<HTMLButtonElement>(`[data-step="${key}"][data-delta="-1"]`)!;
    const plus = el.querySelector<HTMLButtonElement>(`[data-step="${key}"][data-delta="1"]`)!;
    minus.disabled = s[key] <= 1;
    plus.disabled = s[key] >= max[key];
    minus.setAttribute('aria-label', `Remove a ${noun}, ${s[key]} selected`);
    plus.setAttribute('aria-label', `Add a ${noun}, ${s[key]} selected`);
  }
  for (const key of ['study', 'laundry'] as const) {
    el.querySelector(`[data-toggle="${key}"]`)!.setAttribute('aria-pressed', String(s[key]));
  }
  el.querySelectorAll<HTMLInputElement>('input[name="service"]').forEach((i) => (i.checked = i.value === s.service));
  el.querySelectorAll<HTMLInputElement>('input[name="frequency"]').forEach((i) => (i.checked = i.value === s.frequency));
  el.querySelectorAll<HTMLInputElement>('[data-extra]').forEach((i) => (i.checked = s.addOns.includes(i.value as never)));
  const oneOff = pricing.oneOffOnly.includes(s.service);
  el.querySelector<HTMLElement>('[data-frequency-group]')!.hidden = oneOff;
  el.querySelector<HTMLElement>('[data-once-note]')!.hidden = !oneOff;
}

/** Calls `update` with each change the visitor makes. */
export function bindControls(
  el: HTMLElement,
  current: () => Selection,
  update: (next: Partial<Selection>) => void,
  pricing: PricingConfig,
): void {
  el.addEventListener('click', (e) => {
    const s = current();
    const step = (e.target as Element).closest<HTMLButtonElement>('[data-step]');
    const toggle = (e.target as Element).closest<HTMLButtonElement>('[data-toggle]');
    if (step) {
      const key = step.dataset.step as 'bedrooms' | 'bathrooms';
      update({ [key]: s[key] + Number(step.dataset.delta) });
    } else if (toggle) {
      const key = toggle.dataset.toggle as 'study' | 'laundry';
      update({ [key]: !s[key] });
    }
  });
  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const s = current();
    if (input.name === 'service') {
      // Coming back from a one-off service restores the usual fortnightly default.
      const frequency = pricing.oneOffOnly.includes(s.service) ? DEFAULT_SELECTION.frequency : s.frequency;
      update({ service: input.value as Selection['service'], frequency });
    } else if (input.name === 'frequency') {
      update({ frequency: input.value as Selection['frequency'] });
    } else if (input.matches('[data-extra]')) {
      const addOns = [...el.querySelectorAll<HTMLInputElement>('[data-extra]:checked')].map((i) => i.value);
      update({ addOns: addOns as Selection['addOns'] });
    }
  });
}
