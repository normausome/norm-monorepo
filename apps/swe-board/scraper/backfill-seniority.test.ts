import { afterAll, expect, test } from "bun:test"
import { migrate } from "../db/migrate"
import { connect } from "../db/sql"
import { PgStore } from "../db/store"
import type { ScrapedJob } from "../shared/types"
import { backfillSeniority } from "./backfill-seniority"

const scraped = (id: string, title: string): ScrapedJob => ({
  jobId: id,
  title,
  company: "Acme",
  url: `https://example.com/${id}`,
  location: null,
  workMode: "unknown",
  salary: null,
  latamEligibility: "unknown",
  remoteNotes: null,
  seniority: "unknown",
  source: "greenhouse:acme",
  rawJson: {},
})

/** Postgres only. Without TEST_DATABASE_URL this file registers no tests. */
const url = process.env.TEST_DATABASE_URL

if (url) {
  const sql = connect(url)
  afterAll(() => sql.end())

  test("backfill rewrites rows whose stored bucket is stale, including inactive ones, and is idempotent", async () => {
    await migrate(sql)
    await sql`truncate jobs, scrape_runs`
    const store = new PgStore(sql)
    const t0 = new Date("2026-09-01T00:00:00Z")
    await store.applyBoard("greenhouse:acme", [scraped("gh:acme:1", "Staff Software Engineer"), scraped("gh:acme:2", "Software Engineer II")], t0, 1)
    await store.applyBoard("greenhouse:acme", [scraped("gh:acme:2", "Software Engineer II")], t0, 1)
    const before: { jobId: string; isActive: boolean }[] = await sql`select job_id as "jobId", is_active as "isActive" from jobs order by job_id`
    expect(before).toEqual([
      { jobId: "gh:acme:1", isActive: false },
      { jobId: "gh:acme:2", isActive: true },
    ])

    const first = await backfillSeniority(sql)
    expect(first).toEqual({
      scanned: 2,
      changed: 2,
      byBucket: { entry: 0, associate: 0, mid: 1, senior: 0, staff: 1, principal: 0, manager: 0, unknown: 0 },
    })
    const after: { jobId: string; seniority: string }[] = await sql`select job_id as "jobId", seniority from jobs order by job_id`
    expect(after).toEqual([
      { jobId: "gh:acme:1", seniority: "staff" },
      { jobId: "gh:acme:2", seniority: "mid" },
    ])

    const second = await backfillSeniority(sql)
    expect(second.changed).toBe(0)
    expect(second.scanned).toBe(2)
  })
}
