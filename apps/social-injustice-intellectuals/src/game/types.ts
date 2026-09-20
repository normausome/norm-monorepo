export type PlayerId = 0 | 1 | 2 | 3 | 4 | 5;
export type RoomId = 'atrium' | 'library' | 'seminar' | 'lounge' | 'archive';
export type Role = 'Fellow' | 'Pundit';
export type TaskKind = 'citation-hunt' | 'peer-review' | 'jargon-filter' | 'coffee-refill';
export type TaskId = `${PlayerId}:${TaskKind}`;
export type Rng = () => number;

export interface Room {
  id: RoomId;
  name: string;
  exits: readonly RoomId[];
  task: TaskKind | null;
  hasPodium: boolean;
}

export interface Player {
  id: PlayerId;
  name: string;
  title: string;
  color: string;
  role: Role;
  alive: boolean;
  isHuman: boolean;
  location:
    | { kind: 'room'; roomId: RoomId }
    | { kind: 'travel'; to: RoomId; arrivesAt: number };
}

export interface Task {
  id: TaskId;
  kind: TaskKind;
  roomId: RoomId;
  ownerId: PlayerId;
  status: 'todo' | 'done';
}

export interface Footnote {
  victimId: PlayerId;
  roomId: RoomId;
  at: number;
}

export type Vote = { voterId: PlayerId; target: PlayerId | 'skip' };

export type ChatLine =
  | { speaker: PlayerId; kind: 'was-in'; roomId: RoomId }
  | { speaker: PlayerId; kind: 'saw'; target: PlayerId; roomId: RoomId }
  | { speaker: PlayerId; kind: 'alone-with'; target: PlayerId }
  | { speaker: PlayerId; kind: 'vouch'; target: PlayerId }
  | { speaker: PlayerId; kind: 'skip' };

export type MeetingReason =
  | { kind: 'footnote'; reporterId: PlayerId; victimId: PlayerId; roomId: RoomId }
  | { kind: 'podium'; callerId: PlayerId };

export interface Meeting {
  reason: MeetingReason;
  stage: 'discuss' | 'vote' | 'result';
  stageEndsAt: number;
  chat: ChatLine[];
  votes: Vote[];
  ejected: PlayerId | null;
}

export type Phase =
  | { kind: 'Prep' }
  | { kind: 'Match' }
  | { kind: 'Meeting'; meeting: Meeting }
  | { kind: 'Win'; how: 'tasks' | 'vote' }
  | { kind: 'Lose'; how: 'discredited' | 'outnumbered' };

export interface BotMemory {
  lastSeen: Partial<Record<PlayerId, { roomId: RoomId; at: number }>>;
  accusedBy: PlayerId[];
  nextDiscreditAt: number;
  target: RoomId | null;
  busyUntil: number;
  lastDiscreditRollAt?: number;
}

export interface GameState {
  seed: number;
  now: number;
  phase: Phase;
  players: readonly Player[];
  tasks: readonly Task[];
  footnotes: readonly Footnote[];
  symposiumUsed: boolean;
  bots: Partial<Record<PlayerId, BotMemory>>;
}

export type Action =
  | { type: 'convene'; humanName: string; humanColor: string; seed: number }
  | { type: 'tick'; now: number }
  | { type: 'move'; playerId: PlayerId; to: RoomId }
  | { type: 'complete-task'; taskId: TaskId }
  | { type: 'discredit'; punditId: PlayerId; victimId: PlayerId }
  | { type: 'report'; reporterId: PlayerId; victimId: PlayerId }
  | { type: 'call-symposium'; callerId: PlayerId }
  | { type: 'say'; line: ChatLine }
  | { type: 'vote'; vote: Vote }
  | { type: 'reset' };
