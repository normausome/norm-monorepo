import { cn } from '@/lib/utils';
import type { PlayerId } from '@/game/types';

const ACCESSORIES = ['glasses', 'beret', 'lanyard', 'scarf', 'pen', 'book'] as const;

export function Mug({
  color,
  playerId,
  tipped = false,
  size = 'md',
  label,
}: {
  color: string;
  playerId: PlayerId;
  tipped?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const acc = ACCESSORIES[playerId % ACCESSORIES.length];
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.2 : 1;
  return (
    <div
      className={cn('flex flex-col items-center gap-1 transition-transform', tipped && 'rotate-45')}
      style={{ transform: tipped ? `rotate(45deg) scale(${scale})` : `scale(${scale})` }}
      title={label}
    >
      <svg width="48" height="56" viewBox="0 0 48 56" aria-hidden>
        <ellipse cx="24" cy="48" rx="14" ry="4" fill={tipped ? color : 'transparent'} opacity="0.35" />
        <rect x="10" y="14" width="22" height="32" rx="6" fill={color} stroke="var(--color-ink)" strokeWidth="2" />
        <path
          d="M32 20 Q42 22 42 32 Q42 40 32 38"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
        {acc === 'glasses' && (
          <g stroke="var(--color-ink)" strokeWidth="1.5" fill="none">
            <circle cx="18" cy="22" r="4" />
            <circle cx="28" cy="22" r="4" />
            <path d="M22 22 h4" />
          </g>
        )}
        {acc === 'beret' && <ellipse cx="21" cy="12" rx="10" ry="4" fill="var(--color-ink)" />}
        {acc === 'lanyard' && (
          <path d="M21 14 L24 28 L27 14" stroke="var(--color-red-pen)" strokeWidth="1.5" fill="none" />
        )}
        {acc === 'scarf' && (
          <path d="M12 26 Q24 32 32 26" stroke="var(--color-ink)" strokeWidth="3" fill="none" />
        )}
        {acc === 'pen' && (
          <line x1="34" y1="16" x2="38" y2="8" stroke="var(--color-ink)" strokeWidth="2" />
        )}
        {acc === 'book' && (
          <rect x="6" y="24" width="6" height="8" fill="var(--color-ink)" />
        )}
      </svg>
      {label && <span className="max-w-[5rem] truncate text-center text-[10px]">{label}</span>}
    </div>
  );
}
