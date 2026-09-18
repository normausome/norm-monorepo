import { EXITS_BY_START } from "../ride66-map"
import type { ScrapeResult } from "../types"
import { decodeEntities, fetchText } from "../http"

const BASE = "https://ride66express.com"
const PLANNER_URL = `${BASE}/pricing/plan-your-trip/`
const AJAX_URL = `${BASE}/wp-content/themes/i66/theme-ajax.php`
const OPERATOR = "66 Express Mobility Partners (ride66express.com)"
const FALLBACK_TOKEN_KEY = "xvWr"

interface Rate {
  rateStartDate: string
  gantry: { gantryId: number; vehicleClasses: { vehicleClassId: number; rateAmountTag: number }[] }
}

interface ApiCallResponse {
  success: boolean
  data: { error?: string; date?: string; curl_response?: { result: number; description: string; rates: Rate[] } }
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

function parseStarts(html: string, d: "eb" | "wb"): { id: string; label: string }[] {
  const selectId = d === "eb" ? "gantry-start-east" : "gantry-start-west"
  const m = html.match(new RegExp(`<select id="${selectId}"[^>]*>([\\s\\S]*?)</select>`))
  if (!m) throw new Error("ride66express.com planner page missing entry gantry list")
  const out: { id: string; label: string }[] = []
  for (const opt of m[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/g)) {
    out.push({ id: opt[1], label: decodeEntities(opt[2]) })
  }
  return out
}

function latestClass1Rates(rates: Rate[]) {
  const latest = new Map<number, Rate>()
  for (const r of rates) {
    const prev = latest.get(r.gantry.gantryId)
    if (!prev || r.rateStartDate > prev.rateStartDate) latest.set(r.gantry.gantryId, r)
  }
  const amounts: number[] = []
  for (const r of latest.values()) {
    const rate = r.gantry.vehicleClasses.find((v) => v.vehicleClassId === 1)?.rateAmountTag
    if (typeof rate === "number") amounts.push(rate)
  }
  return { gantryCount: latest.size, amounts }
}

export async function scrapeRide66(): Promise<ScrapeResult> {
  const html = await plannerPage()
  const ebStart = parseStarts(html, "eb").find((s) => EXITS_BY_START.eb[s.id])
  if (!ebStart) throw new Error("ride66express.com entry list no longer matches vendored exit table")
  const chain = EXITS_BY_START.eb[ebStart.id][0]?.chain ?? []
  if (chain.length === 0) throw new Error("No exit chain for ride66 benchmark trip")

  let key = await tokenKey()
  let res = await callPlanner(ebStart.id, chain, key)
  if (!res.success && key !== FALLBACK_TOKEN_KEY) {
    key = FALLBACK_TOKEN_KEY
    res = await callPlanner(ebStart.id, chain, key)
  }
  if (!res.success) throw new Error(`ride66express.com planner error: ${res.data?.error ?? "unknown"}`)

  const rates = res.data.curl_response?.rates
  if (!Array.isArray(rates)) throw new Error("ride66express.com response has no rates array")

  const scrapedAt = new Date().toISOString()
  const { gantryCount, amounts } = latestClass1Rates(rates)

  return {
    corridor: "66-outside",
    operator: OPERATOR,
    sourceUrl: PLANNER_URL,
    payload: {
      scrapedAt,
      benchmarkTrip: { direction: "eb", entry: ebStart, exitChain: chain },
      rates,
    },
    summary: {
      scrapedAt,
      rateLogRows: rates.length,
      gantryCount,
      minRate: amounts.length ? Math.min(...amounts) : null,
      maxRate: amounts.length ? Math.max(...amounts) : null,
      avgRate: amounts.length ? Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100 : null,
    },
  }
}
