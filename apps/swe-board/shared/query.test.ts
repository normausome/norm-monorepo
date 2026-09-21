import { expect, test } from "bun:test"
import { DEFAULT_QUERY, jobQueryToParams, parseJobQuery } from "./query"

test("parses every supported filter", () => {
  const q = parseJobQuery(
    new URLSearchParams(
      "q=staff&work_mode=remote,hybrid,bogus,remote&seniority=senior,staff&latam=latam_mx_br&company=Stripe&salary_min=150000&active=all&sort=salary&limit=50&offset=100",
    ),
  )
  expect(q).toEqual({
    q: "staff",
    workModes: ["remote", "hybrid"],
    seniorities: ["senior", "staff"],
    latam: "latam_mx_br",
    company: "Stripe",
    salaryMin: 150_000,
    active: "all",
    sort: "salary",
    limit: 50,
    offset: 100,
  })
})

test("malformed values fall back to defaults and limit is capped", () => {
  const q = parseJobQuery(new URLSearchParams("latam=mars&active=maybe&sort=up&salary_min=lots&limit=99999&offset=-4"))
  expect(q).toEqual({ ...DEFAULT_QUERY, limit: 500 })
})

test("multi-value filters accept repeated keys, comma lists, and both at once", () => {
  expect(parseJobQuery(new URLSearchParams("seniority=senior&seniority=staff")).seniorities).toEqual(["senior", "staff"])
  expect(parseJobQuery(new URLSearchParams("seniority=senior,staff")).seniorities).toEqual(["senior", "staff"])
  expect(parseJobQuery(new URLSearchParams("seniority=entry,mid&seniority=manager&seniority=mid")).seniorities).toEqual(["entry", "mid", "manager"])
  expect(parseJobQuery(new URLSearchParams("work_mode=remote&work_mode=hybrid")).workModes).toEqual(["remote", "hybrid"])
})

test("unknown seniority values are ignored and an all-invalid list is no filter", () => {
  expect(parseJobQuery(new URLSearchParams("seniority=senior,vp,intern")).seniorities).toEqual(["senior"])
  expect(parseJobQuery(new URLSearchParams("seniority=vp&seniority=")).seniorities).toEqual([])
})

test("an empty query string is the default query", () => {
  expect(parseJobQuery(new URLSearchParams())).toEqual(DEFAULT_QUERY)
})

test("jobQueryToParams round-trips and omits defaults", () => {
  const q = { ...DEFAULT_QUERY, q: "sre", workModes: ["remote" as const], seniorities: ["senior" as const, "staff" as const], salaryMin: 200_000, offset: 100 }
  const params = jobQueryToParams(q)
  expect(params.toString()).toBe("q=sre&work_mode=remote&seniority=senior%2Cstaff&salary_min=200000&offset=100")
  expect(parseJobQuery(params)).toEqual(q)
  expect(jobQueryToParams(DEFAULT_QUERY).toString()).toBe("")
})
