import { describe, expect, it } from 'vitest';
import { createMemoryStorage, type KeyValueStorage } from '@/core/storage';
import { REFERRAL_KEY, isReferralCode, newReferralCode, referralCode } from '@/features/referral/referral';

/** A repeatable random sequence, so codes are predictable in tests. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('referral code', () => {
  it('is six characters with no look-alike letters or digits', () => {
    for (let i = 0; i < 200; i++) {
      const code = newReferralCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(isReferralCode(code)).toBe(true);
    }
  });

  it('comes from the random source it is given', () => {
    expect(newReferralCode(sequence(0))).toBe('AAAAAA');
    expect(newReferralCode(sequence(0.9999))).toBe('999999');
  });

  it('is made once and saved under the namespaced key', () => {
    const storage = createMemoryStorage();
    const first = referralCode(storage, sequence(0.1, 0.5, 0.9));
    expect(storage.getItem(REFERRAL_KEY)).toBe(first);
    expect(REFERRAL_KEY).toBe('clearday:v1:referral-code');
    expect(referralCode(storage, sequence(0))).toBe(first);
  });

  it('replaces a saved value that is not a code', () => {
    const storage = createMemoryStorage();
    storage.setItem(REFERRAL_KEY, '<script>');
    const code = referralCode(storage, sequence(0));
    expect(code).toBe('AAAAAA');
    expect(storage.getItem(REFERRAL_KEY)).toBe('AAAAAA');
  });

  it('still gives a code when storage refuses the write', () => {
    const full: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    expect(isReferralCode(referralCode(full))).toBe(true);
  });
});
