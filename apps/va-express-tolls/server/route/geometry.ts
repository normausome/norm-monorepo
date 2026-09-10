import type { LngLat } from "./providers"

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Metres between two WGS84 points. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s))
}

/** Equirectangular projection of `p` in metres relative to `origin`; exact enough over a few km. */
function local(p: LngLat, origin: LngLat): [number, number] {
  return [toRad(p[0] - origin[0]) * Math.cos(toRad(origin[1])) * EARTH_RADIUS_M, toRad(p[1] - origin[1]) * EARTH_RADIUS_M]
}

export interface Projection {
  /** Metres from the point to the nearest spot on the line. */
  distance: number
  /** Metres from the start of the line to that spot. */
  along: number
}

/** Nearest spot on a polyline to a point, as a lateral distance and a position along the line. */
export function projectOnto(line: LngLat[], p: LngLat): Projection {
  let best: Projection = { distance: Number.POSITIVE_INFINITY, along: 0 }
  let travelled = 0
  for (let i = 0; i < line.length - 1; i++) {
    const a = local(line[i], p)
    const b = local(line[i + 1], p)
    const abx = b[0] - a[0]
    const aby = b[1] - a[1]
    const len2 = abx * abx + aby * aby
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-a[0] * abx - a[1] * aby) / len2))
    const distance = Math.hypot(a[0] + t * abx, a[1] + t * aby)
    const segment = Math.sqrt(len2)
    if (distance < best.distance) best = { distance, along: travelled + t * segment }
    travelled += segment
  }
  return best
}

export function polylineLength(line: LngLat[]): number {
  let total = 0
  for (let i = 0; i < line.length - 1; i++) total += haversineMeters(line[i], line[i + 1])
  return total
}
