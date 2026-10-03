/**
 * What the visitor has picked: service, rooms, frequency and extras.
 * Shared by the floor plan, the price tags and the booking form. Anything that
 * arrives from outside (URL, storage) goes through normalise(), so a hand-edited
 * link can never put the page in an impossible state.
 */
import type { KeyValueStorage } from '@/core/storage';
import { readJson, writeJson } from '@/core/storage';
import { ADD_ON_IDS, FREQUENCIES, SERVICE_IDS, type AddOnId, type Frequency, type PricingConfig, type ServiceId } from '@/config/pricing';

export interface Selection {
  service: ServiceId;
  bedrooms: number;
  bathrooms: number;
  study: boolean;
  laundry: boolean;
  frequency: Frequency;
  addOns: AddOnId[];
}

export interface RoomLimits {
  bedrooms: number;
  bathrooms: number;
}

export const DEFAULT_SELECTION: Selection = {
  service: 'regular',
  bedrooms: 3,
  bathrooms: 2,
  study: false,
  laundry: false,
  frequency: 'fortnightly',
  addOns: [],
};

export const SELECTION_KEY = 'clearday:v1:selection';

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

function count(value: unknown, fallback: number, maxValue: number): number {
  const n = Math.round(Number(value));
  if (value === undefined || value === null || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), maxValue);
}

export function normalise(s: Partial<Selection>, pricing: PricingConfig, max: RoomLimits): Selection {
  const service = pick(s.service, SERVICE_IDS, DEFAULT_SELECTION.service);
  const frequency = pricing.oneOffOnly.includes(service) ? 'once' : pick(s.frequency, FREQUENCIES, DEFAULT_SELECTION.frequency);
  const addOns = Array.isArray(s.addOns) ? [...new Set(s.addOns.filter((a): a is AddOnId => ADD_ON_IDS.includes(a)))] : [];
  return {
    service,
    bedrooms: count(s.bedrooms, DEFAULT_SELECTION.bedrooms, max.bedrooms),
    bathrooms: count(s.bathrooms, DEFAULT_SELECTION.bathrooms, max.bathrooms),
    study: s.study === true,
    laundry: s.laundry === true,
    frequency,
    addOns,
  };
}

/** "service=regular&bed=3&bath=2&study=0&laundry=0&freq=fortnightly[&extras=oven,blinds]" */
export function toParams(s: Selection): string {
  const p = new URLSearchParams({
    service: s.service,
    bed: String(s.bedrooms),
    bath: String(s.bathrooms),
    study: s.study ? '1' : '0',
    laundry: s.laundry ? '1' : '0',
    freq: s.frequency,
  });
  if (s.addOns.length) p.set('extras', s.addOns.join(','));
  return p.toString().replace(/%2C/g, ',');
}

export function fromParams(search: string, pricing: PricingConfig, max: RoomLimits): Selection {
  const p = new URLSearchParams(search);
  const flag = (key: string, fallback: boolean) => (p.has(key) ? p.get(key) === '1' : fallback);
  return normalise(
    {
      service: (p.get('service') ?? undefined) as ServiceId,
      bedrooms: p.get('bed') ?? undefined,
      bathrooms: p.get('bath') ?? undefined,
      study: flag('study', DEFAULT_SELECTION.study),
      laundry: flag('laundry', DEFAULT_SELECTION.laundry),
      frequency: (p.get('freq') ?? undefined) as Frequency,
      addOns: (p.get('extras') ?? '').split(',').filter(Boolean) as AddOnId[],
    } as unknown as Partial<Selection>,
    pricing,
    max,
  );
}

export function loadSelection(storage: KeyValueStorage, pricing: PricingConfig, max: RoomLimits): Selection | null {
  const saved = readJson<Partial<Selection> | null>(storage, SELECTION_KEY, null);
  return saved && typeof saved === 'object' ? normalise(saved, pricing, max) : null;
}

export function saveSelection(storage: KeyValueStorage, s: Selection): void {
  writeJson(storage, SELECTION_KEY, s);
}
