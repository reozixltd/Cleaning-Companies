import { beforeEach, describe, expect, it, vi } from 'vitest';
import { el } from '@/core/console/dom';
import { filterLeads, renderInbox } from '@/core/console/inbox';
import { initShell, signOut, WRONG_LOGIN } from '@/core/console/shell';
import { initTabs } from '@/core/console/tabs';
import { createMemoryStorage } from '@/core/storage';
import type { Lead } from '@/core/leads/types';

const TZ = 'Australia/Brisbane';

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'L-1',
  kind: 'booking',
  status: 'new',
  createdAt: '2026-10-03T00:00:00.000Z',
  contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570156', email: 'sam@example.com' },
  suburb: 'Chermside',
  postcode: '4032',
  consent: { terms: true, marketingSms: false, marketingEmail: false, at: '2026-10-03T00:00:00.000Z' },
  payload: {},
  clientRef: 'r1',
  history: [],
  ...over,
});

describe('el', () => {
  it('sets text, never HTML', () => {
    expect(el('p', {}, '<img src=x onerror=alert(1)>').innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('sets attributes, skips empty ones and treats values as text', () => {
    const node = el('button', { class: 'a b', 'data-id': '"><img>', 'aria-pressed': 'true', hidden: false, disabled: true, title: undefined });
    expect(node.className).toBe('a b');
    expect(node.dataset.id).toBe('"><img>');
    expect(node.getAttribute('aria-pressed')).toBe('true');
    expect(node.hasAttribute('hidden')).toBe(false);
    expect(node.hasAttribute('disabled')).toBe(true);
    expect(node.hasAttribute('title')).toBe(false);
    expect(node.querySelector('img')).toBeNull();
  });

  it('binds on<Event> handlers instead of setting attributes', () => {
    const onClick = vi.fn();
    const node = el('button', { onClick });
    node.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(node.hasAttribute('onclick')).toBe(false);
  });

  it('appends nodes, numbers and nested lists, skipping empty children', () => {
    const node = el('ul', {}, [el('li', {}, 'a'), null, false, [el('li', {}, 'b', 2)]], undefined);
    expect(node.children).toHaveLength(2);
    expect(node.textContent).toBe('ab2');
  });
});

describe('filterLeads', () => {
  const leads = [
    lead({ id: 'a', kind: 'booking', status: 'new' }),
    lead({ id: 'b', kind: 'booking', status: 'confirmed' }),
    lead({ id: 'c', kind: 'walkthrough', status: 'new' }),
    lead({ id: 'd', kind: 'waitlist', status: 'done' }),
  ];
  const ids = (out: Lead[]) => out.map((l) => l.id);

  it('keeps everything for all and all', () => {
    expect(ids(filterLeads(leads, { kind: 'all', status: 'all' }))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(filterLeads(leads, {}))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters by kind', () => {
    expect(ids(filterLeads(leads, { kind: 'booking' }))).toEqual(['a', 'b']);
    expect(ids(filterLeads(leads, { kind: 'walkthrough', status: 'all' }))).toEqual(['c']);
  });

  it('filters by status', () => {
    expect(ids(filterLeads(leads, { status: 'new' }))).toEqual(['a', 'c']);
  });

  it('filters by kind and status together, keeping order', () => {
    expect(ids(filterLeads(leads, { kind: 'booking', status: 'confirmed' }))).toEqual(['b']);
    expect(filterLeads(leads, { kind: 'application', status: 'new' })).toEqual([]);
  });
});

describe('renderInbox', () => {
  let list: HTMLUListElement;
  beforeEach(() => {
    document.body.innerHTML = '<ul data-lead-list></ul>';
    list = document.querySelector('ul')!;
  });

  const leads = [lead({ id: 'a' }), lead({ id: 'b', kind: 'walkthrough', contact: { ...lead().contact, firstName: 'Ana' } })];

  it('shows each lead with its describe text, kind and suburb', () => {
    renderInbox(list, leads, { selectedId: null, describe: (l) => `About ${l.id}`, onSelect: () => {}, timeZone: TZ });
    const rows = list.querySelectorAll('[data-lead-id]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Sam Lee');
    expect(rows[0].textContent).toContain('About a');
    expect(rows[0].textContent).toContain('Chermside');
    expect(rows[0].textContent).toContain('Sat 3 Oct, 10:00am');
    expect(rows[1].querySelector('[data-kind-label]')?.textContent).toBe('Walk-through');
  });

  it('marks the selected row and calls onSelect with the id', () => {
    const onSelect = vi.fn();
    renderInbox(list, leads, { selectedId: 'b', describe: () => '', onSelect, timeZone: TZ });
    const rows = list.querySelectorAll<HTMLButtonElement>('[data-lead-id]');
    expect(rows[0].hasAttribute('aria-current')).toBe(false);
    expect(rows[1].getAttribute('aria-current')).toBe('true');
    rows[0].click();
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('marks unread rows and uses the given badge', () => {
    renderInbox(list, leads, {
      selectedId: null,
      describe: () => '',
      onSelect: () => {},
      timeZone: TZ,
      isUnread: (l) => l.id === 'a',
      badge: (l) => el('span', { class: 'test-badge' }, l.status),
    });
    const rows = list.querySelectorAll<HTMLElement>('[data-lead-id]');
    expect(rows[0].hasAttribute('data-unread')).toBe(true);
    expect(rows[0].textContent).toContain('Unread');
    expect(rows[1].hasAttribute('data-unread')).toBe(false);
    expect(rows[0].querySelector('.test-badge')?.textContent).toBe('new');
  });

  it('never interprets lead data as HTML', () => {
    const evil = lead({ contact: { ...lead().contact, firstName: '<img src=x onerror=alert(1)>' }, suburb: '<b>x</b>' });
    renderInbox(list, [evil], { selectedId: null, describe: () => '<i>y</i>', onSelect: () => {}, timeZone: TZ });
    expect(list.querySelector('img, b, i')).toBeNull();
    expect(list.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('initShell', () => {
  const credentials = { email: 'owner@demo.test', password: 'pw1234' };

  function setup() {
    document.body.innerHTML = `
      <div id="root">
        <section data-view="signin">
          <form data-signin>
            <input name="email" id="signin-email" />
            <input name="password" type="password" />
            <p data-signin-error hidden></p>
            <button type="submit">Sign in</button>
          </form>
        </section>
        <div data-view="app" hidden><h1 tabindex="-1">Inbox</h1><button type="button" data-signout>Sign out</button></div>
      </div>`;
    const root = document.getElementById('root')!;
    const form = root.querySelector('form')!;
    const fill = (email: string, password: string) => {
      (form.elements.namedItem('email') as HTMLInputElement).value = email;
      (form.elements.namedItem('password') as HTMLInputElement).value = password;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    };
    const view = (name: string) => root.querySelector<HTMLElement>(`[data-view="${name}"]`)!;
    return { root, fill, view, error: root.querySelector<HTMLElement>('[data-signin-error]')! };
  }

  it('rejects wrong details with the demo message', () => {
    const { root, fill, view, error } = setup();
    const onSignedIn = vi.fn();
    initShell(root, { credentials, sessionKey: 'k', onSignedIn, storage: createMemoryStorage() });
    fill('owner@demo.test', 'wrong');
    expect(error.textContent).toBe(WRONG_LOGIN);
    expect(WRONG_LOGIN).toBe('Use the demo email and password shown above.');
    expect(error.hidden).toBe(false);
    expect(view('app').hidden).toBe(true);
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('signs in (email case and spaces ignored), remembers the session and signs out', () => {
    const { root, fill, view, error } = setup();
    const storage = createMemoryStorage();
    const onSignedIn = vi.fn();
    initShell(root, { credentials, sessionKey: 'k', onSignedIn, storage });
    fill(' Owner@Demo.test ', 'pw1234');
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(view('app').hidden).toBe(false);
    expect(view('signin').hidden).toBe(true);
    expect(error.hidden).toBe(true);
    expect(storage.getItem('k')).toBe('1');

    signOut();
    expect(storage.getItem('k')).toBeNull();
    expect(view('app').hidden).toBe(true);
    expect(view('signin').hidden).toBe(false);
  });

  it('restores a signed-in session on load', () => {
    const { root, view } = setup();
    const storage = createMemoryStorage();
    storage.setItem('k', '1');
    const onSignedIn = vi.fn();
    initShell(root, { credentials, sessionKey: 'k', onSignedIn, storage });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(view('app').hidden).toBe(false);
  });
});

describe('initTabs', () => {
  function setup() {
    document.body.innerHTML = `
      <div role="tablist">
        <button role="tab" id="t-a" data-tab="a" aria-controls="panel" aria-selected="true">A</button>
        <button role="tab" id="t-b" data-tab="b" aria-controls="panel" aria-selected="false">B</button>
        <button role="tab" id="t-c" data-tab="c" aria-controls="panel" aria-selected="false">C</button>
      </div>
      <div role="tabpanel" id="panel" aria-labelledby="t-a"></div>`;
    return document.querySelector<HTMLElement>('[role="tablist"]')!;
  }
  const key = (target: Element, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('uses a roving tabindex and selects on click', () => {
    const list = setup();
    const onChange = vi.fn();
    initTabs(list, onChange);
    const tabs = list.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect([...tabs].map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tabs[1].click();
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect([...tabs].map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.getElementById('panel')!.getAttribute('aria-labelledby')).toBe('t-b');
  });

  it('moves with arrow keys, Home and End, wrapping around', () => {
    const list = setup();
    const onChange = vi.fn();
    initTabs(list, onChange);
    const tabs = list.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[0].focus();
    key(tabs[0], 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2], 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('a');
    key(tabs[0], 'End');
    expect(onChange).toHaveBeenLastCalledWith('c');
    key(tabs[2], 'Home');
    expect(onChange).toHaveBeenLastCalledWith('a');
  });
});
