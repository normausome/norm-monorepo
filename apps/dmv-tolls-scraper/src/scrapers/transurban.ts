import type { CorridorId, ScrapeResult } from "../types"
import { fetchJson } from "../http"

const FEED_URL = "https://expresslanes.com/maps-api/infra-price-confirmed-all"
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

const CORRIDOR_ROADS: Record<Exclude<CorridorId, "66-inside" | "66-outside">, (road: string) => boolean> = {
  "495": (road) => road === "495",
  "395": (road) => road === "395",
  "95": (road) => road === "95",
}

function rowMatchesCorridor(row: FeedRow, corridor: keyof typeof CORRIDOR_ROADS): boolean {
  const road = row.road === "null" ? "" : row.road
  if (corridor === "95" || corridor === "395") return road === "95" || road === "395" || road === "null"
  return CORRIDOR_ROADS[corridor](road)
}

export async function fetchTransurbanFeed(): Promise<Feed> {
  const data = await fetchJson<Feed>(FEED_URL, { headers: { Referer: PUBLIC_URL } })
  if (data.error !== "0" || !Array.isArray(data.response)) {
    throw new Error(`expresslanes.com price feed error: ${data.error_text || data.error}`)
  }
  return data
}

export function splitTransurbanFeed(feed: Feed): ScrapeResult[] {
  const scrapedAt = new Date().toISOString()
  const open95 = feed.direction_95 === "N" ? "nb" : feed.direction_95 === "S" ? "sb" : null
  const corridors: (keyof typeof CORRIDOR_ROADS)[] = ["495", "395", "95"]

  return corridors.map((corridor) => {
    const rows = feed.response.filter((r) => rowMatchesCorridor(r, corridor))
    const prices = rows
      .map((r) => Number.parseFloat(r.price))
      .filter((p) => Number.isFinite(p))
    const summary = {
      scrapedAt,
      rowCount: rows.length,
      openDirection95: open95,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice: prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null,
    }
    return {
      corridor,
      operator: OPERATOR,
      sourceUrl: FEED_URL,
      payload: { direction_95: feed.direction_95 ?? null, rows },
      summary,
    }
  })
}
