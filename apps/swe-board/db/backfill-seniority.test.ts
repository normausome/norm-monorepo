import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { DEFAULT_QUERY } from "../shared/query"
import { backfillSeniority } from "./backfill-seniority"
import { migrate } from "./migrate"
import { queryJobs } from "./read"
import { connect } from "./sql"

const url = process.env.TEST_DATABASE_URL

if (url) {
  describe("backfillSeniority", () => {
    const sql = connect(url)
    beforeEach(async () => {
      await migrate(sql)
      await sql`truncate jobs`
      const row = (id: string, title: string, seniority: string) => ({
        job_id: id,
        title,
        company: "Acme",
        url: `https://example.com/${id}`,
        work_mode: "remote",
        seniority,
        latam_eligibility: "unknown",
        source: "greenhouse:acme",
        first_seen_at: new Date("2026-09-01T00:00:00Z"),
        last_seen_at: new Date("2026-09-01T00:00:00Z"),
        raw_json: "{}",
      })
      await sql`insert into jobs ${sql([
        row("gh:acme:1", "Staff Software Engineer", "unknown"),
        row("gh:acme:2", "Engineering Manager", "unknown"),
        row("gh:acme:3", "Software Engineer", "mid"),
      ])}`
    })
    afterAll(() => sql.end())

    test("classifies every row from its title and a rerun writes nothing", async () => {
      expect(await backfillSeniority(sql)).toEqual({ scanned: 3, updated: 2 })
      const rows = await sql`select job_id, seniority from jobs order by job_id`
      expect(rows.map((r: { job_id: string; seniority: string }) => [r.job_id, r.seniority])).toEqual([
        ["gh:acme:1", "staff"],
        ["gh:acme:2", "manager"],
        ["gh:acme:3", "mid"],
      ])
      expect(await backfillSeniority(sql)).toEqual({ scanned: 3, updated: 0 })
    })

    test("the seniority filter reads what the backfill wrote", async () => {
      await backfillSeniority(sql)
      const { jobs, total } = await queryJobs(sql, { ...DEFAULT_QUERY, seniorities: ["staff", "manager"], sort: "company" })
      expect(total).toBe(2)
      expect(jobs.map((j) => [j.jobId, j.seniority])).toEqual([
        ["gh:acme:2", "manager"],
        ["gh:acme:1", "staff"],
      ])
    })
  })
}
