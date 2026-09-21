import type { ScrapeResult } from "../types"
import { cents, toQuotes, type Direction, type TripQuote, type TripStatus } from "../trips"
import { fetchJson, fetchText } from "../http"

const FEED_URL = "https://expresslanes.com/maps-api/infra-price-confirmed-all"
const MAPPING_URL = "https://expresslanes.com/themes/custom/transurbangroup/js/on-the-road/entry_exit.js"
const PUBLIC_URL = "https://expresslanes.com/map-your-trip/"
const OPERATOR = "Transurban (expresslanes.com)"

interface FeedRow {
  od: string
  price: string
  road: string
  time: string
  status: string
}

interface Feed {
  error: string
  error_text: string
  response: FeedRow[]
  direction_95?: string
}

interface RawPoint {
  id: string
  label: string
  path: string
  latitude?: string
  longitude?: string
}

interface RawEntry extends RawPoint {
  exits: { id: string; ods: string[] }[]
}

interface RawDirection {
  entries: Record<string, RawEntry>
  exits: Record<string, RawPoint>
}

export type TransurbanMapping = Record<"Northbound" | "Southbound", RawDirection>

const CORRIDORS = ["495", "395", "95"] as const
type TransurbanId = (typeof CORRIDORS)[number]

const REVERSIBLE = new Set<TransurbanId>(["395", "95"])

function onRoad(path: string, corridor: TransurbanId): boolean {
  return path === corridor || path.startsWith(`${corridor}`)
}

function latLng(p: RawPoint): { lat: number | null; lng: number | null } {
  const lat = Number(p.latitude)
  const lng = Number(p.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null }
  return { lat, lng }
}

export function parseTransurbanMapping(js: string): TransurbanMapping {
  const marker = "var entryExits ="
  const start = js.indexOf(marker)
  const end = js.indexOf("\n};", start)
  if (start < 0 || end < 0) throw new Error("expresslanes.com entry/exit file has changed shape")
  const literal = js
    .slice(start + marker.length, end + 2)
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
    .replace(/,(\s*[}\]])/g, "$1")
  try {
    return JSON.parse(literal) as TransurbanMapping
  } catch {
    throw new Error("expresslanes.com entry/exit file is no longer parseable as JSON")
  }
}

export async function fetchTransurbanFeed(): Promise<Feed> {
  const data = await fetchJson<Feed>(FEED_URL, { headers: { Referer: PUBLIC_URL } })
  if (data.error !== "0" || !Array.isArray(data.response)) {
    throw new Error(`expresslanes.com price feed error: ${data.error_text || data.error}`)
  }
  return data
}

export async function fetchTransurbanMapping(): Promise<TransurbanMapping> {
  return parseTransurbanMapping(await fetchText(MAPPING_URL))
}

function rowMatchesCorridor(row: FeedRow, corridor: TransurbanId): boolean {
  const road = row.road === "null" ? "" : row.road
  if (corridor === "95" || corridor === "395") return road === "95" || road === "395" || road === "null"
  return road === corridor
}

function priceLink(
  ods: string[],
  rows: Map<string, FeedRow>,
  direction: Direction,
  reversible: boolean,
  open: Direction | null,
): { price: number | null; status: TripStatus } {
  if (reversible && open !== direction) return { price: null, status: "closed" }
  if (ods.length === 0) return { price: null, status: "missing" }
  let sum = 0
  for (const od of ods) {
    const row = rows.get(`od_${od}`)
    const price = row ? Number.parseFloat(row.price) : Number.NaN
    if (!row || !Number.isFinite(price)) return { price: null, status: "missing" }
    if (row.status === "closed") return { price: null, status: "closed" }
    sum += price
  }
  return { price: cents(sum), status: "open" }
}

export function tripsForCorridor(
  corridor: TransurbanId,
  feed: Feed,
  mapping: TransurbanMapping,
  open: Direction | null,
): TripQuote[] {
  const rows = new Map(feed.response.map((row) => [row.od, row]))
  const reversible = REVERSIBLE.has(corridor)
  const drafts = (["Northbound", "Southbound"] as const).flatMap((name) => {
    const direction: Direction = name === "Northbound" ? "nb" : "sb"
    const block = mapping[name]
    return Object.values(block.entries)
      .filter((entry) => onRoad(entry.path, corridor))
      .flatMap((entry) => {
        const entryLL = latLng(entry)
        return entry.exits.flatMap((link) => {
          const exit = block.exits[link.id]
          if (!exit) return []
          const exitLL = latLng(exit)
          const priced = priceLink(link.ods ?? [], rows, direction, reversible, open)
          return [
            {
              direction,
              entryId: entry.id,
              exitId: exit.id,
              entryLabel: entry.label,
              exitLabel: exit.label,
              entryLat: entryLL.lat,
              entryLng: entryLL.lng,
              exitLat: exitLL.lat,
              exitLng: exitLL.lng,
              exitOnCorridor: onRoad(exit.path, corridor),
              ...priced,
            },
          ]
        })
      })
  })
  return toQuotes(drafts)
}

export function splitTransurbanFeed(feed: Feed, mapping: TransurbanMapping): ScrapeResult[] {
  const scrapedAt = new Date().toISOString()
  const open: Direction | null = feed.direction_95 === "N" ? "nb" : feed.direction_95 === "S" ? "sb" : null

  return CORRIDORS.map((corridor) => {
    const rows = feed.response.filter((row) => rowMatchesCorridor(row, corridor))
    const trips = tripsForCorridor(corridor, feed, mapping, open)
    const summary: Record<string, unknown> = {
      scrapedAt,
      rowCount: rows.length,
      tripCount: trips.length,
      trips,
    }
    if (corridor !== "495") summary.openDirection95 = open
    return {
      corridor,
      operator: OPERATOR,
      sourceUrl: FEED_URL,
      payload: { direction_95: feed.direction_95 ?? null, rows },
      summary,
    }
  })
}

export function transurbanFailure(message: string): ScrapeResult[] {
  const scrapedAt = new Date().toISOString()
  return CORRIDORS.map((corridor) => ({
    corridor,
    operator: OPERATOR,
    sourceUrl: FEED_URL,
    payload: {},
    summary: { scrapedAt },
    error: message,
  }))
}
