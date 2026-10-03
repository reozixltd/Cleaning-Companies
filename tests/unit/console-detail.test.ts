import { describe, expect, it } from 'vitest';
import { pricing } from '@/config/pricing';
import { quote, type Quote } from '@/domain/quote';
import { AVAILABILITY, applicationInput } from '@/features/forms/lead-inputs';
import { describeLead, messagesFor, readBooking } from '@/pages/console/_booking';
import { actionsFor, consentLines, summaryFor } from '@/pages/console/_facts';
import { sampleLeads } from '@/pages/console/_sample-leads';
import type { Lead } from '@/core/leads/types';

const NOW = new Date('2026-10-03T03:00:00Z');
const leads = sampleLeads(NOW);
const byId = (id: string) => leads.find((l) => l.id === id)!;
const withPayload = (lead: Lead, over: Record<string, unknown>): Lead => ({ ...lead, payload: { ...(lead.payload as Record<string, unknown>), ...over } });
const text = (nodes: HTMLElement[]) => nodes.map((n) => n.textContent).join(' ');
/** The detail's facts as { label: value }. */
const factsOf = (nodes: HTMLElement[]) =>
  Object.fromEntries(nodes.flatMap((n) => [...n.querySelectorAll('.facts__row')]).map((r) => [r.querySelector('dt')!.textContent, r.querySelector('dd')!.textContent]));

describe('actionsFor', () => {
  it('offers only the moves valid for the status', () => {
    expect(actionsFor('new').map((a) => a.label)).toEqual(['Confirm', 'Decline']);
    expect(actionsFor('confirmed').map((a) => a.label)).toEqual(['Mark done', 'Decline']);
    expect(actionsFor('declined')).toEqual([]);
    expect(actionsFor('done')).toEqual([]);
  });
});

describe('consentLines', () => {
  it('records each consent with its time in Brisbane', () => {
    const lines = consentLines({ terms: true, marketingSms: true, marketingEmail: false, at: '2026-10-04T23:02:00Z' }, 'Australia/Brisbane', 'booking');
    expect(lines).toEqual(['Service terms: agreed, Mon 5 Oct, 9:02am', 'Marketing SMS: yes, Mon 5 Oct, 9:02am', 'Marketing email: no, Mon 5 Oct, 9:02am']);
  });

  it('never shows an agreement for enquiries, where no terms or marketing boxes were shown', () => {
    const consent = { terms: false, marketingSms: false, marketingEmail: false, at: '2026-10-04T23:02:00Z' };
    for (const kind of ['walkthrough', 'waitlist', 'application'] as const) {
      expect(consentLines(consent, 'Australia/Brisbane', kind)).toEqual(['Service terms: not asked (enquiry)', 'Marketing: not asked']);
    }
  });

  it('sample enquiries record no agreement to terms', () => {
    for (const lead of leads.filter((l) => l.kind !== 'booking')) expect(lead.consent.terms, lead.id).toBe(false);
  });
});

describe('readBooking', () => {
  it('reads a sample booking as stored', () => {
    const b = readBooking(byId('S-BK-PRIYA'))!;
    expect(b.windowId).toBe('morning');
    expect(b.access.method).toBe('code');
    expect(b.quote.perVisit).toBe(244);
  });

  it('survives a hand-edited payload', () => {
    const junk = { ...byId('S-BK-PRIYA'), payload: { day: '2026-10-09', windowId: 'midnight', selection: { bedrooms: 99 }, access: { method: 'teleport' } } } as Lead;
    const b = readBooking(junk)!;
    expect(b.windowId).toBe('morning');
    expect(b.selection.bedrooms).toBe(6);
    expect(b.access.method).toBe('home');
    expect(b.quote.lines.length).toBeGreaterThan(0);
    expect(readBooking({ ...junk, payload: {} } as Lead)).toBeNull();
    expect(readBooking(byId('S-WT-NORTHSIDE'))).toBeNull();
  });

  describe('a stored quote it cannot trust', () => {
    const lead = byId('S-BK-PRIYA');
    const stored = (lead.payload as { quote: Quote }).quote;
    const { firstVisit: _dropped, ...noFirstVisit } = stored;
    const malformed: Record<string, unknown> = {
      'a line amount that is not a number': { ...stored, lines: [{ ...stored.lines[0], amount: 'lots' }, ...stored.lines.slice(1)] },
      'no first visit': noFirstVisit,
      'a per-visit price as text': { ...stored, perVisit: '244' },
      'a line that is not a line': { ...stored, lines: [null] },
      'a line with no label': { ...stored, lines: [{ amount: 244 }] },
      'no lines': { ...stored, lines: [] },
      'an unknown frequency': { ...stored, frequency: 'hourly' },
      'no quote object': 'cheap',
    };

    for (const [name, bad] of Object.entries(malformed)) {
      it(`recomputes it when it has ${name}`, () => {
        const b = readBooking(withPayload(lead, { quote: bad }))!;
        expect(b.quote).toEqual(quote(b.selection, pricing));
        const numbers = [b.quote.perVisit, b.quote.firstVisit, ...b.quote.lines.map((l) => l.amount)];
        expect(numbers.every(Number.isFinite)).toBe(true);
      });
    }

    it('never shows $NaN in the request details', () => {
      for (const bad of Object.values(malformed)) expect(text(summaryFor(withPayload(lead, { quote: bad })))).not.toMatch(/NaN/);
    });

    it('keeps a well-formed stored quote as it was priced, without extra fields', () => {
      const b = readBooking(withPayload(lead, { quote: { ...stored, perVisit: 250, firstVisit: 250, note: 'x' } }))!;
      expect(b.quote).toEqual({ ...stored, perVisit: 250, firstVisit: 250 });
    });
  });
});

describe('summaryFor', () => {
  const totalLabel = (lead: Lead) => summaryFor(lead).map((n) => n.querySelector('.quote__total span')).find(Boolean)!.textContent;

  it('labels the price "A visit" for plans and "Total" for one-off cleans, like the booking check step', () => {
    expect(readBooking(byId('S-BK-PRIYA'))!.quote.frequency).toBe('fortnightly');
    expect(totalLabel(byId('S-BK-PRIYA'))).toBe('A visit');
    expect(readBooking(byId('S-BK-MIA'))!.quote.frequency).toBe('once');
    expect(totalLabel(byId('S-BK-MIA'))).toBe('Total');
  });

  describe('a job application', () => {
    const TICK = 'Right to work, car and licence';
    const grace = byId('S-AP-GRACE');

    it('shows the right to work, car and licence tick with the other facts', () => {
      expect(Object.keys(factsOf(summaryFor(grace)))).toEqual(['Lives in', 'Availability', TICK, 'Experience']);
      expect(factsOf(summaryFor(grace))[TICK]).toBe('Yes');
    });

    it('shows what the careers form stores', () => {
      const values = { firstName: 'Ana', lastName: 'Silva', phone: '0412 345 678', email: 'ana@example.com', suburb: 'Zillmere', postcode: '4034', availability: AVAILABILITY[0].value, experience: '', requirements: 'on' };
      const input = applicationInput(values, { clientRef: 'r', consentAt: '2026-10-03T00:00:00Z' });
      const lead = JSON.parse(JSON.stringify({ ...input, id: 'AP-1', status: 'new', createdAt: '2026-10-03T00:00:00Z', history: [] })) as Lead;
      expect(factsOf(summaryFor(lead))[TICK]).toBe('Yes');
    });

    it('says so honestly when the box was not ticked or nothing was recorded', () => {
      expect(factsOf(summaryFor(withPayload(grace, { rightToWorkCarLicence: false })))[TICK]).toBe('Not confirmed');
      expect(factsOf(summaryFor(withPayload(grace, { rightToWorkCarLicence: undefined })))[TICK]).toBe('Not recorded');
      expect(factsOf(summaryFor(withPayload(grace, { rightToWorkCarLicence: 'yes' })))[TICK]).toBe('Not recorded');
      expect(factsOf(summaryFor({ ...grace, payload: null } as unknown as Lead))[TICK]).toBe('Not recorded');
    });
  });
});

describe('messagesFor', () => {
  it('times a confirmed booking from its visit window', () => {
    const out = messagesFor(byId('S-BK-BEN'), NOW);
    expect(out.map((m) => m.templateId)).toEqual(['confirmation', 'reminder', 'on-the-way', 'review-request']);
    const b = readBooking(byId('S-BK-BEN'))!;
    expect(out.find((m) => m.templateId === 'on-the-way')!.sendAt).toBe(`${b.day}T12:00:00+10:00`);
    // 4 bed, 2 bath, study, weekly: (129 + 3×20 + 30 + 12) × 0.85 = $196
    expect(out[0].text).toContain('arriving 12–2pm. $196 a visit.');
  });

  it('adds the rebook offer for the one-off booking with email consent', () => {
    const offer = messagesFor(byId('S-BK-MIA'), NOW).find((m) => m.templateId === 'rebook-offer')!;
    expect(offer.channel).toBe('email');
    expect(offer.skippedReason).toBeUndefined();
  });

  it('holds a new booking until it is confirmed', () => {
    const out = messagesFor(byId('S-BK-PRIYA'), NOW);
    expect(out).toHaveLength(4);
    expect(out.every((m) => m.sendAt === null && m.skippedReason === 'not-confirmed')).toBe(true);
  });
});

describe('describeLead', () => {
  it('summarises each kind in one line', () => {
    expect(describeLead(byId('S-BK-PRIYA'))).toMatch(/^3 bed, 2 bath, fortnightly\. \w{3} \d{1,2} \w{3}, 8–10am$/);
    expect(describeLead(byId('S-WT-NORTHSIDE'))).toBe('Northside Physio, 200–500 m²');
    expect(describeLead(byId('S-AP-GRACE'))).toBe('Weekdays, school hours');
    expect(describeLead(byId('S-WL-LENA'))).toBe('Wants to hear when we clean in Kedron');
  });
});
