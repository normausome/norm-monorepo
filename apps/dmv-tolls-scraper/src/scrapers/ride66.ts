import { ENTRY_COORDS, EXIT_COORDS, EXITS_BY_START } from "../ride66-map"
import type { ScrapeResult } from "../types"
import { cents, toQuotes, type TripQuote } from "../trips"
import { decodeEntities, fetchText } from "../http"

const BASE = "https://ride66express.com"
const PLANNER_URL = `${BASE}/pricing/plan-your-trip/`
const AJAX_URL = `${BASE}/wp-content/themes/i66/theme-ajax.php`
const OPERATOR = "66 Express Mobility Partners (ride66express.com)"
const FALLBACK_TOKEN_KEY = "xvWr"

type Dir = "eb" | "wb"

export interface Rate {
  rateStartDate: string
  gantry: { gantryId: number; vehicleClasses: { vehicleClassId: number; rateAmountTag: number }[] }
}

interface ApiCallResponse {
  success: boolean
  data: { error?: string; date?: string; curl_response?: { result: number; description: string; rates: Rate[] } }
}

interface Start {
  id: string
  label: string
}

export function exitId(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

async function plannerPage() {
  return fetchText(PLANNER_URL)
}

async function tokenKey(): Promise<string> {
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
  return JSON.parse(text) as ApiCallResponse
}

function parseStarts(html: string, d: Dir): Start[] {
  const selectId = d === "eb" ? "gantry-start-east" : "gantry-start-west"
  const m = html.match(new RegExp(`<select id="${selectId}"[^>]*>([\\s\\S]*?)</select>`))
  if (!m) throw new Error("ride66express.com planner page missing entry gantry list")
  const out: Start[] = []
  for (const opt of m[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/g)) {
    out.push({ id: opt[1], label: decodeEntities(opt[2]) })
  }
  return out
}

function latestClass1(rates: Rate[]): Map<number, number> {
  const latest = new Map<number, Rate>()
  for (const rate of rates) {
    const prev = latest.get(rate.gantry.gantryId)
    if (!prev || rate.rateStartDate > prev.rateStartDate) latest.set(rate.gantry.gantryId, rate)
  }
  const amounts = new Map<number, number>()
  for (const rate of latest.values()) {
    const amount = rate.gantry.vehicleClasses.find((v) => v.vehicleClassId === 1)?.rateAmountTag
    if (typeof amount === "number") amounts.set(rate.gantry.gantryId, amount)
  }
  return amounts
}

export function ride66Trips(starts: Record<Dir, Start[]>, rates: Rate[]): TripQuote[] {
  const latest = latestClass1(rates)
  const drafts = (["eb", "wb"] as const).flatMap((direction) =>
    starts[direction].flatMap((start) => {
      const exits = EXITS_BY_START[direction][start.id]
      if (!exits) return []
      const entryLL = ENTRY_COORDS[direction][start.id]
      return exits.map((exit) => {
        const gantries = [...new Set([start.id, ...exit.chain])]
        let sum = 0
        let missing = false
        for (const gantry of gantries) {
          const amount = latest.get(Number(gantry))
          if (amount == null) missing = true
          else sum += amount
        }
        const exitLL = EXIT_COORDS[direction][exit.label]
        return {
          direction,
          entryId: start.id,
          exitId: exitId(exit.label),
          entryLabel: start.label,
          exitLabel: exit.label,
          entryLat: entryLL?.[0] ?? null,
          entryLng: entryLL?.[1] ?? null,
          exitLat: exitLL?.[0] ?? null,
          exitLng: exitLL?.[1] ?? null,
          price: missing ? null : cents(sum),
          status: missing ? ("missing" as const) : ("open" as const),
        }
      })
    }),
  )
  return toQuotes(drafts)
}

function trigger(starts: Record<Dir, Start[]>): { id: string; chain: string[] } | null {
  for (const direction of ["eb", "wb"] as const) {
    for (const start of starts[direction]) {
      const chain = EXITS_BY_START[direction][start.id]?.[0]?.chain
      if (chain && chain.length > 0) return { id: start.id, chain }
    }
  }
  return null
}

export async function scrapeRide66(): Promise<ScrapeResult> {
  const html = await plannerPage()
  const starts: Record<Dir, Start[]> = {
    eb: parseStarts(html, "eb").filter((s) => EXITS_BY_START.eb[s.id]),
    wb: parseStarts(html, "wb").filter((s) => EXITS_BY_START.wb[s.id]),
  }
  const probe = trigger(starts)
  if (!probe) throw new Error("ride66express.com entry list no longer matches vendored exit table")

  let key = await tokenKey()
  let res = await callPlanner(probe.id, probe.chain, key)
  if (!res.success && key !== FALLBACK_TOKEN_KEY) {
    key = FALLBACK_TOKEN_KEY
    res = await callPlanner(probe.id, probe.chain, key)
  }
  if (!res.success) throw new Error(`ride66express.com planner error: ${res.data?.error ?? "unknown"}`)

  const rates = res.data.curl_response?.rates
  if (!Array.isArray(rates)) throw new Error("ride66express.com response has no rates array")

  const scrapedAt = new Date().toISOString()
  const trips = ride66Trips(starts, rates)
  return {
    corridor: "66-outside",
    operator: OPERATOR,
    sourceUrl: PLANNER_URL,
    payload: { scrapedAt, rates },
    summary: { scrapedAt, tripCount: trips.length, trips },
  }
}
