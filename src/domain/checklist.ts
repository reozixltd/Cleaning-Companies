/** What gets cleaned in a room for a service: each level builds on the one before. */
import type { ServiceId } from '@/config/pricing';
import type { RoomKind, RoomsConfig } from '@/config/rooms';

export function checklistFor(kind: RoomKind, service: ServiceId, config: RoomsConfig): string[] {
  const room = config.rooms[kind];
  if (service === 'regular') return [...room.every];
  if (service === 'end-of-lease') return [...room.every, ...room.deep, ...room.endOfLease];
  return [...room.every, ...room.deep];
}
