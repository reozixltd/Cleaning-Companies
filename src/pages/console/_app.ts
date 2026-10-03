/**
 * Console entry: demo sign-in, sample data, the request list with its filters,
 * the selected request and CSV export. Phones show the list or one request;
 * wider screens show both side by side.
 */
import { business } from '@/config/business';
import { el } from '@/core/console/dom';
import { filterLeads, renderInbox, type InboxFilter } from '@/core/console/inbox';
import { initShell } from '@/core/console/shell';
import { initTabs } from '@/core/console/tabs';
import { todayIn } from '@/core/format';
import { getLeadRepository, seedDemoLeads, STATUS_LABELS, type Lead, type LeadStatus } from '@/core/leads';
import { DEFAULT_COLUMNS, leadsToCsv } from '@/core/leads/csv';
import { getStorage, readJson, writeJson } from '@/core/storage';
import { describeLead } from './_booking';
import { DEMO_LOGIN, OPENED_KEY, SAMPLE_ID_PREFIX, SEEDED_KEY, SESSION_KEY } from './_demo';
import { renderDetail, statusBadge, type DetailHandlers } from './_detail';
import { loadSampleLeads } from './_sample-leads';

const repo = getLeadRepository();
const storage = getStorage();
const root = document.querySelector<HTMLElement>('[data-console]')!;
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
const narrow = window.matchMedia('(max-width: 1023px)');

const state = { leads: [] as Lead[], filter: { kind: 'all', status: 'all' } as Required<InboxFilter>, selected: null as string | null };
const opened = new Set(readJson<string[]>(storage, OPENED_KEY, []));
const isUnread = (l: Lead) => l.status === 'new' && !opened.has(l.id);
const announce = (text: string) => ($('[data-announce]').textContent = text);

function markOpened(id: string | null): void {
  if (id === null) opened.clear();
  else opened.add(id);
  writeJson(storage, OPENED_KEY, [...opened]);
}

/** Fresh samples alongside the owner's own requests; old samples no longer count as opened. */
async function loadSamples(): Promise<void> {
  await loadSampleLeads({ list: () => repo.list(), seed: seedDemoLeads }, new Date());
  storage.setItem(SEEDED_KEY, '1');
  for (const id of [...opened]) if (id.startsWith(SAMPLE_ID_PREFIX)) opened.delete(id);
  writeJson(storage, OPENED_KEY, [...opened]);
}

async function refresh(): Promise<void> {
  state.leads = await repo.list();
  if (!state.leads.some((l) => l.id === state.selected)) state.selected = null;
  render();
}

function render(): void {
  const shown = filterLeads(state.leads, state.filter);
  renderInbox($('[data-lead-list]'), shown, {
    selectedId: state.selected,
    // A word joiner after each dash keeps "8–10am" on one line.
    describe: (l) => describeLead(l).replace(/–/g, '–\u2060'),
    onSelect: select,
    timeZone: business.timeZone,
    isUnread,
    badge: (l) => statusBadge(l.status),
  });
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => {
    c.textContent = String(filterLeads(state.leads, { kind: c.dataset.count as InboxFilter['kind'], status: state.filter.status }).length);
  });
  const unread = state.leads.filter(isUnread).length;
  $('[data-summary]').textContent = state.leads.length
    ? `${state.leads.length} ${state.leads.length === 1 ? 'request' : 'requests'}${unread ? `, ${unread} unread` : ''}`
    : 'No requests yet';
  $('[data-empty]').hidden = state.leads.length > 0;
  $('[data-no-match]').hidden = !state.leads.length || shown.length > 0;
  $<HTMLButtonElement>('[data-export]').disabled = shown.length === 0;

  const lead = state.leads.find((l) => l.id === state.selected);
  const panel = $('[data-detail]');
  $('[data-workspace]').dataset.showing = lead ? 'detail' : 'list';
  panel.hidden = !lead;
  $('[data-detail-empty]').hidden = Boolean(lead) || !state.leads.length;
  if (lead) renderDetail(panel, lead, handlers);
}

function select(id: string): void {
  state.selected = id;
  markOpened(id);
  render();
  if (narrow.matches) {
    window.scrollTo(0, 0);
    $('[data-detail-name]').focus();
  }
}

async function change(run: () => Promise<unknown>, message: string, focus: string): Promise<void> {
  try {
    await run();
  } catch (err) {
    announce(err instanceof Error ? err.message : 'Could not save the change.');
    return;
  }
  await refresh();
  announce(message);
  root.querySelector<HTMLElement>(focus)?.focus();
}

const handlers: DetailHandlers = {
  onStatus: (id, status: LeadStatus) => void change(() => repo.updateStatus(id, status), `Marked ${STATUS_LABELS[status].toLowerCase()}.`, '[data-detail-name]'),
  onNote: (id, note) => void change(() => repo.addNote(id, note), 'Note added.', '.note__input'),
  onBack: () => {
    const id = state.selected ?? '';
    state.selected = null;
    render();
    root.querySelector<HTMLElement>(`[data-lead-id="${CSS.escape(id)}"]`)?.focus();
  },
};

initTabs($('[data-kind-tabs]'), (kind) => {
  state.filter.kind = kind as Required<InboxFilter>['kind'];
  render();
});

$<HTMLSelectElement>('[data-status-filter]').addEventListener('change', (e) => {
  state.filter.status = (e.target as HTMLSelectElement).value as Required<InboxFilter>['status'];
  render();
});

$('[data-export]').addEventListener('click', () => {
  const csv = leadsToCsv(filterLeads(state.leads, state.filter), [...DEFAULT_COLUMNS, { header: 'Request', value: describeLead }]);
  const href = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = el('a', { href, download: `clearday-leads-${todayIn(business.timeZone, new Date())}.csv`, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});

$('[data-load-samples]').addEventListener('click', () =>
  void change(loadSamples, 'Sample leads loaded.', '[data-focus-on-show]').catch(() => announce('Could not load sample leads.')),
);

$('[data-clear]').addEventListener('click', () =>
  void change(async () => {
    await repo.clear();
    storage.setItem(SEEDED_KEY, '1');
    markOpened(null);
  }, 'Leads cleared.', '[data-focus-on-show]'),
);

initShell(root, {
  credentials: DEMO_LOGIN,
  sessionKey: SESSION_KEY,
  onSignedIn: () =>
    void (async () => {
      if (storage.getItem(SEEDED_KEY) !== '1') await loadSamples().catch(() => announce('Could not load sample leads.'));
      await refresh();
    })(),
});
