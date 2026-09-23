import { describe, expect, test } from "bun:test"
import {
  QUESTIONS,
  QUESTION_COUNT,
  SECTION_IDS,
  questionsIn,
} from "@/data/questions"
import {
  initialQuizPhase,
  isAnswerCorrect,
  orderQuestions,
  quizReducer,
  tallyScore,
} from "@/quiz/engine"
import { shuffleWithSeed } from "@/quiz/seed"

describe("question bank", () => {
  test("exports 37 questions across six sections", () => {
    expect(QUESTION_COUNT).toBe(37)
    expect(QUESTIONS).toHaveLength(37)
    expect(questionsIn("all")).toHaveLength(37)
  })

  test("each section is playable on its own", () => {
    const counts = SECTION_IDS.map((id) => questionsIn(id).length)
    expect(counts).toEqual([7, 6, 6, 6, 6, 6])
    const tagged = SECTION_IDS.reduce((sum, id) => sum + questionsIn(id).length, 0)
    expect(tagged).toBe(QUESTION_COUNT)
  })

  test("each question has four choices and a valid correctId", () => {
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4)
      const ids = q.choices.map((c) => c.id)
      expect(ids).toContain(q.correctId)
      expect(ids).toEqual(["a", "b", "c", "d"])
    }
  })

  test("correct choices are spread across slots", () => {
    const ids = new Set(QUESTIONS.map((q) => q.correctId))
    expect([...ids].sort()).toEqual(["a", "b", "c", "d"])
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
    expect(tallyScore(QUESTIONS, Array(QUESTION_COUNT).fill(null))).toBe(0)
  })
})

describe("seeded order", () => {
  test("same seed yields same order", () => {
    const a = orderQuestions("share-run-1", "all")
    const b = orderQuestions("share-run-1", "all")
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
  })

  test("a section run stays inside that section", () => {
    const order = orderQuestions("share-run-1", "books")
    expect(order).toHaveLength(6)
    expect(order.every((q) => q.section === "books")).toBe(true)
    expect(orderQuestions("share-run-1", "books").map((q) => q.id)).toEqual(
      order.map((q) => q.id),
    )
  })

  test("different seeds usually reorder", () => {
    const a = shuffleWithSeed(QUESTIONS, "alpha")
    const b = shuffleWithSeed(QUESTIONS, "beta")
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id))
  })
})

describe("section runs", () => {
  test("start deals only the chosen section and replay keeps it", () => {
    const started = quizReducer(initialQuizPhase, {
      type: "START",
      seed: null,
      section: "education",
    })
    expect(started.type).toBe("question")
    if (started.type !== "question") return
    expect(started.section).toBe("education")
    expect(started.order.every((q) => q.section === "education")).toBe(true)

    const replay = quizReducer(started, {
      type: "PLAY_AGAIN",
      seed: null,
      section: started.section,
    })
    expect(replay.type).toBe("question")
    if (replay.type !== "question") return
    expect(replay.order.map((q) => q.id)).toEqual(started.order.map((q) => q.id))
  })

  test("sections returns to the title from a question", () => {
    const started = quizReducer(initialQuizPhase, {
      type: "START",
      seed: "x",
      section: "policy",
    })
    expect(quizReducer(started, { type: "TO_TITLE" })).toEqual({ type: "title" })
  })

  test("JUMP revisits an earlier answer in place", () => {
    let state = quizReducer(initialQuizPhase, {
      type: "START",
      seed: null,
      section: "personal",
    })
    if (state.type !== "question") throw new Error("expected question")
    state = quizReducer(state, {
      type: "ANSWER",
      choiceId: state.order[0]!.correctId,
    })
    state = quizReducer(state, { type: "NEXT" })
    state = quizReducer(state, { type: "JUMP", index: 0 })
    expect(state.type).toBe("feedback")
    if (state.type !== "feedback") return
    expect(state.index).toBe(0)
    expect(state.answers[0]).toBe(state.order[0]!.correctId)
  })
})
