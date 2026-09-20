import { Button } from '@/components/ui/button';
import { pickContent, CITATION_POOL } from '@/game/taskContent';

export function CitationHunt({
  seed,
  onComplete,
}: {
  seed: number;
  onComplete: () => void;
}) {
  const item = pickContent(CITATION_POOL, seed, 3);
  return (
    <div className="space-y-4">
      <p className="text-sm">{item.prompt}</p>
      <div className="flex flex-col gap-2">
        {item.options.map((opt, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-auto whitespace-normal py-2 text-left"
            onClick={() => {
              if (i === item.correctIndex) onComplete();
            }}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
