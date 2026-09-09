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

export interface ApiError {
  error: string
}
