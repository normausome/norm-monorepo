import { useState } from 'react';
import { cn } from '@/lib/utils';
import { pickContent, JARGON_POOL } from '@/game/taskContent';

export function JargonFilter({
  seed,
  onComplete,
}: {
  seed: number;
  onComplete: () => void;
}) {
  const item = pickContent(JARGON_POOL, seed, 11);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState(false);

  const toggle = (i: number) => {
    const jargon = new Set(item.jargonIndices);
    if (jargon.has(i)) {
      const next = new Set(picked);
      next.add(i);
      setPicked(next);
      if (next.size === 2) onComplete();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm">Remove the words that mean nothing.</p>
      <p className={cn('text-base leading-relaxed', shake && 'animate-pulse text-[var(--color-red-pen)]')}>
        {item.words.map((w, i) => (
          <button
            key={i}
            type="button"
            className={cn(
              'mx-0.5 rounded px-1 focus-visible:ring-2 focus-visible:ring-[var(--color-chalk)]',
              picked.has(i) && 'bg-[var(--color-highlighter)] line-through',
            )}
            onClick={() => toggle(i)}
          >
            {w}
          </button>
        ))}
      </p>
    </div>
  );
}
