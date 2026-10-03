/**
 * The visitor's refer-a-friend code: six characters, made once per browser and
 * kept in storage. No look-alike characters (0/O, 1/I/L), so it reads cleanly
 * over the phone.
 */
import type { KeyValueStorage } from '@/core/storage';

export const REFERRAL_KEY = 'clearday:v1:referral-code';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 6;
const PATTERN = new RegExp(`^[${ALPHABET}]{${LENGTH}}$`);

export const isReferralCode = (value: unknown): value is string => typeof value === 'string' && PATTERN.test(value);

export function newReferralCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[Math.min(Math.floor(random() * ALPHABET.length), ALPHABET.length - 1)];
  return code;
}

/** The saved code, or a new one saved for next time. Storage failures still return a code. */
export function referralCode(storage: KeyValueStorage, random?: () => number): string {
  let saved: string | null = null;
  try {
    saved = storage.getItem(REFERRAL_KEY);
  } catch {
    saved = null;
  }
  if (isReferralCode(saved)) return saved;
  const code = newReferralCode(random);
  try {
    storage.setItem(REFERRAL_KEY, code);
  } catch {
    // Shown for this visit only; nothing else depends on it being saved.
  }
  return code;
}
