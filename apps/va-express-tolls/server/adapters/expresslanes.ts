import type { CorridorId } from "../../src/data/corridors"
import type { Direction, EstimateLeg, EstimateResponse, TripEntry } from "../../src/lib/api-types"
import { HOUR, MINUTE, cached } from "../cache"
import { UpstreamError, fetchJson, fetchText } from "../http"
import { BadRequest, type CorridorAdapter, type EstimateRequest } from "./types"

const BASE = "https://expresslanes.com"
const MAPPING_URL = `${BASE}/themes/custom/transurbangroup/js/on-the-road/entry_exit.js`
const FEED_URL = `${BASE}/maps-api/infra-price-confirmed-all`
const PUBLIC_URL = "https://expresslanes.com/map-your-trip/"
const OPERATOR = "Transurban (expresslanes.com)"

interface RawPoint {
  id: string
  label: string
  path: string
  latitude?: string
  longitude?: string
}

function point(p: RawPoint) {
  const lat = Number(p.latitude)
  const lng = Number(p.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { id: p.id, label: p.label, lat, lng } : { id: p.id, label: p.label }
}
interface RawEntry extends RawPoint {
  exits: { id: string; ods: string[] }[]
}
interface RawDirection {
  entries: Record<string, RawEntry>
  exits: Record<string, RawPoint>
}
type RawMapping = Record<"Northbound" | "Southbound", RawDirection>

interface FeedRow {
  od: string
  price: string
  road: string
  time: string
  status: string
}
interface Feed {
  error: string
  error_text: string
  response: FeedRow[]
  /** "N" | "S" — which way the reversible 95/395 lanes are currently open. */
  direction_95?: string
}

/**
 * entry_exit.js is `var entryExits = {…};` — JSON apart from a few `//` comment
 * lines and trailing commas. Strip those and parse strictly; never eval remote code.
 */
function parseMapping(js: string): RawMapping {
  const marker = "var entryExits ="
  const start = js.indexOf(marker)
  const end = js.indexOf("\n};", start)
  if (start < 0 || end < 0) throw new UpstreamError("expresslanes.com entry/exit file has changed shape")
  const literal = js
    .slice(start + marker.length, end + 2)
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
    .replace(/,(\s*[}\]])/g, "$1")
  try {
    return JSON.parse(literal) as RawMapping
  } catch {
    throw new UpstreamError("expresslanes.com entry/exit file is no longer parseable as JSON")
  }
}

const mapping = () => cached("xl:mapping", 24 * HOUR, async () => parseMapping(await fetchText(MAPPING_URL)))

const feed = () =>
  cached("xl:feed", MINUTE, async () => {
    const data = await fetchJson<Feed>(FEED_URL, { headers: { Referer: PUBLIC_URL } })
    if (data.error !== "0" || !Array.isArray(data.response)) {
      throw new UpstreamError(`expresslanes.com price feed error: ${data.error_text || data.error}`)
    }
    // direction_95 is the operator's live flag for which way the reversible 95/395 lanes are open.
    const open95: Direction | null = data.direction_95 === "N" ? "nb" : data.direction_95 === "S" ? "sb" : null
    return { rows: new Map(data.response.map((r) => [r.od, r])), open95, fetchedAt: new Date().toISOString() }
  })

function dirKey(direction: Direction, name: string): keyof RawMapping {
  if (direction === "nb") return "Northbound"
  if (direction === "sb") return "Southbound"
  throw new BadRequest(`${name} direction must be nb or sb`)
}

/** The feed labels legs by road; 95 and 395 are priced as one continuous road and the operator's UI names them together. */
function roadLabel(road: string | undefined, fallback: string) {
  if (!road || road === "null") return fallback
  if (road === "95" || road === "395") return "95 and 395 Express Lanes"
  return `${road} Express Lanes`
}

interface TransurbanCorridor {
  id: CorridorId
  name: string
  /** Entries whose mapping `path` starts with this belong to the corridor (e.g. "495" matches 495North/495South). */
  pathPrefix: string
  reversible: boolean
  directions: { id: Direction; label: string }[]
}

/**
 * One adapter per Transurban corridor, all backed by the same static mapping and
 * price feed; only the entry filter and the reversible handling differ.
 */
function transurban(c: TransurbanCorridor): CorridorAdapter {
  const onCorridor = (p: RawPoint) => p.path.startsWith(c.pathPrefix)

  async function points(direction: Direction): Promise<TripEntry[]> {
    const raw = (await mapping())[dirKey(direction, c.name)]
    const entries = Object.values(raw.entries)
      .filter(onCorridor)
      .map((e) => ({
        ...point(e),
        exits: e.exits
          .map((x) => raw.exits[x.id])
          .filter((x): x is RawPoint => Boolean(x))
          .map(point),
      }))
      .filter((e) => e.exits.length > 0)
    return entries
  }

  async function notice(direction: Direction): Promise<string | undefined> {
    if (!c.reversible) return undefined
    const { open95 } = await feed()
    const word = open95 === "nb" ? "northbound" : open95 === "sb" ? "southbound" : null
    return word
      ? `Operator feed: the reversible 95/395 lanes are open ${word} right now.${open95 === direction ? "" : " The direction you picked is closed, so no price is published for it."}`
      : "Operator feed: the reversible 95/395 lanes are between directions right now (closed for reversal)."
  }

  async function estimate(req: EstimateRequest): Promise<EstimateResponse> {
    if (req.at) throw new BadRequest(`The ${c.name} calculator only publishes current prices, not historical ones`)
    const raw = (await mapping())[dirKey(req.direction, c.name)]
    const entry = raw.entries[req.entry]
    if (!entry || !onCorridor(entry)) throw new BadRequest(`Unknown ${c.name} entry for this direction`)
    const link = entry.exits.find((x) => x.id === req.exit)
    const exit = link && raw.exits[link.id]
    if (!link || !exit) throw new BadRequest("That exit is not reachable from the chosen entry")

    const { rows, open95, fetchedAt } = await feed()
    const legs: EstimateLeg[] = []
    const notes: string[] = []
    let missing = false

    for (const od of link.ods) {
      const row = rows.get(`od_${od}`)
      const price = row ? Number.parseFloat(row.price) : Number.NaN
      if (!row || !Number.isFinite(price)) {
        missing = true
        continue
      }
      legs.push({
        road: roadLabel(row.road, `${c.pathPrefix} Express Lanes`),
        price,
        observedAt: row.time && row.time !== "null" ? row.time.replace(" ", "T") + "-04:00" : null,
        status: row.status && row.status !== "null" ? row.status : null,
      })
    }

    const closed = legs.length > 0 && legs.every((l) => l.status === "closed")
    const directionClosed = c.reversible && open95 !== null && open95 !== req.direction
    // A closed reversible direction may still carry a stale figure in the feed; never present it as a price.
    const total = legs.length > 0 && !missing && !closed && !directionClosed ? legs.reduce((s, l) => s + l.price, 0) : null

    if (directionClosed) {
      notes.push(
        `The reversible 95/395 lanes are open ${open95 === "nb" ? "northbound" : "southbound"} right now, so there is no ${req.direction === "nb" ? "northbound" : "southbound"} price — the operator publishes prices only for the open direction.`,
      )
    } else if (closed) {
      notes.push("The operator's feed marks this trip closed right now, so no price applies.")
    } else if (missing) {
      notes.push("The operator's feed has no price for part of this trip right now (the lanes may be closed or reversed).")
    }
    if (total !== null && legs.length > 1) {
      notes.push("This trip crosses more than one Express Lanes road, so it is billed as separate line items; the total below adds them up.")
    }
    if (c.reversible && total !== null) {
      notes.push("Reversible lanes: the schedule is approximate and changes for holidays, events and incidents. Trust the signs and gates.")
    }
    notes.push("Current price from Transurban's public feed, refreshed roughly hourly by the operator. The price on the overhead sign when you enter is what you pay.")

    return {
      corridor: c.id,
      direction: req.direction,
      entry: point(entry),
      exit: point(exit),
      kind: "current",
      total,
      currency: "USD",
      legs: total === null ? [] : legs,
      source: { operator: OPERATOR, url: PUBLIC_URL, fetchedAt },
      notes,
    }
  }

  return {
    support: { id: c.id, supported: true, historical: false, directions: c.directions },
    points,
    notice,
    estimate,
  }
}

export const expresslanes = transurban({
  id: "495",
  name: "495 Express Lanes",
  pathPrefix: "495",
  reversible: false,
  directions: [
    { id: "nb", label: "Northbound (toward Tysons / American Legion Bridge)" },
    { id: "sb", label: "Southbound (toward Springfield)" },
  ],
})

export const expresslanes395 = transurban({
  id: "395",
  name: "395 Express Lanes",
  pathPrefix: "395",
  reversible: true,
  directions: [
    { id: "nb", label: "Northbound (toward the Pentagon / DC) · usually mornings" },
    { id: "sb", label: "Southbound (toward Springfield / I-95) · usually afternoons & evenings" },
  ],
})
