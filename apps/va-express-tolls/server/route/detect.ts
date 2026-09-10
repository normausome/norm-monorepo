import { CORRIDORS, type CorridorId } from "../../src/data/corridors"
import type { Direction, TripEntry, TripPoint } from "../../src/lib/api-types"
import { adapters } from "../estimate"
import { type Projection, haversineMeters, polylineLength, projectOnto } from "./geometry"
import type { DrivingRoute, LngLat, RouteStep } from "./providers"

/**
 * Corridors are grouped the way the operators bill them. The 95 and 395 Express
 * Lanes are one continuous reversible road ("95 and 395 Express Lanes" on the
 * bill), so they are searched together and a trip can enter on one and exit on the
 * other. 495 is its own line item even though Transurban runs it too: keeping it
 * separate means a closed reversible 95/395 direction (no price) doesn't hide the
 * 495 price for the rest of the trip. The two I-66 systems are different operators.
 */
interface Network {
  id: string
  corridors: CorridorId[]
  /** Route steps whose road `ref` matches drive on this network's interstates. */
  ref: RegExp
  /** Which coordinate grows in the operator's "northbound"/"eastbound": lat → nb/sb, lng → eb/wb. */
  axis: "lat" | "lng"
}

const NETWORKS: Network[] = [
  { id: "95-395", corridors: ["95", "395"], ref: /\bI[ -]?(95|395)\b/, axis: "lat" },
  { id: "495", corridors: ["495"], ref: /\bI[ -]?495\b/, axis: "lat" },
  { id: "66-outside", corridors: ["66-outside"], ref: /\bI[ -]?66\b/, axis: "lng" },
  { id: "66-inside", corridors: ["66-inside"], ref: /\bI[ -]?66\b/, axis: "lng" },
]

/**
 * Matching radii, in metres, between an operator's entry/exit coordinate and the
 * route. On the interstate the operator's points sit on or beside the mainline, so
 * a tight radius avoids picking up ramps to other roads. At the two ends of a run
 * the route is on an on/off ramp while the Express Lanes' own ramp may land up to
 * ~1 km away (Route 7 at Tysons, Route 17 at Fredericksburg), so those are looser
 * and reported as a weaker match.
 */
const ON_ROUTE_M = 400
const NEAR_END_M = 1200
const END_ZONE_M = 300
/** Ramps between two of a network's interstates have no `ref`; bridge them so 95 → 395 → 495 stays one run (the Springfield connector is 2.3 km). */
const BRIDGE_GAP_M = 3000
/** Consider a network "nearby but unmatched" when an entry lies this close to the route. */
const NEARBY_M = 1000
/** How far ahead of an entry the direction of travel is measured. */
const HEADING_WINDOW_M = 5000
const MAX_LEGS_PER_RUN = 4

export interface LegMatch {
  corridor: CorridorId
  direction: Direction
  entry: TripPoint
  exit: TripPoint
  match: "on-route" | "near-ends"
}

export interface NetworkOutcome {
  legs: LegMatch[]
  /** Networks the route drives past without a confident entry/exit pair (fail closed, link out). */
  unmatched: { corridor: CorridorId; reason: string }[]
}

type Positioned<T> = { point: T; corridor: CorridorId } & Projection

const hasPos = <T extends TripPoint>(p: T): p is T & { lat: number; lng: number } =>
  typeof p.lat === "number" && typeof p.lng === "number"

/** Contiguous stretches of the route on one network's interstates, as polylines. */
function runsFor(steps: RouteStep[], network: Network): LngLat[][] {
  const runs: LngLat[][] = []
  let current: LngLat[] | null = null
  let gap: LngLat[] = []
  let gapMeters = 0
  for (const step of steps) {
    if (network.ref.test(step.ref)) {
      if (current && gap.length) current.push(...gap)
      if (!current) {
        current = []
        runs.push(current)
      }
      current.push(...step.geometry)
      gap = []
      gapMeters = 0
    } else if (current) {
      if (step.ref === "" && gapMeters + polylineLength(step.geometry) <= BRIDGE_GAP_M) {
        gap.push(...step.geometry)
        gapMeters += polylineLength(step.geometry)
      } else {
        current = null
        gap = []
        gapMeters = 0
      }
    }
  }
  return runs.filter((r) => r.length >= 2)
}

function pointAt(line: LngLat[], along: number): LngLat {
  let travelled = 0
  for (let i = 0; i < line.length - 1; i++) {
    const seg = haversineMeters(line[i], line[i + 1])
    if (travelled + seg >= along) {
      const t = seg === 0 ? 0 : (along - travelled) / seg
      return [line[i][0] + t * (line[i + 1][0] - line[i][0]), line[i][1] + t * (line[i + 1][1] - line[i][1])]
    }
    travelled += seg
  }
  return line[line.length - 1]
}

/** Operator direction id for the way the route travels from `along` onwards. */
function directionAt(run: LngLat[], runLength: number, along: number, network: Network): Direction {
  let a = pointAt(run, along)
  let b = pointAt(run, Math.min(runLength, along + HEADING_WINDOW_M))
  if (haversineMeters(a, b) < 500) {
    a = run[0]
    b = run[run.length - 1]
  }
  const delta = network.axis === "lat" ? b[1] - a[1] : b[0] - a[0]
  if (network.axis === "lat") return delta >= 0 ? "nb" : "sb"
  return delta >= 0 ? "eb" : "wb"
}

function isNear(p: Projection, runLength: number): boolean {
  if (p.distance <= ON_ROUTE_M) return true
  const atEnd = p.along <= END_ZONE_M || p.along >= runLength - END_ZONE_M
  return atEnd && p.distance <= NEAR_END_M
}

async function entriesFor(network: Network, direction: Direction): Promise<{ corridor: CorridorId; entry: TripEntry }[]> {
  const perCorridor = await Promise.all(
    network.corridors.map(async (corridor) => {
      const adapter = adapters[corridor]
      if (!adapter.support.directions.some((d) => d.id === direction)) return []
      const entries = await adapter.points(direction)
      return entries.map((entry) => ({ corridor, entry }))
    }),
  )
  return perCorridor.flat()
}

async function matchRun(network: Network, run: LngLat[]): Promise<{ legs: LegMatch[]; nearby: CorridorId | null }> {
  const runLength = polylineLength(run)
  const legs: LegMatch[] = []
  let nearby: { corridor: CorridorId; distance: number } | null = null
  let cursor = 0
  const entryCache = new Map<Direction, { corridor: CorridorId; entry: TripEntry }[]>()

  for (let i = 0; i < MAX_LEGS_PER_RUN; i++) {
    const direction = directionAt(run, runLength, cursor, network)
    let entries = entryCache.get(direction)
    if (!entries) {
      entries = await entriesFor(network, direction)
      entryCache.set(direction, entries)
    }

    const candidates: Positioned<TripEntry>[] = []
    for (const { corridor, entry } of entries) {
      if (!hasPos(entry)) continue
      const p = projectOnto(run, [entry.lng, entry.lat])
      if (p.distance <= NEARBY_M && (!nearby || p.distance < nearby.distance)) nearby = { corridor, distance: p.distance }
      if (p.along >= cursor && isNear(p, runLength)) candidates.push({ point: entry, corridor, ...p })
    }
    candidates.sort((a, b) => a.along - b.along)

    let matched = false
    for (const entry of candidates) {
      let best: Positioned<TripPoint> | null = null
      for (const exit of entry.point.exits) {
        if (!hasPos(exit)) continue
        const p = projectOnto(run, [exit.lng, exit.lat])
        if (p.along <= entry.along + END_ZONE_M || !isNear(p, runLength)) continue
        if (!best || p.along > best.along) best = { point: exit, corridor: entry.corridor, ...p }
      }
      if (!best) continue
      legs.push({
        corridor: entry.corridor,
        direction,
        entry: strip(entry.point),
        exit: strip(best.point),
        match: entry.distance <= ON_ROUTE_M && best.distance <= ON_ROUTE_M ? "on-route" : "near-ends",
      })
      cursor = best.along + END_ZONE_M
      matched = true
      break
    }
    if (!matched) break
  }
  return { legs, nearby: nearby?.corridor ?? null }
}

const strip = (p: TripPoint): TripPoint => ({ id: p.id, label: p.label, lat: p.lat, lng: p.lng })

const corridorName = (id: CorridorId) => CORRIDORS.find((c) => c.id === id)?.name ?? id

/**
 * Which Express Lanes trips a driven route implies, per operator network. Purely
 * geometric: the operators' own entry/exit coordinates are lined up against the
 * stretches of the route that run on the relevant interstates. The route itself
 * may be drawn on the free general-purpose lanes; the result answers "if you took
 * the Express Lanes wherever your route runs beside them, which trip would you buy".
 */
export async function detectLegs(route: DrivingRoute): Promise<NetworkOutcome> {
  const outcome: NetworkOutcome = { legs: [], unmatched: [] }
  await Promise.all(
    NETWORKS.map(async (network) => {
      const runs = runsFor(route.steps, network)
      if (runs.length === 0) return
      try {
        for (const run of runs) {
          const { legs, nearby } = await matchRun(network, run)
          outcome.legs.push(...legs)
          if (legs.length === 0 && nearby) {
            outcome.unmatched.push({
              corridor: nearby,
              reason: `Your route drives on this interstate close to the ${corridorName(nearby)}, but no entry and exit could be lined up with it confidently, so nothing is priced for this stretch.`,
            })
          }
        }
      } catch (err) {
        outcome.unmatched.push({
          corridor: network.corridors[network.corridors.length - 1],
          reason: `Could not load this operator's entry and exit points: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }),
  )
  // Present legs in driving order.
  const order = (leg: LegMatch) => (hasPos(leg.entry) ? projectOnto(route.geometry, [leg.entry.lng, leg.entry.lat]).along : 0)
  outcome.legs.sort((a, b) => order(a) - order(b))
  return outcome
}
