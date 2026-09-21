import { describe, expect, test } from "bun:test"
import { catalogTrips, parseTrips, pickHeadline, resolveTrip, type StoredTrip } from "./history-trips"

function trip(partial: Partial<StoredTrip> & Pick<StoredTrip, "direction" | "entryId" | "exitId">): StoredTrip {
  return {
    entryLabel: partial.entryId,
    exitLabel: partial.exitId,
    spanning: false,
    price: 1,
    status: "open",
    ...partial,
  }
}

describe("history trips", () => {
  test("drops a trip that claims a price it does not have", () => {
    const trips = parseTrips({
      trips: [
        { direction: "nb", entryId: "a", exitId: "b", entryLabel: "A", exitLabel: "B", spanning: true, price: null, status: "open" },
        { direction: "nb", entryId: "a", exitId: "c", entryLabel: "A", exitLabel: "C", spanning: false, price: 2.5, status: "open" },
      ],
    })
    expect(trips[0]?.status).toBe("missing")
    expect(trips[0]?.price).toBeNull()
    expect(trips[1]?.price).toBe(2.5)
  })

  test("prefers the open reversible direction's full span", () => {
    const trips = [
      trip({ direction: "nb", entryId: "n", exitId: "1", spanning: true, price: null, status: "closed" }),
      trip({ direction: "sb", entryId: "s", exitId: "1", spanning: true, price: 8, status: "open" }),
      trip({ direction: "sb", entryId: "s", exitId: "2", price: 3, status: "open" }),
    ]
    expect(pickHeadline("95", trips, "sb")?.entryId).toBe("s")
    expect(pickHeadline("95", trips, "nb")?.direction).toBe("nb")
    expect(pickHeadline("495", trips, null)?.entryId).toBe("s")
    const inside = [
      trip({ direction: "eb", entryId: "1", exitId: "16", spanning: true, price: 0, status: "free" }),
      trip({ direction: "wb", entryId: "16", exitId: "1", spanning: true, price: 7.35, status: "open" }),
    ]
    expect(pickHeadline("66-inside", inside, null)?.direction).toBe("wb")
  })

  test("an explicit pair wins over the full span", () => {
    const catalog = [
      trip({ direction: "eb", entryId: "1", exitId: "16", entryLabel: "I-66 West", exitLabel: "Washington", spanning: true, price: 4 }),
      trip({ direction: "eb", entryId: "1", exitId: "4", entryLabel: "I-66 West", exitLabel: "Route 7", price: 0, status: "free" }),
    ]
    const chosen = resolveTrip("66-inside", catalog, { direction: "eb", entryId: "1", exitId: "4" }, null)
    expect(chosen?.exitLabel).toBe("Route 7")
    expect(catalogTrips("66-inside", catalog, chosen).map((t) => t.exitId)).toEqual(["16", "4"])
  })

  test("ignores the old corridor average", () => {
    expect(parseTrips({ minPrice: 1, avgPrice: 2, maxPrice: 3 })).toEqual([])
  })
})
