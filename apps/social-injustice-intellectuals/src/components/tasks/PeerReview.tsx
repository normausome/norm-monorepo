import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function PeerReview({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  const startHold = () => {
    startRef.current = performance.now();
    const tick = () => {
      if (startRef.current === null) return;
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(100, (elapsed / 2000) * 100);
      setProgress(p);
      if (p >= 100) {
        onComplete();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (startRef.current !== null && progress < 100) {
      cancelAnimationFrame(frameRef.current);
      startRef.current = null;
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm">Sign the review. Do not read the paper.</p>
      <div className="relative mx-auto h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#ddd" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--color-highlighter)"
            strokeWidth="8"
            strokeDasharray={`${progress * 2.64} 264`}
          />
        </svg>
      </div>
      <Button
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        className="w-full"
      >
        Approve
      </Button>
    </div>
  );
}
