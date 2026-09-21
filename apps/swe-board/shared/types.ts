export const WORK_MODES = ["remote", "hybrid", "onsite", "unknown"] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const LATAM_ELIGIBILITIES = ["latam_mx_br", "us_only", "unknown"] as const
export type LatamEligibility = (typeof LATAM_ELIGIBILITIES)[number]

/** Level read from the title by `inferSeniority`. Ordered junior to senior, then management, then unknown. */
export const SENIORITIES = ["entry", "associate", "mid", "senior", "staff", "principal", "manager", "unknown"] as const
export type Seniority = (typeof SENIORITIES)[number]

/** SWE Radar geo tiers. A and B map to latam_mx_br, C to us_only, D to unknown. */
export type GeoTier = "A" | "B" | "C" | "D"

/** `{ats}:{board_slug}:{native_id}`, e.g. `gh:affirm:7764109003`. Built only by `jobIdFor`. */
export type JobId = string

export type Salary = {
  min: number | null
  max: number | null
  currency: string
}

/** One posting after an adapter normalized it and the classifiers ran. */
export type ScrapedJob = {
  jobId: JobId
  title: string
  company: string
  url: string
  location: string | null
  workMode: WorkMode
  salary: Salary | null
  latamEligibility: LatamEligibility
  remoteNotes: string | null
  /** `{ats}:{slug}`, e.g. `greenhouse:affirm`. One board, one source. */
  source: string
  rawJson: unknown
}

/** A `jobs` row as the API returns it. */
export type Job = {
  jobId: JobId
  title: string
  company: string
  url: string
  location: string | null
  workMode: WorkMode
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  latamEligibility: LatamEligibility
  remoteNotes: string | null
  source: string
  firstSeenAt: string
  lastSeenAt: string
  isActive: boolean
  missedRuns: number
}

export type ScrapeRun = {
  id: number
  startedAt: string
  finishedAt: string
  boardsOk: number
  boardsFailed: number
  jobsSeen: number
  jobsMatched: number
}

export type JobsResponse = {
  jobs: Job[]
  total: number
}

export type MetaResponse = {
  lastScrapeAt: string | null
  lastRun: ScrapeRun | null
  activeJobs: number
  companies: string[]
}
