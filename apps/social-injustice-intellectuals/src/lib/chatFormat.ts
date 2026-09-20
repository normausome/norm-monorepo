import { ROOMS } from '@/game/rooms';
import type { ChatLine, GameState, PlayerId } from '@/game/types';

export function formatChatLine(state: GameState, line: ChatLine): string {
  const speaker = state.players.find((p) => p.id === line.speaker)?.name ?? '?';
  switch (line.kind) {
    case 'was-in':
      return `${speaker}: I was in the ${ROOMS[line.roomId].name}.`;
    case 'saw': {
      const target = state.players.find((p) => p.id === line.target)?.name ?? '?';
      return `${speaker}: I saw ${target} in the ${ROOMS[line.roomId].name}.`;
    }
    case 'alone-with': {
      const target = state.players.find((p) => p.id === line.target)?.name ?? '?';
      return `${speaker}: ${target} was alone with them.`;
    }
    case 'vouch': {
      const target = state.players.find((p) => p.id === line.target)?.name ?? '?';
      return `${speaker}: I vouch for ${target}.`;
    }
    case 'skip':
      return `${speaker}: Skip. We know nothing.`;
  }
}

export function meetingReasonLine(state: GameState): string {
  const m = state.phase.kind === 'Meeting' ? state.phase.meeting : null;
  if (!m) return '';
  const reason = m.reason;
  if (reason.kind === 'footnote') {
    const reporter = state.players.find((p) => p.id === reason.reporterId)?.name;
    const victim = state.players.find((p) => p.id === reason.victimId)?.name;
    return `${reporter} found ${victim} in the ${ROOMS[reason.roomId].name}.`;
  }
  const caller = state.players.find((p) => p.id === reason.callerId)?.name;
  return `${caller} called an Emergency Symposium.`;
}

export function playerName(state: GameState, id: PlayerId): string {
  return state.players.find((p) => p.id === id)?.name ?? '?';
}
