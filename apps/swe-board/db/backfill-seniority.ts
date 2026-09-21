import { classifySeniority } from "../scraper/classify"
import { migrate } from "./migrate"
import { connect, type Sql } from "./sql"

const BATCH = 500

/** Reclassify every row from its title. Writes only what changes, so a rerun is a no-op. */
export async function backfillSeniority(sql: Sql): Promise<{ scanned: number; updated: number }> {
  let scanned = 0
  let updated = 0
  let after = ""
  for (;;) {
    const rows: { job_id: string; title: string }[] = await sql`
      select job_id, title from jobs where job_id > ${after} order by job_id limit ${BATCH}`
    if (!rows.length) break
    scanned += rows.length
    after = rows[rows.length - 1].job_id
    const ids = rows.map((r) => r.job_id)
    const levels = rows.map((r) => classifySeniority(r.title))
    const written = await sql`
      update jobs set seniority = v.seniority
      from unnest(${sql.array(ids, "text")}, ${sql.array(levels, "text")}) as v(job_id, seniority)
      where jobs.job_id = v.job_id and jobs.seniority <> v.seniority`
    updated += written.count
  }
  return { scanned, updated }
}

if (import.meta.main) {
  const sql = connect()
  await migrate(sql)
  const { scanned, updated } = await backfillSeniority(sql)
  console.log(`scanned ${scanned} jobs, updated ${updated}`)
  await sql.end()
}
