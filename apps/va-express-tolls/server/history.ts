import postgres from "postgres"
import { CORRIDORS, isCorridorId, type CorridorId } from "../src/data/corridors"
import type { Direction, HistoryResponse, HistorySample, HistorySummaryResponse, HistoryTrip } from "../src/lib/api-types"
import { BadRequest } from "./adapters/types"
import {
  catalogTrips,
  parseOpenDirection,
  parseTrips,
  publicTrip,
  resolveTrip,
  type TripQuery,
} from "./history-trips"
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

// The scraper owns the schema and creates it on its first run. Until then a
// configured but empty database is "no history yet", not an outage.
const UNDEFINED_TABLE = "42P01"
const isUndefinedTable = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === UNDEFINED_TABLE

async function withDb<T>(fn: (db: Sql) => Promise<T>, whenEmpty: () => T): Promise<T> {
  try {
    return await fn(client())
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof BadRequest) throw err
    if (isUndefinedTable(err)) return whenEmpty()
    console.error(err)
    throw new UpstreamError(`History database unavailable: ${err instanceof Error ? err.message : String(err)}`, 503)
  }
}

function clampHours(raw: string | null): number {
  const n = raw == null || raw === "" ? 24 : Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 24
  return Math.min(168, Math.max(1, n))
}

function isDirection(v: string): v is Direction {
  return v === "nb" || v === "sb" || v === "eb" || v === "wb"
}

function readTripQuery(url: URL): TripQuery | null {
  const direction = url.searchParams.get("direction")
  const entry = url.searchParams.get("entry")
  const exit = url.searchParams.get("exit")
  if (!direction && !entry && !exit) return null
  if (!direction || !entry || !exit) throw new BadRequest("direction, entry, and exit must be sent together")
  if (!isDirection(direction)) throw new BadRequest("direction must be nb, sb, eb, or wb")
  if (entry.length > 80 || exit.length > 120) throw new BadRequest("entry or exit id is too long")
  return { direction, entryId: entry, exitId: exit }
}

function openField(open: "nb" | "sb" | null | undefined): Pick<HistorySample, "openDirection95"> {
  return open === undefined ? {} : { openDirection95: open }
}

function headlineView(
  corridor: CorridorId,
  scrapedAt: Date,
  summary: unknown,
  error: string | null,
): { sample: HistorySample; headline: HistoryTrip | null } {
  const open = parseOpenDirection(summary)
  const picked = error ? null : resolveTrip(corridor, parseTrips(summary), null, open ?? null)
  return {
    sample: {
      scrapedAt: scrapedAt.toISOString(),
      price: picked?.price ?? null,
      status: picked?.status ?? null,
      ...openField(open),
      error,
    },
    headline: picked ? publicTrip(picked) : null,
  }
}

function seriesSample(scrapedAt: Date, error: string | null, hasOpen: boolean, openText: string | null, tripJson: unknown): HistorySample {
  const open = !hasOpen ? undefined : openText === "nb" || openText === "sb" ? openText : null
  const trip = error ? null : parseTrips({ trips: tripJson ? [tripJson] : [] })[0]
  return {
    scrapedAt: scrapedAt.toISOString(),
    price: trip?.price ?? null,
    status: trip?.status ?? null,
    ...openField(open),
    error,
  }
}

type RunRow = { started_at: Date; finished_at: Date; status: "ok" | "partial" | "failed" }
type LatestRow = { corridor_id: string; scraped_at: Date; summary: unknown; error: string | null; n: number }
type CatalogRow = { summary: unknown }
type SeriesRow = { scraped_at: Date; error: string | null; has_open: boolean; open_direction: string | null; trip: unknown }

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

    const latest = new Map<CorridorId, { sample: HistorySample; headline: HistoryTrip | null; n: number }>()
    for (const row of snaps) {
      if (!isCorridorId(row.corridor_id)) continue
      const view = headlineView(row.corridor_id, row.scraped_at, row.summary, row.error)
      latest.set(row.corridor_id, { ...view, n: row.n })
    }

    const run = runs[0]
    return {
      available: true,
      latestRun: run
        ? { startedAt: run.started_at.toISOString(), finishedAt: run.finished_at.toISOString(), status: run.status }
        : null,
      corridors: CORRIDORS.map((c) => {
        const hit = latest.get(c.id)
        return { id: c.id, latest: hit?.sample ?? null, headline: hit?.headline ?? null, samples24h: hit?.n ?? 0 }
      }),
    }
  }, emptySummary)
}

const emptySummary = (): HistorySummaryResponse => ({
  available: true,
  latestRun: null,
  corridors: CORRIDORS.map((c) => ({ id: c.id, latest: null, headline: null, samples24h: 0 })),
})

export async function handleHistory(corridorId: string, url: URL): Promise<HistoryResponse> {
  if (!isCorridorId(corridorId)) throw new BadRequest(`Unknown corridor "${corridorId}"`)
  if (!historyConfigured) throw new UpstreamError("History is not configured (DATABASE_URL is unset)", 503)
  const hours = clampHours(url.searchParams.get("hours"))
  const requested = readTripQuery(url)

  return withDb(async (db) => {
    const [catalogRow] = await db<CatalogRow[]>`
      SELECT summary
      FROM corridor_snapshots
      WHERE corridor_id = ${corridorId}
        AND jsonb_typeof(summary->'trips') = 'array'
        AND jsonb_array_length(summary->'trips') > 0
      ORDER BY scraped_at DESC
      LIMIT 1
    `
    const catalog = parseTrips(catalogRow?.summary)
    const open = parseOpenDirection(catalogRow?.summary)
    const chosen = resolveTrip(corridorId, catalog, requested, open ?? null)
    const direction = chosen?.direction ?? ""
    const entryId = chosen?.entryId ?? ""
    const exitId = chosen?.exitId ?? ""

    const rows = await db<SeriesRow[]>`
      SELECT s.scraped_at, s.error,
        (s.summary ? 'openDirection95') AS has_open,
        s.summary->>'openDirection95' AS open_direction,
        trip.elem AS trip
      FROM corridor_snapshots s
      LEFT JOIN LATERAL (
        SELECT elem
        FROM jsonb_array_elements(COALESCE(s.summary->'trips', '[]'::jsonb)) elem
        WHERE elem->>'direction' = ${direction}
          AND elem->>'entryId' = ${entryId}
          AND elem->>'exitId' = ${exitId}
        LIMIT 1
      ) trip ON true
      WHERE s.corridor_id = ${corridorId}
        AND s.scraped_at >= now() - ${hours} * interval '1 hour'
      ORDER BY s.scraped_at ASC
    `

    return {
      corridor: corridorId,
      hours,
      trip: chosen ? publicTrip(chosen) : null,
      trips: catalogTrips(corridorId, catalog, chosen),
      samples: rows.map((row) => seriesSample(row.scraped_at, row.error, row.has_open, row.open_direction, row.trip)),
    }
  }, () => ({ corridor: corridorId, hours, trip: null, trips: [], samples: [] }))
}
