import type { CorridorId } from "../src/data/corridors"
import type { Direction, HistoryTrip, HistoryTripStatus } from "../src/lib/api-types"

const DIRECTIONS = ["nb", "sb", "eb", "wb"] as const
const STATUSES = ["open", "free", "closed", "missing"] as const

const ORDER: Record<CorridorId, readonly Direction[]> = {
  "495": ["nb", "sb"],
  "395": ["nb", "sb"],
  "95": ["nb", "sb"],
  "66-inside": ["eb", "wb"],
  "66-outside": ["eb", "wb"],
}

export interface StoredTrip extends HistoryTrip {
  price: number | null
  status: HistoryTripStatus
}

export interface TripQuery {
  direction: Direction
  entryId: string
  exitId: string
}

function isDirection(v: unknown): v is Direction {
  return typeof v === "string" && (DIRECTIONS as readonly string[]).includes(v)
}

function isStatus(v: unknown): v is HistoryTripStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v)
}

function text(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= max ? v : null
}

function parseTrip(item: unknown): StoredTrip | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null
  const row = item as Record<string, unknown>
  const entryId = text(row.entryId, 80)
  const exitId = text(row.exitId, 120)
  const entryLabel = text(row.entryLabel, 300)
  const exitLabel = text(row.exitLabel, 300)
  if (!isDirection(row.direction) || !isStatus(row.status) || !entryId || !exitId || !entryLabel || !exitLabel) return null
  const price = typeof row.price === "number" && Number.isFinite(row.price) ? row.price : null
  const priced = row.status === "open" || row.status === "free"
  const status: HistoryTripStatus = priced && price == null ? "missing" : row.status
  return {
    direction: row.direction,
    entryId,
    exitId,
    entryLabel,
    exitLabel,
    spanning: row.spanning === true,
    status,
    price: status === "open" || status === "free" ? price : null,
  }
}

export function parseTrips(summary: unknown): StoredTrip[] {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return []
  const raw = (summary as { trips?: unknown }).trips
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const trip = parseTrip(item)
    return trip ? [trip] : []
  })
}

export function parseOpenDirection(summary: unknown): "nb" | "sb" | null | undefined {
  if (!summary || typeof summary !== "object" || Array.isArray(summary) || !("openDirection95" in summary)) return undefined
  const value = (summary as { openDirection95?: unknown }).openDirection95
  if (value === "nb" || value === "sb") return value
  return null
}

export function publicTrip(trip: StoredTrip): HistoryTrip {
  return {
    direction: trip.direction,
    entryId: trip.entryId,
    exitId: trip.exitId,
    entryLabel: trip.entryLabel,
    exitLabel: trip.exitLabel,
    spanning: trip.spanning,
  }
}

function sameTrip(a: TripQuery, b: TripQuery): boolean {
  return a.direction === b.direction && a.entryId === b.entryId && a.exitId === b.exitId
}

export function pickHeadline(corridor: CorridorId, trips: readonly StoredTrip[], open: "nb" | "sb" | null): StoredTrip | null {
  const spanning = trips.filter((trip) => trip.spanning)
  const pool = spanning.length > 0 ? spanning : trips
  if (open) {
    const match = pool.find((trip) => trip.direction === open)
    if (match) return match
  }
  for (const direction of ORDER[corridor]) {
    const match = pool.find((trip) => trip.direction === direction && trip.status === "open" && trip.price != null)
    if (match) return match
  }
  for (const direction of ORDER[corridor]) {
    const match = pool.find((trip) => trip.direction === direction && trip.price != null)
    if (match) return match
  }
  for (const direction of ORDER[corridor]) {
    const match = pool.find((trip) => trip.direction === direction)
    if (match) return match
  }
  return pool[0] ?? null
}

export function sortTrips(corridor: CorridorId, trips: readonly StoredTrip[]): StoredTrip[] {
  const order = ORDER[corridor]
  return [...trips].sort((a, b) => {
    const byDirection = order.indexOf(a.direction) - order.indexOf(b.direction)
    if (byDirection !== 0) return byDirection
    if (a.spanning !== b.spanning) return a.spanning ? -1 : 1
    const byEntry = a.entryLabel.localeCompare(b.entryLabel)
    if (byEntry !== 0) return byEntry
    return a.exitLabel.localeCompare(b.exitLabel)
  })
}

export function resolveTrip(
  corridor: CorridorId,
  catalog: readonly StoredTrip[],
  requested: TripQuery | null,
  open: "nb" | "sb" | null,
): StoredTrip | null {
  if (!requested) return pickHeadline(corridor, catalog, open)
  return (
    catalog.find((trip) => sameTrip(trip, requested)) ?? {
      direction: requested.direction,
      entryId: requested.entryId,
      exitId: requested.exitId,
      entryLabel: requested.entryId,
      exitLabel: requested.exitId,
      spanning: false,
      price: null,
      status: "missing",
    }
  )
}

export function catalogTrips(corridor: CorridorId, catalog: readonly StoredTrip[], chosen: StoredTrip | null): HistoryTrip[] {
  const rows = chosen && !catalog.some((trip) => sameTrip(trip, chosen)) ? [chosen, ...catalog] : [...catalog]
  return sortTrips(corridor, rows).map(publicTrip)
}
