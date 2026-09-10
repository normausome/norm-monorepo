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
