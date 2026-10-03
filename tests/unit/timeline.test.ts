import { beforeEach, describe, expect, it } from 'vitest';
import { renderTimeline, SKIP_REASONS } from '@/features/messages/timeline';
import type { ScheduledMessage } from '@/features/messages/schedule';

const TZ = 'Australia/Brisbane';

const items: ScheduledMessage[] = [
  { templateId: 'confirmation', label: 'Booking confirmed', channel: 'sms', sendAt: '2026-10-05T09:02:00+10:00', text: 'Hi Sam, confirmed. Clearday Home Cleaning' },
  { templateId: 'rebook-offer', label: 'Rebook offer', channel: 'email', sendAt: '2026-10-30T08:00:00+10:00', text: 'Hi Sam, rebook.', skippedReason: 'no-consent' },
  { templateId: 'reminder', label: 'Reminder the day before', channel: 'sms', sendAt: null, text: 'Hi Sam, reminder.', skippedReason: 'not-confirmed' },
  { templateId: 'walkthrough-day-2', label: 'Walk-through follow-up', channel: 'email', sendAt: '2026-10-03T10:00:00+10:00', text: 'Hi Ana', skippedReason: 'status-changed' },
];

describe('renderTimeline', () => {
  let box: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div data-timeline></div>';
    box = document.querySelector('[data-timeline]')!;
  });

  const rows = () => [...box.querySelectorAll<HTMLElement>('[data-message]')];

  it('renders one row per message with channel, label, time and text', () => {
    renderTimeline(box, items, { demoMode: false, timeZone: TZ });
    expect(rows()).toHaveLength(4);
    const first = rows()[0];
    expect(first.dataset.message).toBe('confirmation');
    expect(first.dataset.channel).toBe('sms');
    expect(first.querySelector('[data-channel-label]')?.textContent).toBe('SMS');
    expect(first.textContent).toContain('Booking confirmed');
    expect(first.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-05T09:02:00+10:00');
    expect(first.querySelector('time')?.textContent).toBe('Mon 5 Oct, 9:02am');
    expect(first.querySelector('[data-message-text]')?.textContent).toBe('Hi Sam, confirmed. Clearday Home Cleaning');
    expect(rows()[1].querySelector('[data-channel-label]')?.textContent).toBe('Email');
  });

  it('says why a message would not send, in words', () => {
    renderTimeline(box, items, { demoMode: false, timeZone: TZ });
    const reason = (i: number) => rows()[i].querySelector('[data-skip-reason]')?.textContent;
    expect(reason(0)).toBeUndefined();
    expect(reason(1)).toBe('No marketing consent');
    expect(reason(2)).toBe('Waits for confirmation');
    expect(reason(3)).toBe("Stopped: you've already replied");
    expect(rows()[1].hasAttribute('data-skipped')).toBe(true);
    expect(rows()[0].hasAttribute('data-skipped')).toBe(false);
    expect(SKIP_REASONS['no-consent']).toBe('No marketing consent');
  });

  it('shows "Waits for confirmation" in place of an unknown send time', () => {
    renderTimeline(box, items, { demoMode: false, timeZone: TZ });
    const row = rows()[2];
    expect(row.querySelector('time')).toBeNull();
    expect(row.querySelector('[data-send-at]')?.textContent).toBe('Waits for confirmation');
  });

  it('labels every row "Preview, not sent" in demo mode only', () => {
    renderTimeline(box, items, { demoMode: true, timeZone: TZ });
    expect(rows().every((r) => r.querySelector('[data-preview-label]')?.textContent === 'Preview, not sent')).toBe(true);
    renderTimeline(box, items, { demoMode: false, timeZone: TZ });
    expect(box.querySelector('[data-preview-label]')).toBeNull();
    expect(box.textContent).not.toContain('Preview, not sent');
  });

  it('replaces previous rows and shows an empty line when nothing would send', () => {
    renderTimeline(box, items, { demoMode: true, timeZone: TZ });
    renderTimeline(box, items.slice(0, 1), { demoMode: true, timeZone: TZ });
    expect(rows()).toHaveLength(1);
    renderTimeline(box, [], { demoMode: true, timeZone: TZ });
    expect(rows()).toHaveLength(0);
    expect(box.textContent).toContain('No messages for this request.');
  });

  it('never interprets message text as HTML', () => {
    const evil = { ...items[0], text: 'Hi <img src=x onerror=alert(1)>' };
    renderTimeline(box, [evil], { demoMode: true, timeZone: TZ });
    expect(box.querySelector('img')).toBeNull();
    expect(box.textContent).toContain('Hi <img src=x onerror=alert(1)>');
  });
});
