import { describe, expect, it } from 'vitest';
import { render } from '@/features/messages/render';
import { schedule, type ScheduleContext } from '@/features/messages/schedule';
import { messages, OPT_OUT } from '@/config/messages';
import type { Lead } from '@/core/leads/types';

const ctx = (over: Partial<ScheduleContext> = {}): ScheduleContext => ({
  now: '2026-10-05T10:00:00+10:00',
  timeZone: 'Australia/Brisbane',
  businessName: 'Clearday Home Cleaning',
  reviewLink: 'https://g.page/r/clearday-demo/review',
  optOut: OPT_OUT,
  visit: { startIso: '2026-10-09T08:00:00+10:00', windowLabel: '8–10am', dayLabel: 'Fri 9 Oct', priceLabel: '$179', oneOff: false },
  ...over,
});

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'L-1',
  kind: 'booking',
  status: 'confirmed',
  createdAt: '2026-10-04T22:00:00.000Z',
  contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570110', email: 'sam@example.com' },
  suburb: 'Chermside',
  postcode: '4032',
  consent: { terms: true, marketingSms: false, marketingEmail: false, at: '2026-10-04T22:00:00.000Z' },
  payload: {},
  clientRef: 'r',
  history: [{ at: '2026-10-04T23:00:00.000Z', type: 'status', value: 'confirmed' }],
  ...over,
});

describe('render', () => {
  it('replaces known keys and keeps unknown', () => {
    expect(render('Hi {firstName} {x}', { firstName: 'Sam' })).toBe('Hi Sam {x}');
  });

  it('does not interpret the replacement text', () => {
    expect(render('Hi {firstName}', { firstName: '$& {x}' })).toBe('Hi $& {x}');
  });

  it('keeps placeholders that only name inherited object properties', () => {
    const body = 'Hi {constructor} {toString} {hasOwnProperty} {__proto__} {valueOf}';
    expect(render(body, { firstName: 'Sam' })).toBe(body);
  });

  it('still fills a key the vars object owns, whatever its name', () => {
    expect(render('{toString}', { toString: 'own' })).toBe('own');
  });
});

describe('schedule', () => {
  it('confirmed booking gets four messages at the right times', () => {
    const out = schedule(lead(), messages, ctx());
    expect(out.map((m) => [m.templateId, m.sendAt])).toEqual([
      ['confirmation', '2026-10-05T09:00:00+10:00'],
      ['reminder', '2026-10-08T08:00:00+10:00'],
      ['on-the-way', '2026-10-09T08:00:00+10:00'],
      ['review-request', '2026-10-09T14:00:00+10:00'],
    ]);
    for (const m of out) {
      expect(m.text).toContain('Clearday Home Cleaning');
      expect(m.skippedReason).toBeUndefined();
      expect(m.channel).toBe('sms');
    }
    expect(out[0].text).toBe('Hi Sam, your clean is confirmed for Fri 9 Oct, arriving 8–10am. $179 a visit. Reply to this text with any access notes. Clearday Home Cleaning');
  });

  it('new booking shows messages waiting for confirmation', () => {
    const out = schedule(lead({ status: 'new', history: [] }), messages, ctx());
    const confirmation = out.find((m) => m.templateId === 'confirmation')!;
    expect(confirmation.sendAt).toBeNull();
    expect(confirmation.skippedReason).toBe('not-confirmed');
    expect(out.every((m) => m.skippedReason === 'not-confirmed')).toBe(true);
  });

  it('marketing messages need consent', () => {
    const oneOff = ctx({ visit: { ...ctx().visit!, oneOff: true } });
    const without = schedule(lead(), messages, oneOff).find((m) => m.templateId === 'rebook-offer')!;
    expect(without.skippedReason).toBe('no-consent');
    const consent = { terms: true, marketingSms: false, marketingEmail: true, at: '2026-10-04T22:00:00.000Z' };
    const withConsent = schedule(lead({ consent }), messages, oneOff).find((m) => m.templateId === 'rebook-offer')!;
    expect(withConsent.skippedReason).toBeUndefined();
    expect(withConsent.channel).toBe('email');
    expect(withConsent.text.endsWith(OPT_OUT.email)).toBe(true);
    expect(withConsent.sendAt).toBe('2026-10-30T08:00:00+10:00');
  });

  it('declined booking has no messages', () => {
    expect(schedule(lead({ status: 'declined' }), messages, ctx())).toEqual([]);
  });

  it('visit messages are omitted without visit details', () => {
    const out = schedule(lead(), messages, ctx({ visit: undefined }));
    expect(out.map((m) => m.templateId)).toEqual(['confirmation']);
  });

  it('walk-through follow-ups stop once the owner acts', () => {
    const walk = lead({ kind: 'walkthrough', status: 'new', createdAt: '2026-10-01T00:00:00.000Z', history: [] });
    const open = schedule(walk, messages, ctx({ visit: undefined }));
    expect(open.map((m) => [m.templateId, m.sendAt, m.skippedReason])).toEqual([
      ['walkthrough-day-2', '2026-10-03T10:00:00+10:00', undefined],
      ['walkthrough-day-5', '2026-10-06T10:00:00+10:00', undefined],
    ]);
    const acted = schedule({ ...walk, status: 'confirmed' }, messages, ctx({ visit: undefined }));
    expect(acted.every((m) => m.skippedReason === 'status-changed')).toBe(true);
  });

  it('other lead kinds get no messages', () => {
    expect(schedule(lead({ kind: 'application' }), messages, ctx())).toEqual([]);
  });
});
