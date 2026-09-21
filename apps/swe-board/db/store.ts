import type { Job, JobId, ScrapedJob, ScrapeRun } from "../shared/types"
import type { Sql } from "./sql"

export type BoardReport = {
  source: string
  ok: boolean
  /** Postings the board returned before filtering. */
  seen: number
  /** Postings that passed the SWE filters and were written. */
  matched: number
  error?: string
}

export type RunReport = Omit<ScrapeRun, "id"> & { boards: BoardReport[] }

export type ApplyResult = { inserted: number; updated: number; deactivated: number }

/**
 * What one scrape run needs from storage. `applyBoard` is called once per board
 * that fetched successfully, so a failed fetch never counts as a miss.
 */
export interface ScrapeStore {
  applyBoard(source: string, jobs: ScrapedJob[], seenAt: Date, maxMissedRuns: number): Promise<ApplyResult>
  recordRun(run: RunReport): Promise<void>
}

/** Drop repeated ids inside one board response. The first occurrence wins. */
export function dedupeByJobId(jobs: ScrapedJob[]): ScrapedJob[] {
  const seen = new Set<JobId>()
  return jobs.filter((j) => (seen.has(j.jobId) ? false : (seen.add(j.jobId), true)))
}

export class MemoryStore implements ScrapeStore {
  readonly jobs = new Map<JobId, Job>()
  readonly runs: RunReport[] = []

  async applyBoard(source: string, jobs: ScrapedJob[], seenAt: Date, maxMissedRuns: number): Promise<ApplyResult> {
    const now = seenAt.toISOString()
    const result: ApplyResult = { inserted: 0, updated: 0, deactivated: 0 }
    const seenIds = new Set<JobId>()
    for (const j of dedupeByJobId(jobs)) {
      seenIds.add(j.jobId)
      const prev = this.jobs.get(j.jobId)
      prev ? result.updated++ : result.inserted++
      this.jobs.set(j.jobId, {
        jobId: j.jobId,
        title: j.title,
        company: j.company,
        url: j.url,
        location: j.location,
        workMode: j.workMode,
        salaryMin: j.salary?.min ?? null,
        salaryMax: j.salary?.max ?? null,
        salaryCurrency: j.salary?.currency ?? null,
        latamEligibility: j.latamEligibility,
        remoteNotes: j.remoteNotes,
        source: j.source,
        firstSeenAt: prev?.firstSeenAt ?? now,
        lastSeenAt: now,
        isActive: true,
        missedRuns: 0,
      })
    }
    for (const job of this.jobs.values()) {
      if (job.source !== source || seenIds.has(job.jobId)) continue
      job.missedRuns += 1
      const active = job.missedRuns < maxMissedRuns
      if (job.isActive && !active) result.deactivated++
      job.isActive = active
    }
    return result
  }

  async recordRun(run: RunReport): Promise<void> {
    this.runs.push(run)
  }
}

const INSERT_CHUNK = 200

export class PgStore implements ScrapeStore {
  private readonly sql: Sql
  constructor(sql: Sql) {
    this.sql = sql
  }

  async applyBoard(source: string, jobs: ScrapedJob[], seenAt: Date, maxMissedRuns: number): Promise<ApplyResult> {
    const unique = dedupeByJobId(jobs)
    const ids = unique.map((j) => j.jobId)
    return this.sql.begin(async (tx) => {
      const result: ApplyResult = { inserted: 0, updated: 0, deactivated: 0 }
      for (let i = 0; i < unique.length; i += INSERT_CHUNK) {
        const rows = unique.slice(i, i + INSERT_CHUNK).map((j) => ({
          job_id: j.jobId,
          title: j.title,
          company: j.company,
          url: j.url,
          location: j.location,
          work_mode: j.workMode,
          salary_min: j.salary?.min ?? null,
          salary_max: j.salary?.max ?? null,
          salary_currency: j.salary?.currency ?? null,
          latam_eligibility: j.latamEligibility,
          remote_notes: j.remoteNotes,
          source: j.source,
          first_seen_at: seenAt,
          last_seen_at: seenAt,
          missed_runs: 0,
          is_active: true,
          raw_json: JSON.stringify(j.rawJson),
        }))
        const written: { inserted: boolean }[] = await tx`
          insert into jobs ${tx(rows)}
          on conflict (job_id) do update set
            title = excluded.title,
            company = excluded.company,
            url = excluded.url,
            location = excluded.location,
            work_mode = excluded.work_mode,
            salary_min = excluded.salary_min,
            salary_max = excluded.salary_max,
            salary_currency = excluded.salary_currency,
            latam_eligibility = excluded.latam_eligibility,
            remote_notes = excluded.remote_notes,
            source = excluded.source,
            last_seen_at = excluded.last_seen_at,
            missed_runs = 0,
            is_active = true,
            raw_json = excluded.raw_json
          returning (xmax = 0) as inserted`
        for (const w of written) w.inserted ? result.inserted++ : result.updated++
      }
      const missed: { missed_runs: number }[] = await tx`
        update jobs
        set missed_runs = missed_runs + 1,
            is_active = missed_runs + 1 < ${maxMissedRuns}
        where source = ${source}
          and job_id <> all(${tx.array(ids, "text")})
        returning missed_runs`
      result.deactivated = missed.filter((m) => m.missed_runs === maxMissedRuns).length
      return result
    })
  }

  async recordRun(run: RunReport): Promise<void> {
    await this.sql`insert into scrape_runs ${this.sql({
      started_at: new Date(run.startedAt),
      finished_at: new Date(run.finishedAt),
      boards_ok: run.boardsOk,
      boards_failed: run.boardsFailed,
      jobs_seen: run.jobsSeen,
      jobs_matched: run.jobsMatched,
      boards: JSON.stringify(run.boards),
    })}`
  }
}
