import type { CorridorSupport, Direction, EstimateResponse, TripEntry } from "../../src/lib/api-types"

export interface EstimateRequest {
  direction: Direction
  entry: string
  exit: string
  /** Past date/time to price historically; undefined means "right now". */
  at?: Date
}

export interface CorridorAdapter {
  support: CorridorSupport
  points(direction: Direction): Promise<TripEntry[]>
  estimate(req: EstimateRequest): Promise<EstimateResponse>
}

export class BadRequest extends Error {
  readonly status = 400
}
