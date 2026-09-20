import { Button } from '@/components/ui/button';
import type { GameState } from '@/game/types';

const COPY = {
  discredited: 'You are now a Footnote. Your work will be cited incorrectly.',
  outnumbered: 'The Pundit has been given a column.',
  vote: 'The Pundit has been asked to step back from public life.',
  tasks: 'MANIFESTO PUBLISHED. Nobody will read it.',
} as const;

export function EndScreen({
  state,
  onAgain,
}: {
  state: GameState;
  onAgain: (reroll: boolean) => void;
}) {
  if (state.phase.kind !== 'Win' && state.phase.kind !== 'Lose') return null;
  const win = state.phase.kind === 'Win';
  const line =
    state.phase.kind === 'Win'
      ? COPY[state.phase.how]
      : COPY[state.phase.how];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-serif text-3xl text-[var(--color-chalk)]">
        {win ? 'Manifesto secured' : 'Discourse wins'}
      </h1>
      <p className="text-lg leading-relaxed">{line}</p>
      <p className="font-mono text-xs opacity-70">Seed: {state.seed}</p>
      <div className="flex w-full flex-col gap-2">
        <Button onClick={() => onAgain(false)}>Convene again</Button>
        <Button variant="outline" onClick={() => onAgain(true)}>New seed</Button>
      </div>
    </main>
  );
}
