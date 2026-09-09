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
    return { rows: new Map(data.response.map((r) => [r.od, r])), fetchedAt: new Date().toISOString() }
  })

function dirKey(direction: Direction): keyof RawMapping {
  if (direction === "nb") return "Northbound"
  if (direction === "sb") return "Southbound"
  throw new BadRequest("495 Express Lanes direction must be nb or sb")
}

const on495 = (p: RawPoint) => p.path.startsWith("495")

async function points(direction: Direction): Promise<TripEntry[]> {
  const raw = (await mapping())[dirKey(direction)]
  return Object.values(raw.entries)
    .filter(on495)
    .map((e) => ({
      id: e.id,
      label: e.label,
      exits: e.exits
        .map((x) => raw.exits[x.id])
        .filter((x): x is RawPoint => Boolean(x))
        .map((x) => ({ id: x.id, label: x.label })),
    }))
    .filter((e) => e.exits.length > 0)
}

async function estimate(req: EstimateRequest): Promise<EstimateResponse> {
  if (req.at) throw new BadRequest("The 495 calculator only publishes current prices, not historical ones")
  const raw = (await mapping())[dirKey(req.direction)]
  const entry = raw.entries[req.entry]
  if (!entry || !on495(entry)) throw new BadRequest("Unknown 495 entry for this direction")
  const link = entry.exits.find((x) => x.id === req.exit)
  const exit = link && raw.exits[link.id]
  if (!link || !exit) throw new BadRequest("That exit is not reachable from the chosen entry")

  const { rows, fetchedAt } = await feed()
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
      road: row.road && row.road !== "null" ? `${row.road} Express Lanes` : "495 Express Lanes",
      price,
      observedAt: row.time && row.time !== "null" ? row.time.replace(" ", "T") + "-04:00" : null,
      status: row.status && row.status !== "null" ? row.status : null,
    })
  }

  const total = legs.length > 0 && !missing ? legs.reduce((s, l) => s + l.price, 0) : null
  if (missing) notes.push("The operator's feed has no price for part of this trip right now (the lanes may be closed or reversed).")
  if (legs.length > 1) notes.push("This trip crosses more than one Express Lanes road, so it is billed as separate tolls; the total below adds them up.")
  if (legs.some((l) => l.status && l.status !== "open")) notes.push(`Operator status: ${legs.map((l) => l.status).filter(Boolean).join(", ")}.`)
  notes.push("Current price from Transurban's public feed, refreshed roughly hourly by the operator. The price on the overhead sign when you enter is what you pay.")

  return {
    corridor: "495",
    direction: req.direction,
    entry: { id: entry.id, label: entry.label },
    exit: { id: exit.id, label: exit.label },
    kind: "current",
    total,
    currency: "USD",
    legs,
    source: { operator: OPERATOR, url: PUBLIC_URL, fetchedAt },
    notes,
  }
}

export const expresslanes: CorridorAdapter = {
  support: {
    id: "495",
    supported: true,
    historical: false,
    directions: [
      { id: "nb", label: "Northbound (toward Tysons / American Legion Bridge)" },
      { id: "sb", label: "Southbound (toward Springfield)" },
    ],
  },
  points,
  estimate,
}
