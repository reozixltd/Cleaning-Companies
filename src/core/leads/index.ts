/**
 * The single place that decides which lead store the site uses.
 * Production: replace LocalLeadRepository with an HttpLeadRepository that
 * implements the same LeadRepository interface.
 */
import { getStorage } from '../storage';
import { LocalLeadRepository } from './local-repository';
import type { LeadRepository } from './repository';
import type { Lead } from './types';

let repo: LocalLeadRepository | null = null;

function local(): LocalLeadRepository {
  repo ??= new LocalLeadRepository(getStorage());
  return repo;
}

export function getLeadRepository(): LeadRepository {
  return local();
}

/** Demo-only: replaces the stored leads with this list in one write. Not part of LeadRepository, so production stores don't need it. */
export async function seedDemoLeads(leads: Lead[]): Promise<void> {
  await local().seed(leads);
}

export * from './types';
export { RateLimitError, type LeadFilter, type LeadRepository } from './repository';
