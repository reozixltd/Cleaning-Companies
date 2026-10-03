import { describe, expect, it } from 'vitest';
import { checklistFor } from '@/domain/checklist';
import { rooms } from '@/config/rooms';

const kitchen = rooms.rooms.kitchen;

describe('checklistFor', () => {
  it('regular is the every list', () => {
    expect(checklistFor('kitchen', 'regular', rooms)).toEqual(kitchen.every);
  });

  it('deep and move-in add the deep list', () => {
    expect(checklistFor('kitchen', 'deep', rooms)).toEqual([...kitchen.every, ...kitchen.deep]);
    expect(checklistFor('kitchen', 'move-in', rooms)).toEqual([...kitchen.every, ...kitchen.deep]);
  });

  it('end of lease builds on each level', () => {
    const list = checklistFor('kitchen', 'end-of-lease', rooms);
    expect(list.slice(0, kitchen.every.length)).toEqual(kitchen.every);
    expect(list).toHaveLength(kitchen.every.length + kitchen.deep.length + kitchen.endOfLease.length);
  });
});
