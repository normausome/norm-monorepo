import { afterAll, beforeAll, expect, test } from "bun:test"
import { parseJobQuery } from "../shared/query"
import type { ScrapedJob } from "../shared/types"
import { migrate } from "./migrate"
import { queryJobs } from "./read"
import { connect } from "./sql"
import { PgStore } from "./store"

const scraped = (id: string, title: string, seniority: ScrapedJob["seniority"]): ScrapedJob => ({
  jobId: id,
  title,
  company: "Acme",
  url: `https://example.com/${id}`,
  location: null,
  workMode: "remote",
  salary: null,
  latamEligibility: "unknown",
  remoteNotes: null,
  seniority,
  source: "greenhouse:acme",
  rawJson: {},
})

/** Postgres only. Without TEST_DATABASE_URL this file registers no tests. */
const url = process.env.TEST_DATABASE_URL

if (url) {
  const sql = connect(url)
  const query = (qs: string) => queryJobs(sql, parseJobQuery(new URLSearchParams(qs)))

  beforeAll(async () => {
    await migrate(sql)
    await sql`truncate jobs, scrape_runs`
    await new PgStore(sql).applyBoard(
      "greenhouse:acme",
      [
        scraped("gh:acme:1", "Software Engineer", "mid"),
        scraped("gh:acme:2", "Senior Software Engineer", "senior"),
        scraped("gh:acme:3", "Staff Software Engineer", "staff"),
        scraped("gh:acme:4", "Director of Engineering", "manager"),
      ],
      new Date("2026-09-01T00:00:00Z"),
      3,
    )
  })
  afterAll(() => sql.end())

  test("seniority filters rows to the listed buckets, from repeated keys or a comma list", async () => {
    const repeated = await query("seniority=senior&seniority=staff&sort=company")
    expect(repeated.total).toBe(2)
    expect(repeated.jobs.map((j) => [j.jobId, j.seniority])).toEqual([
      ["gh:acme:2", "senior"],
      ["gh:acme:3", "staff"],
    ])
    const comma = await query("seniority=senior,staff&sort=company")
    expect(comma.jobs.map((j) => j.jobId)).toEqual(["gh:acme:2", "gh:acme:3"])
  })

  test("no seniority param and an all-invalid one both return every row", async () => {
    expect((await query("")).total).toBe(4)
    expect((await query("seniority=vp,intern")).total).toBe(4)
  })

  test("seniority combines with the other filters", async () => {
    const r = await query("seniority=mid,senior&q=senior")
    expect(r.jobs.map((j) => j.jobId)).toEqual(["gh:acme:2"])
  })
}
