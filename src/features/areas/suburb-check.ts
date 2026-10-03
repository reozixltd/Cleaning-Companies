/** Wires every suburb check on the page to core/geo findArea. */
import { findArea } from '@/core/geo';
import { sitePath } from '@/core/paths';
import { business } from '@/config/business';

function link(text: string, href: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = sitePath(href);
  a.textContent = text;
  return a;
}

export function answer(result: HTMLElement, raw: string): void {
  const match = findArea(raw, business.areas);
  result.replaceChildren();
  if (match.status === 'in') {
    const area = match.matches[0];
    const names = match.matches.map((m) => m.suburb).join(', ');
    result.append(`We clean in ${match.query === area.postcode ? names : area.suburb}.`);
    if (area.page && match.matches.length === 1) result.append(' ', link(`About ${area.suburb}`, `/areas/${area.page}/`));
  } else if (match.status === 'out') {
    result.append(`We don't clean in ${match.query} yet.`, ' ');
    result.append(link('Tell me when you do', `/areas/?suburb=${encodeURIComponent(match.query)}#waitlist`));
  } else {
    result.append('Check the spelling or try a postcode.');
  }
}

let started = false;

export function initSuburbChecks(): void {
  if (started) return;
  started = true;
  document.querySelectorAll<HTMLFormElement>('[data-suburb-check]').forEach((form) => {
    const result = form.querySelector<HTMLElement>('[data-suburb-result]')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      answer(result, new FormData(form).get('suburb')?.toString() ?? '');
    });
  });
}
