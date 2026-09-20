import {
  DISCREDIT_COOLDOWN_MS,
  DISCREDIT_FIRST_COOLDOWN_MS,
  DISCUSS_MS,
  PLAYER_PRESETS,
  RESULT_MS,
  TRAVEL_MS,
  VOTE_MS,
  ALL_TASK_KINDS,
} from './constants';
import {
  allTasksDone,
  applyTravelArrivals,
  countLivingByRole,
  humanPlayer,
  markOwnerTasksDone,
  playerRoomAt,
  playersInRoom,
  resolveColorKey,
} from './helpers';
import { createRng } from './rng';
import { ROOMS } from './rooms';
import type {
  Action,
  BotMemory,
  GameState,
  Meeting,
  Player,
  PlayerId,
  RoomId,
  Task,
  TaskId,
  Vote,
} from './types';

const initialState: GameState = {
  seed: 0,
  now: 0,
  phase: { kind: 'Prep' },
  players: [],
  tasks: [],
  footnotes: [],
  symposiumUsed: false,
  bots: {},
};

function checkEnd(state: GameState): GameState {
  const human = humanPlayer(state);
  if (human && !human.alive) {
    return { ...state, phase: { kind: 'Lose', how: 'discredited' } };
  }
  const { fellows, pundits } = countLivingByRole(state);
  if (fellows <= pundits) {
    return { ...state, phase: { kind: 'Lose', how: 'outnumbered' } };
  }
  if (allTasksDone(state.tasks)) {
    return { ...state, phase: { kind: 'Win', how: 'tasks' } };
  }
  return state;
}

function tallyVotes(votes: Vote[]): PlayerId | 'skip' | null {
  const counts = new Map<PlayerId | 'skip', number>();
  for (const v of votes) {
    counts.set(v.target, (counts.get(v.target) ?? 0) + 1);
  }
  let best: PlayerId | 'skip' | null = null;
  let bestCount = 0;
  let tie = false;
  for (const [target, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = target;
      tie = false;
    } else if (count === bestCount && count > 0) {
      tie = true;
    }
  }
  if (bestCount === 0) return null;
  if (tie) return null;
  if (best === 'skip') return null;
  return best;
}

function startMeeting(
  state: GameState,
  reason: Meeting['reason'],
): GameState {
  const meeting: Meeting = {
    reason,
    stage: 'discuss',
    stageEndsAt: state.now + DISCUSS_MS,
    chat: [],
    votes: [],
    ejected: null,
  };
  const bots = { ...state.bots };
  for (const p of state.players) {
    if (!p.isHuman && p.alive) {
      const mem = bots[p.id] ?? emptyBotMemory(state.now);
      bots[p.id] = { ...mem, accusedBy: [] };
    }
  }
  return { ...state, phase: { kind: 'Meeting', meeting }, bots };
}

function emptyBotMemory(now: number): BotMemory {
  return {
    lastSeen: {},
    accusedBy: [],
    nextDiscreditAt: now + DISCREDIT_FIRST_COOLDOWN_MS,
    target: null,
    busyUntil: 0,
  };
}

function convene(_state: GameState, humanName: string, humanColor: string, seed: number): GameState {
  const rng = createRng(seed);
  const now = 0;
  const humanPresetIdx = PLAYER_PRESETS.findIndex((p) => p.name === humanName);
  const humanSlot = (humanPresetIdx >= 0 ? humanPresetIdx : 5) as PlayerId;

  const botIds: PlayerId[] = [];
  for (let i = 0; i < 6; i++) {
    if (i !== humanSlot) botIds.push(i as PlayerId);
  }
  const punditBotId = botIds[Math.floor(rng() * botIds.length)]!;

  const players: Player[] = PLAYER_PRESETS.map((preset, i) => {
    const id = i as PlayerId;
    const isHuman = id === humanSlot;
    const role =
      id === punditBotId ? ('Pundit' as const) : ('Fellow' as const);
    const colorKey = isHuman ? humanColor : preset.color;
    return {
      id,
      name: isHuman ? humanName : preset.name,
      title: preset.title,
      color: resolveColorKey(colorKey),
      role,
      alive: true,
      isHuman,
      location: { kind: 'room', roomId: 'atrium' as RoomId },
    };
  });

  const tasks: Task[] = [];
  for (const p of players) {
    if (p.role !== 'Fellow') continue;
    for (const kind of ALL_TASK_KINDS) {
      const roomId =
        kind === 'citation-hunt'
          ? 'library'
          : kind === 'peer-review'
            ? 'seminar'
            : kind === 'jargon-filter'
              ? 'archive'
              : 'lounge';
      tasks.push({
        id: `${p.id}:${kind}` as TaskId,
        kind,
        roomId,
        ownerId: p.id,
        status: 'todo',
      });
    }
  }

  const bots: Partial<Record<PlayerId, BotMemory>> = {};
  for (const p of players) {
    if (!p.isHuman) {
      bots[p.id] = emptyBotMemory(now);
    }
  }

  const next: GameState = {
    seed,
    now,
    phase: { kind: 'Match' },
    players,
    tasks,
    footnotes: [],
    symposiumUsed: false,
    bots,
  };
  return next;
}

function handleMove(state: GameState, playerId: PlayerId, to: RoomId): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return state;
  const room = playerRoomAt(player, state.now);
  if (room === null) return state;
  if (!ROOMS[room].exits.includes(to)) return state;

  const players = state.players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          location: { kind: 'travel' as const, to, arrivesAt: state.now + TRAVEL_MS },
        }
      : p,
  );
  return { ...state, players };
}

function handleCompleteTask(state: GameState, taskId: TaskId): GameState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.status !== 'todo') return state;
  const owner = state.players.find((p) => p.id === task.ownerId);
  if (!owner || !owner.alive || owner.role !== 'Fellow') return state;
  const room = playerRoomAt(owner, state.now);
  if (room !== task.roomId) return state;

  const tasks = state.tasks.map((t) =>
    t.id === taskId ? { ...t, status: 'done' as const } : t,
  );
  let next: GameState = { ...state, tasks };
  next = checkEnd(next);
  return next;
}

function handleDiscredit(
  state: GameState,
  punditId: PlayerId,
  victimId: PlayerId,
): GameState {
  const pundit = state.players.find((p) => p.id === punditId);
  const victim = state.players.find((p) => p.id === victimId);
  if (!pundit || !victim || pundit.role !== 'Pundit' || !victim.alive || victim.role !== 'Fellow')
    return state;

  const room = playerRoomAt(pundit, state.now);
  if (room === null) return state;
  const inRoom = playersInRoom(state, room, state.now);
  if (inRoom.length !== 2) return state;
  if (!inRoom.some((p) => p.id === victimId)) return state;

  const mem = state.bots[punditId];
  if (mem && state.now < mem.nextDiscreditAt) return state;

  const players = state.players.map((p) =>
    p.id === victimId ? { ...p, alive: false } : p,
  );
  const tasks = markOwnerTasksDone(state.tasks, victimId);
  const footnotes = [
    ...state.footnotes,
    { victimId, roomId: room, at: state.now },
  ];
  const bots = { ...state.bots };
  if (mem) {
    bots[punditId] = {
      ...mem,
      nextDiscreditAt: state.now + DISCREDIT_COOLDOWN_MS,
    };
  }

  let next: GameState = { ...state, players, tasks, footnotes, bots };
  next = checkEnd(next);
  return next;
}

function handleReport(state: GameState, reporterId: PlayerId, victimId: PlayerId): GameState {
  const reporter = state.players.find((p) => p.id === reporterId);
  if (!reporter || !reporter.alive) return state;
  const room = playerRoomAt(reporter, state.now);
  if (room === null) return state;
  const fn = state.footnotes.find((f) => f.victimId === victimId && f.roomId === room);
  if (!fn) return state;
  return startMeeting(state, {
    kind: 'footnote',
    reporterId,
    victimId,
    roomId: room,
  });
}

function handleSymposium(state: GameState, callerId: PlayerId): GameState {
  if (state.symposiumUsed) return state;
  const caller = state.players.find((p) => p.id === callerId);
  if (!caller || !caller.alive) return state;
  const room = playerRoomAt(caller, state.now);
  if (room !== 'atrium') return state;
  const next = startMeeting(state, { kind: 'podium', callerId });
  return { ...next, symposiumUsed: true };
}

function advanceMeetingOnTick(state: GameState, now: number): GameState {
  if (state.phase.kind !== 'Meeting') return state;
  const meeting = state.phase.meeting;
  if (now < meeting.stageEndsAt) return { ...state, now };

  if (meeting.stage === 'discuss') {
    const nextMeeting: Meeting = {
      ...meeting,
      stage: 'vote',
      stageEndsAt: now + VOTE_MS,
    };
    return { ...state, now, phase: { kind: 'Meeting', meeting: nextMeeting } };
  }

  if (meeting.stage === 'vote') {
    const tally = tallyVotes(meeting.votes);
    const ejected = tally === 'skip' ? null : tally;
    const nextMeeting: Meeting = {
      ...meeting,
      stage: 'result',
      stageEndsAt: now + RESULT_MS,
      ejected,
    };
    return { ...state, now, phase: { kind: 'Meeting', meeting: nextMeeting } };
  }

  // result stage ended
  let players = state.players;
  let phase: GameState['phase'] = { kind: 'Match' };
  if (meeting.ejected !== null) {
    const target = state.players.find((p) => p.id === meeting.ejected);
    if (target) {
      players = state.players.map((p) =>
        p.id === meeting.ejected ? { ...p, alive: false } : p,
      );
      if (target.role === 'Pundit') {
        phase = { kind: 'Win', how: 'vote' };
      }
    }
  }

  let next: GameState = { ...state, now, players, phase };
  if (phase.kind === 'Match') {
    next = checkEnd(next);
  }
  return next;
}

function meetingVoteComplete(state: GameState): boolean {
  if (state.phase.kind !== 'Meeting') return false;
  if (state.phase.meeting.stage !== 'vote') return false;
  const living = state.players.filter((p) => p.alive);
  const voted = new Set(state.phase.meeting.votes.map((v) => v.voterId));
  return living.every((p) => voted.has(p.id));
}

export function step(state: GameState, action: Action): GameState {
  if (action.type === 'reset') {
    if (state.phase.kind === 'Win' || state.phase.kind === 'Lose' || state.phase.kind === 'Prep') {
      return { ...initialState };
    }
    return state;
  }

  if (action.type === 'convene') {
    if (state.phase.kind !== 'Prep') return state;
    return convene(state, action.humanName, action.humanColor, action.seed);
  }

  if (action.type === 'tick') {
    let next = { ...state, now: action.now };
    next = {
      ...next,
      players: applyTravelArrivals(next.players, action.now),
    };

    if (next.phase.kind === 'Meeting') {
      const m = next.phase.meeting;
      if (m.stage === 'vote' && meetingVoteComplete(next)) {
        const tally = tallyVotes(m.votes);
        const ejected = tally === 'skip' ? null : tally;
        const nextMeeting: Meeting = {
          ...m,
          stage: 'result',
          stageEndsAt: action.now + RESULT_MS,
          ejected,
        };
        next = { ...next, phase: { kind: 'Meeting', meeting: nextMeeting } };
        return next;
      }
      return advanceMeetingOnTick(next, action.now);
    }

    return next;
  }

  if (state.phase.kind === 'Match') {
    switch (action.type) {
      case 'move':
        return handleMove(state, action.playerId, action.to);
      case 'complete-task':
        return handleCompleteTask(state, action.taskId);
      case 'discredit':
        return handleDiscredit(state, action.punditId, action.victimId);
      case 'report':
        return handleReport(state, action.reporterId, action.victimId);
      case 'call-symposium':
        return handleSymposium(state, action.callerId);
      default:
        return state;
    }
  }

  if (state.phase.kind === 'Meeting') {
    const meeting = state.phase.meeting;
    switch (action.type) {
      case 'say':
        if (meeting.stage !== 'discuss') return state;
        const speaker = state.players.find((p) => p.id === action.line.speaker);
        if (!speaker || !speaker.alive) return state;
        return {
          ...state,
          phase: {
            kind: 'Meeting',
            meeting: { ...meeting, chat: [...meeting.chat, action.line] },
          },
        };
      case 'vote':
        if (meeting.stage !== 'vote') return state;
        const voter = state.players.find((p) => p.id === action.vote.voterId);
        if (!voter || !voter.alive) return state;
        const votes = meeting.votes.filter((v) => v.voterId !== action.vote.voterId);
        votes.push(action.vote);
        let next: GameState = {
          ...state,
          phase: { kind: 'Meeting', meeting: { ...meeting, votes } },
        };
        if (meetingVoteComplete(next)) {
          const tally = tallyVotes(votes);
          const ejected = tally === 'skip' ? null : tally;
          next = {
            ...next,
            phase: {
              kind: 'Meeting',
              meeting: {
                ...meeting,
                votes,
                stage: 'result',
                stageEndsAt: state.now + RESULT_MS,
                ejected,
              },
            },
          };
        }
        return next;
      default:
        return state;
    }
  }

  return state;
}

export function getInitialState(): GameState {
  return { ...initialState };
}

export { tallyVotes };
