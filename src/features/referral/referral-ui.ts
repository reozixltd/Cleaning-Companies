/** Shows the visitor's saved referral code and copies it on request. */
import { getStorage } from '@/core/storage';
import { referralCode } from './referral';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function initReferral(): void {
  document.querySelectorAll<HTMLElement>('[data-referral]').forEach((box) => {
    const codeEl = box.querySelector<HTMLElement>('[data-referral-code]')!;
    const button = box.querySelector<HTMLButtonElement>('[data-copy-code]')!;
    const status = box.querySelector<HTMLElement>('[data-copy-status]')!;
    const code = referralCode(getStorage());

    codeEl.textContent = code;
    codeEl.dataset.ready = '';
    button.hidden = false;
    button.addEventListener('click', async () => {
      status.textContent = (await copy(code))
        ? 'Copied. Paste it into a message to your friend.'
        : `Couldn't copy. Your code is ${code.split('').join(' ')}.`;
    });
  });
}
