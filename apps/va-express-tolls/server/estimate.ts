import { isCorridorId } from "../src/data/corridors"
import type { CacheInfo, EstimateResponse } from "../src/lib/api-types"
import { expresslanes, expresslanes395, expresslanes95 } from "./adapters/expresslanes"
import { ride66 } from "./adapters/ride66"
import { BadRequest, type CorridorAdapter, type EstimateRequest } from "./adapters/types"
import { vai66 } from "./adapters/vai66"
import { MINUTE, type Outcome, SECOND, cachedOutcome } from "./cache"

export const adapters: Record<string, CorridorAdapter> = {
  "495": expresslanes,
  "395": expresslanes395,
  "95": expresslanes95,
  "66-inside": vai66,
  "66-outside": ride66,
}

export function adapterFor(id: string): CorridorAdapter {
  if (!isCorridorId(id)) throw new BadRequest(`Unknown corridor "${id}"`)
  return adapters[id]
}

/**
 * Prices are dynamic, so a priced estimate is reused for 3 minutes. A trip with
 * no price (closed / reversing lanes) or an operator failure is kept only briefly
 * so a recovery shows up quickly, while a burst of retries still doesn't fan out.
 * Bad requests are deterministic and cost no upstream call, so they aren't kept.
 */
const ESTIMATE_TTL = 3 * MINUTE
const NEGATIVE_TTL = 30 * SECOND
function estimateTtl(outcome: Outcome<EstimateResponse>): number {
  if (outcome.ok) return outcome.value.total === null ? NEGATIVE_TTL : ESTIMATE_TTL
  return outcome.error instanceof BadRequest ? 0 : NEGATIVE_TTL
}

/**
 * One trip, priced through the corridor's adapter behind the shared response cache.
 * Simple mode's /estimate and Advanced mode's /route-tolls both come through here,
 * so the same trip asked either way shares one operator call.
 */
export async function cachedEstimate(adapter: CorridorAdapter, req: EstimateRequest) {
  // `at` is normalized to UTC so the same wall-clock minute written two ways shares an entry.
  const key = `estimate:${JSON.stringify([adapter.support.id, req.direction, req.entry, req.exit, req.at?.toISOString() ?? "now"])}`
  const { outcome, hit, cachedAt, expiresAt } = await cachedOutcome(key, () => adapter.estimate(req), estimateTtl)
  const cache: CacheInfo = { cache: hit ? "hit" : "miss", cachedAt, expiresAt }
  return { outcome, cache }
}
