import type { Direction, EstimateResponse, TripEntry } from "../../src/lib/api-types"
import { HOUR, MINUTE, cached } from "../cache"
import { UpstreamError, fetchJson, fetchText, parseOptions } from "../http"
import { BadRequest, type CorridorAdapter, type EstimateRequest } from "./types"

const BASE = "https://www.vai66tolls.com"
const PUBLIC_URL = "https://vai66tolls.com/"
const OPERATOR = "VDOT (vai66tolls.com)"
const TZ = "America/New_York"

function eastbound(direction: Direction) {
  if (direction === "eb") return true
  if (direction === "wb") return false
  throw new BadRequest("I-66 Inside the Beltway direction must be eb or wb")
}

/** The operator form posts dates as MM/DD/YYYY and times as "h : mm am", both in Eastern time. */
function easternFormParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return {
    datePicked: `${get("month")}/${get("day")}/${get("year")}`,
    timePicked: `${get("hour")} : ${get("minute")} ${get("dayPeriod").toLowerCase()}`,
  }
}

async function entriesFor(eb: boolean) {
  const html = await fetchText(`${BASE}/Index?handler=BeginIntPartial&rbEastVal=${eb}`)
  const opts = parseOptions(html)
  if (opts.length === 0) throw new UpstreamError("vai66tolls.com returned no entry interchanges (page layout may have changed)")
  return opts
}

async function exitsFor(entryId: string, eb: boolean) {
  const html = await fetchText(`${BASE}/Index?handler=ExitIntPartial&bIntId=${encodeURIComponent(entryId)}&rbEastVal=${eb}`)
  return parseOptions(html)
}

async function points(direction: Direction): Promise<TripEntry[]> {
  const eb = eastbound(direction)
  return cached(`vai66:points:${eb}`, 24 * HOUR, async () => {
    const entries = await entriesFor(eb)
    const withExits = await Promise.all(
      entries.map(async (e) => ({ ...e, exits: await exitsFor(e.id, eb) })),
    )
    return withExits.filter((e) => e.exits.length > 0)
  })
}

interface TollCalcPayload {
  jsToRun?: string
  decToll?: number | string
}

async function estimate(req: EstimateRequest): Promise<EstimateResponse> {
  const eb = eastbound(req.direction)
  const all = await points(req.direction)
  const entry = all.find((e) => e.id === req.entry)
  if (!entry) throw new BadRequest("Unknown entry interchange for this direction")
  const exit = entry.exits.find((x) => x.id === req.exit)
  if (!exit) throw new BadRequest("That exit is not reachable from the chosen entry")

  const isCurrent = !req.at
  if (req.at && req.at.getTime() > Date.now()) {
    throw new BadRequest("The operator only prices past dates and times; pick a time that has already happened")
  }
  const { datePicked, timePicked } = easternFormParts(req.at ?? new Date())

  const params = new URLSearchParams({
    handler: "TollCalcPartial",
    bIntId: entry.id,
    eIntId: exit.id,
    datePicked,
    timePicked,
    rbEastVal: String(eb),
    isCurrent: String(isCurrent),
  })
  const url = `${BASE}/Index?${params}`
  const cacheKey = `vai66:est:${params}`
  const ttl = isCurrent ? MINUTE : 24 * HOUR

  const { payload, fetchedAt } = await cached(cacheKey, ttl, async () => ({
    payload: await fetchJson<TollCalcPayload>(url),
    fetchedAt: new Date().toISOString(),
  }))

  const raw = payload.decToll
  const price = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN
  if (!Number.isFinite(price)) {
    throw new UpstreamError("vai66tolls.com responded without a numeric toll (response shape may have changed)")
  }

  const notes: string[] = []
  if (price === 0) {
    notes.push(
      isCurrent
        ? "The operator reports no toll right now — I-66 Inside the Beltway is only tolled weekdays EB 5:30–9:30 AM and WB 3–7 PM."
        : "The operator reports no toll for that time — outside weekday peak windows (and on federal holidays) the lanes are free.",
    )
  } else if (isCurrent) {
    notes.push("Current estimate from the VDOT calculator. The price on the overhead sign when you enter is what you pay.")
  } else {
    notes.push(`Historical estimate for ${datePicked} at ${timePicked.replace(" : ", ":")} Eastern, as reported by the VDOT calculator.`)
  }

  return {
    corridor: "66-inside",
    direction: req.direction,
    entry: { id: entry.id, label: entry.label },
    exit: { id: exit.id, label: exit.label },
    kind: isCurrent ? "current" : "historical",
    total: price,
    currency: "USD",
    legs: [{ road: "I-66 Inside the Beltway", price, observedAt: fetchedAt, status: price === 0 ? "free" : "tolling" }],
    source: { operator: OPERATOR, url: PUBLIC_URL, fetchedAt },
    notes,
  }
}

export const vai66: CorridorAdapter = {
  support: {
    id: "66-inside",
    supported: true,
    historical: true,
    directions: [
      { id: "eb", label: "Eastbound (toward DC) · tolled 5:30–9:30 AM" },
      { id: "wb", label: "Westbound (toward I-495) · tolled 3–7 PM" },
    ],
  },
  points,
  estimate,
}
