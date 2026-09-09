import type { Direction, EstimateResponse, TripEntry } from "../../src/lib/api-types"
import { HOUR, MINUTE, cached } from "../cache"
import { UpstreamError, decodeEntities, fetchText } from "../http"
import { ENTRY_COORDS, EXIT_COORDS, EXITS_BY_START } from "./ride66-map"
import { BadRequest, type CorridorAdapter, type EstimateRequest } from "./types"

const BASE = "https://ride66express.com"
const PLANNER_URL = `${BASE}/pricing/plan-your-trip/`
const AJAX_URL = `${BASE}/wp-content/themes/i66/theme-ajax.php`
const OPERATOR = "66 Express Mobility Partners (ride66express.com)"
const FALLBACK_TOKEN_KEY = "xvWr"
const OPERATOR_FOOTNOTE =
  "Operator footnote: toll estimations are based on standard vehicle pricing and historical averages; actual tolls may vary with traffic, congestion and vehicle classification."

type Dir = "eb" | "wb"

function dir(direction: Direction): Dir {
  if (direction === "eb" || direction === "wb") return direction
  throw new BadRequest("I-66 Outside the Beltway direction must be eb or wb")
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/** The planner page ships the entry gantries for each direction in plain <select>s (its mobile fallback UI). */
const plannerPage = () => cached("r66:page", 24 * HOUR, () => fetchText(PLANNER_URL))

function parseStarts(html: string, d: Dir): { id: string; label: string }[] {
  const selectId = d === "eb" ? "gantry-start-east" : "gantry-start-west"
  const m = html.match(new RegExp(`<select id="${selectId}"[^>]*>([\\s\\S]*?)</select>`))
  if (!m) throw new UpstreamError("ride66express.com planner page no longer contains the entry gantry list (layout changed)")
  const out: { id: string; label: string }[] = []
  for (const opt of m[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/g)) {
    out.push({ id: opt[1], label: decodeEntities(opt[2]) })
  }
  if (out.length === 0) throw new UpstreamError("ride66express.com planner page lists no entry gantries")
  return out
}

/**
 * The planner posts one extra form field whose *name* is a constant baked into
 * its (obfuscated) bundle: `const xvWr = <expr>;` right before `let map,gantry_id`.
 * Read it from the live bundle so a theme rebuild doesn't silently break us.
 */
const tokenKey = () =>
  cached("r66:token", 24 * HOUR, async () => {
    try {
      const html = await plannerPage()
      const src = html.match(/src="([^"]*plan-your-trip\.js[^"]*)"/)?.[1]
      if (!src) return FALLBACK_TOKEN_KEY
      const js = await fetchText(new URL(src, BASE).toString())
      const m = js.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]{1,120};function\s+_0x[0-9a-f]+\([^)]*\)\{return\s+_0x[0-9a-f]+\([^)]*\);\}let\s+map,gantry_id/)
      return m?.[1] ?? FALLBACK_TOKEN_KEY
    } catch {
      return FALLBACK_TOKEN_KEY
    }
  })

async function points(direction: Direction): Promise<TripEntry[]> {
  const d = dir(direction)
  return cached(`r66:points:${d}`, 24 * HOUR, async () => {
    const starts = parseStarts(await plannerPage(), d)
    const at = (ll?: [number, number]) => (ll ? { lat: ll[0], lng: ll[1] } : {})
    const entries = starts
      .filter((s) => EXITS_BY_START[d][s.id])
      .map((s) => ({
        ...s,
        ...at(ENTRY_COORDS[d][s.id]),
        exits: EXITS_BY_START[d][s.id].map((x) => ({ id: slug(x.label), label: x.label, ...at(EXIT_COORDS[d][x.label]) })),
      }))
    if (entries.length === 0) {
      throw new UpstreamError("ride66express.com entry gantries no longer match our exit table; refusing to guess")
    }
    return entries
  })
}

interface Rate {
  rateStartDate: string
  gantry: { gantryId: number; vehicleClasses: { vehicleClassId: number; rateAmountTag: number }[] }
}
interface ApiCallResponse {
  success: boolean
  data: { error?: string; date?: string; curl_response?: { result: number; description: string; rates: Rate[] } }
}

async function callPlanner(start: string, chain: string[], key: string): Promise<ApiCallResponse> {
  const ending = chain[chain.length - 1]
  const middle = chain.length >= 2 ? chain[chain.length - 2] : ""
  const first = chain.length >= 3 ? chain[chain.length - 3] : ""
  const body = new URLSearchParams({
    action: "api_call",
    "data[starting_gantry_id]": start,
    "data[ending_gantry_id]": ending,
    "data[middle_ending_gantry_id]": middle,
    "data[first_ending_gantry_id]": first,
    [`data[${key}]`]: "1",
    "data[response]": "",
  })
  const text = await fetchText(AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: PLANNER_URL,
      Origin: BASE,
    },
    body,
  })
  try {
    return JSON.parse(text) as ApiCallResponse
  } catch {
    throw new UpstreamError("ride66express.com planner returned non-JSON")
  }
}

/** Mirrors the planner: the most recently posted class-1 rate at each tolling gantry the trip passes, summed. */
function priceFromRates(rates: Rate[], gantries: string[]) {
  const latest = new Map<number, Rate>()
  for (const r of rates) {
    const prev = latest.get(r.gantry.gantryId)
    if (!prev || r.rateStartDate > prev.rateStartDate) latest.set(r.gantry.gantryId, r)
  }
  const legs = gantries.map((g) => {
    const r = latest.get(Number(g))
    const rate = r?.gantry.vehicleClasses.find((v) => v.vehicleClassId === 1)?.rateAmountTag
    return { gantry: g, rate: typeof rate === "number" ? rate : null, postedAt: r?.rateStartDate ?? null }
  })
  return legs
}

async function estimate(req: EstimateRequest): Promise<EstimateResponse> {
  const d = dir(req.direction)
  if (req.at) throw new BadRequest("The 66 Express planner only publishes current pricing, not historical ones")
  const entries = await points(d)
  const entry = entries.find((e) => e.id === req.entry)
  if (!entry) throw new BadRequest("Unknown entry gantry for this direction")
  const exit = entry.exits.find((x) => x.id === req.exit)
  const mapped = EXITS_BY_START[d][entry.id]?.find((x) => slug(x.label) === req.exit)
  if (!exit || !mapped) throw new BadRequest("That exit is not reachable from the chosen entry")

  const charged = [...new Set([entry.id, ...mapped.chain])]
  const cacheKey = `r66:est:${entry.id}:${mapped.chain.join(",")}`

  const { res, fetchedAt } = await cached(cacheKey, MINUTE, async () => {
    let key = await tokenKey()
    let res = await callPlanner(entry.id, mapped.chain, key)
    if (!res.success && key !== FALLBACK_TOKEN_KEY) {
      key = FALLBACK_TOKEN_KEY
      res = await callPlanner(entry.id, mapped.chain, key)
    }
    if (!res.success) throw new UpstreamError(`ride66express.com planner error: ${res.data?.error ?? "unknown"}`)
    return { res, fetchedAt: new Date().toISOString() }
  })

  const rates = res.data.curl_response?.rates
  if (!Array.isArray(rates)) throw new UpstreamError("ride66express.com planner response has no rates (shape changed)")

  const perGantry = priceFromRates(rates, charged)
  const complete = perGantry.every((g) => g.rate !== null)
  const total = complete ? perGantry.reduce((s, g) => s + (g.rate ?? 0), 0) : null

  const notes = [
    complete
      ? `Sum of the current posted rate at ${charged.length} tolling ${charged.length === 1 ? "gantry" : "gantries"} along this trip — the same arithmetic the operator's planner uses.`
      : "The operator's planner returned no posted rate for part of this trip today, so we can't total it.",
    OPERATOR_FOOTNOTE,
    "The price on the overhead sign when you enter each segment is what you pay.",
  ]

  return {
    corridor: "66-outside",
    direction: d,
    entry: { id: entry.id, label: entry.label, lat: entry.lat, lng: entry.lng },
    exit,
    kind: "current",
    total: total === null ? null : Math.round(total * 100) / 100,
    currency: "USD",
    legs: complete
      ? perGantry.map((g) => ({
          road: `66 Express · gantry ${g.gantry}`,
          price: g.rate ?? 0,
          observedAt: g.postedAt ? g.postedAt.replace(" ", "T") + "-04:00" : null,
          status: null,
        }))
      : [],
    source: { operator: OPERATOR, url: PLANNER_URL, fetchedAt },
    notes,
  }
}

export const ride66: CorridorAdapter = {
  support: {
    id: "66-outside",
    supported: true,
    historical: false,
    directions: [
      { id: "eb", label: "Eastbound (Gainesville → I-495)" },
      { id: "wb", label: "Westbound (I-495 → Gainesville)" },
    ],
  },
  points,
  estimate,
}
