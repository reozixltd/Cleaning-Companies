/**
 * Rooms on the floor plan and what gets cleaned in each.
 * Regular = `every`; deep and move-in add `deep`; end of lease adds `endOfLease` too.
 */
export const ROOM_KINDS = ['bedroom', 'bathroom', 'living', 'kitchen', 'study', 'laundry'] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export interface RoomChecklist {
  label: string;
  every: string[];
  deep: string[];
  endOfLease: string[];
}

export interface RoomsConfig {
  /** Plan grid in plan units: rows stack top to bottom; living gets `livingShare` of the width. */
  plan: { width: number; rows: { sleep: number; wet: number; living: number }; livingShare: number };
  max: { bedrooms: number; bathrooms: number };
  rooms: Record<RoomKind, RoomChecklist>;
}

export const rooms: RoomsConfig = {
  plan: { width: 12, rows: { sleep: 4, wet: 3, living: 3 }, livingShare: 7 },
  max: { bedrooms: 6, bathrooms: 4 },
  rooms: {
    bedroom: {
      label: 'Bedroom',
      every: ['Dust surfaces, sills and skirting you can reach', 'Make the bed (change linen if you leave fresh sheets out)', 'Vacuum and mop floors', 'Empty bins'],
      deep: ['Dust ceiling fans and light fittings', 'Wipe doors, handles and light switches', 'Vacuum under the bed and behind furniture'],
      endOfLease: ['Inside wardrobes, drawers and shelves', 'Spot-clean marks on walls'],
    },
    bathroom: {
      label: 'Bathroom',
      every: ['Clean shower, bath and screen', 'Clean and disinfect toilet', 'Clean vanity, basin and tapware', 'Polish mirrors', 'Mop floors'],
      deep: ['Scrub grout and remove soap scum', 'Clean exhaust fan cover', 'Wipe cabinet fronts and doors'],
      endOfLease: ['Inside cabinets and drawers', 'Descale shower head and taps'],
    },
    living: {
      label: 'Living',
      every: ['Dust surfaces, shelves and TV unit', 'Vacuum sofa cushions', 'Vacuum and mop floors', 'Wipe light switches'],
      deep: ['Dust ceiling fans, vents and light fittings', 'Wipe skirting boards and door frames', 'Vacuum under and behind furniture'],
      endOfLease: ['Window sills and tracks', 'Spot-clean marks on walls'],
    },
    kitchen: {
      label: 'Kitchen',
      every: ['Wipe benches and splashback', 'Clean sink and tapware', 'Wipe outside of appliances', 'Clean stovetop', 'Mop floors'],
      deep: ['Wipe cupboard fronts and handles', 'Clean range hood filter and cover', 'Clean inside the microwave'],
      endOfLease: ['Inside cupboards and drawers', 'Inside oven, grill and trays', 'Behind the fridge space'],
    },
    study: {
      label: 'Study',
      every: ['Dust desk and shelves (papers left where they are)', 'Vacuum and mop floors', 'Empty bins'],
      deep: ['Dust light fittings and vents', 'Wipe doors, handles and switches'],
      endOfLease: ['Inside cupboards and shelves'],
    },
    laundry: {
      label: 'Laundry',
      every: ['Wipe tub and tapware', 'Wipe outside of machines', 'Mop floors'],
      deep: ['Clean lint filter and machine seals', 'Wipe cupboard fronts'],
      endOfLease: ['Inside cupboards', 'Behind and under machine spaces'],
    },
  },
};
