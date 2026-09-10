export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown }

export interface CachedOutcome<T> {
  outcome: Outcome<T>
  /** Whether this call was answered from memory rather than by running `load`. */
  hit: boolean
  /** ISO time the outcome was produced. */
  cachedAt: string
  /** ISO time the entry lapses and the next caller runs `load` again. */
  expiresAt: string
}

interface Entry {
  outcome: Outcome<unknown>
  cachedAt: number
  expiresAt: number
}

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<CachedOutcome<unknown>>>()

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * TTL cache with single-flight: concurrent callers for the same key share one
 * upstream request, so a burst of UI clicks never fans out to the operators.
 *
 * `ttlFor` decides how long each settled outcome is kept, so a thin result or an
 * upstream failure can be held briefly (negative cache) instead of for the full
 * TTL; return 0 to keep nothing. Callers get the outcome plus its timestamps so
 * responses can be labelled with when they were produced and when they lapse.
 */
export async function cachedOutcome<T>(
  key: string,
  load: () => Promise<T>,
  ttlFor: (outcome: Outcome<T>) => number,
): Promise<CachedOutcome<T>> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return { outcome: hit.outcome as Outcome<T>, hit: true, cachedAt: iso(hit.cachedAt), expiresAt: iso(hit.expiresAt) }
  }

  const pending = inflight.get(key)
  if (pending) return pending as Promise<CachedOutcome<T>>

  const p = load()
    .then(
      (value): Outcome<T> => ({ ok: true, value }),
      (error: unknown): Outcome<T> => ({ ok: false, error }),
    )
    .then((outcome): CachedOutcome<T> => {
      const now = Date.now()
      const ttl = ttlFor(outcome)
      if (ttl > 0) store.set(key, { outcome, cachedAt: now, expiresAt: now + ttl })
      return { outcome, hit: false, cachedAt: iso(now), expiresAt: iso(now + Math.max(ttl, 0)) }
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** Memoize a successful `load` for `ttlMs`; rejections are never stored. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const { outcome } = await cachedOutcome(key, load, (o) => (o.ok ? ttlMs : 0))
  if (!outcome.ok) throw outcome.error
  return outcome.value
}

export const SECOND = 1_000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
