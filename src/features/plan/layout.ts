/**
 * Turns room counts into a floor plan: three rows stacked top to bottom,
 *   sleep row:  bedrooms, then an "add a bedroom" slot while below the maximum
 *   wet row:    bathrooms (+ add slot), laundry or its add slot, study or its add slot
 *   living row: living (livingShare of the width) and kitchen
 * Rooms in a row share its width equally, so the plan always tiles with no gaps.
 */
import type { RoomKind, RoomsConfig } from '@/config/rooms';
import type { Selection } from '@/domain/selection';

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 'available' = a dashed slot the visitor can press to add the room. */
  state: 'included' | 'available';
}

export interface Plan {
  width: number;
  height: number;
  rooms: PlanRoom[];
}

type Cell = Pick<PlanRoom, 'id' | 'kind' | 'label' | 'state'>;

const included = (id: string, kind: RoomKind, label: string): Cell => ({ id, kind, label, state: 'included' });
const available = (kind: RoomKind, noun: string): Cell => ({ id: `add-${kind}`, kind, label: `Add a ${noun}`, state: 'available' });

function row(cells: Cell[], y: number, h: number, width: number): PlanRoom[] {
  const w = width / cells.length;
  return cells.map((c, i) => ({ ...c, x: i * w, y, w, h }));
}

/** `slots: false` draws only the rooms in the home (the read-only checklist plan). */
export function layout(s: Selection, config: RoomsConfig, opts: { slots?: boolean } = {}): Plan {
  const { width, rows, livingShare } = config.plan;
  const slots = opts.slots ?? true;

  const sleep: Cell[] = Array.from({ length: s.bedrooms }, (_, i) => included(`bed-${i + 1}`, 'bedroom', `Bed ${i + 1}`));
  if (slots && s.bedrooms < config.max.bedrooms) sleep.push(available('bedroom', 'bedroom'));

  const wet: Cell[] = Array.from({ length: s.bathrooms }, (_, i) => included(`bath-${i + 1}`, 'bathroom', `Bath ${i + 1}`));
  if (slots && s.bathrooms < config.max.bathrooms) wet.push(available('bathroom', 'bathroom'));
  if (s.laundry) wet.push(included('laundry', 'laundry', 'Laundry'));
  else if (slots) wet.push(available('laundry', 'laundry'));
  if (s.study) wet.push(included('study', 'study', 'Study'));
  else if (slots) wet.push(available('study', 'study'));

  const livingY = rows.sleep + rows.wet;
  const living: PlanRoom[] = [
    { ...included('living', 'living', 'Living'), x: 0, y: livingY, w: livingShare, h: rows.living },
    { ...included('kitchen', 'kitchen', 'Kitchen'), x: livingShare, y: livingY, w: width - livingShare, h: rows.living },
  ];

  return {
    width,
    height: rows.sleep + rows.wet + rows.living,
    rooms: [...row(sleep, 0, rows.sleep, width), ...row(wet, rows.sleep, rows.wet, width), ...living],
  };
}
