/**
 * The storage contract for leads. Forms and the console depend only on this
 * interface, so swapping the demo store for a real API is a one-line change
 * in ./index.ts.
 */
import type { Lead, LeadInput, LeadKind, LeadStatus } from './types';

export interface LeadFilter {
  kind?: LeadKind;
  status?: LeadStatus;
}

export interface LeadRepository {
  create(input: LeadInput): Promise<Lead>;
  /** Newest first. */
  list(filter?: LeadFilter): Promise<Lead[]>;
  get(id: string): Promise<Lead | null>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead>;
  addNote(id: string, note: string): Promise<Lead>;
  clear(): Promise<void>;
}

export class RateLimitError extends Error {
  constructor() {
    super('Too many requests from this device. Please call us instead.');
    this.name = 'RateLimitError';
  }
}
