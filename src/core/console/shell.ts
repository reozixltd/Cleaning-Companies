/**
 * Demo sign-in for the owner console. Not real authentication: the details are
 * printed on the page, and the flag lives in session storage so a closed tab
 * signs out. Production replaces this with the platform's own accounts.
 *
 * Markup it expects inside `root`:
 *   [data-view="signin"] > form[data-signin] (email, password) + [data-signin-error]
 *   [data-view="app"] (with optional [data-signout] buttons and [data-focus-on-show])
 */
import { getSessionStorage, type KeyValueStorage } from '../storage';

export const WRONG_LOGIN = 'Use the demo email and password shown above.';

export interface ShellOptions {
  credentials: { email: string; password: string };
  sessionKey: string;
  onSignedIn: () => void;
  /** Defaults to browser session storage. */
  storage?: KeyValueStorage;
}

interface Session {
  show: (signedIn: boolean, focus: boolean) => void;
  storage: KeyValueStorage;
  key: string;
}

let session: Session | null = null;

export function initShell(root: HTMLElement, opts: ShellOptions): void {
  const storage = opts.storage ?? getSessionStorage();
  const signin = root.querySelector<HTMLElement>('[data-view="signin"]')!;
  const app = root.querySelector<HTMLElement>('[data-view="app"]')!;
  const form = signin.querySelector<HTMLFormElement>('form[data-signin]')!;
  const error = signin.querySelector<HTMLElement>('[data-signin-error]')!;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

  const show = (signedIn: boolean, focus: boolean) => {
    signin.hidden = signedIn;
    app.hidden = !signedIn;
    if (!focus) return;
    const target = signedIn ? app.querySelector<HTMLElement>('[data-focus-on-show]') : field('email');
    target?.focus();
  };
  session = { show, storage, key: opts.sessionKey };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = field('email').value.trim().toLowerCase();
    const ok = email === opts.credentials.email.toLowerCase() && field('password').value === opts.credentials.password;
    error.textContent = ok ? '' : WRONG_LOGIN;
    error.hidden = ok;
    field('password').toggleAttribute('aria-invalid', !ok);
    if (!ok) return;
    storage.setItem(opts.sessionKey, '1');
    show(true, true);
    opts.onSignedIn();
  });

  root.querySelectorAll('[data-signout]').forEach((button) => button.addEventListener('click', signOut));

  const signedIn = storage.getItem(opts.sessionKey) === '1';
  show(signedIn, false);
  if (signedIn) opts.onSignedIn();
}

export function signOut(): void {
  if (!session) return;
  session.storage.removeItem(session.key);
  session.show(false, true);
}
