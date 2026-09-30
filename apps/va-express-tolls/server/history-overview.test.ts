import { describe, expect, test } from "bun:test"
import { buildOverviewCorridors, statsFromSummary } from "./history-overview"

describe("history overview stats", () => {
  test("min avg max from priced trips in one snapshot", () => {
    expect(
      statsFromSummary({
        trips: [
          { direction: "nb", entryId: "a", exitId: "b", entryLabel: "A", exitLabel: "B", price: 2, status: "open" },
          { direction: "nb", entryId: "a", exitId: "c", entryLabel: "A", exitLabel: "C", price: 8, status: "open" },
          { direction: "sb", entryId: "s", exitId: "b", entryLabel: "S", exitLabel: "B", price: null, status: "closed" },
          { direction: "eb", entryId: "1", exitId: "2", entryLabel: "1", exitLabel: "2", price: 0, status: "free" },
        ],
      }),
    ).toMatchObject({ min: 0, max: 8, tripCount: 3 })
    expect(statsFromSummary({
      trips: [
        { direction: "nb", entryId: "a", exitId: "b", entryLabel: "A", exitLabel: "B", price: 2, status: "open" },
        { direction: "nb", entryId: "a", exitId: "c", entryLabel: "A", exitLabel: "C", price: 8, status: "open" },
        { direction: "eb", entryId: "1", exitId: "2", entryLabel: "1", exitLabel: "2", price: 0, status: "free" },
      ],
    }).avg).toBeCloseTo(10 / 3)
  })

  test("ignores snapshots with no trips", () => {
    expect(statsFromSummary({})).toEqual({ min: null, avg: null, max: null, tripCount: 0 })
    expect(statsFromSummary({ minPrice: 1, avgPrice: 2, maxPrice: 3 })).toEqual({
      min: null,
      avg: null,
      max: null,
      tripCount: 0,
    })
  })

  test("groups rows by corridor in scrape order", () => {
    const t0 = new Date("2026-09-30T12:00:00Z")
    const t1 = new Date("2026-09-30T12:30:00Z")
    const corridors = buildOverviewCorridors([
      {
        corridor_id: "495",
        scraped_at: t0,
        summary: {
          trips: [
            { direction: "nb", entryId: "a", exitId: "b", entryLabel: "A", exitLabel: "B", price: 4, status: "open" },
          ],
        },
        error: null,
      },
      {
        corridor_id: "495",
        scraped_at: t1,
        summary: {
          trips: [
            { direction: "nb", entryId: "a", exitId: "b", entryLabel: "A", exitLabel: "B", price: 6, status: "open" },
          ],
        },
        error: null,
      },
      { corridor_id: "395", scraped_at: t0, summary: { trips: [] }, error: "feed timeout" },
    ])
    expect(corridors.map((c) => c.id)).toEqual(["495", "395", "95", "66-inside", "66-outside"])
    expect(corridors[0]?.samples.map((s) => s.avg)).toEqual([4, 6])
    expect(corridors[1]?.samples[0]?.error).toBe("feed timeout")
  })
})
