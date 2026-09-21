import { describe, expect, test } from "bun:test"
import { EXITS_BY_START } from "./ride66-map"
import { ride66Trips, type Rate } from "./scrapers/ride66"
import { tripsForCorridor, type TransurbanMapping } from "./scrapers/transurban"
import { quotesFromMeasured } from "./scrapers/vai66"
import { pairKey } from "./trips"

function point(id: string, label: string, path: string, lat: number, lng: number) {
  return { id, label, path, latitude: String(lat), longitude: String(lng) }
}

function mapping(): TransurbanMapping {
  const nbExitFar = point("far", "Far on 95", "95", 38.8, -77.2)
  const nbExitOther = point("other", "Onto 495", "495North", 39.2, -77.2)
  const nbExitNear = point("near", "Near on 95", "95", 38.5, -77.3)
  const upstream = {
    ...point("up", "Route 17", "95", 38.3, -77.4),
    exits: [
      { id: "other", ods: ["1", "2"] },
      { id: "far", ods: ["1"] },
      { id: "near", ods: ["3"] },
    ],
  }
  const downstream = {
    ...point("down", "Edsall", "95", 38.9, -77.1),
    exits: [{ id: "far", ods: ["9"] }],
  }
  return {
    Northbound: {
      entries: { up: upstream, down: downstream },
      exits: { far: nbExitFar, other: nbExitOther, near: nbExitNear },
    },
    Southbound: { entries: {}, exits: {} },
  }
}

describe("transurban trips", () => {
  test("sums the link's od rows and marks the on-corridor full span", () => {
    const feed = {
      error: "0",
      error_text: "",
      direction_95: "N",
      response: [
        { od: "od_1", price: "1.10", road: "95", time: "2026-09-21 08:00:00", status: "open" },
        { od: "od_2", price: "2.25", road: "495", time: "2026-09-21 08:00:00", status: "open" },
        { od: "od_3", price: "0.50", road: "95", time: "2026-09-21 08:00:00", status: "open" },
        { od: "od_9", price: "4.00", road: "95", time: "2026-09-21 08:00:00", status: "open" },
        { od: "od_unused", price: "99.00", road: "95", time: "2026-09-21 08:00:00", status: "open" },
      ],
    }
    const trips = tripsForCorridor("95", feed, mapping(), "nb")
    expect(trips).toHaveLength(4)
    const cross = trips.find((t) => t.entryId === "up" && t.exitId === "other")
    const span = trips.find((t) => t.spanning)
    expect(cross?.price).toBe(3.35)
    expect(span?.entryId).toBe("up")
    expect(span?.exitId).toBe("far")
    expect(span?.price).toBe(1.1)
    expect(trips.some((t) => t.price === 99)).toBe(false)
  })

  test("a closed reversible direction stores no price", () => {
    const feed = {
      error: "0",
      error_text: "",
      direction_95: "S",
      response: [{ od: "od_1", price: "1.10", road: "95", time: "2026-09-21 08:00:00", status: "open" }],
    }
    const trips = tripsForCorridor("95", feed, mapping(), "sb")
    expect(trips.every((t) => t.status === "closed" && t.price === null)).toBe(true)
  })

  test("a closed leg nulls the trip even when other legs have prices", () => {
    const feed = {
      error: "0",
      error_text: "",
      direction_95: "N",
      response: [
        { od: "od_1", price: "1.10", road: "95", time: "2026-09-21 08:00:00", status: "closed" },
        { od: "od_2", price: "2.25", road: "495", time: "2026-09-21 08:00:00", status: "open" },
        { od: "od_3", price: "0.50", road: "95", time: "2026-09-21 08:00:00", status: "open" },
      ],
    }
    const trips = tripsForCorridor("95", feed, mapping(), "nb")
    expect(trips.find((t) => t.exitId === "other")?.status).toBe("closed")
    expect(trips.find((t) => t.exitId === "near")?.price).toBe(0.5)
  })
})

function rate(gantryId: number, amount: number, at = "2026-09-21 08:00:00"): Rate {
  return { rateStartDate: at, gantry: { gantryId, vehicleClasses: [{ vehicleClassId: 1, rateAmountTag: amount }] } }
}

describe("ride66 trips", () => {
  test("sums the chain and ignores gantries the trip does not pass", () => {
    const trips = ride66Trips(
      { eb: [{ id: "401", label: "Western Entry" }], wb: [] },
      [rate(401, 1), rate(407, 2), rate(411, 4), rate(999, 100), rate(407, 9, "2026-09-21 07:00:00")],
    )
    const span = trips.find((t) => t.spanning)
    expect(span?.exitLabel).toBe("EB GP Exit")
    expect(span?.price).toBe(7)
    expect(trips.some((t) => t.price === 100)).toBe(false)
    const short = trips.find((t) => t.exitLabel === "Walney Rd/Rt28")
    expect(short?.price).toBe(1)
    expect(short?.spanning).toBe(false)
  })

  test("every vendored pair has a distinct id", () => {
    const trips = ride66Trips(
      {
        eb: Object.keys(EXITS_BY_START.eb).map((id) => ({ id, label: id })),
        wb: Object.keys(EXITS_BY_START.wb).map((id) => ({ id, label: id })),
      },
      [],
    )
    const keys = trips.map((t) => pairKey(t))
    expect(new Set(keys).size).toBe(keys.length)
    expect(trips).toHaveLength(172)
    expect(trips.filter((t) => t.spanning)).toHaveLength(2)
  })
})

describe("vai66 trips", () => {
  test("zero is free and the full span is west to east", () => {
    const trips = quotesFromMeasured([
      {
        direction: "eb",
        entry: { id: "1", label: "I-66 West", lat: 38.88, lng: -77.23 },
        exit: { id: "4", label: "Route 7", lat: 38.9, lng: -77.19 },
        price: 0,
      },
      {
        direction: "eb",
        entry: { id: "1", label: "I-66 West", lat: 38.88, lng: -77.23 },
        exit: { id: "16", label: "Washington", lat: 38.89, lng: -77.05 },
        price: 4.5,
      },
      {
        direction: "eb",
        entry: { id: "9", label: "Glebe Road", lat: 38.89, lng: -77.12 },
        exit: { id: "16", label: "Washington", lat: 38.89, lng: -77.05 },
        price: null,
      },
    ])
    const span = trips.find((t) => t.spanning)
    expect(span?.entryLabel).toBe("I-66 West")
    expect(span?.exitLabel).toBe("Washington")
    expect(span?.price).toBe(4.5)
    expect(trips.find((t) => t.exitId === "4")?.status).toBe("free")
    expect(trips.find((t) => t.entryId === "9")?.status).toBe("missing")
  })
})
