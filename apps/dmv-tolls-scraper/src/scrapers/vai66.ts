import type { ScrapeResult } from "../types"
import { toQuotes, type Direction, type TripQuote, type TripStatus } from "../trips"
import { fetchJson, fetchText, parseOptions } from "../http"

const BASE = "https://www.vai66tolls.com"
const PUBLIC_URL = "https://vai66tolls.com/"
const OPERATOR = "VDOT (vai66tolls.com)"
const TZ = "America/New_York"
const POOL = 6

interface Point {
  id: string
  label: string
  lat?: number
  lng?: number
}

interface Measured {
  direction: Direction
  entry: Point
  exit: Point
  price: number | null
}

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

function parseCoords(html: string): Map<string, { lat: number; lng: number }> {
  const out = new Map<string, { lat: number; lng: number }>()
  for (const m of html.matchAll(/new Exit\('[^']*',\s*0,\s*0,\s*'[ew]b',\s*(\d+),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/g)) {
    out.set(m[1], { lat: Number(m[2]), lng: Number(m[3]) })
  }
  return out
}

function withCoords(html: string, opts: { id: string; label: string }[]): Point[] {
  const coords = parseCoords(html)
  return opts.map((opt) => ({ ...opt, ...coords.get(opt.id) }))
}

async function entriesFor(eb: boolean): Promise<Point[]> {
  const html = await fetchText(`${BASE}/Index?handler=BeginIntPartial&rbEastVal=${eb}`)
  const opts = withCoords(html, parseOptions(html))
  if (opts.length === 0) throw new Error("vai66tolls.com returned no entry interchanges")
  return opts
}

async function exitsFor(entryId: string, eb: boolean): Promise<Point[]> {
  const html = await fetchText(`${BASE}/Index?handler=ExitIntPartial&bIntId=${encodeURIComponent(entryId)}&rbEastVal=${eb}`)
  return withCoords(html, parseOptions(html))
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

async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return []
  const out: R[] = Array.from({ length: items.length })
  let next = 0
  async function worker() {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) return
      const item = items[i]
      if (item === undefined) return
      out[i] = await fn(item)
    }
  }
  const workers = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return out
}

export function quotesFromMeasured(rows: readonly Measured[]): TripQuote[] {
  return toQuotes(
    rows.map((row) => {
      const status: TripStatus = row.price == null ? "missing" : row.price === 0 ? "free" : "open"
      return {
        direction: row.direction,
        entryId: row.entry.id,
        exitId: row.exit.id,
        entryLabel: row.entry.label,
        exitLabel: row.exit.label,
        entryLat: row.entry.lat ?? null,
        entryLng: row.entry.lng ?? null,
        exitLat: row.exit.lat ?? null,
        exitLng: row.exit.lng ?? null,
        price: status === "missing" ? null : row.price,
        status,
      }
    }),
  )
}

async function directionTrips(direction: Direction): Promise<Measured[]> {
  const eb = direction === "eb"
  const entries = await entriesFor(eb)
  const withExits = await mapPool(entries, POOL, async (entry) => ({
    entry,
    exits: await exitsFor(entry.id, eb),
  }))
  const pairs = withExits.flatMap(({ entry, exits }) => exits.map((exit) => ({ entry, exit })))
  return mapPool(pairs, POOL, async ({ entry, exit }) => {
    try {
      const price = await currentToll(entry.id, exit.id, direction)
      return { direction, entry, exit, price }
    } catch {
      return { direction, entry, exit, price: null }
    }
  })
}

export async function scrapeVai66(): Promise<ScrapeResult> {
  const scrapedAt = new Date().toISOString()
  const measured = (await Promise.all([directionTrips("eb"), directionTrips("wb")])).flat()
  const trips = quotesFromMeasured(measured)
  if (trips.every((trip) => trip.status === "missing")) {
    throw new Error("vai66tolls.com returned no toll for any entry-exit pair")
  }
  return {
    corridor: "66-inside",
    operator: OPERATOR,
    sourceUrl: PUBLIC_URL,
    payload: { tripCount: trips.length },
    summary: { scrapedAt, tripCount: trips.length, trips },
  }
}
