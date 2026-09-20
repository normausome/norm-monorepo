import { describe, expect, test } from "bun:test"
import { QUESTIONS, QUESTION_COUNT } from "@/data/questions"
import {
  isAnswerCorrect,
  orderQuestions,
  tallyScore,
} from "@/quiz/engine"
import { shuffleWithSeed } from "@/quiz/seed"

describe("question bank", () => {
  test("exports exactly 14 questions", () => {
    expect(QUESTION_COUNT).toBe(14)
    expect(QUESTIONS).toHaveLength(14)
  })

  test("each question has four choices and a valid correctId", () => {
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4)
      const ids = q.choices.map((c) => c.id)
      expect(ids).toContain(q.correctId)
    }
  })
})

describe("isAnswerCorrect", () => {
  test("returns true only for correctId", () => {
    const q = QUESTIONS[0]!
    expect(isAnswerCorrect(q, q.correctId)).toBe(true)
    expect(isAnswerCorrect(q, "d")).toBe(false)
  })
})

describe("tallyScore", () => {
  test("counts correct picks across order", () => {
    const order = QUESTIONS.slice(0, 3)
    const answers = [order[0]!.correctId, "x", order[2]!.correctId]
    expect(tallyScore(order, answers)).toBe(2)
  })

  test("null answers score zero", () => {
    expect(tallyScore(QUESTIONS, Array(14).fill(null))).toBe(0)
  })
})

describe("seeded order", () => {
  test("same seed yields same order", () => {
    const a = orderQuestions("share-run-1")
    const b = orderQuestions("share-run-1")
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
  })

  test("different seeds usually reorder", () => {
    const a = shuffleWithSeed(QUESTIONS, "alpha")
    const b = shuffleWithSeed(QUESTIONS, "beta")
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id))
  })
})
