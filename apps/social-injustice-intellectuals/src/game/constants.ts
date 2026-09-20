import type { TaskKind } from './types';

export const TRAVEL_MS = 1200;
export const DISCUSS_MS = 30_000;
export const VOTE_MS = 20_000;
export const RESULT_MS = 5000;
export const TICK_MS = 250;
export const DISCREDIT_FIRST_COOLDOWN_MS = 15_000;
export const DISCREDIT_COOLDOWN_MS = 25_000;
export const DISCREDIT_CHANCE = 0.6;

export const MUG_COLORS: Record<string, string> = {
  mustard: '#C4A035',
  plum: '#6B4C6E',
  teal: '#3D8B8B',
  rust: '#B85C38',
  sage: '#7A9B76',
  ink: '#1E1B18',
};

export const PLAYER_PRESETS = [
  { name: 'Ambrose', title: 'Visiting Fellow in Vibes', color: 'mustard' },
  { name: 'Priya', title: 'Chair of Applied Nuance', color: 'plum' },
  { name: 'Ludo', title: 'Emeritus Reply Guy', color: 'teal' },
  { name: 'Greta', title: 'Adjunct of Everything', color: 'rust' },
  { name: 'Kwame', title: 'Director of Discourse', color: 'sage' },
  { name: 'Sunny', title: 'Fellow, Unpaid', color: 'ink' },
] as const;

export const BOT_TASK_DURATION_MS: Record<TaskKind, number> = {
  'citation-hunt': 4500,
  'peer-review': 5000,
  'jargon-filter': 4000,
  'coffee-refill': 3500,
};

export const TASK_ROOM: Record<TaskKind, import('./types').RoomId> = {
  'citation-hunt': 'library',
  'peer-review': 'seminar',
  'jargon-filter': 'archive',
  'coffee-refill': 'lounge',
};

export const ALL_TASK_KINDS: TaskKind[] = [
  'citation-hunt',
  'peer-review',
  'jargon-filter',
  'coffee-refill',
];
