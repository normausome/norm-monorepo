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
  /** Optional live operator status worth showing above the form (e.g. which way reversible lanes are open). */
  notice?(direction: Direction): Promise<string | undefined>
  estimate(req: EstimateRequest): Promise<EstimateResponse>
}

export class BadRequest extends Error {
  readonly status = 400
}
