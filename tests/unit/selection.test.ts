import { describe, expect, it } from 'vitest';
import { DEFAULT_SELECTION, fromParams, loadSelection, normalise, saveSelection, toParams } from '@/domain/selection';
import { describeRooms, describeSelection } from '@/domain/describe';
import { pricing } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { createMemoryStorage } from '@/core/storage';

const max = rooms.max;

describe('selection', () => {
  it('fromParams clamps and defaults', () => {
    const s = fromParams('?bed=99&bath=0&service=pool&freq=daily&extras=oven,jacuzzi,oven', pricing, max);
    expect(s).toMatchObject({ bedrooms: 6, bathrooms: 1, service: 'regular', frequency: 'fortnightly', addOns: ['oven'] });
  });

  it('fromParams treats garbage numbers as the default', () => {
    expect(fromParams('?bed=abc&bath=2.7', pricing, max)).toMatchObject({ bedrooms: 3, bathrooms: 3 });
  });

  it('toParams and fromParams round-trip', () => {
    const s = { ...DEFAULT_SELECTION, study: true, addOns: ['oven' as const, 'blinds' as const] };
    expect(toParams(s)).toBe('service=regular&bed=3&bath=2&study=1&laundry=0&freq=fortnightly&extras=oven,blinds');
    expect(fromParams('?' + toParams(s), pricing, max)).toEqual(s);
    expect(fromParams(toParams(DEFAULT_SELECTION), pricing, max)).toEqual(DEFAULT_SELECTION);
  });

  it('normalise forces one-off services to once', () => {
    expect(normalise({ service: 'move-in', frequency: 'weekly' }, pricing, max).frequency).toBe('once');
  });

  it('saves and loads through storage', () => {
    const storage = createMemoryStorage();
    expect(loadSelection(storage, pricing, max)).toBeNull();
    saveSelection(storage, { ...DEFAULT_SELECTION, bedrooms: 5 });
    expect(loadSelection(storage, pricing, max)?.bedrooms).toBe(5);
    storage.setItem('clearday:v1:selection', '{"bedrooms": 40}');
    expect(loadSelection(storage, pricing, max)?.bedrooms).toBe(6);
  });
});

describe('describe', () => {
  it('describeSelection', () => {
    expect(describeSelection(DEFAULT_SELECTION)).toBe('3 bed, 2 bath, fortnightly');
    expect(describeSelection({ ...DEFAULT_SELECTION, service: 'end-of-lease', frequency: 'once' })).toBe('3 bed, 2 bath, end of lease');
    expect(describeSelection({ ...DEFAULT_SELECTION, service: 'deep', frequency: 'monthly' })).toBe('3 bed, 2 bath, deep clean, monthly');
  });

  it('describeRooms uses singular for one', () => {
    expect(describeRooms(DEFAULT_SELECTION)).toBe('3 bedrooms, 2 bathrooms, living, kitchen');
    expect(describeRooms({ ...DEFAULT_SELECTION, bedrooms: 1, bathrooms: 1, study: true, laundry: true })).toBe(
      '1 bedroom, 1 bathroom, living, kitchen, study, laundry',
    );
  });
});
