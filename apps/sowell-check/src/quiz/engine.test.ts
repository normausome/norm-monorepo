import { describe, expect, test } from "bun:test"
import {
  QUESTIONS,
  SECTION_LABEL,
  SECTION_ORDER,
  SECTION_SOURCE_URL,
  parseQuestions,
  questionsFor,
} from "@/data/questions"
import {
  initialQuizPhase,
  isAnswerCorrect,
  orderQuestions,
  quizReducer,
  sectionOfRun,
  tallyBySection,
  tallyScore,
} from "@/quiz/engine"
import { shuffleWithSeed } from "@/quiz/seed"

describe("question bank", () => {
  test("each section is playable and each question is well formed", () => {
    const ids = QUESTIONS.map((question) => question.id)
    expect(new Set(ids).size).toBe(QUESTIONS.length)
    for (const section of SECTION_ORDER) {
      const inSection = questionsFor(section)
      expect(inSection.length).toBeGreaterThanOrEqual(6)
      expect(inSection.every((question) => question.section === section)).toBe(
        true,
      )
    }
    expect(questionsFor("all")).toHaveLength(QUESTIONS.length)
    for (const question of QUESTIONS) {
      expect(question.choices).toHaveLength(4)
      expect(question.choices.map((choice) => choice.id)).toContain(
        question.correctId,
      )
    }
  })

  test("personal includes the Harlem question and economics does not", () => {
    expect(questionsFor("personal").map((question) => question.id)).toContain(
      "q1",
    )
    expect(questionsFor("economics").map((question) => question.id)).toContain(
      "q4",
    )
    expect(questionsFor("economics").map((question) => question.id)).not.toContain(
      "q1",
    )
  })

  test("1993 economic versus political section is last and linked", () => {
    expect(SECTION_ORDER.at(-1)).toBe("economic-vs-political-1993")
    expect(SECTION_LABEL["economic-vs-political-1993"]).toBe(
      "Sowell (1993): Economic vs Political Decision-Making",
    )
    expect(SECTION_SOURCE_URL["economic-vs-political-1993"]).toBe(
      "https://www.youtube.com/watch?v=Wh-qTnq-cwM",
    )
    for (const id of SECTION_ORDER) {
      if (id === "economic-vs-political-1993") continue
      expect(SECTION_SOURCE_URL[id]).toBeUndefined()
    }
    const pack = questionsFor("economic-vs-political-1993")
    expect(pack.length).toBe(12)
    expect(pack.map((question) => question.id)).toEqual([
      "econ-pol-1993-q01",
      "econ-pol-1993-q02",
      "econ-pol-1993-q03",
      "econ-pol-1993-q04",
      "econ-pol-1993-q05",
      "econ-pol-1993-q06",
      "econ-pol-1993-q07",
      "econ-pol-1993-q08",
      "econ-pol-1993-q09",
      "econ-pol-1993-q10",
      "econ-pol-1993-q11",
      "econ-pol-1993-q12",
    ])
    expect(pack.map((question) => question.correctId)).toEqual([
      "b",
      "c",
      "b",
      "b",
      "b",
      "b",
      "b",
      "c",
      "b",
      "c",
      "c",
      "b",
    ])
    expect(
      pack.every((question) => question.section === "economic-vs-political-1993"),
    ).toBe(true)
    expect(pack.every((question) => question.kind === "trivia")).toBe(true)
  })

  test("rejects an unknown section at the boundary", () => {
    expect(() =>
      parseQuestions([
        {
          id: "bad",
          section: "astrology",
          kind: "trivia",
          prompt: "Nope",
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" },
            { id: "d", text: "D" },
          ],
          correctId: "a",
          explain: "No",
          source: "None",
        },
      ]),
    ).toThrow("unknown section")
  })
})

describe("isAnswerCorrect", () => {
  test("returns true only for correctId", () => {
    const question = QUESTIONS[0]!
    expect(isAnswerCorrect(question, question.correctId)).toBe(true)
    const wrong = question.choices.find((choice) => choice.id !== question.correctId)
    expect(wrong).toBeDefined()
    expect(isAnswerCorrect(question, wrong!.id)).toBe(false)
  })
})

describe("tallyScore", () => {
  test("counts correct picks across order", () => {
    const order = QUESTIONS.slice(0, 3)
    const answers = [order[0]!.correctId, "x", order[2]!.correctId]
    expect(tallyScore(order, answers)).toBe(2)
  })

  test("null answers score zero", () => {
    expect(tallyScore(QUESTIONS, Array(QUESTIONS.length).fill(null))).toBe(0)
  })
})

describe("tallyBySection", () => {
  test("scores only the sections present in the run", () => {
    const personal = QUESTIONS.find((question) => question.id === "q1")!
    const economics = QUESTIONS.find((question) => question.id === "q4")!
    expect(
      tallyBySection([personal, economics], [personal.correctId, "z"]),
    ).toEqual([
      { section: "personal", correct: 1, total: 1 },
      { section: "economics", correct: 0, total: 1 },
    ])
  })
})

describe("seeded order", () => {
  test("same seed yields same order", () => {
    const a = orderQuestions("share-run-1")
    const b = orderQuestions("share-run-1")
    expect(a.map((question) => question.id)).toEqual(
      b.map((question) => question.id),
    )
  })

  test("different seeds usually reorder", () => {
    const a = shuffleWithSeed(QUESTIONS, "alpha")
    const b = shuffleWithSeed(QUESTIONS, "beta")
    expect(a.map((question) => question.id)).not.toEqual(
      b.map((question) => question.id),
    )
  })

  test("a section seed stays inside that section", () => {
    const order = orderQuestions("edu-seed", "education")
    expect(order.every((question) => question.section === "education")).toBe(
      true,
    )
    expect(order.map((question) => question.id)).toContain("q26")
    expect(order.map((question) => question.id)).not.toContain("q1")
    expect(sectionOfRun(order)).toBe("education")
  })
})

describe("quizReducer", () => {
  test("START economics deals only economics questions", () => {
    let state = quizReducer(initialQuizPhase, {
      type: "START",
      seed: null,
      section: "economics",
    })
    expect(state.type).toBe("question")
    if (state.type !== "question") return
    expect(state.order.map((question) => question.id)).toContain("q4")
    expect(state.order.map((question) => question.id)).not.toContain("q1")
    state = quizReducer(state, { type: "ANSWER", choiceId: "a" })
    expect(state.type).toBe("feedback")
    state = quizReducer(state, { type: "NEXT" })
    expect(state.type).toBe("question")
    if (state.type !== "question") return
    expect(state.index).toBe(1)
    expect(state.order[1]?.section).toBe("economics")
  })
})
