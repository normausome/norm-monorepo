import { EndScreen } from '@/components/EndScreen';
import { MatchView } from '@/components/MatchView';
import { MeetingPanel } from '@/components/MeetingPanel';
import { PrepScreen } from '@/components/PrepScreen';
import { useGameEngine } from '@/hooks/useGameEngine';
import { MUG_COLORS } from '@/game/constants';
import { randomSeed } from '@/game/rng';

export default function App() {
  const { state, dispatch, convene, reset } = useGameEngine();
  const human = state.players.find((p) => p.isHuman);

  if (state.phase.kind === 'Prep') {
    return <PrepScreen onConvene={(name, color) => convene(name, color)} />;
  }

  if (state.phase.kind === 'Win' || state.phase.kind === 'Lose') {
    return (
      <EndScreen
        state={state}
        onAgain={(reroll) => {
          const name = human?.name ?? 'Sunny';
          const colorKey =
            Object.entries(MUG_COLORS).find(([, v]) => v === human?.color)?.[0] ?? 'ink';
          reset();
          convene(name, colorKey, reroll ? randomSeed() : state.seed);
        }}
      />
    );
  }

  return (
    <>
      {state.phase.kind === 'Match' && human && (
        <MatchView
          state={state}
          onMove={(to) => dispatch({ type: 'move', playerId: human.id, to })}
          onCompleteTask={(taskId) => dispatch({ type: 'complete-task', taskId })}
          onReport={(victimId) =>
            dispatch({ type: 'report', reporterId: human.id, victimId })
          }
          onSymposium={() =>
            dispatch({ type: 'call-symposium', callerId: human.id })
          }
        />
      )}
      {state.phase.kind === 'Meeting' && human && (
        <MeetingPanel
          state={state}
          onSay={(line) => dispatch({ type: 'say', line })}
          onVote={(target) =>
            dispatch({
              type: 'vote',
              vote: { voterId: human.id, target },
            })
          }
        />
      )}
    </>
  );
}
