/**
 * Form validation as data: each field gets a list of rules, and the first
 * failing rule's message is shown. Pure functions; messages are written by
 * the caller in the site's voice.
 */

/** Returns the error message, or null when the value is acceptable. */
export type Rule = (value: string, all: Record<string, string>) => string | null;
export type Rules = Record<string, Rule[]>;
export type FieldErrors = Record<string, string>;

export function validate(input: Record<string, string>, rules: Rules): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = input[field] ?? '';
    for (const rule of fieldRules) {
      const message = rule(value, input);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export const required = (msg: string): Rule => (v) => (v.trim() ? null : msg);
export const minLength = (n: number, msg: string): Rule => (v) => (v.trim().length >= n ? null : msg);
export const maxLength = (n: number, msg: string): Rule => (v) => (v.trim().length <= n ? null : msg);
export const oneOf = (values: readonly string[], msg: string): Rule => (v) => (values.includes(v) ? null : msg);
export const checked = (msg: string): Rule => (v) => (v === 'on' || v === 'true' ? null : msg);
export const postcode = (msg: string): Rule => (v) => (/^\d{4}$/.test(v.trim()) ? null : msg);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const email = (msg: string): Rule => (v) => (EMAIL.test(v.trim()) ? null : msg);
export const auPhone = (msg: string): Rule => (v) => (normalisePhone(v) ? null : msg);

/** Returns AU numbers as 10 digits starting with 0, or null if not a valid AU phone. */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+61')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('61') && digits.length === 11) digits = '0' + digits.slice(2);
  if (digits.startsWith('+')) return null;
  return /^0[2-478]\d{8}$/.test(digits) ? digits : null;
}

const MIN_FILL_MS = 3000;

/**
 * What a send looks like:
 *   - 'honeypot': the hidden field is filled. Only bots fill it, so the caller may drop it quietly.
 *   - 'too-fast': sent sooner than a person could type the form. Browser autofill can do that
 *     too, so the caller must never drop it silently.
 *   - null: nothing suspicious.
 */
export function spamSignal(opts: { honeypot: string; startedAt: number; now: number }): 'honeypot' | 'too-fast' | null {
  if (opts.honeypot.trim() !== '') return 'honeypot';
  return opts.now - opts.startedAt < MIN_FILL_MS ? 'too-fast' : null;
}
