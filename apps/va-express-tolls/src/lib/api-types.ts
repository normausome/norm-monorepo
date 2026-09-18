import type { CorridorId } from "@/data/corridors"

export type Direction = "eb" | "wb" | "nb" | "sb"

export interface CorridorSupport {
  id: CorridorId
  /** Whether the server has a working adapter for this corridor. */
  supported: boolean
  /** Plain-English reason when `supported` is false. */
  reason?: string
  directions: { id: Direction; label: string }[]
  /** Whether the adapter can price a past date/time as well as "now". */
  historical: boolean
}

export interface TripPoint {
  id: string
  label: string
  /** WGS84 position from the operator's own map, when they publish one. */
  lat?: number
  lng?: number
}

export interface TripEntry extends TripPoint {
  exits: TripPoint[]
}

export interface PointsResponse {
  corridor: CorridorId
  direction: Direction
  entries: TripEntry[]
  /** Live operator status for this direction, when the operator publishes one. */
  notice?: string
}

export interface EstimateLeg {
  road: string
  price: number
  /** Operator-reported timestamp for this price, if any. */
  observedAt: string | null
  status: string | null
}

export interface EstimateResponse {
  corridor: CorridorId
  direction: Direction
  entry: TripPoint
  exit: TripPoint
  kind: "current" | "historical"
  /** Sum of legs, or null when the operator returned no usable price. */
  total: number | null
  currency: "USD"
  legs: EstimateLeg[]
  source: { operator: string; url: string; fetchedAt: string }
  notes: string[]
}

/**
 * Server-side response cache labels on `/estimate`. Identical requests within the
 * TTL share one answer; `expiresAt` is when the server will ask the operator again.
 */
export interface CacheInfo {
  cache: "hit" | "miss"
  cachedAt: string
  expiresAt: string
}

export type CachedEstimateResponse = EstimateResponse & CacheInfo

export interface ApiError extends Partial<CacheInfo> {
  error: string
}

/** A geocoded place (Advanced mode "from" / "to"). */
export interface Place {
  label: string
  lat: number
  lng: number
}

export interface GeocodeResponse {
  query: string
  results: Place[]
  provider: string
}

/**
 * One Express Lanes trip the driven route implies: the operator's entry and exit
 * points that lie along the route, priced through the corridor's adapter.
 */
export interface RouteLeg {
  corridor: CorridorId
  corridorName: string
  direction: Direction
  entry: TripPoint
  exit: TripPoint
  /**
   * "on-route": both points sit on the route itself. "near-ends": at least one was
   * matched at the start or end of the interstate stretch, where ramps diverge from
   * the route by up to ~1 km — the interchange is right, the exact gantry may not be.
   */
  match: "on-route" | "near-ends"
  /** Null when the operator could not be priced; see `error`. */
  estimate: CachedEstimateResponse | null
  error: string | null
  /** Live operator status for this direction (reversible 95/395), when published. */
  notice?: string
  calculatorUrl: string
}

/** An interstate with Express Lanes that the route drives on, but with no matchable entry/exit pair. */
export interface UnmatchedCorridor {
  corridor: CorridorId
  corridorName: string
  calculatorUrl: string
  reason: string
}

/**
 * One scraper snapshot for a corridor, normalized from the dmv-tolls-scraper
 * `corridor_snapshots.summary` JSONB (see apps/dmv-tolls-scraper). Prices are the
 * operator's posted per-segment/per-trip figures at that moment, in USD.
 */
export interface HistorySample {
  scrapedAt: string
  /** Lowest / highest / mean posted price across the corridor at that moment; null when the scrape failed or nothing was tolled. */
  min: number | null
  max: number | null
  avg: number | null
  /** Which way the reversible 95/395 lanes were open (Transurban corridors only). */
  openDirection95?: "nb" | "sb" | null
  /** I-66 Inside only: whether the operator reported a non-zero toll. */
  currentlyTolled?: boolean
  /** Scraper-recorded failure for this corridor, if any. */
  error: string | null
}

export interface HistoryCorridorStatus {
  id: CorridorId
  latest: HistorySample | null
  /** Snapshots recorded in the last 24 hours. */
  samples24h: number
}

export interface HistorySummaryResponse {
  /** False when the API has no DATABASE_URL; the UI then explains how to enable history. */
  available: boolean
  latestRun: { startedAt: string; finishedAt: string; status: "ok" | "partial" | "failed" } | null
  corridors: HistoryCorridorStatus[]
}

export interface HistoryResponse {
  corridor: CorridorId
  /** Window length actually applied (clamped server-side, 1–168). */
  hours: number
  samples: HistorySample[]
}

export interface RouteTollsResponse {
  from: Place
  to: Place
  route: {
    provider: string
    distanceMeters: number
    durationSeconds: number
    /** [lat, lng] pairs, full route. */
    geometry: [number, number][]
  }
  legs: RouteLeg[]
  unmatched: UnmatchedCorridor[]
  /** Sum of every leg's total when all legs are priced; null if any leg has no price. */
  total: number | null
  currency: "USD"
  notes: string[]
}
