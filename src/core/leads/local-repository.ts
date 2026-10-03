/**
 * DEMO lead store backed by browser storage. Leads only exist in the browser
 * that created them: fine for showing the flow, never for a real client.
 * Production uses an HTTP repository (see ./index.ts).
 */
import { readJson, writeJson, type KeyValueStorage } from '../storage';
import { RateLimitError, type LeadFilter, type LeadRepository } from './repository';
import type { Lead, LeadInput, LeadStatus } from './types';

export const LEADS_KEY = 'clearday:v1:leads';
export const SUBMITS_KEY = 'clearday:v1:submits';
const RATE = { max: 5, windowMs: 60 * 60 * 1000 };

export class LocalLeadRepository implements LeadRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => number = Date.now,
  ) {}

  async create(input: LeadInput): Promise<Lead> {
    const leads = this.read();
    const existing = leads.find((l) => l.clientRef === input.clientRef);
    if (existing) return existing;
    this.enforceRateLimit();
    const lead: Lead = {
      ...input,
      id: `L-${this.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      createdAt: new Date(this.now()).toISOString(),
      status: 'new',
      history: [],
    };
    leads.push(lead);
    if (!this.write(leads)) throw new Error('Could not save your request on this device.');
    return lead;
  }

  async list(filter: LeadFilter = {}): Promise<Lead[]> {
    return this.read()
      .filter((l) => (!filter.kind || l.kind === filter.kind) && (!filter.status || l.status === filter.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Lead | null> {
    return this.read().find((l) => l.id === id) ?? null;
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    return this.mutate(id, (lead, at) => {
      lead.status = status;
      lead.history.push({ at, type: 'status', value: status });
    });
  }

  async addNote(id: string, note: string): Promise<Lead> {
    return this.mutate(id, (lead, at) => lead.history.push({ at, type: 'note', value: note.trim() }));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(LEADS_KEY);
    this.storage.removeItem(SUBMITS_KEY);
  }

  /**
   * Demo only: replaces every stored lead with `leads` (pre-built sample data
   * plus whatever the caller keeps), bypassing the rate limit. It is one write,
   * so if it fails (storage full) the stored leads are left as they were.
   */
  async seed(leads: Lead[]): Promise<void> {
    if (!this.write(leads)) throw new Error('Could not load sample leads (storage full).');
  }

  private mutate(id: string, change: (lead: Lead, at: string) => void): Lead {
    const leads = this.read();
    const lead = leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    change(lead, new Date(this.now()).toISOString());
    if (!this.write(leads)) throw new Error('Could not save the change on this device (storage full).');
    return lead;
  }

  private enforceRateLimit(): void {
    const cutoff = this.now() - RATE.windowMs;
    const recent = readJson<number[]>(this.storage, SUBMITS_KEY, []).filter((t) => t > cutoff);
    if (recent.length >= RATE.max) throw new RateLimitError();
    recent.push(this.now());
    writeJson(this.storage, SUBMITS_KEY, recent);
  }

  private read(): Lead[] {
    const data = readJson<unknown>(this.storage, LEADS_KEY, []);
    return Array.isArray(data) ? (data as Lead[]) : [];
  }

  private write(leads: Lead[]): boolean {
    return writeJson(this.storage, LEADS_KEY, leads);
  }
}
