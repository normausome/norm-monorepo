import { CORRIDORS } from "../../src/data/corridors"
import type { GeocodeResponse, Place, RouteLeg, RouteTollsResponse } from "../../src/lib/api-types"
import { BadRequest } from "../adapters/types"
import { adapters, cachedEstimate } from "../estimate"
import { UpstreamError } from "../http"
import { detectLegs } from "./detect"
import { type LngLat, geocode, geocodingProvider, route } from "./providers"

const MAX_LEG_DISTANCE_M = 400_000

/** `lat,lng` query parameter → [lng, lat]; anything else is a 400. */
function parseLatLng(raw: string | null, name: string): LngLat {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(raw ?? "")
  if (!m) throw new BadRequest(`${name} must be "lat,lng"`)
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new BadRequest(`${name} is out of range`)
  return [lng, lat]
}

export async function handleGeocode(url: URL): Promise<GeocodeResponse> {
  const q = (url.searchParams.get("q") ?? "").trim()
  if (q.length < 3) throw new BadRequest("q must be at least 3 characters")
  if (q.length > 200) throw new BadRequest("q is too long")
  const results = await geocode(q)
  return { query: q, results, provider: geocodingProvider }
}

async function priceLeg(leg: Awaited<ReturnType<typeof detectLegs>>["legs"][number]): Promise<RouteLeg> {
  const adapter = adapters[leg.corridor]
  const corridor = CORRIDORS.find((c) => c.id === leg.corridor)
  const [{ outcome, cache }, notice] = await Promise.all([
    cachedEstimate(adapter, { direction: leg.direction, entry: leg.entry.id, exit: leg.exit.id }),
    adapter.notice?.(leg.direction).catch(() => undefined),
  ])
  let error: string | null = null
  if (!outcome.ok) {
    const err = outcome.error
    error = err instanceof BadRequest || err instanceof UpstreamError ? err.message : "The operator could not be priced right now"
    if (!(err instanceof BadRequest || err instanceof UpstreamError)) console.error(err)
  }
  return {
    corridor: leg.corridor,
    corridorName: corridor?.name ?? leg.corridor,
    direction: leg.direction,
    entry: leg.entry,
    exit: leg.exit,
    match: leg.match,
    estimate: outcome.ok ? { ...outcome.value, ...cache } : null,
    error,
    ...(notice ? { notice } : {}),
    calculatorUrl: corridor?.calculator.url ?? "",
  }
}

export async function handleRouteTolls(url: URL): Promise<RouteTollsResponse> {
  const from = parseLatLng(url.searchParams.get("from"), "from")
  const to = parseLatLng(url.searchParams.get("to"), "to")
  const fromLabel = url.searchParams.get("fromLabel")?.slice(0, 200) || `${from[1].toFixed(5)}, ${from[0].toFixed(5)}`
  const toLabel = url.searchParams.get("toLabel")?.slice(0, 200) || `${to[1].toFixed(5)}, ${to[0].toFixed(5)}`

  const driving = await route(from, to)
  if (driving.distanceMeters > MAX_LEG_DISTANCE_M) {
    throw new BadRequest("That trip is over 400 km; Advanced mode is meant for trips around Northern Virginia and DC")
  }

  const detected = await detectLegs(driving)
  const legs = await Promise.all(detected.legs.map(priceLeg))
  const priced = legs.every((l) => l.estimate && l.estimate.total !== null)
  const total = legs.length > 0 && priced ? legs.reduce((s, l) => s + (l.estimate?.total ?? 0), 0) : null

  const notes: string[] = []
  if (legs.length === 0 && detected.unmatched.length === 0) {
    notes.push("No Express Lanes entry and exit line up with this route (I-495, I-395, I-95 and I-66 in Northern Virginia), so no Express Lanes toll applies.")
  } else {
    notes.push(
      "Assumes you take the Express Lanes wherever your route runs beside them. The regular lanes on 495, 395, 95 and I-66 outside the Beltway are free; I-66 inside the Beltway tolls every lane at peak.",
    )
    notes.push("Each corridor is priced by asking its operator's own calculator for the matched entry and exit; the total just adds them up. Unofficial — the overhead sign when you enter is the price you pay.")
  }
  if (legs.some((l) => l.match === "near-ends")) {
    notes.push("Where your route joins or leaves the interstate, the matched Express Lanes ramp may be one interchange off. Check the entry and exit named on each leg.")
  }
  if (legs.length > 1 && total !== null) notes.push("More than one operator or road is involved, so this is billed as separate tolls on your E-ZPass.")
  if (legs.length > 0 && total === null) notes.push("At least one leg has no price right now, so there is no total; the priced legs are shown individually.")

  const places = (p: LngLat, label: string): Place => ({ label, lat: p[1], lng: p[0] })
  return {
    from: places(from, fromLabel),
    to: places(to, toLabel),
    route: {
      provider: driving.provider,
      distanceMeters: Math.round(driving.distanceMeters),
      durationSeconds: Math.round(driving.durationSeconds),
      geometry: driving.geometry.map(([lng, lat]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))] as [number, number]),
    },
    legs,
    unmatched: detected.unmatched.map((u) => {
      const c = CORRIDORS.find((x) => x.id === u.corridor)
      return { corridor: u.corridor, corridorName: c?.name ?? u.corridor, calculatorUrl: c?.calculator.url ?? "", reason: u.reason }
    }),
    total: total === null ? null : Math.round(total * 100) / 100,
    currency: "USD",
    notes,
  }
}
