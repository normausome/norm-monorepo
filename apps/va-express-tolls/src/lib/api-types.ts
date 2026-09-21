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

export type HistoryTripStatus = "open" | "free" | "closed" | "missing"

export interface HistoryTrip {
  direction: Direction
  entryId: string
  exitId: string
  entryLabel: string
  exitLabel: string
  spanning: boolean
}

export interface HistorySample {
  scrapedAt: string
  /** Null when the scrape failed, the pair was closed or missing, or this snapshot predates trip rows. */
  price: number | null
  /** `free` is an I-66 Inside toll of $0. Null when this snapshot has no row for the trip. */
  status: HistoryTripStatus | null
  /** Which way the reversible 95/395 lanes were open. Present only for those corridors. */
  openDirection95?: "nb" | "sb" | null
  error: string | null
}

export interface HistoryCorridorStatus {
  id: CorridorId
  latest: HistorySample | null
  /** Full-span trip the latest price belongs to, when the snapshot has trip rows. */
  headline: HistoryTrip | null
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
  /** Trip the samples belong to. Null when no snapshot has trip rows yet. */
  trip: HistoryTrip | null
  /** Pairs from the newest snapshot that stored trips. */
  trips: HistoryTrip[]
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
