import type { JobQuery, Sort } from "../shared/query"
import type { Job, JobsResponse, MetaResponse, ScrapeRun } from "../shared/types"
import type { Sql } from "./sql"

type JobRow = Omit<Job, "firstSeenAt" | "lastSeenAt"> & { firstSeenAt: Date; lastSeenAt: Date }
type RunRow = Omit<ScrapeRun, "startedAt" | "finishedAt"> & { startedAt: Date; finishedAt: Date }

const toJob = (r: JobRow): Job => ({
  ...r,
  firstSeenAt: r.firstSeenAt.toISOString(),
  lastSeenAt: r.lastSeenAt.toISOString(),
})

const toRun = (r: RunRow): ScrapeRun => ({
  ...r,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt.toISOString(),
})

function whereClause(sql: Sql, q: JobQuery) {
  const conds = []
  if (q.active === "active") conds.push(sql`is_active`)
  if (q.active === "inactive") conds.push(sql`not is_active`)
  if (q.q) conds.push(sql`(title ilike ${"%" + q.q + "%"} or company ilike ${"%" + q.q + "%"})`)
  if (q.workModes.length) conds.push(sql`work_mode = any(${sql.array(q.workModes, "text")})`)
  if (q.seniorities.length) conds.push(sql`seniority = any(${sql.array(q.seniorities, "text")})`)
  if (q.latam) conds.push(sql`latam_eligibility = ${q.latam}`)
  if (q.company) conds.push(sql`lower(company) = ${q.company.toLowerCase()}`)
  if (q.salaryMin !== null) conds.push(sql`coalesce(salary_max, salary_min) >= ${q.salaryMin}`)
  return conds.reduce((acc, c) => sql`${acc} and ${c}`, sql`true`)
}

function orderClause(sql: Sql, sort: Sort) {
  // Every row a scrape touched shares the same last_seen_at, so pay breaks the tie.
  const orders = {
    last_seen: sql`last_seen_at desc, coalesce(salary_max, salary_min) desc nulls last, company, title`,
    first_seen: sql`first_seen_at desc, coalesce(salary_max, salary_min) desc nulls last, company, title`,
    salary: sql`coalesce(salary_max, salary_min) desc nulls last, last_seen_at desc, company, title`,
    company: sql`lower(company), title`,
  } satisfies Record<Sort, unknown>
  return orders[sort]
}

export async function queryJobs(sql: Sql, q: JobQuery): Promise<JobsResponse> {
  const where = whereClause(sql, q)
  const rows: JobRow[] = await sql`
    select job_id as "jobId", title, company, url, location,
           work_mode as "workMode", seniority, salary_min as "salaryMin", salary_max as "salaryMax",
           salary_currency as "salaryCurrency", latam_eligibility as "latamEligibility",
           remote_notes as "remoteNotes", source, first_seen_at as "firstSeenAt",
           last_seen_at as "lastSeenAt", is_active as "isActive", missed_runs as "missedRuns"
    from jobs
    where ${where}
    order by ${orderClause(sql, q.sort)}
    limit ${q.limit} offset ${q.offset}`
  const [{ total }]: { total: number }[] = await sql`select count(*)::int as total from jobs where ${where}`
  return { jobs: rows.map(toJob), total }
}

export async function readMeta(sql: Sql): Promise<MetaResponse> {
  const [lastRun]: RunRow[] = await sql`
    select id, started_at as "startedAt", finished_at as "finishedAt", boards_ok as "boardsOk",
           boards_failed as "boardsFailed", jobs_seen as "jobsSeen", jobs_matched as "jobsMatched"
    from scrape_runs order by finished_at desc limit 1`
  const [{ lastScrapeAt }]: { lastScrapeAt: Date | null }[] =
    await sql`select max(finished_at) as "lastScrapeAt" from scrape_runs where boards_ok > 0`
  const [{ activeJobs }]: { activeJobs: number }[] = await sql`select count(*)::int as "activeJobs" from jobs where is_active`
  const companies: { company: string }[] = await sql`select distinct company from jobs where is_active order by company`
  return {
    lastScrapeAt: lastScrapeAt?.toISOString() ?? null,
    lastRun: lastRun ? toRun(lastRun) : null,
    activeJobs,
    companies: companies.map((c) => c.company),
  }
}
