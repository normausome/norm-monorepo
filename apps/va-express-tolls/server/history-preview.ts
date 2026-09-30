import { CORRIDORS, type CorridorId } from "../src/data/corridors"
import type { HistoryOverviewCorridor, HistoryOverviewResponse, HistorySummaryResponse } from "../src/lib/api-types"
import { buildOverviewCorridors } from "./history-overview"

/** Local/demo only: set HISTORY_PREVIEW=1 to serve fixture snapshots without Postgres. */
export const historyPreviewEnabled = process.env.HISTORY_PREVIEW === "1"

const BASE: Record<CorridorId, { min: number; avg: number; max: number }> = {
  "495": { min: 1.25, avg: 4.8, max: 12.5 },
  "395": { min: 2, avg: 6.2, max: 14 },
  "95": { min: 3.5, avg: 9.1, max: 22 },
  "66-inside": { min: 0, avg: 3.4, max: 8.75 },
  "66-outside": { min: 0.75, avg: 5.5, max: 11 },
}

function trip(
  direction: "nb" | "sb" | "eb" | "wb",
  entryId: string,
  exitId: string,
  price: number,
  spanning: boolean,
) {
  return {
    direction,
    entryId,
    exitId,
    entryLabel: entryId,
    exitLabel: exitId,
    spanning,
    price,
    status: price === 0 ? ("free" as const) : ("open" as const),
  }
}

function summaryFor(corridor: CorridorId, scrapeIndex: number) {
  const base = BASE[corridor]
  const wave = Math.sin(scrapeIndex / 4) * 0.15 + 1
  const min = Math.round(base.min * wave * 100) / 100
  const max = Math.round(base.max * wave * 100) / 100
  const avg = Math.round(base.avg * wave * 100) / 100
  const dir = corridor.startsWith("66") ? ("eb" as const) : ("nb" as const)
  return {
    trips: [
      trip(dir, "entry-a", "exit-z", avg, true),
      trip(dir, "entry-a", "exit-m", min, false),
      trip(dir, "entry-b", "exit-z", max, false),
    ],
  }
}

export function previewOverview(hours: number): HistoryOverviewResponse {
  const now = Date.now()
  const stepMs = 30 * 60 * 1000
  const count = Math.min(Math.ceil((hours * 3600 * 1000) / stepMs), 48)
  const rows: { corridor_id: string; scraped_at: Date; summary: unknown; error: string | null }[] = []
  for (let i = 0; i < count; i++) {
    const scraped_at = new Date(now - (count - 1 - i) * stepMs)
    for (const c of CORRIDORS) {
      rows.push({
        corridor_id: c.id,
        scraped_at,
        summary: summaryFor(c.id, i),
        error: null,
      })
    }
  }
  return { available: true, hours, corridors: buildOverviewCorridors(rows) }
}

export function previewSummary(): HistorySummaryResponse {
  const overview = previewOverview(24)
  const finishedAt = new Date().toISOString()
  return {
    available: true,
    latestRun: { startedAt: finishedAt, finishedAt, status: "ok" },
    corridors: CORRIDORS.map((c) => {
      const row = overview.corridors.find((x) => x.id === c.id) as HistoryOverviewCorridor | undefined
      const latest = row?.samples.at(-1)
      return {
        id: c.id,
        latest: latest
          ? {
              scrapedAt: latest.scrapedAt,
              price: latest.avg,
              status: "open",
              error: null,
            }
          : null,
        headline: latest
          ? {
              direction: c.id.startsWith("66") ? "eb" : "nb",
              entryId: "entry-a",
              exitId: "exit-z",
              entryLabel: "entry-a",
              exitLabel: "exit-z",
              spanning: true,
            }
          : null,
        samples24h: row?.samples.length ?? 0,
      }
    }),
  }
}
