import { migrate } from "../db/migrate"
import { connect, type Sql } from "../db/sql"
import { SENIORITIES, type Seniority } from "../shared/types"
import { inferSeniority } from "./seniority"

export type BackfillReport = {
  scanned: number
  /** Rows whose stored bucket differed from `inferSeniority(title)` and were rewritten. */
  changed: number
  byBucket: Record<Seniority, number>
}

const UPDATE_CHUNK = 1000

/**
 * Re-run `inferSeniority` over every stored title, active or not, and write the
 * rows whose bucket changed. Running it again changes nothing.
 */
export async function backfillSeniority(sql: Sql): Promise<BackfillReport> {
  const rows: { jobId: string; title: string; seniority: Seniority }[] = await sql`select job_id as "jobId", title, seniority from jobs`
  const byBucket = Object.fromEntries(SENIORITIES.map((s) => [s, 0])) as Record<Seniority, number>
  const stale: { jobId: string; seniority: Seniority }[] = []
  for (const row of rows) {
    const seniority = inferSeniority(row.title)
    byBucket[seniority]++
    if (seniority !== row.seniority) stale.push({ jobId: row.jobId, seniority })
  }
  for (let i = 0; i < stale.length; i += UPDATE_CHUNK) {
    const chunk = stale.slice(i, i + UPDATE_CHUNK)
    await sql`
      update jobs
      set seniority = fresh.seniority
      from unnest(${sql.array(chunk.map((c) => c.jobId), "text")}, ${sql.array(chunk.map((c) => c.seniority), "text")}) as fresh(job_id, seniority)
      where jobs.job_id = fresh.job_id`
  }
  return { scanned: rows.length, changed: stale.length, byBucket }
}

if (import.meta.main) {
  const sql = connect()
  await migrate(sql)
  const report = await backfillSeniority(sql)
  console.log(`scanned ${report.scanned} jobs, rewrote ${report.changed}`)
  for (const bucket of SENIORITIES) console.log(`  ${bucket.padEnd(9)} ${report.byBucket[bucket]}`)
  await sql.end()
}
