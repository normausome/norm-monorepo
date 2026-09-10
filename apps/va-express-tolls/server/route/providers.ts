import type { Place } from "../../src/lib/api-types"
import { HOUR, MINUTE, cached } from "../cache"
import { UpstreamError, fetchJson } from "../http"

/**
 * Third-party services behind Advanced mode. Everything runs server-side so the
 * browser only ever talks to /api and no key is shipped to the client.
 *
 * Zero-config default (no keys): the public OSRM demo router + komoot's Photon
 * geocoder, both OpenStreetMap-based. Fine for a demo; neither has an SLA, and the
 * OSRM demo asks not to be used for production traffic. Set MAPBOX_TOKEN to move
 * both routing and geocoding to Mapbox (Directions is OSRM-compatible, so the same
 * parser is used), or ROUTING_URL to any self-hosted OSRM.
 */
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN?.trim() || null
const ROUTING_URL = (process.env.ROUTING_URL?.trim() || "https://router.project-osrm.org").replace(/\/+$/, "")
const PHOTON_URL = (process.env.PHOTON_URL?.trim() || "https://photon.komoot.io").replace(/\/+$/, "")

/** Roughly Fredericksburg → Baltimore, Front Royal → the Bay: where a trip on these lanes starts or ends. */
const REGION_BBOX = { west: -78.6, south: 37.8, east: -76.2, north: 39.6 }
const REGION_CENTER = { lat: 38.85, lng: -77.2 }

export type LngLat = [number, number]

export interface RouteStep {
  ref: string
  geometry: LngLat[]
}

export interface DrivingRoute {
  provider: string
  distanceMeters: number
  durationSeconds: number
  geometry: LngLat[]
  steps: RouteStep[]
}

interface OsrmResponse {
  code?: string
  message?: string
  routes?: {
    distance: number
    duration: number
    geometry: { coordinates: LngLat[] }
    legs: { steps: { ref?: string; geometry: { coordinates: LngLat[] } }[] }[]
  }[]
}

export const routingProvider = MAPBOX_TOKEN ? "Mapbox Directions" : ROUTING_URL.includes("project-osrm.org") ? "OSRM demo server" : "OSRM"
export const geocodingProvider = MAPBOX_TOKEN ? "Mapbox Geocoding" : "Photon (komoot)"

const fmt = (n: number) => n.toFixed(5)

/** Driving route between two points with per-step road refs (`I 495`, `I 66`, …). */
export function route(from: LngLat, to: LngLat): Promise<DrivingRoute> {
  const coords = `${fmt(from[0])},${fmt(from[1])};${fmt(to[0])},${fmt(to[1])}`
  return cached(`route:${routingProvider}:${coords}`, 10 * MINUTE, async () => {
    const params = new URLSearchParams({ overview: "full", geometries: "geojson", steps: "true" })
    let url: string
    if (MAPBOX_TOKEN) {
      params.set("access_token", MAPBOX_TOKEN)
      url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`
    } else {
      url = `${ROUTING_URL}/route/v1/driving/${coords}?${params}`
    }
    const data = await fetchJson<OsrmResponse>(url).catch((err: unknown): OsrmResponse => {
      // The router answers 4xx with a JSON body ({code:"NoRoute"}); surface that instead of a bare status.
      if (err instanceof UpstreamError && /responded 4\d\d/.test(err.message)) return { code: "NoRoute" }
      throw err
    })
    if (data.code !== "Ok" || !data.routes?.[0]) {
      const why = data.code === "NoRoute" || data.code === "NoSegment" ? "no drivable route between those two points" : data.message || data.code || "unknown error"
      throw new UpstreamError(`${routingProvider}: ${why}`)
    }
    const best = data.routes[0]
    return {
      provider: routingProvider,
      distanceMeters: best.distance,
      durationSeconds: best.duration,
      geometry: best.geometry.coordinates,
      steps: best.legs.flatMap((l) => l.steps.map((s) => ({ ref: s.ref ?? "", geometry: s.geometry.coordinates }))),
    }
  })
}

interface PhotonFeature {
  geometry: { coordinates: LngLat }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
    countrycode?: string
  }
}

interface MapboxFeature {
  geometry: { coordinates: LngLat }
  properties: { full_address?: string; name?: string; place_formatted?: string }
}

function photonLabel(p: PhotonFeature["properties"]): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const parts = [p.name, street && street !== p.name ? street : "", p.city, p.state]
  return parts.filter(Boolean).join(", ")
}

/** Forward-geocode free text to a few candidate places, biased to the DC region. */
export function geocode(query: string): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, " ")
  return cached(`geocode:${geocodingProvider}:${q.toLowerCase()}`, 24 * HOUR, async () => {
    if (MAPBOX_TOKEN) {
      const params = new URLSearchParams({
        q,
        access_token: MAPBOX_TOKEN,
        autocomplete: "true",
        limit: "5",
        country: "us",
        language: "en",
        proximity: `${REGION_CENTER.lng},${REGION_CENTER.lat}`,
        bbox: `${REGION_BBOX.west},${REGION_BBOX.south},${REGION_BBOX.east},${REGION_BBOX.north}`,
      })
      const data = await fetchJson<{ features?: MapboxFeature[] }>(`https://api.mapbox.com/search/geocode/v6/forward?${params}`)
      return (data.features ?? []).map((f) => ({
        label: f.properties.full_address ?? [f.properties.name, f.properties.place_formatted].filter(Boolean).join(", "),
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }))
    }
    const params = new URLSearchParams({
      q,
      limit: "6",
      lang: "en",
      lat: String(REGION_CENTER.lat),
      lon: String(REGION_CENTER.lng),
      bbox: `${REGION_BBOX.west},${REGION_BBOX.south},${REGION_BBOX.east},${REGION_BBOX.north}`,
    })
    const data = await fetchJson<{ features?: PhotonFeature[] }>(`${PHOTON_URL}/api/?${params}`)
    const seen = new Set<string>()
    const out: Place[] = []
    for (const f of data.features ?? []) {
      const label = photonLabel(f.properties)
      if (!label || seen.has(label)) continue
      seen.add(label)
      out.push({ label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })
    }
    return out.slice(0, 5)
  })
}
