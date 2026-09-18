import { existsSync } from "node:fs"
import path from "node:path"
import { CORRIDORS } from "../src/data/corridors"
import type { ApiError, CacheInfo, Direction } from "../src/lib/api-types"
import { BadRequest, type CorridorAdapter } from "./adapters/types"
import { allowedOrigins, preflight, withCors } from "./cors"
import { adapterFor, adapters, cachedEstimate } from "./estimate"
import { handleHistory, handleHistorySummary, historyConfigured } from "./history"
import { UpstreamError } from "./http"
import { handleGeocode, handleRouteTolls } from "./route"
import { geocodingProvider, routingProvider } from "./route/providers"

// Railway (and most PaaS) inject PORT and route to whatever listens on all interfaces.
const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? "0.0.0.0"
const DIST = path.resolve(import.meta.dir, "../dist")
const serveStatic = existsSync(DIST)
const startedAt = new Date()

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

function directionParam(url: URL, adapter: CorridorAdapter): Direction {
  const d = url.searchParams.get("direction") ?? ""
  const ok = adapter.support.directions.some((x) => x.id === d)
  if (!ok) throw new BadRequest(`direction must be one of: ${adapter.support.directions.map((x) => x.id).join(", ")}`)
  return d as Direction
}

async function handleApi(url: URL): Promise<Response> {
  const [, , corridorId, action] = url.pathname.split("/")

  // Deploy health check: must stay cheap and never touch an operator.
  if (corridorId === "health" && !action) {
    return json({
      ok: true,
      service: "va-express-tolls",
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      corridors: Object.keys(adapters),
      static: serveStatic,
      advanced: { routing: routingProvider, geocoding: geocodingProvider },
      history: historyConfigured,
    })
  }

  // Advanced mode: address → address. Both proxy third parties server-side (see route/providers.ts).
  if (corridorId === "geocode" && !action) return json(await handleGeocode(url))
  if (corridorId === "route-tolls" && !action) return json(await handleRouteTolls(url))
  if (corridorId === "history" && action === "summary") return json(await handleHistorySummary())
  if (corridorId === "history" && action) return json(await handleHistory(action, url))

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
    const { outcome, cache } = await cachedEstimate(adapter, { direction, entry, exit, at })
    const headers = { "x-cache": cache.cache === "hit" ? "HIT" : "MISS" }
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
  hostname: HOST,
  // Bun drops a connection idle for 10 s by default; a cold estimate can wait up to
  // 15 s on an operator (see http.ts), so give in-flight requests room to finish.
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname.startsWith("/api/")) {
      const pre = preflight(req)
      if (pre) return pre
      try {
        return withCors(req, await handleApi(url))
      } catch (err) {
        return withCors(req, errorResponse(err))
      }
    }
    if (serveStatic && req.method === "GET") return serveFile(url.pathname)
    return json({ error: "Not found" }, 404)
  },
})

console.log(
  `va-express-tolls API on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}` +
    `${serveStatic ? " (also serving dist/)" : ""}; CORS origins: ${[...allowedOrigins].join(", ")}`,
)
