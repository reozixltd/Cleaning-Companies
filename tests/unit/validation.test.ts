import { describe, expect, it } from 'vitest';
import {
  auPhone,
  checked,
  email,
  maxLength,
  minLength,
  normalisePhone,
  oneOf,
  postcode,
  required,
  spamSignal,
  validate,
} from '@/core/leads/validation';

describe('validate', () => {
  it('returns the first failing message per field', () => {
    const result = validate({ name: '' }, { name: [required('Enter your first name'), minLength(2, 'Too short')] });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBe('Enter your first name');
  });

  it('is ok when every rule passes, and treats missing fields as empty', () => {
    expect(validate({ name: 'Sam' }, { name: [required('x')] })).toEqual({ ok: true, errors: {} });
    expect(validate({}, { name: [required('Enter your first name')] }).errors.name).toBe('Enter your first name');
  });

  it('passes every field to rules so they can compare', () => {
    const sameAs = (other: string) => (v: string, all: Record<string, string>) => (v === all[other] ? null : 'Must match');
    expect(validate({ a: '1', b: '2' }, { b: [sameAs('a')] }).errors.b).toBe('Must match');
  });

  it('required ignores whitespace-only values', () => {
    expect(required('x')('   ', {})).toBe('x');
  });

  it('auPhone accepts mobiles, landlines and +61', () => {
    const rule = auPhone('bad');
    for (const ok of ['0412 345 678', '07 5550 1234', '+61 7 5550 1234']) expect(rule(ok, {})).toBeNull();
    for (const bad of ['12345', '+44 20 7946 0000']) expect(rule(bad, {})).toBe('bad');
  });

  it('postcode requires four digits', () => {
    const rule = postcode('bad');
    expect(rule('4032', {})).toBeNull();
    for (const bad of ['403', '40320', 'abcd']) expect(rule(bad, {})).toBe('bad');
  });

  it('checked accepts on and true only', () => {
    const rule = checked('tick it');
    expect(rule('on', {})).toBeNull();
    expect(rule('true', {})).toBeNull();
    expect(rule('', {})).toBe('tick it');
  });

  it('email accepts plus-addressing and long domains, rejects missing @', () => {
    const rule = email('bad');
    expect(rule('first.last+billing@example.com', {})).toBeNull();
    expect(rule('bartholomew.fitzgerald@northwind-industries-holdings.example.com', {})).toBeNull();
    expect(rule('sam.example.com', {})).toBe('bad');
  });

  it('min, max and oneOf', () => {
    expect(minLength(5, 'short')('abc', {})).toBe('short');
    expect(maxLength(3, 'long')('abcd', {})).toBe('long');
    expect(oneOf(['a', 'b'], 'pick')('c', {})).toBe('pick');
    expect(oneOf(['a', 'b'], 'pick')('a', {})).toBeNull();
  });
});

describe('normalisePhone', () => {
  it('normalises +61 and spacing', () => {
    expect(normalisePhone('+61 491 570 110')).toBe('0491570110');
    expect(normalisePhone('(07) 5550 1234')).toBe('0755501234');
    expect(normalisePhone('1234')).toBeNull();
  });
});

describe('spamSignal', () => {
  it('a filled honeypot is a bot, however long the form took', () => {
    expect(spamSignal({ honeypot: 'x', startedAt: 0, now: 10_000 })).toBe('honeypot');
    expect(spamSignal({ honeypot: 'x', startedAt: 0, now: 1_000 })).toBe('honeypot');
  });

  it('a send within 3 seconds of load is too fast, but kept apart from the honeypot (autofill can do it)', () => {
    expect(spamSignal({ honeypot: '', startedAt: 0, now: 1_000 })).toBe('too-fast');
    expect(spamSignal({ honeypot: ' ', startedAt: 0, now: 2_999 })).toBe('too-fast');
  });

  it('a person who takes 3 seconds or more passes', () => {
    expect(spamSignal({ honeypot: '', startedAt: 0, now: 3_000 })).toBeNull();
    expect(spamSignal({ honeypot: '', startedAt: 0, now: 10_000 })).toBeNull();
  });
});
