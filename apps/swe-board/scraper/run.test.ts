import { expect, test } from "bun:test"
import { MemoryStore } from "../db/store"
import type { Board } from "./boards"
import { runScrape } from "./run"

const acme: Board = { ats: "greenhouse", slug: "acme", company: "Acme" }
const beta: Board = { ats: "lever", slug: "beta", company: "Beta" }

const ghJob = (id: number, title: string) => ({
  id,
  title,
  absolute_url: `https://boards.greenhouse.io/acme/jobs/${id}`,
  location: { name: "Remote US" },
  content: "&lt;p&gt;Pay: $160,000 - $210,000&lt;/p&gt;",
})

const leverJob = (id: string, text: string) => ({
  id,
  text,
  hostedUrl: `https://jobs.lever.co/beta/${id}`,
  categories: { commitment: "Full-time", location: "Remote - US" },
  workplaceType: "remote",
  descriptionPlain: "Build things.",
})

function fetcherFor(payloads: Record<string, unknown | Error>) {
  return async <T>(url: string): Promise<T> => {
    const hit = Object.entries(payloads).find(([key]) => url.includes(key))
    if (!hit) throw new Error(`no fixture for ${url}`)
    if (hit[1] instanceof Error) throw hit[1]
    return hit[1] as T
  }
}

test("a run writes only SWE matches and records per-board counts", async () => {
  const store = new MemoryStore()
  const run = await runScrape(store, {
    boards: [acme, beta],
    fetchJson: fetcherFor({
      "greenhouse.io/v1/boards/acme": { jobs: [ghJob(1, "Senior Software Engineer, Payments"), ghJob(2, "Account Executive")] },
      "lever.co/v0/postings/beta": [leverJob("u-1", "Staff Backend Engineer")],
    }),
  })
  expect(run.boardsOk).toBe(2)
  expect(run.boardsFailed).toBe(0)
  expect(run.jobsSeen).toBe(3)
  expect(run.jobsMatched).toBe(2)
  expect([...store.jobs.keys()].sort()).toEqual(["gh:acme:1", "lever:beta:u-1"])
  expect(store.jobs.get("gh:acme:1")).toMatchObject({ company: "Acme", source: "greenhouse:acme", salaryMin: 160_000, salaryMax: 210_000, seniority: "senior" })
  expect(store.jobs.get("lever:beta:u-1")?.seniority).toBe("staff")
  expect(store.runs).toHaveLength(1)
})

test("a failed board fetch is reported and does not count as a miss", async () => {
  const store = new MemoryStore()
  const good = fetcherFor({
    "greenhouse.io/v1/boards/acme": { jobs: [ghJob(1, "Software Engineer")] },
    "lever.co/v0/postings/beta": [leverJob("u-1", "Software Engineer")],
  })
  await runScrape(store, { boards: [acme, beta], fetchJson: good, maxMissedRuns: 1 })

  const acmeDown = fetcherFor({
    "greenhouse.io/v1/boards/acme": new Error("HTTP 503"),
    "lever.co/v0/postings/beta": [],
  })
  const run = await runScrape(store, { boards: [acme, beta], fetchJson: acmeDown, maxMissedRuns: 1 })

  expect(run.boardsOk).toBe(1)
  expect(run.boardsFailed).toBe(1)
  expect(run.boards.find((b) => b.source === "greenhouse:acme")?.error).toContain("HTTP 503")
  expect(store.jobs.get("gh:acme:1")).toMatchObject({ isActive: true, missedRuns: 0 })
  expect(store.jobs.get("lever:beta:u-1")).toMatchObject({ isActive: false, missedRuns: 1 })
})

test("a payload without a jobs array fails that board only", async () => {
  const store = new MemoryStore()
  const run = await runScrape(store, {
    boards: [acme],
    fetchJson: fetcherFor({ "greenhouse.io/v1/boards/acme": { error: "not found" } }),
  })
  expect(run.boardsFailed).toBe(1)
  expect(run.boards[0].error).toBe("greenhouse payload has no jobs array")
})
