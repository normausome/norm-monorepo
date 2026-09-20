import { MUG_COLORS } from './constants';
import { ROOMS } from './rooms';
import type { GameState, Player, PlayerId, RoomId, Task } from './types';

export function playerRoomAt(player: Player, now: number): RoomId | null {
  if (player.location.kind === 'room') return player.location.roomId;
  if (player.location.kind === 'travel' && now >= player.location.arrivesAt) {
    return player.location.to;
  }
  return null;
}

export function playersInRoom(state: GameState, roomId: RoomId, now: number): Player[] {
  return state.players.filter((p) => p.alive && playerRoomAt(p, now) === roomId);
}

export function livingPlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

export function countLivingByRole(state: GameState): { fellows: number; pundits: number } {
  let fellows = 0;
  let pundits = 0;
  for (const p of state.players) {
    if (!p.alive) continue;
    if (p.role === 'Fellow') fellows++;
    else pundits++;
  }
  return { fellows, pundits };
}

export function humanPlayer(state: GameState): Player | undefined {
  return state.players.find((p) => p.isHuman);
}

export function applyTravelArrivals(players: readonly Player[], now: number): Player[] {
  return players.map((p) => {
    if (p.location.kind === 'travel' && now >= p.location.arrivesAt) {
      return { ...p, location: { kind: 'room', roomId: p.location.to } };
    }
    return p;
  });
}

export function markOwnerTasksDone(tasks: readonly Task[], ownerId: PlayerId): Task[] {
  return tasks.map((t) =>
    t.ownerId === ownerId && t.status === 'todo' ? { ...t, status: 'done' } : t,
  );
}

export function allTasksDone(tasks: readonly Task[]): boolean {
  return tasks.every((t) => t.status === 'done');
}

export function roomDistance(from: RoomId, to: RoomId): number {
  if (from === to) return 0;
  const visited = new Set<RoomId>([from]);
  const queue: { id: RoomId; d: number }[] = [{ id: from, d: 0 }];
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    for (const next of ROOMS[id].exits) {
      if (next === to) return d + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ id: next, d: d + 1 });
      }
    }
  }
  return 999;
}

export function resolveColorKey(key: string): string {
  return MUG_COLORS[key] ?? key;
}

export function footnoteInRoom(state: GameState, roomId: RoomId): import('./types').Footnote | undefined {
  return state.footnotes.find((f) => f.roomId === roomId);
}
