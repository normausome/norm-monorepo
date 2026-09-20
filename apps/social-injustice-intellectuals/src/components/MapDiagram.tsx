import { cn } from '@/lib/utils';
import type { RoomId } from '@/game/types';

const NODES: { id: RoomId; x: number; y: number; label: string }[] = [
  { id: 'library', x: 50, y: 8, label: 'Library' },
  { id: 'atrium', x: 50, y: 38, label: 'Atrium' },
  { id: 'archive', x: 12, y: 55, label: 'Archive' },
  { id: 'seminar', x: 88, y: 55, label: 'Seminar' },
  { id: 'lounge', x: 50, y: 82, label: 'Lounge' },
];

const EDGES: [RoomId, RoomId][] = [
  ['library', 'atrium'],
  ['atrium', 'archive'],
  ['atrium', 'seminar'],
  ['atrium', 'lounge'],
  ['archive', 'lounge'],
];

export function MapDiagram({ currentRoom }: { currentRoom: RoomId | null }) {
  const pos = (id: RoomId) => NODES.find((n) => n.id === id)!;
  return (
    <svg viewBox="0 0 100 95" className="h-20 w-full max-w-xs" aria-label="Institute map">
      {EDGES.map(([a, b]) => {
        const pa = pos(a);
        const pb = pos(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={pa.x}
            y1={pa.y + 4}
            x2={pb.x}
            y2={pb.y + 4}
            stroke="var(--color-ink)"
            strokeWidth="1"
            opacity="0.35"
          />
        );
      })}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x - 14}
            y={n.y}
            width="28"
            height="12"
            rx="2"
            className={cn(
              'stroke-[var(--color-ink)]',
              currentRoom === n.id
                ? 'fill-[var(--color-highlighter)] stroke-2'
                : 'fill-[var(--color-paper)]',
            )}
          />
          <text
            x={n.x}
            y={n.y + 8}
            textAnchor="middle"
            fontSize="4"
            className="fill-[var(--color-ink)]"
          >
            {n.label.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}
