import { useCallback, useEffect, useRef, useState } from 'react';
import { applyBotTick } from '@/game/bots';
import { TICK_MS } from '@/game/constants';
import { createRng, randomSeed } from '@/game/rng';
import { getInitialState, step } from '@/game/step';
import type { Action, GameState } from '@/game/types';

function readSeedFromHash(): number | null {
  const m = window.location.hash.match(/seed=(\d+)/);
  return m ? Number(m[1]) : null;
}

function writeSeedToHash(seed: number) {
  const url = new URL(window.location.href);
  url.hash = `seed=${seed}`;
  window.history.replaceState(null, '', url.toString());
}

export function useGameEngine() {
  const [state, setState] = useState<GameState>(getInitialState);
  const rngRef = useRef(createRng(1));

  useEffect(() => {
    rngRef.current = createRng(state.seed || 1);
  }, [state.seed]);

  const dispatch = useCallback((action: Action) => {
    setState((s) => step(s, action));
  }, []);

  const convene = useCallback((humanName: string, humanColor: string, seed?: number) => {
    const s = seed ?? readSeedFromHash() ?? randomSeed();
    writeSeedToHash(s);
    setState((prev) => step(prev, { type: 'convene', humanName, humanColor, seed: s }));
  }, []);

  const reset = useCallback(() => {
    setState(getInitialState());
  }, []);

  const phase = state.phase.kind;

  useEffect(() => {
    if (phase === 'Prep' || phase === 'Win' || phase === 'Lose') return;
    const id = window.setInterval(() => {
      setState((s) => {
        if (s.phase.kind === 'Prep' || s.phase.kind === 'Win' || s.phase.kind === 'Lose') {
          return s;
        }
        return applyBotTick(s, rngRef.current);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  return { state, dispatch, convene, reset };
}
