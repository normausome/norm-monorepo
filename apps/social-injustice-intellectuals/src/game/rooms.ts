import type { Room, RoomId } from './types';

export const ROOMS: Record<RoomId, Room> = {
  atrium: {
    id: 'atrium',
    name: 'Atrium',
    exits: ['library', 'archive', 'seminar', 'lounge'],
    task: null,
    hasPodium: true,
  },
  library: {
    id: 'library',
    name: 'Library',
    exits: ['atrium'],
    task: 'citation-hunt',
    hasPodium: false,
  },
  seminar: {
    id: 'seminar',
    name: 'Seminar Room',
    exits: ['atrium'],
    task: 'peer-review',
    hasPodium: false,
  },
  lounge: {
    id: 'lounge',
    name: 'Faculty Lounge',
    exits: ['atrium', 'archive'],
    task: 'coffee-refill',
    hasPodium: false,
  },
  archive: {
    id: 'archive',
    name: 'Archive',
    exits: ['atrium', 'lounge'],
    task: 'jargon-filter',
    hasPodium: false,
  },
};

export const DEAD_END_ROOMS: RoomId[] = ['library', 'seminar'];
