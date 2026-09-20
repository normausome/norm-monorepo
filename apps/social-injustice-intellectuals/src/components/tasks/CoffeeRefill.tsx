import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function CoffeeRefill({ onComplete }: { onComplete: () => void }) {
  const [level, setLevel] = useState(0);
  const holding = useRef(false);
  const frame = useRef(0);

  const loop = () => {
    if (!holding.current) return;
    setLevel((l) => {
      const next = Math.min(100, l + 2);
      if (next >= 35 && next <= 75) {
        // pass band — wait for release
      }
      if (next >= 100) return 0;
      return next;
    });
    frame.current = requestAnimationFrame(loop);
  };

  const start = () => {
    holding.current = true;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(loop);
  };

  const stop = () => {
    holding.current = false;
    cancelAnimationFrame(frame.current);
    if (level >= 35 && level <= 75) onComplete();
    else setLevel(0);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm">Refill. This is the real work.</p>
      <div className="relative mx-auto h-32 w-16 border-2 border-[var(--color-ink)]">
        <div
          className="absolute bottom-0 w-full bg-[var(--color-ink)] transition-all"
          style={{ height: `${level}%` }}
        />
        <div className="absolute top-[35%] w-full border-t border-dashed border-[var(--color-red-pen)]" />
        <div className="absolute top-[75%] w-full border-t border-dashed border-[var(--color-red-pen)]" />
      </div>
      <Button
        className="w-full"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
      >
        Pour
      </Button>
    </div>
  );
}
