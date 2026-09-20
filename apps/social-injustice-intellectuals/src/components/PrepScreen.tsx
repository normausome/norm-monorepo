import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MUG_COLORS, PLAYER_PRESETS } from '@/game/constants';
import { Mug } from '@/components/Mug';

export function PrepScreen({ onConvene }: { onConvene: (name: string, color: string) => void }) {
  const [name, setName] = useState<string>(PLAYER_PRESETS[5].name);
  const [color, setColor] = useState<string>(PLAYER_PRESETS[5].color);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="font-serif text-3xl font-semibold leading-tight">
          Social Injustice:
          <br />
          Intellectuals Among Us
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Six Fellows. One Grand Manifesto. Someone has not done the reading.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border-2 border-[var(--color-ink)] bg-white/40 p-4">
        <label className="block text-sm font-medium">
          Fellow name
          <select
            className="mt-1 w-full rounded border-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-2 focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          >
            {PLAYER_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-medium">Mug color</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {Object.keys(MUG_COLORS).map((key) => (
              <button
                key={key}
                type="button"
                className={`rounded-full p-1 focus-visible:ring-[3px] focus-visible:ring-[var(--color-chalk)] ${color === key ? 'ring-2 ring-[var(--color-ink)]' : ''}`}
                onClick={() => setColor(key)}
                aria-label={key}
              >
                <Mug color={MUG_COLORS[key]} playerId={0} size="sm" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Mug color={MUG_COLORS[color] ?? color} playerId={5} label={name} />
        </div>
      </div>

      <Button size="lg" className="w-full font-serif text-lg" onClick={() => onConvene(name, color)}>
        Convene
      </Button>
    </main>
  );
}
