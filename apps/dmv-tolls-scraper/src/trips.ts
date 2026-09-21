export const DIRECTIONS = ["nb", "sb", "eb", "wb"] as const
export type Direction = (typeof DIRECTIONS)[number]
export type TripStatus = "open" | "free" | "closed" | "missing"

export interface TripQuote {
  direction: Direction
  entryId: string
  exitId: string
  entryLabel: string
  exitLabel: string
  spanning: boolean
  price: number | null
  status: TripStatus
}

export interface SpanInput {
  direction: Direction
  entryId: string
  exitId: string
  entryLat: number | null
  entryLng: number | null
  exitLat: number | null
  exitLng: number | null
  exitOnCorridor?: boolean
}

export function cents(n: number): number {
  return Math.round(n * 100) / 100
}

export function pairKey(t: { direction: string; entryId: string; exitId: string }): string {
  return `${t.direction}\0${t.entryId}\0${t.exitId}`
}

function progress(direction: Direction, lat: number, lng: number): number {
  if (direction === "nb") return lat
  if (direction === "sb") return -lat
  if (direction === "eb") return lng
  return -lng
}

function chooseSpanning(group: readonly SpanInput[]): string | null {
  const entries = new Map<string, { progress: number; trips: SpanInput[] }>()
  for (const trip of group) {
    if (trip.entryLat == null || trip.entryLng == null) continue
    const score = progress(trip.direction, trip.entryLat, trip.entryLng)
    const hit = entries.get(trip.entryId)
    if (hit) hit.trips.push(trip)
    else entries.set(trip.entryId, { progress: score, trips: [trip] })
  }
  const ordered = [...entries.values()].sort((a, b) => a.progress - b.progress)
  for (const entry of ordered) {
    let best: { score: number; trip: SpanInput } | null = null
    for (const trip of entry.trips) {
      if (trip.exitOnCorridor === false) continue
      if (trip.exitLat == null || trip.exitLng == null) continue
      const score = progress(trip.direction, trip.exitLat, trip.exitLng)
      if (!best || score > best.score) best = { score, trip }
    }
    if (best) return pairKey(best.trip)
  }
  return null
}

export function withSpanning<T extends SpanInput>(trips: readonly T[]): (T & { spanning: boolean })[] {
  const byDir = new Map<Direction, T[]>()
  for (const trip of trips) {
    const list = byDir.get(trip.direction)
    if (list) list.push(trip)
    else byDir.set(trip.direction, [trip])
  }
  const keys = new Set<string>()
  for (const group of byDir.values()) {
    const key = chooseSpanning(group)
    if (key) keys.add(key)
  }
  return trips.map((trip) => ({ ...trip, spanning: keys.has(pairKey(trip)) }))
}

export function toQuotes<T extends SpanInput & { entryLabel: string; exitLabel: string; price: number | null; status: TripStatus }>(
  drafts: readonly T[],
): TripQuote[] {
  return withSpanning(drafts).map((d) => {
    const priced = d.status === "open" || d.status === "free"
    const price = priced && d.price != null && Number.isFinite(d.price) ? cents(d.price) : null
    const status: TripStatus = priced && price == null ? "missing" : d.status
    return {
      direction: d.direction,
      entryId: d.entryId,
      exitId: d.exitId,
      entryLabel: d.entryLabel,
      exitLabel: d.exitLabel,
      spanning: d.spanning,
      price: status === "closed" || status === "missing" ? null : price,
      status,
    }
  })
}
