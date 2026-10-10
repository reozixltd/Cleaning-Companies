/**
 * Turns a Plan into the boxes of the 3D home model: walls and simple furniture,
 * in plan units (the units PlanRoom uses). Pure: no three.js and no DOM.
 * Only rooms that are in the home get boxes; a dashed "add" slot stays flat.
 */
import type { RoomKind } from '@/config/rooms';
import type { Plan, PlanRoom } from './layout';

export interface Box {
  room: string;
  kind: 'wall' | 'furniture';
  /** Top-left corner on the plan, then size along the plan's x and y. */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Height above the floor. */
  h: number;
}

export const WALL_HEIGHT = 0.9;
/** A wall that runs across the view would hide the floor behind it, so it stays low. */
export const LOW_WALL_HEIGHT = 0.2;
const WALL = 0.08;

/**
 * Furniture per room kind, as fractions of the room: x, y, width, depth, then
 * height in plan units. All of it sits in the top third, clear of the room's label.
 */
const FURNITURE: Record<RoomKind, [number, number, number, number, number][]> = {
  bedroom: [[0.2, 0.08, 0.6, 0.28, 0.25], [0.2, 0.08, 0.6, 0.04, 0.5]],
  bathroom: [[0.1, 0.08, 0.42, 0.2, 0.4], [0.62, 0.08, 0.28, 0.28, 0.25]],
  living: [[0.12, 0.1, 0.5, 0.26, 0.22], [0.12, 0.1, 0.5, 0.07, 0.42]],
  kitchen: [[0.08, 0.08, 0.84, 0.2, 0.45]],
  study: [[0.15, 0.08, 0.7, 0.22, 0.36]],
  laundry: [[0.15, 0.08, 0.7, 0.26, 0.42]],
};

function walls(r: PlanRoom): Box[] {
  const wall = (x: number, y: number, w: number, d: number, h: number): Box => ({ room: r.id, kind: 'wall', x, y, w, d, h });
  return [
    wall(r.x, r.y, r.w, WALL, r.y === 0 ? WALL_HEIGHT : LOW_WALL_HEIGHT),
    wall(r.x, r.y + r.h - WALL, r.w, WALL, LOW_WALL_HEIGHT),
    wall(r.x, r.y + WALL, WALL, r.h - 2 * WALL, WALL_HEIGHT),
    wall(r.x + r.w - WALL, r.y + WALL, WALL, r.h - 2 * WALL, WALL_HEIGHT),
  ];
}

function furniture(r: PlanRoom): Box[] {
  return FURNITURE[r.kind].map(([x, y, w, d, h]) => ({ room: r.id, kind: 'furniture', x: r.x + x * r.w, y: r.y + y * r.h, w: w * r.w, d: d * r.h, h }));
}

export function model(plan: Plan): Box[] {
  return plan.rooms.filter((r) => r.state === 'included').flatMap((r) => [...walls(r), ...furniture(r)]);
}
