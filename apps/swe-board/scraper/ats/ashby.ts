import type { Salary, WorkMode } from "../../shared/types"
import type { Board } from "../boards"
import { jobIdFor, type Posting } from "../posting"

export type AshbyCompensationComponent = {
  compensationType: string
  interval: string
  currencyCode: string | null
  minValue: number | null
  maxValue: number | null
}

export type AshbyJob = {
  id: string
  title: string
  location?: string
  secondaryLocations?: { location?: string }[]
  employmentType?: string
  isListed?: boolean
  isRemote?: boolean
  workplaceType?: string
  jobUrl: string
  applyUrl?: string
  descriptionPlain?: string
  compensation?: { summaryComponents?: AshbyCompensationComponent[] } | null
}

export type AshbyPayload = { jobs: AshbyJob[] }

export const ashbyUrl = (slug: string) => `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`

const WORKPLACE: Record<string, WorkMode> = { remote: "remote", hybrid: "hybrid", onsite: "onsite" }

export function ashbySalary(job: AshbyJob): Salary | null {
  const c = job.compensation?.summaryComponents?.find(
    (x) => x.compensationType === "Salary" && /year/i.test(x.interval) && (x.minValue !== null || x.maxValue !== null),
  )
  return c ? { min: c.minValue, max: c.maxValue, currency: c.currencyCode ?? "USD" } : null
}

export function parseAshby(payload: AshbyPayload, board: Board): Posting[] {
  return payload.jobs
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const locations = [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)]
        .map((s) => s?.trim())
        .filter((s): s is string => !!s)
      const workMode = WORKPLACE[(j.workplaceType ?? "").toLowerCase()] ?? (j.isRemote ? "remote" : null)
      return {
        jobId: jobIdFor(board, j.id),
        title: j.title.trim(),
        url: j.jobUrl,
        location: locations.length ? locations.slice(0, 3).join("; ") : null,
        locations: [...new Set(locations)],
        text: j.descriptionPlain ?? "",
        workMode,
        salary: ashbySalary(j),
        employmentType: j.employmentType ?? null,
        raw: j,
      }
    })
}
