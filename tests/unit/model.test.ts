import { describe, expect, it } from 'vitest';
import { rooms } from '@/config/rooms';
import { DEFAULT_SELECTION } from '@/domain/selection';
import { layout } from '@/features/plan/layout';
import { LOW_WALL_HEIGHT, WALL_HEIGHT, model } from '@/features/plan/model';

const home = layout(DEFAULT_SELECTION, rooms);
const boxes = model(home);
const full = layout({ ...DEFAULT_SELECTION, bedrooms: rooms.max.bedrooms, bathrooms: rooms.max.bathrooms, study: true, laundry: true }, rooms);
const EPSILON = 1e-9;

describe('model', () => {
  it('gives the default home four walls a room: 28 for its 7 rooms', () => {
    expect(home.rooms.filter((r) => r.state === 'included')).toHaveLength(7);
    expect(boxes.filter((b) => b.kind === 'wall')).toHaveLength(28);
  });

  it('builds 41 boxes for the default home and 81 for the largest', () => {
    expect(boxes).toHaveLength(41);
    expect(model(full)).toHaveLength(81);
  });

  it('builds nothing on a dashed "add" slot', () => {
    const slots = home.rooms.filter((r) => r.state === 'available').map((r) => r.id);
    expect(slots.length).toBeGreaterThan(0);
    expect(boxes.filter((b) => slots.includes(b.room))).toEqual([]);
  });

  for (const [name, plan] of [['default', home], ['largest', full]] as const) {
    it(`keeps every box inside its room (${name} home)`, () => {
      for (const b of model(plan)) {
        const r = plan.rooms.find((room) => room.id === b.room)!;
        expect(b.x, b.room).toBeGreaterThanOrEqual(r.x - EPSILON);
        expect(b.y, b.room).toBeGreaterThanOrEqual(r.y - EPSILON);
        expect(b.x + b.w, b.room).toBeLessThanOrEqual(r.x + r.w + EPSILON);
        expect(b.y + b.d, b.room).toBeLessThanOrEqual(r.y + r.h + EPSILON);
        expect(b.w > 0 && b.d > 0 && b.h > 0, b.room).toBe(true);
      }
    });
  }

  it('keeps walls that run across the view low, except along the back of the plan', () => {
    const across = boxes.filter((b) => b.kind === 'wall' && b.w > b.d);
    for (const b of across) expect(b.h).toBe(b.y === 0 ? WALL_HEIGHT : LOW_WALL_HEIGHT);
    expect(across.some((b) => b.h === WALL_HEIGHT)).toBe(true);
  });

  it('furnishes every room in the home, in the top part of the room so the label stays clear', () => {
    for (const r of full.rooms) {
      const furniture = model(full).filter((b) => b.room === r.id && b.kind === 'furniture');
      expect(furniture.length, r.id).toBeGreaterThan(0);
      for (const b of furniture) {
        expect(b.y + b.d, r.id).toBeLessThanOrEqual(r.y + r.h * 0.4);
        expect(b.h, r.id).toBeLessThan(WALL_HEIGHT);
      }
    }
  });
});
