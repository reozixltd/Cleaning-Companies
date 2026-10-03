import { describe, expect, it } from 'vitest';
import { keptOnlyInPage } from '@/features/booking/send';
import { LocalLeadRepository } from '@/core/leads/local-repository';
import type { LeadRepository } from '@/core/leads/repository';
import { createMemoryStorage } from '@/core/storage';

const browserStore = new LocalLeadRepository(createMemoryStorage());
const serverStore = { create: async () => ({}) } as unknown as LeadRepository;

describe('keptOnlyInPage (the success screen says this browser kept no copy)', () => {
  it('is true when the demo store saved the request and the browser blocks storage', () => {
    expect(keptOnlyInPage(browserStore, false)).toBe(true);
  });

  it('is false when the browser keeps storage, the usual case', () => {
    expect(keptOnlyInPage(browserStore, true)).toBe(false);
  });

  it('is false for a store that is not this browser (production), whatever the browser allows', () => {
    expect(keptOnlyInPage(serverStore, false)).toBe(false);
  });
});
