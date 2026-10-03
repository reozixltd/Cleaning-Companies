import { beforeEach, describe, expect, it } from 'vitest';
import { LocalLeadRepository, LEADS_KEY } from '@/core/leads/local-repository';
import { createMemoryStorage, type KeyValueStorage } from '@/core/storage';
import type { LeadInput } from '@/core/leads/types';

let ref = 0;
const input = (over: Partial<LeadInput> = {}): LeadInput => ({
  kind: 'booking',
  contact: { firstName: 'Sam', lastName: 'Lee', phone: '0491570110', email: 'sam@example.com' },
  suburb: 'Chermside',
  postcode: '4032',
  consent: { terms: true, marketingSms: false, marketingEmail: false, at: '2026-10-03T00:00:00.000Z' },
  payload: {},
  clientRef: `r${++ref}`,
  ...over,
});

describe('LocalLeadRepository', () => {
  let clock = 1_000_000;
  let repo: LocalLeadRepository;

  beforeEach(() => {
    clock = 1_000_000;
    repo = new LocalLeadRepository(createMemoryStorage(), () => clock);
  });

  it('creates a lead with id, new status and timestamp', async () => {
    const lead = await repo.create(input());
    expect(lead.id).toMatch(/^L-/);
    expect(lead.status).toBe('new');
    expect(lead.createdAt).toBe(new Date(clock).toISOString());
    expect(lead.history).toEqual([]);
  });

  it('create with the same clientRef returns the existing lead', async () => {
    const a = await repo.create(input({ clientRef: 'r1-same' }));
    const b = await repo.create(input({ clientRef: 'r1-same' }));
    expect(b.id).toBe(a.id);
    expect(await repo.list()).toHaveLength(1);
  });

  it('create throws when the write fails', async () => {
    const full: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const r = new LocalLeadRepository(full, () => clock);
    await expect(r.create(input())).rejects.toThrow(/Could not save/);
  });

  it('list filters by kind and status, newest first', async () => {
    const a = await repo.create(input());
    clock += 1000;
    const b = await repo.create(input());
    await repo.updateStatus(b.id, 'confirmed');
    clock += 1000;
    await repo.create(input({ kind: 'walkthrough' }));
    expect(await repo.list({ kind: 'booking' })).toHaveLength(2);
    const fresh = await repo.list({ status: 'new' });
    expect(fresh.map((l) => l.kind)).toEqual(['walkthrough', 'booking']);
    expect(fresh[1].id).toBe(a.id);
  });

  it('updates status and records it in the history', async () => {
    const lead = await repo.create(input());
    clock += 1000;
    const updated = await repo.updateStatus(lead.id, 'confirmed');
    expect(updated.status).toBe('confirmed');
    expect(updated.history.at(-1)).toEqual({ at: new Date(clock).toISOString(), type: 'status', value: 'confirmed' });
  });

  it('adds a trimmed note', async () => {
    const lead = await repo.create(input());
    const updated = await repo.addNote(lead.id, '  Key under the mat  ');
    expect(updated.history.at(-1)).toMatchObject({ type: 'note', value: 'Key under the mat' });
  });

  it('throws on an unknown id', async () => {
    await expect(repo.updateStatus('L-nope', 'done')).rejects.toThrow(/not found/i);
  });

  it('rate-limits after 5 submissions in an hour, then recovers', async () => {
    for (let i = 0; i < 5; i++) await repo.create(input());
    await expect(repo.create(input())).rejects.toThrow(/too many/i);
    clock += 61 * 60_000;
    await expect(repo.create(input())).resolves.toBeDefined();
  });

  it('keeps working when storage contains corrupt data', async () => {
    const storage = createMemoryStorage();
    storage.setItem(LEADS_KEY, '{not json');
    const r = new LocalLeadRepository(storage, () => clock);
    expect(await r.list()).toEqual([]);
  });

  it('clears all leads', async () => {
    await repo.create(input());
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it('seed replaces every stored lead in one write, and changes nothing when that write fails', async () => {
    const memory = createMemoryStorage();
    let full = false;
    const storage: KeyValueStorage = {
      getItem: (k) => memory.getItem(k),
      setItem: (k, v) => {
        if (full) throw new Error('QuotaExceededError');
        memory.setItem(k, v);
      },
      removeItem: (k) => memory.removeItem(k),
    };
    const r = new LocalLeadRepository(storage, () => clock);
    const old = await r.create(input());
    const kept = await r.create(input());
    await r.seed([kept]);
    expect((await r.list()).map((l) => l.id)).toEqual([kept.id]);
    expect(old.id).not.toBe(kept.id);

    const before = memory.getItem(LEADS_KEY);
    full = true;
    await expect(r.seed([])).rejects.toThrow(/Could not load sample leads/);
    expect(memory.getItem(LEADS_KEY)).toBe(before);
  });

  it('uses the clearday namespace', () => {
    expect(LEADS_KEY).toBe('clearday:v1:leads');
  });
});
