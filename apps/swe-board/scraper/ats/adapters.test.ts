import { expect, test } from "bun:test"
import type { Board } from "../boards"
import { htmlToText } from "../posting"
import { parseAshby } from "./ashby"
import { parseGreenhouse } from "./greenhouse"
import { parseLever } from "./lever"

const board = (ats: Board["ats"], slug: string): Board => ({ ats, slug, company: slug })

test("greenhouse ids are gh:{slug}:{numeric_id} and content is decoded twice", () => {
  const [p] = parseGreenhouse(
    {
      jobs: [
        {
          id: 7764109003,
          title: " Software Engineer II ",
          absolute_url: "https://job-boards.greenhouse.io/affirm/jobs/7764109003",
          location: { name: "Remote US" },
          offices: [{ name: "Remote", location: "Remote Canada" }],
          content: "&lt;div&gt;&lt;p&gt;Pay range: $160,000 &amp;ndash; $210,000&lt;/p&gt;&lt;/div&gt;",
        },
      ],
    },
    board("greenhouse", "affirm"),
  )
  expect(p.jobId).toBe("gh:affirm:7764109003")
  expect(p.title).toBe("Software Engineer II")
  expect(p.locations).toEqual(["Remote US", "Remote Canada"])
  expect(p.text).toBe("Pay range: $160,000 - $210,000")
  expect(p.workMode).toBeNull()
})

test("ashby ids are ashby:{slug}:{uuid} with structured salary and workplace type", () => {
  const [p] = parseAshby(
    {
      jobs: [
        {
          id: "34413f8d-26bf-4bbc-8ade-eb309a0e2245",
          title: "Security Engineer, Cloud",
          location: "New York, NY (HQ)",
          secondaryLocations: [{ location: "Remote (US)" }],
          employmentType: "FullTime",
          isListed: true,
          isRemote: true,
          workplaceType: "Hybrid",
          jobUrl: "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245",
          descriptionPlain: "About Ramp",
          compensation: {
            summaryComponents: [
              { compensationType: "EquityPercentage", interval: "NONE", currencyCode: null, minValue: null, maxValue: null },
              { compensationType: "Salary", interval: "1 YEAR", currencyCode: "USD", minValue: 211400, maxValue: 290600 },
            ],
          },
        },
        { id: "hidden", title: "Hidden", jobUrl: "https://x", isListed: false },
      ],
    },
    board("ashby", "ramp"),
  )
  expect(p.jobId).toBe("ashby:ramp:34413f8d-26bf-4bbc-8ade-eb309a0e2245")
  expect(p.salary).toEqual({ min: 211400, max: 290600, currency: "USD" })
  expect(p.workMode).toBe("hybrid")
  expect(p.location).toBe("New York, NY (HQ); Remote (US)")
  expect(parseAshby({ jobs: [{ id: "hidden", title: "Hidden", jobUrl: "https://x", isListed: false }] }, board("ashby", "ramp"))).toEqual([])
})

test("lever ids are lever:{slug}:{posting_id} and commitment is the employment type", () => {
  const [p] = parseLever(
    [
      {
        id: "2193db3f-77c5-43b8-b030-8f92c9882bf1",
        text: "Android Engineer - Experience",
        hostedUrl: "https://jobs.lever.co/spotify/2193db3f-77c5-43b8-b030-8f92c9882bf1",
        categories: { commitment: "Permanent", location: "London", allLocations: ["London", "Stockholm"] },
        workplaceType: "hybrid",
        descriptionBodyPlain: "We design Spotify's consumer experience.",
        lists: [{ text: "What you'll do", content: "<li>Ship features</li>" }],
        salaryRange: { min: 120000, max: 150000, currency: "USD", interval: "per-year-salary" },
      },
    ],
    board("lever", "spotify"),
  )
  expect(p.jobId).toBe("lever:spotify:2193db3f-77c5-43b8-b030-8f92c9882bf1")
  expect(p.locations).toEqual(["London", "Stockholm"])
  expect(p.employmentType).toBe("Permanent")
  expect(p.workMode).toBe("hybrid")
  expect(p.salary).toEqual({ min: 120000, max: 150000, currency: "USD" })
  expect(p.text).toContain("What you'll do\nShip features")
})

test("htmlToText strips tags and decodes numeric entities", () => {
  expect(htmlToText("<p>Hi&#160;there&#x2019;s <b>bold</b></p><ul><li>one</li><li>two</li></ul>")).toBe("Hi there\u2019s bold\none\ntwo")
})
