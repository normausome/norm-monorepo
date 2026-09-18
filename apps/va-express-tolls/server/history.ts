import postgres from "postgres"
import { CORRIDORS, isCorridorId, type CorridorId } from "../src/data/corridors"
import type { HistoryResponse, HistorySample, HistorySummaryResponse } from "../src/lib/api-types"
import { BadRequest } from "./adapters/types"
import { UpstreamError } from "./http"

export const historyConfigured = Boolean(process.env.DATABASE_URL)

type Sql = ReturnType<typeof postgres>
let sql: Sql | undefined

function client(): Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new UpstreamError("History is not configured (DATABASE_URL is unset)", 503)
    sql = postgres(url, { max: 2, idle_timeout: 30, connect_timeout: 10 })
  }
  return sql
}

async function withDb<T>(fn: (db: Sql) => Promise<T>): Promise<T> {
  try {
    return await fn(client())
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof BadRequest) throw err
    console.error(err)
    throw new UpstreamError(`History database unavailable: ${err instanceof Error ? err.message : String(err)}`, 503)
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

type Json = Record<string, unknown>

function asJson(v: unknown): Json {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {}
}

function mid(min: number | null, max: number | null): number | null {
  // Scraper stores 0/0 when I-66 Inside is not currently tolled; that is not a $0 trip.
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return null
  return Math.round((((min ?? max)! + (max ?? min)!) / 2) * 100) / 100
}

const transurban = (s: Json): Partial<HistorySample> => ({
  min: num(s.minPrice),
  max: num(s.maxPrice),
  avg: num(s.avgPrice),
  openDirection95: s.openDirection95 === "nb" || s.openDirection95 === "sb" ? s.openDirection95 : null,
})

const fields: Record<CorridorId, (summary: Json) => Partial<HistorySample>> = {
  "495": transurban,
  "395": transurban,
  "95": transurban,
  "66-inside": (s) => {
    const min = num(s.minToll)
    const max = num(s.maxToll)
    return { min, max, avg: mid(min, max), currentlyTolled: Boolean(s.currentlyTolled) }
  },
  "66-outside": (s) => ({ min: num(s.minRate), max: num(s.maxRate), avg: num(s.avgRate) }),
}

function toSample(corridor: CorridorId, scrapedAt: Date, summary: unknown, error: string | null): HistorySample {
  const extra = fields[corridor](asJson(summary))
  const failed = Boolean(error)
  return {
    scrapedAt: scrapedAt.toISOString(),
    min: failed ? null : (extra.min ?? null),
    max: failed ? null : (extra.max ?? null),
    avg: failed ? null : (extra.avg ?? null),
    ...(extra.openDirection95 !== undefined ? { openDirection95: extra.openDirection95 } : {}),
    ...(extra.currentlyTolled !== undefined ? { currentlyTolled: extra.currentlyTolled } : {}),
    error: failed ? error : null,
  }
}

function clampHours(raw: string | null): number {
  const n = raw == null || raw === "" ? 24 : Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 24
  return Math.min(168, Math.max(1, n))
}

type RunRow = { started_at: Date; finished_at: Date; status: "ok" | "partial" | "failed" }
type LatestRow = { corridor_id: string; scraped_at: Date; summary: unknown; error: string | null; n: number }
type SampleRow = { scraped_at: Date; summary: unknown; error: string | null }

export async function handleHistorySummary(): Promise<HistorySummaryResponse> {
  if (!historyConfigured) return { available: false, latestRun: null, corridors: [] }

  return withDb(async (db) => {
    const [runs, snaps] = await Promise.all([
      db<RunRow[]>`
        SELECT started_at, finished_at, status FROM scrape_runs ORDER BY started_at DESC LIMIT 1
      `,
      db<LatestRow[]>`
        SELECT DISTINCT ON (s.corridor_id)
          s.corridor_id, s.scraped_at, s.summary, s.error, COALESCE(c.n, 0)::int AS n
        FROM corridor_snapshots s
        LEFT JOIN (
          SELECT corridor_id, count(*)::int AS n
          FROM corridor_snapshots
          WHERE scraped_at >= now() - interval '24 hours'
          GROUP BY corridor_id
        ) c USING (corridor_id)
        ORDER BY s.corridor_id, s.scraped_at DESC
      `,
    ])

    const latest = new Map<CorridorId, { sample: HistorySample; n: number }>()
    for (const row of snaps) {
      if (!isCorridorId(row.corridor_id)) continue
      latest.set(row.corridor_id, {
        sample: toSample(row.corridor_id, row.scraped_at, row.summary, row.error),
        n: row.n,
      })
    }

    const run = runs[0]
    return {
      available: true,
      latestRun: run
        ? { startedAt: run.started_at.toISOString(), finishedAt: run.finished_at.toISOString(), status: run.status }
        : null,
      corridors: CORRIDORS.map((c) => {
        const hit = latest.get(c.id)
        return { id: c.id, latest: hit?.sample ?? null, samples24h: hit?.n ?? 0 }
      }),
    }
  })
}

export async function handleHistory(corridorId: string, url: URL): Promise<HistoryResponse> {
  if (!isCorridorId(corridorId)) throw new BadRequest(`Unknown corridor "${corridorId}"`)
  if (!historyConfigured) throw new UpstreamError("History is not configured (DATABASE_URL is unset)", 503)
  const hours = clampHours(url.searchParams.get("hours"))

  return withDb(async (db) => {
    const rows = await db<SampleRow[]>`
      SELECT scraped_at, summary, error
      FROM corridor_snapshots
      WHERE corridor_id = ${corridorId}
        AND scraped_at >= now() - ${hours} * interval '1 hour'
      ORDER BY scraped_at ASC
    `
    return {
      corridor: corridorId,
      hours,
      samples: rows.map((r) => toSample(corridorId, r.scraped_at, r.summary, r.error)),
    }
  })
}
