import { CORRIDORS, isCorridorId, type CorridorId } from "../src/data/corridors"
import type { HistoryOverviewCorridor, HistoryOverviewResponse, HistoryOverviewSample } from "../src/lib/api-types"
import { parseTrips } from "./history-trips"

export function statsFromSummary(summary: unknown): Pick<HistoryOverviewSample, "min" | "avg" | "max" | "tripCount"> {
  const trips = parseTrips(summary)
  const prices = trips.flatMap((t) =>
    t.price != null && (t.status === "open" || t.status === "free") ? [t.price] : [],
  )
  if (prices.length === 0) return { min: null, avg: null, max: null, tripCount: 0 }
  const sum = prices.reduce((a, b) => a + b, 0)
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: sum / prices.length,
    tripCount: prices.length,
  }
}

export function buildOverviewCorridors(
  rows: readonly { corridor_id: string; scraped_at: Date; summary: unknown; error: string | null }[],
): HistoryOverviewCorridor[] {
  const byCorridor = new Map<CorridorId, HistoryOverviewSample[]>()
  for (const row of rows) {
    if (!isCorridorId(row.corridor_id)) continue
    const stats = statsFromSummary(row.summary)
    const sample: HistoryOverviewSample = {
      scrapedAt: row.scraped_at.toISOString(),
      error: row.error,
      ...stats,
    }
    const list = byCorridor.get(row.corridor_id) ?? []
    list.push(sample)
    byCorridor.set(row.corridor_id, list)
  }
  return CORRIDORS.map((c) => ({
    id: c.id,
    samples: byCorridor.get(c.id) ?? [],
  }))
}

export function emptyOverview(hours: number): HistoryOverviewResponse {
  return {
    available: true,
    hours,
    corridors: CORRIDORS.map((c) => ({ id: c.id, samples: [] })),
  }
}
