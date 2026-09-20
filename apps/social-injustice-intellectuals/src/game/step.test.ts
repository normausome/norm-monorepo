import { describe, expect, test } from 'bun:test';
import { applyBotTick } from './bots';
import { createRng } from './rng';
import { getInitialState, step, tallyVotes } from './step';
import type { GameState, PlayerId, Vote } from './types';

function convene(seed = 42): GameState {
  let s = getInitialState();
  s = step(s, { type: 'convene', humanName: 'Sunny', humanColor: 'ink', seed });
  return s;
}

describe('convene', () => {
  test('starts in Match with six players and twenty tasks', () => {
    const s = convene();
    expect(s.phase.kind).toBe('Match');
    expect(s.players).toHaveLength(6);
    expect(s.tasks).toHaveLength(20);
    expect(s.players.filter((p) => p.isHuman)).toHaveLength(1);
    expect(s.players.filter((p) => p.role === 'Pundit')).toHaveLength(1);
    const human = s.players.find((p) => p.isHuman)!;
    expect(human.role).toBe('Fellow');
  });
});

describe('move', () => {
  test('rejects invalid exit', () => {
    const s = convene();
    const human = s.players.find((p) => p.isHuman)!;
    let s2 = step(s, { type: 'move', playerId: human.id, to: 'library' });
    s2 = step(s2, { type: 'tick', now: 2000 });
    const next = step(s2, { type: 'move', playerId: human.id, to: 'seminar' });
    expect(next).toBe(s2);
  });

  test('allows travel to adjacent room', () => {
    const s = convene();
    const human = s.players.find((p) => p.isHuman)!;
    const next = step(s, { type: 'move', playerId: human.id, to: 'library' });
    expect(next.players.find((p) => p.id === human.id)!.location.kind).toBe('travel');
  });
});

describe('complete-task', () => {
  test('win when all tasks done', () => {
    let s = convene(7);
    const last = s.tasks[0]!;
    s = {
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === last.id ? t : { ...t, status: 'done' },
      ),
      players: s.players.map((p) =>
        p.id === last.ownerId
          ? { ...p, location: { kind: 'room', roomId: last.roomId } }
          : p,
      ),
    };
    const next = step(s, { type: 'complete-task', taskId: last.id });
    expect(next.phase).toEqual({ kind: 'Win', how: 'tasks' });
  });
});

describe('vote tally', () => {
  test('plurality ejects', () => {
    const votes: Vote[] = [
      { voterId: 0, target: 2 },
      { voterId: 1, target: 2 },
      { voterId: 2, target: 3 },
    ];
    expect(tallyVotes(votes)).toBe(2);
  });

  test('tie ejects nobody', () => {
    const votes: Vote[] = [
      { voterId: 0, target: 1 },
      { voterId: 1, target: 2 },
      { voterId: 2, target: 1 },
      { voterId: 3, target: 2 },
    ];
    expect(tallyVotes(votes)).toBeNull();
  });

  test('skip plurality ejects nobody', () => {
    const votes: Vote[] = [
      { voterId: 0, target: 'skip' },
      { voterId: 1, target: 'skip' },
      { voterId: 2, target: 1 },
    ];
    expect(tallyVotes(votes)).toBeNull();
  });
});

describe('discredit and lose', () => {
  test('human discredited loses', () => {
    let s = convene(99);
    const human = s.players.find((p) => p.isHuman)!;
    const pundit = s.players.find((p) => p.role === 'Pundit')!;
    s = {
      ...s,
      now: 20_000,
      players: s.players.map((p) => {
        if (p.id === human.id) return { ...p, location: { kind: 'room', roomId: 'library' } };
        if (p.id === pundit.id) return { ...p, location: { kind: 'room', roomId: 'library' } };
        return { ...p, location: { kind: 'room', roomId: 'atrium' } };
      }),
      bots: {
        ...s.bots,
        [pundit.id]: {
          ...s.bots[pundit.id]!,
          nextDiscreditAt: 0,
        },
      },
    };
    const next = step(s, {
      type: 'discredit',
      punditId: pundit.id,
      victimId: human.id,
    });
    expect(next.phase).toEqual({ kind: 'Lose', how: 'discredited' });
  });
});

describe('meeting eject pundit wins', () => {
  test('ejecting pundit ends in win vote', () => {
    let s = convene(1);
    const pundit = s.players.find((p) => p.role === 'Pundit')!;
    const meeting = {
      reason: { kind: 'podium' as const, callerId: 0 as PlayerId },
      stage: 'result' as const,
      stageEndsAt: 1000,
      chat: [],
      votes: [],
      ejected: pundit.id,
    };
    s = { ...s, phase: { kind: 'Meeting', meeting }, now: 2000 };
    const next = step(s, { type: 'tick', now: 2000 });
    expect(next.phase).toEqual({ kind: 'Win', how: 'vote' });
  });
});

describe('simulation', () => {
  test('fixed seed reaches meeting within 90s', () => {
    let s = convene(12345);
    const rng = createRng(12345);
    const deadline = 90_000;
    while (s.now < deadline) {
      if (s.phase.kind === 'Meeting') break;
      if (s.phase.kind === 'Win' || s.phase.kind === 'Lose') break;
      s = applyBotTick(s, rng);
    }
    expect(s.phase.kind === 'Meeting' || s.phase.kind === 'Win' || s.phase.kind === 'Lose').toBe(
      true,
    );
  });
});
