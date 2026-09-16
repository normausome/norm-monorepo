export const STAGE_W = 960;
export const STAGE_H = 540;

export const PREP_SECONDS = 45;
export const HUNT_SECONDS = 90;

export interface Timers {
  prep: number;
  hunt: number;
}

/** Dev override for demos, e.g. `?prep=8&hunt=12`. Values are seconds, capped at 600. */
export function readTimers(search: string): Timers {
  const query = new URLSearchParams(search);
  const seconds = (key: string, fallback: number): number => {
    const n = Number(query.get(key));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 600) : fallback;
  };
  return { prep: seconds("prep", PREP_SECONDS), hunt: seconds("hunt", HUNT_SECONDS) };
}
