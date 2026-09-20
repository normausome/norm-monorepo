import { BOT_TASK_DURATION_MS, DISCREDIT_CHANCE, TICK_MS } from './constants';
import { footnoteInRoom, playerRoomAt, playersInRoom, roomDistance } from './helpers';
import { DEAD_END_ROOMS, ROOMS } from './rooms';
import { step } from './step';
import type {
  Action,
  BotMemory,
  ChatLine,
  GameState,
  Player,
  PlayerId,
  RoomId,
  Rng,
  Task,
} from './types';

function pickRandom<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function botActions(state: GameState, botId: PlayerId, rng: Rng): Action[] {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot || bot.isHuman || !bot.alive) return [];

  if (state.phase.kind === 'Match') {
    return matchActions(state, bot, rng);
  }
  if (state.phase.kind === 'Meeting') {
    return meetingActions(state, bot, rng);
  }
  return [];
}

function matchActions(state: GameState, bot: Player, rng: Rng): Action[] {
  const mem = state.bots[bot.id];
  if (!mem) return [];

  const traveling = bot.location.kind === 'travel' && state.now < bot.location.arrivesAt;
  const room = playerRoomAt(bot, state.now);

  if (room && !traveling) {
    const fn = footnoteInRoom(state, room);
    if (fn && bot.role === 'Fellow' && rng() < 0.8) {
      return [{ type: 'report', reporterId: bot.id, victimId: fn.victimId }];
    }
  }

  if (traveling) return [];

  if (bot.role === 'Pundit') {
    return punditMatch(state, bot, mem, rng, room);
  }
  return fellowMatch(state, bot, mem, room, rng);
}

function punditMatch(
  state: GameState,
  bot: Player,
  mem: BotMemory,
  rng: Rng,
  room: RoomId | null,
): Action[] {
  if (room) {
    const inRoom = playersInRoom(state, room, state.now);
    const fellows = inRoom.filter((p) => p.role === 'Fellow');
    if (fellows.length === 1 && inRoom.length === 2 && state.now >= mem.nextDiscreditAt) {
      if (rng() < DISCREDIT_CHANCE) {
        return [
          {
            type: 'discredit',
            punditId: bot.id,
            victimId: fellows[0]!.id,
          },
        ];
      }
    }
  }

  if (state.now < mem.busyUntil) return [];

  const currentRoom = room ?? 'atrium';

  if (state.now >= mem.nextDiscreditAt) {
    const lonelyRooms = (Object.keys(ROOMS) as RoomId[]).filter((rid) => {
      const aliveHere = playersInRoom(state, rid, state.now).filter(
        (p) => p.alive && p.role === 'Fellow',
      );
      const totalHere = playersInRoom(state, rid, state.now).filter((p) => p.alive);
      return aliveHere.length === 1 && totalHere.length === 1;
    });
    if (lonelyRooms.length > 0) {
      lonelyRooms.sort(
        (a, b) => roomDistance(currentRoom, a) - roomDistance(currentRoom, b),
      );
      const target = lonelyRooms[0]!;
      if (target === currentRoom) return [];
      const exits = ROOMS[currentRoom].exits;
      let stepTo: RoomId | null = null;
      let best = 999;
      for (const e of exits) {
        const d = roomDistance(e, target);
        if (d < best) {
          best = d;
          stepTo = e;
        }
      }
      if (stepTo) return [{ type: 'move', playerId: bot.id, to: stepTo }];
    }
  }

  const exits = ROOMS[currentRoom].exits;
  const preferred = exits.filter((e) => DEAD_END_ROOMS.includes(e));
  const dest =
    rng() < 0.6 && preferred.length > 0
      ? pickRandom(rng, preferred)
      : pickRandom(rng, exits);
  if (dest !== currentRoom) {
    return [{ type: 'move', playerId: bot.id, to: dest }];
  }
  return [];
}

function fellowMatch(
  state: GameState,
  bot: Player,
  mem: BotMemory,
  room: RoomId | null,
  rng: Rng,
): Action[] {
  const myTasks = state.tasks.filter((t) => t.ownerId === bot.id && t.status === 'todo');

  if (room) {
    const here = myTasks.find((t) => t.roomId === room);
    if (here) {
      if (state.now >= mem.busyUntil) {
        return [{ type: 'complete-task', taskId: here.id }];
      }
      return [];
    }
  }

  if (rng() < 0.1 && room) {
    const dest = pickRandom(rng, ROOMS[room].exits);
    return [{ type: 'move', playerId: bot.id, to: dest }];
  }

  if (myTasks.length === 0) return [];

  let best: Task | null = null;
  let bestDist = 999;
  for (const t of myTasks) {
    const d = room ? roomDistance(room, t.roomId) : roomDistance('atrium', t.roomId);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  if (!best || !room) return [];

  const exits = ROOMS[room].exits;
  let stepTo: RoomId | null = null;
  let stepDist = 999;
  for (const e of exits) {
    const d = roomDistance(e, best.roomId);
    if (d < stepDist) {
      stepDist = d;
      stepTo = e;
    }
  }
  if (stepTo) {
    return [{ type: 'move', playerId: bot.id, to: stepTo }];
  }
  return [];
}

function suspicionScores(
  state: GameState,
  botId: PlayerId,
  meeting: import('./types').Meeting,
  rng: Rng,
): Map<PlayerId, number> {
  const scores = new Map<PlayerId, number>();
  const mem = state.bots[botId];
  const victimRoom =
    meeting.reason.kind === 'footnote' ? meeting.reason.roomId : null;

  for (const p of state.players) {
    if (!p.alive || p.id === botId) continue;
    scores.set(p.id, 0);
  }

  if (victimRoom && mem) {
    for (const [pid, seen] of Object.entries(mem.lastSeen)) {
      const id = Number(pid) as PlayerId;
      if (!scores.has(id)) continue;
      if (seen.roomId === victimRoom && state.now - seen.at <= 10_000) {
        scores.set(id, (scores.get(id) ?? 0) + 3);
      }
    }
  }

  for (const line of meeting.chat) {
    if (line.kind === 'alone-with' && line.target === botId) {
      scores.set(line.speaker, (scores.get(line.speaker) ?? 0) + 2);
    }
    if (line.kind === 'saw' && line.target === botId) {
      scores.set(line.speaker, (scores.get(line.speaker) ?? 0) + 2);
    }
  }

  if (mem) {
    const counts = new Map<PlayerId, number>();
    for (const [pid] of Object.entries(mem.lastSeen)) {
      const id = Number(pid) as PlayerId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let least: PlayerId | null = null;
    let leastCount = Infinity;
    for (const [id] of scores) {
      const c = counts.get(id) ?? 0;
      if (c < leastCount) {
        leastCount = c;
        least = id;
      }
    }
    if (least !== null) {
      scores.set(least, (scores.get(least) ?? 0) + 1);
    }
  }

  for (const [id, s] of scores) {
    scores.set(id, s + rng());
  }
  return scores;
}

function meetingActions(state: GameState, bot: Player, rng: Rng): Action[] {
  if (state.phase.kind !== 'Meeting') return [];
  const meeting = state.phase.meeting;
  const actions: Action[] = [];

  if (meeting.stage === 'discuss') {
    const alreadySpoke = meeting.chat.some((l) => l.speaker === bot.id);
    if (alreadySpoke) return actions;
    const line = pickMeetingLine(state, bot, meeting, rng);
    if (line) actions.push({ type: 'say', line });
    return actions;
  }

  if (meeting.stage === 'vote') {
    if (meeting.votes.some((v) => v.voterId === bot.id)) return actions;

    if (bot.role === 'Pundit') {
      const accuser = meeting.chat.find(
        (l) =>
          (l.kind === 'alone-with' || l.kind === 'saw') && l.target === bot.id,
      );
      if (accuser) {
        actions.push({
          type: 'vote',
          vote: { voterId: bot.id, target: accuser.speaker },
        });
        return actions;
      }
      const fellows = state.players.filter(
        (p) => p.alive && p.role === 'Fellow' && p.id !== bot.id,
      );
      if (fellows.length > 0) {
        actions.push({
          type: 'vote',
          vote: { voterId: bot.id, target: pickRandom(rng, fellows).id },
        });
      }
      return actions;
    }

    const scores = suspicionScores(state, bot.id, meeting, rng);
    let top: PlayerId | null = null;
    let topScore = -1;
    for (const [id, s] of scores) {
      if (s > topScore) {
        topScore = s;
        top = id;
      }
    }
    if (top !== null && topScore >= 3) {
      actions.push({ type: 'vote', vote: { voterId: bot.id, target: top } });
    } else {
      actions.push({ type: 'vote', vote: { voterId: bot.id, target: 'skip' } });
    }
  }

  return actions;
}

function pickMeetingLine(
  state: GameState,
  bot: Player,
  meeting: import('./types').Meeting,
  rng: Rng,
): ChatLine | null {
  const mem = state.bots[bot.id];

  if (bot.role === 'Pundit') {
    const accused = meeting.chat.find(
      (l) =>
        (l.kind === 'alone-with' || l.kind === 'saw') && l.target === bot.id,
    );
    if (accused) {
      const denyRoom = pickRandom(rng, Object.keys(ROOMS) as RoomId[]);
      return { speaker: bot.id, kind: 'was-in', roomId: denyRoom };
    }
  }

  const scores = suspicionScores(state, bot.id, meeting, rng);
  let top: PlayerId | null = null;
  let topScore = -1;
  let low: PlayerId | null = null;
  let lowScore = Infinity;
  for (const [id, s] of scores) {
    if (s > topScore) {
      topScore = s;
      top = id;
    }
    if (s < lowScore) {
      lowScore = s;
      low = id;
    }
  }

  if (top !== null && topScore >= 3 && rng() < 0.6) {
    const seen = mem?.lastSeen[top];
    if (seen) {
      return { speaker: bot.id, kind: 'saw', target: top, roomId: seen.roomId };
    }
    return { speaker: bot.id, kind: 'alone-with', target: top };
  }

  if (low !== null && rng() < 0.4) {
    return { speaker: bot.id, kind: 'vouch', target: low };
  }

  const myRoom =
    playerRoomAt(bot, state.now) ??
    mem?.lastSeen[bot.id]?.roomId ??
    'atrium';
  return { speaker: bot.id, kind: 'was-in', roomId: myRoom };
}

export function updateBotMemory(state: GameState, botId: PlayerId): GameState {
  const bot = state.players.find((p) => p.id === botId);
  if (!bot || bot.isHuman || !bot.alive) return state;
  if (state.phase.kind !== 'Match') return state;

  const mem = state.bots[botId] ?? {
    lastSeen: {},
    accusedBy: [],
    nextDiscreditAt: state.now + 15_000,
    target: null,
    busyUntil: 0,
  };

  const room = playerRoomAt(bot, state.now);
  const lastSeen = { ...mem.lastSeen };

  if (room) {
    for (const p of state.players) {
      if (!p.alive) continue;
      const pr = playerRoomAt(p, state.now);
      if (pr === room) {
        lastSeen[p.id] = { roomId: room, at: state.now };
      }
    }
  }

  let busyUntil = mem.busyUntil;
  let target = mem.target;
  if (bot.role === 'Fellow') {
    const task =
      room &&
      state.tasks.find(
        (t) => t.ownerId === bot.id && t.roomId === room && t.status === 'todo',
      );
    if (!task || !room) {
      busyUntil = 0;
      target = null;
    } else if (target !== room) {
      target = room;
      busyUntil = state.now + BOT_TASK_DURATION_MS[task.kind];
    }
  }

  if (bot.role === 'Pundit' && room) {
    if (ROOMS[room].task && busyUntil <= state.now) {
      busyUntil = state.now + BOT_TASK_DURATION_MS[ROOMS[room].task!];
    }
  }

  return {
    ...state,
    bots: {
      ...state.bots,
      [botId]: { ...mem, lastSeen, busyUntil, target },
    },
  };
}

export function applyBotTick(state: GameState, rng: Rng): GameState {
  let next = step(state, { type: 'tick', now: state.now + TICK_MS });
  if (next.phase.kind === 'Win' || next.phase.kind === 'Lose') return next;

  for (const p of next.players) {
    if (p.isHuman || !p.alive) continue;
    next = updateBotMemory(next, p.id);
    const actions = botActions(next, p.id, rng);
    for (const action of actions) {
      next = step(next, action);
      if (next.phase.kind === 'Meeting' || next.phase.kind === 'Win' || next.phase.kind === 'Lose') {
        return next;
      }
    }
  }
  return next;
}
