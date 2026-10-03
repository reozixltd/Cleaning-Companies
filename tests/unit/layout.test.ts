import { describe, expect, it } from 'vitest';
import { layout } from '@/features/plan/layout';
import { DEFAULT_SELECTION, type Selection } from '@/domain/selection';
import { rooms } from '@/config/rooms';

const EPS = 1e-9;
const homes: Selection[] = [];
for (let bedrooms = 1; bedrooms <= 6; bedrooms++)
  for (let bathrooms = 1; bathrooms <= 4; bathrooms++)
    for (const study of [false, true])
      for (const laundry of [false, true]) homes.push({ ...DEFAULT_SELECTION, bedrooms, bathrooms, study, laundry });

describe('layout', () => {
  it('covers 96 home shapes', () => {
    expect(homes).toHaveLength(96);
  });

  it('rooms tile the plan with no gaps or overlaps', () => {
    for (const s of homes) {
      const plan = layout(s, rooms);
      const area = plan.rooms.reduce((t, r) => t + r.w * r.h, 0);
      expect(Math.abs(area - plan.width * plan.height), JSON.stringify(s)).toBeLessThan(EPS);
      for (let i = 0; i < plan.rooms.length; i++)
        for (let j = i + 1; j < plan.rooms.length; j++) {
          const a = plan.rooms[i];
          const b = plan.rooms[j];
          const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          expect(overlapX > EPS && overlapY > EPS, `${a.id} overlaps ${b.id}`).toBe(false);
        }
    }
  });

  it('ids are unique and labels follow the pattern', () => {
    const plan = layout({ ...DEFAULT_SELECTION, bedrooms: 2, bathrooms: 1 }, rooms);
    const ids = plan.rooms.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.rooms.map((r) => [r.id, r.label, r.state])).toEqual([
      ['bed-1', 'Bed 1', 'included'],
      ['bed-2', 'Bed 2', 'included'],
      ['add-bedroom', 'Add a bedroom', 'available'],
      ['bath-1', 'Bath 1', 'included'],
      ['add-bathroom', 'Add a bathroom', 'available'],
      ['add-laundry', 'Add a laundry', 'available'],
      ['add-study', 'Add a study', 'available'],
      ['living', 'Living', 'included'],
      ['kitchen', 'Kitchen', 'included'],
    ]);
  });

  it('available slots appear only below the maximum', () => {
    const full = layout({ ...DEFAULT_SELECTION, bedrooms: 6, bathrooms: 4, study: true, laundry: true }, rooms);
    const ids = full.rooms.map((r) => r.id);
    expect(ids.filter((id) => id.startsWith('add-'))).toEqual([]);
    expect(ids).toContain('study');
    expect(ids).toContain('laundry');
  });

  it('living and kitchen are always included, living takes 7/12 of the width', () => {
    for (const s of homes) {
      const plan = layout(s, rooms);
      const living = plan.rooms.find((r) => r.id === 'living')!;
      expect(living.state).toBe('included');
      expect(living.w).toBeCloseTo(7);
      expect(plan.rooms.find((r) => r.id === 'kitchen')?.state).toBe('included');
    }
  });

  it('rows stack sleep, wet, living', () => {
    const plan = layout(DEFAULT_SELECTION, rooms);
    expect(plan.width).toBe(12);
    expect(plan.height).toBe(10);
    expect(plan.rooms.find((r) => r.id === 'bed-1')).toMatchObject({ y: 0, h: 4, kind: 'bedroom' });
    expect(plan.rooms.find((r) => r.id === 'bath-1')).toMatchObject({ y: 4, h: 3, kind: 'bathroom' });
    expect(plan.rooms.find((r) => r.id === 'living')).toMatchObject({ y: 7, h: 3, kind: 'living' });
  });

  it('without slots, only included rooms tile the plan', () => {
    for (const s of homes) {
      const plan = layout(s, rooms, { slots: false });
      expect(plan.rooms.every((r) => r.state === 'included'), JSON.stringify(s)).toBe(true);
      const area = plan.rooms.reduce((t, r) => t + r.w * r.h, 0);
      expect(Math.abs(area - plan.width * plan.height)).toBeLessThan(EPS);
    }
  });
});
