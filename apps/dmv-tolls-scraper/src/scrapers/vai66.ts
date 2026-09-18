import type { ScrapeResult } from "../types"
import { fetchJson, fetchText, parseOptions } from "../http"

const BASE = "https://www.vai66tolls.com"
const PUBLIC_URL = "https://vai66tolls.com/"
const OPERATOR = "VDOT (vai66tolls.com)"
const TZ = "America/New_York"

type Direction = "eb" | "wb"

function easternFormParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return {
    datePicked: `${get("month")}/${get("day")}/${get("year")}`,
    timePicked: `${get("hour")} : ${get("minute")} ${get("dayPeriod").toLowerCase()}`,
  }
}

async function entriesFor(eb: boolean) {
  const html = await fetchText(`${BASE}/Index?handler=BeginIntPartial&rbEastVal=${eb}`)
  const opts = parseOptions(html)
  if (opts.length === 0) throw new Error("vai66tolls.com returned no entry interchanges")
  return opts
}

async function exitsFor(entryId: string, eb: boolean) {
  const html = await fetchText(`${BASE}/Index?handler=ExitIntPartial&bIntId=${encodeURIComponent(entryId)}&rbEastVal=${eb}`)
  return parseOptions(html)
}

interface TollCalcPayload {
  decToll?: number | string
}

async function currentToll(entryId: string, exitId: string, direction: Direction) {
  const eb = direction === "eb"
  const { datePicked, timePicked } = easternFormParts(new Date())
  const params = new URLSearchParams({
    handler: "TollCalcPartial",
    bIntId: entryId,
    eIntId: exitId,
    datePicked,
    timePicked,
    rbEastVal: String(eb),
    isCurrent: "true",
  })
  const payload = await fetchJson<TollCalcPayload>(`${BASE}/Index?${params}`)
  const raw = payload.decToll
  const toll = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN
  if (!Number.isFinite(toll)) throw new Error("vai66tolls.com responded without a numeric toll")
  return toll
}

/** Spanning benchmark trips (first entry to last reachable exit) per peak direction. */
async function benchmarkTrip(direction: Direction) {
  const eb = direction === "eb"
  const entries = await entriesFor(eb)
  const entry = entries[0]
  const exits = await exitsFor(entry.id, eb)
  const exit = exits[exits.length - 1]
  if (!exit) throw new Error(`No exits for vai66 entry ${entry.id}`)
  const toll = await currentToll(entry.id, exit.id, direction)
  return {
    direction,
    entry: { id: entry.id, label: entry.label },
    exit: { id: exit.id, label: exit.label },
    toll,
  }
}

export async function scrapeVai66(): Promise<ScrapeResult> {
  const scrapedAt = new Date().toISOString()
  const trips = await Promise.all([benchmarkTrip("eb"), benchmarkTrip("wb")])
  const tolls = trips.map((t) => t.toll).filter((t) => t > 0)
  return {
    corridor: "66-inside",
    operator: OPERATOR,
    sourceUrl: PUBLIC_URL,
    payload: { scrapedAt, trips },
    summary: {
      scrapedAt,
      tripCount: trips.length,
      maxToll: tolls.length ? Math.max(...tolls) : 0,
      minToll: tolls.length ? Math.min(...tolls) : 0,
      currentlyTolled: tolls.length > 0,
    },
  }
}
