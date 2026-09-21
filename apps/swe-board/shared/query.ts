import { LATAM_ELIGIBILITIES, SENIORITIES, WORK_MODES, type LatamEligibility, type Seniority, type WorkMode } from "./types"

export const ACTIVE_FILTERS = ["active", "inactive", "all"] as const
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number]

export const SORTS = ["last_seen", "first_seen", "salary", "company"] as const
export type Sort = (typeof SORTS)[number]

export const MAX_LIMIT = 500

/** Every filter the jobs table supports. The URL query string and `/api/jobs` share it. */
export type JobQuery = {
  q: string
  workModes: WorkMode[]
  seniorities: Seniority[]
  latam: LatamEligibility | null
  company: string
  salaryMin: number | null
  active: ActiveFilter
  sort: Sort
  limit: number
  offset: number
}

export const DEFAULT_QUERY: JobQuery = {
  q: "",
  workModes: [],
  seniorities: [],
  latam: null,
  company: "",
  salaryMin: null,
  active: "active",
  sort: "last_seen",
  limit: 100,
  offset: 0,
}

function oneOf<T extends string>(values: readonly T[], raw: string | null): T | null {
  return values.includes(raw as T) ? (raw as T) : null
}

/** `key=a,b` and `key=a&key=b` both work. Unknown values are dropped, repeats collapse. */
function manyOf<T extends string>(values: readonly T[], raw: string[]): T[] {
  const picked = raw.flatMap((s) => s.split(",")).map((s) => oneOf(values, s.trim()))
  return [...new Set(picked.filter((v): v is T => v !== null))]
}

function positiveInt(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/** Parse a query string. Unknown or malformed values fall back to the default. */
export function parseJobQuery(params: URLSearchParams): JobQuery {
  const limit = positiveInt(params.get("limit"))
  return {
    q: (params.get("q") ?? "").trim(),
    workModes: manyOf(WORK_MODES, params.getAll("work_mode")),
    seniorities: manyOf(SENIORITIES, params.getAll("seniority")),
    latam: oneOf(LATAM_ELIGIBILITIES, params.get("latam")),
    company: (params.get("company") ?? "").trim(),
    salaryMin: positiveInt(params.get("salary_min")),
    active: oneOf(ACTIVE_FILTERS, params.get("active")) ?? DEFAULT_QUERY.active,
    sort: oneOf(SORTS, params.get("sort")) ?? DEFAULT_QUERY.sort,
    limit: limit === null || limit === 0 ? DEFAULT_QUERY.limit : Math.min(limit, MAX_LIMIT),
    offset: positiveInt(params.get("offset")) ?? 0,
  }
}

/** Inverse of `parseJobQuery`. Omits defaults so URLs stay short. */
export function jobQueryToParams(query: JobQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.workModes.length) params.set("work_mode", query.workModes.join(","))
  if (query.seniorities.length) params.set("seniority", query.seniorities.join(","))
  if (query.latam) params.set("latam", query.latam)
  if (query.company) params.set("company", query.company)
  if (query.salaryMin !== null) params.set("salary_min", String(query.salaryMin))
  if (query.active !== DEFAULT_QUERY.active) params.set("active", query.active)
  if (query.sort !== DEFAULT_QUERY.sort) params.set("sort", query.sort)
  if (query.limit !== DEFAULT_QUERY.limit) params.set("limit", String(query.limit))
  if (query.offset) params.set("offset", String(query.offset))
  return params
}
