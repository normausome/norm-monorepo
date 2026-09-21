import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { DEFAULT_QUERY } from "../shared/query"
import type { Job, ScrapedJob } from "../shared/types"
import { queryJobs } from "./read"
import { migrate } from "./migrate"
import { connect } from "./sql"
import { MemoryStore, PgStore, dedupeByJobId, type ScrapeStore } from "./store"

function scraped(id: string, source = "greenhouse:acme", over: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    jobId: id,
    title: "Software Engineer",
    company: "Acme",
    url: `https://example.com/${id}`,
    location: "Remote US",
    workMode: "remote",
    seniority: "mid",
    salary: { min: 150_000, max: 200_000, currency: "USD" },
    latamEligibility: "us_only",
    remoteNotes: null,
    source,
    rawJson: { id },
    ...over,
  }
}

type Harness = {
  store: ScrapeStore
  reset(): Promise<void>
  all(): Promise<Job[]>
  close?(): Promise<void>
}

function memoryHarness(): Harness {
  let store = new MemoryStore()
  return {
    get store() {
      return store
    },
    reset: async () => {
      store = new MemoryStore()
    },
    all: async () => [...store.jobs.values()].sort((a, b) => a.jobId.localeCompare(b.jobId)),
  }
}

function pgHarness(url: string): Harness {
  const sql = connect(url)
  return {
    store: new PgStore(sql),
    reset: async () => {
      await migrate(sql)
      await sql`truncate jobs, scrape_runs`
    },
    all: async () => (await queryJobs(sql, { ...DEFAULT_QUERY, active: "all", sort: "company" })).jobs.sort((a, b) => a.jobId.localeCompare(b.jobId)),
    close: () => sql.end(),
  }
}

const harnesses: [string, Harness][] = [["MemoryStore", memoryHarness()]]
if (process.env.TEST_DATABASE_URL) harnesses.push(["PgStore", pgHarness(process.env.TEST_DATABASE_URL)])

const t0 = new Date("2026-09-01T00:00:00Z")
const t1 = new Date("2026-09-01T06:00:00Z")
const t2 = new Date("2026-09-01T12:00:00Z")
const t3 = new Date("2026-09-01T18:00:00Z")

describe.each(harnesses)("%s contract", (_name, h) => {
  beforeEach(() => h.reset())
  afterAll(() => h.close?.())

  test("first scrape inserts with first_seen = last_seen and the salary split into columns", async () => {
    const result = await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1")], t0, 3)
    expect(result).toEqual({ inserted: 1, updated: 0, deactivated: 0 })
    const [job] = await h.all()
    expect(job).toMatchObject({
      jobId: "gh:acme:1",
      firstSeenAt: t0.toISOString(),
      lastSeenAt: t0.toISOString(),
      salaryMin: 150_000,
      salaryMax: 200_000,
      salaryCurrency: "USD",
      seniority: "mid",
      isActive: true,
      missedRuns: 0,
    })
  })

  test("re-seeing a job bumps last_seen, keeps first_seen, and takes the new title and seniority", async () => {
    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1")], t0, 3)
    const result = await h.store.applyBoard(
      "greenhouse:acme",
      [scraped("gh:acme:1", undefined, { title: "Senior Software Engineer", seniority: "senior" })],
      t1,
      3,
    )
    expect(result).toEqual({ inserted: 0, updated: 1, deactivated: 0 })
    const [job] = await h.all()
    expect(job.firstSeenAt).toBe(t0.toISOString())
    expect(job.lastSeenAt).toBe(t1.toISOString())
    expect(job.title).toBe("Senior Software Engineer")
    expect(job.seniority).toBe("senior")
  })

  test("a job goes inactive only after N consecutive misses and revives on re-see", async () => {
    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1"), scraped("gh:acme:2")], t0, 3)
    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:2")], t1, 3)
    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:2")], t2, 3)
    let [one] = await h.all()
    expect(one).toMatchObject({ jobId: "gh:acme:1", missedRuns: 2, isActive: true })

    const third = await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:2")], t3, 3)
    expect(third.deactivated).toBe(1)
    ;[one] = await h.all()
    expect(one).toMatchObject({ missedRuns: 3, isActive: false, lastSeenAt: t0.toISOString() })

    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1"), scraped("gh:acme:2")], t3, 3)
    ;[one] = await h.all()
    expect(one).toMatchObject({ missedRuns: 0, isActive: true, firstSeenAt: t0.toISOString(), lastSeenAt: t3.toISOString() })
  })

  test("a miss on one board never touches another board's jobs", async () => {
    await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1")], t0, 1)
    await h.store.applyBoard("ashby:beta", [scraped("ashby:beta:x", "ashby:beta")], t0, 1)
    await h.store.applyBoard("ashby:beta", [], t1, 1)
    const jobs = await h.all()
    expect(jobs.map((j) => [j.jobId, j.isActive, j.missedRuns])).toEqual([
      ["ashby:beta:x", false, 1],
      ["gh:acme:1", true, 0],
    ])
  })

  test("duplicate ids inside one response are written once", async () => {
    const result = await h.store.applyBoard("greenhouse:acme", [scraped("gh:acme:1"), scraped("gh:acme:1", undefined, { title: "Dup" })], t0, 3)
    expect(result.inserted).toBe(1)
    const jobs = await h.all()
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe("Software Engineer")
  })
})

test("dedupeByJobId keeps the first occurrence", () => {
  const out = dedupeByJobId([scraped("a", "s", { title: "first" }), scraped("b"), scraped("a", "s", { title: "second" })])
  expect(out.map((j) => [j.jobId, j.title])).toEqual([
    ["a", "first"],
    ["b", "Software Engineer"],
  ])
})
