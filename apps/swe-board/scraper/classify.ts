import type { GeoTier, LatamEligibility, Salary, ScrapedJob, WorkMode } from "../shared/types"
import { sourceOf, type Board } from "./boards"
import type { Posting } from "./posting"
import { inferSeniority } from "./seniority"

export const MIN_USD_SALARY = 100_000

// --- Title -----------------------------------------------------------------

const TITLE_INCLUDE = [
  /software (development )?engineer\b/i,
  /software developer\b/i,
  /\b(backend|back-end|back end|frontend|front-end|front end|full[- ]?stack|fullstack)\b/i,
  /\b(staff\+?|principal) (software )?engineer\b/i,
  /\b(platform|infrastructure|infra|distributed systems|cloud|mobile|ios|android|web|api|developer experience|devex|compiler|runtime|kernel|embedded|graphics|search|payments|growth|product) (software )?engineer\b/i,
  /\b(machine learning|ml|ai|applied ai|deep learning|llm|research) engineer\b/i,
  /\b(site reliability|database reliability|reliability|production|devops|devsecops) engineer\b/i,
  /\bsre\b/i,
  /\b(application|product|appsec|cloud|infrastructure|platform|offensive|detection) security engineer\b/i,
  /security software engineer\b/i,
  /\bappsec\b/i,
  /director,? (of )?(software )?engineering\b/i,
  /forward[- ]deployed\b/i,
  /member of technical staff/i,
]

const TITLE_EXCLUDE = [
  /\b(contract|contractor|c2c|corp[- ]to[- ]corp|freelance|temporary|temp)\b/i,
  /\b(intern|internship|co-?op|apprentice|apprenticeship|fellow|fellowship|new grad|graduate program)\b/i,
  /\b(manager|chief|head of|vp|vice president|president|coordinator|specialist|strategist)\b/i,
  /\b(sales|solutions?|support|field|implementation|pre-?sales|partner)\b.*\bengineer|\bcustomer (success|support|engineer)/i,
  /\b(hardware|mechanical|electrical|civil|manufacturing|process|industrial|optical|rf|radio|antenna|test|quality|qa|validation|materials|chemical|structural|thermal|firmware|fpga|asic|network|networking|systems? administrator|technician|supply chain|low observables|avionics|propulsion|weapons?|munitions?)\b/i,
  /\b(analytics|data|bi|business intelligence|marketing|content|revenue|finance|accounting|people|recruit|talent|sourcing|grc|compliance|it)\b(?!.*\b(platform|infrastructure) engineer\b)/i,
  /\b(technical writer|program manager|project manager|product manager|designer|analyst|scientist|researcher|architect|evangelist|advocate|coach)\b/i,
]

const EMPLOYMENT_EXCLUDE = /contract|contractor|temporary|temp|intern|part[- ]?time|freelance/i

export function isSweTitle(title: string): boolean {
  return TITLE_INCLUDE.some((re) => re.test(title)) && !TITLE_EXCLUDE.some((re) => re.test(title))
}

export function isExcludedEmployment(employmentType: string | null): boolean {
  return employmentType !== null && EMPLOYMENT_EXCLUDE.test(employmentType)
}

// --- Salary ----------------------------------------------------------------

const CURRENCY: Record<string, string> = {
  $: "USD",
  US$: "USD",
  USD$: "USD",
  USD: "USD",
  CA$: "CAD",
  C$: "CAD",
  CAD$: "CAD",
  CAD: "CAD",
  A$: "AUD",
  AUD$: "AUD",
  AUD: "AUD",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
}

const MONEY = /((?:USD|CAD|AUD|US|CA|C|A)?\s?\$|USD|CAD|AUD|€|EUR|£|GBP)\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?([kK])?(?![\d,])/g
const RANGE_GAP = /^\s*(?:-|–|—|to|and|through)\s*$/
const MIN_PLAUSIBLE_ANNUAL = 30_000
const MAX_PLAUSIBLE_ANNUAL = 2_000_000

/** `bareDollar` marks a plain `$`, which inherits the currency of the range it closes ("CAD $1 - $2"). */
type Money = { currency: string; bareDollar: boolean; value: number; start: number; end: number }

function moneyTokens(text: string): Money[] {
  const out: Money[] = []
  for (const m of text.matchAll(MONEY)) {
    const value = Number(m[2].replace(/,/g, "")) * (m[3] ? 1000 : 1)
    if (!Number.isFinite(value)) continue
    const symbol = m[1].replace(/\s/g, "").toUpperCase()
    out.push({ currency: CURRENCY[symbol] ?? "USD", bareDollar: symbol === "$", value, start: m.index, end: m.index + m[0].length })
  }
  return out
}

/**
 * Find the annual pay range in free text. Picks the plausible range with the
 * highest top end, so a "$5,000 sign-on bonus" never wins over "$150,000 - $200,000".
 */
export function parseSalaryText(text: string): Salary | null {
  const tokens = moneyTokens(text)
  const candidates: Salary[] = []
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (b && (b.currency === a.currency || b.bareDollar) && RANGE_GAP.test(text.slice(a.end, b.start)) && b.value >= a.value) {
      candidates.push({ min: a.value, max: b.value, currency: a.currency })
      i++
    } else {
      candidates.push({ min: a.value, max: a.value, currency: a.currency })
    }
  }
  const plausible = candidates.filter((c) => {
    const top = c.max ?? c.min ?? 0
    return top >= MIN_PLAUSIBLE_ANNUAL && top <= MAX_PLAUSIBLE_ANNUAL
  })
  if (!plausible.length) return null
  return plausible.reduce((best, c) => ((c.max ?? 0) > (best.max ?? 0) ? c : best))
}

/** Unlisted or non-USD pay passes. Listed USD pay passes when the top end reaches the floor. */
export function passesSalaryFloor(salary: Salary | null, floor = MIN_USD_SALARY): boolean {
  if (!salary || salary.currency !== "USD") return true
  return (salary.max ?? salary.min ?? 0) >= floor
}

// --- Work mode -------------------------------------------------------------

const HEADLINE_WORK_MODE: [RegExp, WorkMode][] = [
  [/\bhybrid\b/i, "hybrid"],
  [/\bremote\b|work from home|\bwfh\b|\bdistributed\b/i, "remote"],
  [/\bon-?site\b|\bin[- ]office\b|\bin[- ]person\b/i, "onsite"],
]

const BODY_WORK_MODE: [RegExp, WorkMode][] = [
  [/\bhybrid\b/i, "hybrid"],
  [/(fully|100%|entirely) remote|remote-first|remote (role|position|job|work|opportunity|team|company)|work remotely|work from home|\bwfh\b/i, "remote"],
  [/\bon-?site\b|\bin[- ]office\b|\bin[- ]person\b/i, "onsite"],
]

function firstMatch(rules: [RegExp, WorkMode][], haystack: string): WorkMode | null {
  return rules.find(([re]) => re.test(haystack))?.[1] ?? null
}

/** Title and locations are trusted over the body, which mentions "remote" incidentally. */
export function inferWorkMode(title: string, locations: string[], text: string): WorkMode {
  return firstMatch(HEADLINE_WORK_MODE, [title, ...locations].join(" | ")) ?? firstMatch(BODY_WORK_MODE, text) ?? "unknown"
}

// --- Geo (SWE Radar tiers) -------------------------------------------------

export type Geo = { latamEligibility: LatamEligibility; tier: GeoTier; note: string }

const TIER_ELIGIBILITY: Record<GeoTier, LatamEligibility> = {
  A: "latam_mx_br",
  B: "latam_mx_br",
  C: "us_only",
  D: "unknown",
}

type GeoRule = { tier: GeoTier; scope: "locations" | "text"; re: RegExp }

const US = String.raw`(?:us|u\.s\.a?|usa|united states)`
const LATAM_PLACES = String.raw`(?:mexico|méxico|brazil|brasil|latam|latin america|argentina|colombia|chile|peru|uruguay|costa rica|guatemala|s[aã]o paulo|mexico city|ciudad de m[eé]xico|cdmx|guadalajara|monterrey|bogot[aá]|buenos aires|montevideo)`

/** Evaluated in order. The first hit decides the tier. */
/** "work from anywhere for up to 3 months" is a perk, not a hiring region. */
const ANYWHERE = String.raw`(?:work|hire|working|hiring) (?:from |remotely from )?anywhere(?![^.\n]{0,40}\b(?:days?|weeks?|months?|year|per))`

const GEO_RULES: GeoRule[] = [
  { tier: "A", scope: "locations", re: /\b(anywhere|worldwide|global|americas)\b/i },
  { tier: "A", scope: "locations", re: new RegExp(String.raw`\b${US}\b.*\b${LATAM_PLACES}\b|\b${LATAM_PLACES}\b.*\b${US}\b`, "i") },
  {
    tier: "A",
    scope: "text",
    re: new RegExp(
      String.raw`${ANYWHERE}|anywhere in the (?:world|americas)|remote (?:anywhere|worldwide|globally)|\b${US}\b[^.\n]{0,80}\b(?:mexico|brazil|latam|latin america)\b|\b(?:mexico|brazil|latam|latin america)\b[^.\n]{0,80}\b${US}\b`,
      "i",
    ),
  },
  {
    tier: "C",
    scope: "locations",
    re: new RegExp(String.raw`^${US}$|^remote[\s,()-]*${US}\b|\b${US}[\s-]*(?:only|remote)\b|\bremote\b[^;]*\b${US}\b`, "i"),
  },
  {
    tier: "C",
    scope: "text",
    re: new RegExp(
      String.raw`\b${US}[- ]only\b|must (?:be |reside |live |be located |currently )?(?:in|within) the ${US}\b|(?:based|located|reside|residing|living|resident) in the ${US}\b|\bw-?2\b|authorized to work in the ${US}\b|(?:legally|eligible to) work in the ${US}\b`,
      "i",
    ),
  },
  { tier: "B", scope: "locations", re: new RegExp(String.raw`\b${LATAM_PLACES}\b`, "i") },
]

const US_STATE_ABBR = String.raw`A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[DLNA]|K[SY]|LA|M[EDAINSOT]|N[EVHJMYC]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[TA]|W[AVIY]`
const US_LOCATION = new RegExp(
  String.raw`\b(?:united states|usa|u\.s\.)\b|,\s*(?:${US_STATE_ABBR})\b|\b(?:new york|nyc|san francisco|sf bay area|bay area|seattle|austin|chicago|boston|los angeles|denver|atlanta|washington,? d\.?c\.?|palo alto|mountain view|menlo park|sunnyvale|san jose|san mateo|redwood city|miami|portland|dallas|houston|philadelphia|pittsburgh|salt lake city|phoenix|minneapolis|nashville|raleigh|durham|charlotte|san diego|oakland|irvine|bellevue|redmond|kirkland|arlington|reston|mclean|brooklyn|santa monica|culver city|boulder|detroit|columbus|las vegas|orlando|tampa|st\.? louis|kansas city|cincinnati|indianapolis|madison|ann arbor|provo|lehi)\b`,
  "i",
)

function quote(haystack: string, m: RegExpMatchArray): string {
  const start = Math.max(0, (m.index ?? 0) - 50)
  const end = Math.min(haystack.length, (m.index ?? 0) + m[0].length + 50)
  const snippet = haystack.slice(start, end).replace(/\s+/g, " ").trim()
  return `${start > 0 ? "..." : ""}${snippet}${end < haystack.length ? "..." : ""}`
}

export function classifyGeo(locations: string[], text: string, workMode: WorkMode): Geo {
  const locationLine = locations.join("; ")
  for (const rule of GEO_RULES) {
    const haystack = rule.scope === "locations" ? locationLine : text
    const m = haystack.match(rule.re)
    if (m) return { tier: rule.tier, latamEligibility: TIER_ELIGIBILITY[rule.tier], note: `Tier ${rule.tier}: "${quote(haystack, m)}"` }
  }
  if (workMode !== "remote" && US_LOCATION.test(locationLine)) {
    const how = workMode === "unknown" ? "located in" : `${workMode} in`
    return { tier: "C", latamEligibility: "us_only", note: `Tier C: ${how} ${locationLine}, no remote statement` }
  }
  return { tier: "D", latamEligibility: "unknown", note: `Tier D: no geo statement. Location: ${locationLine || "not listed"}` }
}

// --- Compose ---------------------------------------------------------------

/** Turn a posting into a row, or `null` when it is not a SWE role we keep. */
export function classify(posting: Posting, board: Board): ScrapedJob | null {
  if (!isSweTitle(posting.title) || isExcludedEmployment(posting.employmentType)) return null
  const salary = posting.salary ?? parseSalaryText(posting.text)
  if (!passesSalaryFloor(salary)) return null
  const workMode = posting.workMode ?? inferWorkMode(posting.title, posting.locations, posting.text)
  const geo = classifyGeo(posting.locations, posting.text, workMode)
  return {
    jobId: posting.jobId,
    title: posting.title,
    company: board.company,
    url: posting.url,
    location: posting.location,
    workMode,
    salary,
    latamEligibility: geo.latamEligibility,
    remoteNotes: geo.note,
    seniority: inferSeniority(posting.title),
    source: sourceOf(board),
    rawJson: posting.raw,
  }
}
