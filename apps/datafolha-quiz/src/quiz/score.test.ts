import { describe, expect, test } from "bun:test"
import { ITEMS, type Item, type Pole } from "@/quiz/items"
import { scoreQuiz } from "@/quiz/score"

function pickPole(poleFor: (item: Item) => Pole): Record<string, string> {
  const picks: Record<string, string> = {}
  for (const item of ITEMS) {
    const pole = poleFor(item)
    const statement = item.statements.find((entry) => entry.pole === pole)
    if (!statement) throw new Error(`missing ${pole} on ${item.id}`)
    picks[item.id] = statement.id
  }
  return picks
}

describe("scoreQuiz", () => {
  test("the bank is 10 behavior items and 6 economy items, each with both poles", () => {
    expect(ITEMS.filter((item) => item.axis === "behavior")).toHaveLength(10)
    expect(ITEMS.filter((item) => item.axis === "economy")).toHaveLength(6)
    for (const item of ITEMS) {
      expect(item.statements.map((entry) => entry.pole).slice().sort()).toEqual([
        "left",
        "right",
      ])
    }
  })

  test("every left-pole answer scores 0 and 0", () => {
    expect(scoreQuiz(ITEMS, pickPole(() => "left"))).toEqual({
      behavior: 0,
      economy: 0,
      overall: 0,
    })
  })

  test("every right-pole answer scores 100 and 100", () => {
    expect(scoreQuiz(ITEMS, pickPole(() => "right"))).toEqual({
      behavior: 100,
      economy: 100,
      overall: 100,
    })
  })

  test("the drug ban is conservative even though it is stored first", () => {
    const drugs = ITEMS.find((item) => item.id === "drugs")
    expect(drugs?.statements[0]?.id).toBe("drugs-ban")
    expect(drugs?.statements[0]?.pole).toBe("right")
    expect(drugs?.statements[1]?.id).toBe("drugs-user")
    expect(drugs?.statements[1]?.pole).toBe("left")

    const picks = pickPole(() => "left")
    picks.drugs = "drugs-ban"
    expect(scoreQuiz(ITEMS, picks)).toEqual({
      behavior: 10,
      economy: 0,
      overall: 5,
    })

    picks.drugs = "drugs-user"
    expect(scoreQuiz(ITEMS, picks)).toEqual({
      behavior: 0,
      economy: 0,
      overall: 0,
    })
  })

  test("a mixed set scores 30 behavior, 50 economy, and 40 overall", () => {
    const behaviorRight = new Set(["guns", "poverty", "crime"])
    const economyRight = new Set(["taxes", "benefits", "bailouts"])
    const picks = pickPole((item) => {
      const rightIds = item.axis === "behavior" ? behaviorRight : economyRight
      return rightIds.has(item.id) ? "right" : "left"
    })
    expect(scoreQuiz(ITEMS, picks)).toEqual({
      behavior: 30,
      economy: 50,
      overall: 40,
    })
  })

  test("overall is the mean of the two axes", () => {
    const score = scoreQuiz(
      ITEMS,
      pickPole((item) => (item.axis === "behavior" ? "right" : "left")),
    )
    expect(score).toEqual({ behavior: 100, economy: 0, overall: 50 })
    expect(score?.overall).not.toBe((10 / 16) * 100)
  })

  test("a missing or unknown answer has no score", () => {
    expect(scoreQuiz(ITEMS, {})).toBeNull()
    const picks = pickPole(() => "left")
    picks.guns = "missing"
    expect(scoreQuiz(ITEMS, picks)).toBeNull()
  })
})
