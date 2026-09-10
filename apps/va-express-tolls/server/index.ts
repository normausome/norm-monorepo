import { existsSync } from "node:fs"
import path from "node:path"
import { CORRIDORS, isCorridorId } from "../src/data/corridors"
import type { ApiError, CacheInfo, Direction, EstimateResponse } from "../src/lib/api-types"
import { expresslanes, expresslanes395, expresslanes95 } from "./adapters/expresslanes"
import { ride66 } from "./adapters/ride66"
import { BadRequest, type CorridorAdapter } from "./adapters/types"
import { vai66 } from "./adapters/vai66"
import { MINUTE, type Outcome, SECOND, cachedOutcome } from "./cache"
import { UpstreamError } from "./http"

const adapters: Record<string, CorridorAdapter> = {
  "495": expresslanes,
  "395": expresslanes395,
  "95": expresslanes95,
  "66-inside": vai66,
  "66-outside": ride66,
}

const PORT = Number(process.env.PORT ?? 8787)
const DIST = path.resolve(import.meta.dir, "../dist")
const serveStatic = existsSync(DIST)

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  })

function errorResponse(err: unknown, extra: Partial<CacheInfo> = {}, headers?: Record<string, string>): Response {
  const body = (message: string, status: number) => json({ error: message, ...extra } satisfies ApiError, status, headers)
  if (err instanceof BadRequest) return body(err.message, err.status)
  if (err instanceof UpstreamError) return body(err.message, err.status)
  console.error(err)
  return body("Unexpected server error", 500)
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
 * Zone-less `YYYY-MM-DDTHH:mm` from the UI means Eastern wall-clock time (the
 * corridors' own clock), whatever the browser's zone. Try both EST/EDT offsets
 * and keep the one that round-trips through America/New_York.
 */
function easternWallClockToDate(local: string): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  for (const offset of ["-04:00", "-05:00"]) {
    const candidate = new Date(`${local}:00${offset}`)
    if (Number.isNaN(candidate.getTime())) continue
    const parts = fmt.formatToParts(candidate)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
    const roundTrip = `${get("year")}-${get("month")}-${get("day")}T${get("hour").padStart(2, "0").replace("24", "00")}:${get("minute")}`
    if (roundTrip === local) return candidate
  }
  return new Date(Number.NaN)
}

function adapterFor(id: string): CorridorAdapter {
  if (!isCorridorId(id)) throw new BadRequest(`Unknown corridor "${id}"`)
  return adapters[id]
}

function directionParam(url: URL, adapter: CorridorAdapter): Direction {
  const d = url.searchParams.get("direction") ?? ""
  const ok = adapter.support.directions.some((x) => x.id === d)
  if (!ok) throw new BadRequest(`direction must be one of: ${adapter.support.directions.map((x) => x.id).join(", ")}`)
  return d as Direction
}

async function handleApi(url: URL): Promise<Response> {
  const [, , corridorId, action] = url.pathname.split("/")

  if (corridorId === "corridors" && !action) {
    return json(
      CORRIDORS.map((c) => ({
        ...adapters[c.id].support,
        name: c.name,
        calculatorUrl: c.calculator.url,
      })),
    )
  }

  const adapter = adapterFor(corridorId ?? "")
  if (!adapter.support.supported) throw new BadRequest(adapter.support.reason ?? "This corridor is not automated")

  if (action === "points") {
    const direction = directionParam(url, adapter)
    const [entries, notice] = await Promise.all([adapter.points(direction), adapter.notice?.(direction)])
    return json({ corridor: adapter.support.id, direction, entries, ...(notice ? { notice } : {}) })
  }

  if (action === "estimate") {
    const direction = directionParam(url, adapter)
    const entry = url.searchParams.get("entry") ?? ""
    const exit = url.searchParams.get("exit") ?? ""
    if (!entry || !exit) throw new BadRequest("entry and exit are required")
    const atRaw = url.searchParams.get("at")
    let at: Date | undefined
    if (atRaw) {
      at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(atRaw) ? easternWallClockToDate(atRaw) : new Date(atRaw)
      if (Number.isNaN(at.getTime())) throw new BadRequest("at must be an ISO date-time")
    }
    // `at` is normalized to UTC so the same wall-clock minute written two ways shares an entry.
    const key = `estimate:${JSON.stringify([adapter.support.id, direction, entry, exit, at?.toISOString() ?? "now"])}`
    const { outcome, hit, cachedAt, expiresAt } = await cachedOutcome(
      key,
      () => adapter.estimate({ direction, entry, exit, at }),
      estimateTtl,
    )
    const cache: CacheInfo = { cache: hit ? "hit" : "miss", cachedAt, expiresAt }
    const headers = { "x-cache": hit ? "HIT" : "MISS" }
    if (!outcome.ok) return errorResponse(outcome.error, cache, headers)
    return json({ ...outcome.value, ...cache }, 200, headers)
  }

  throw new BadRequest("Not found")
}

async function serveFile(pathname: string): Promise<Response> {
  const target = path.resolve(DIST, `.${pathname === "/" ? "/index.html" : pathname}`)
  const inDist = target.startsWith(DIST + path.sep)
  let file = Bun.file(target)
  if (!inDist || !(await file.exists())) file = Bun.file(path.join(DIST, "index.html"))
  return new Response(file)
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(url)
      } catch (err) {
        return errorResponse(err)
      }
    }
    if (serveStatic && req.method === "GET") return serveFile(url.pathname)
    return json({ error: "Not found" }, 404)
  },
})

console.log(`va-express-tolls API on http://127.0.0.1:${PORT}${serveStatic ? " (also serving dist/)" : ""}`)
