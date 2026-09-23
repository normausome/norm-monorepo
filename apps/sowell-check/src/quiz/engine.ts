import { SECTION_ORDER, questionsFor } from "@/data/questions"
import type { Question, SectionChoice, SectionId } from "@/data/questions"
import { shuffleWithSeed } from "@/quiz/seed"
import type { QuizAction, QuizPhase } from "@/quiz/types"

export type SectionTally = {
  section: SectionId
  correct: number
  total: number
}

export function orderQuestions(
  seed: string | null,
  section: SectionChoice = "all",
): Question[] {
  const pool = questionsFor(section)
  if (!seed) return [...pool]
  return shuffleWithSeed(pool, seed)
}

export function sectionOfRun(order: readonly Question[]): SectionChoice {
  if (order.length === 0) return "all"
  const first = order[0]?.section
  if (first && order.every((question) => question.section === first)) return first
  return "all"
}

export function isAnswerCorrect(question: Question, choiceId: string): boolean {
  return question.correctId === choiceId
}

export function tallyScore(
  order: readonly Question[],
  answers: readonly (string | null)[],
): number {
  let score = 0
  for (let i = 0; i < order.length; i++) {
    const q = order[i]
    const pick = answers[i]
    if (q && pick && isAnswerCorrect(q, pick)) score += 1
  }
  return score
}

export function tallyBySection(
  order: readonly Question[],
  answers: readonly (string | null)[],
): SectionTally[] {
  const buckets = new Map<SectionId, SectionTally>(
    SECTION_ORDER.map((section) => [section, { section, correct: 0, total: 0 }]),
  )
  for (let i = 0; i < order.length; i++) {
    const question = order[i]
    if (!question) continue
    const bucket = buckets.get(question.section)
    if (!bucket) continue
    bucket.total += 1
    const pick = answers[i]
    if (pick && isAnswerCorrect(question, pick)) bucket.correct += 1
  }
  return SECTION_ORDER.map((section) => buckets.get(section)).filter(
    (row): row is SectionTally => row !== undefined && row.total > 0,
  )
}

export function scoreTakeaway(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0
  if (ratio >= 0.93) {
    return "Strong grasp of Sowell’s themes on trade-offs, incentives, and evidence."
  }
  if (ratio >= 0.64) {
    return "Solid start. Revisit Basic Economics and A Conflict of Visions for sharper intuition."
  }
  return "Worth another pass. Sowell’s core move is to ask what trade-offs a policy hides."
}

export const initialQuizPhase: QuizPhase = { type: "title" }

export function quizReducer(state: QuizPhase, action: QuizAction): QuizPhase {
  switch (action.type) {
    case "START": {
      const order = orderQuestions(action.seed, action.section)
      if (order.length === 0) return state
      return {
        type: "question",
        index: 0,
        order,
        answers: Array.from<string | null>({ length: order.length }).fill(null),
      }
    }
    case "ANSWER": {
      if (state.type !== "question") return state
      const nextAnswers = [...state.answers]
      nextAnswers[state.index] = action.choiceId
      return {
        type: "feedback",
        index: state.index,
        order: state.order,
        answers: nextAnswers,
        selectedId: action.choiceId,
      }
    }
    case "NEXT": {
      if (state.type !== "feedback") return state
      const nextIndex = state.index + 1
      if (nextIndex >= state.order.length) {
        return {
          type: "end",
          order: state.order,
          answers: state.answers,
        }
      }
      return {
        type: "question",
        index: nextIndex,
        order: state.order,
        answers: state.answers,
      }
    }
    case "PLAY_AGAIN":
      return quizReducer(
        { type: "title" },
        { type: "START", seed: action.seed, section: action.section },
      )
    case "BACK_TO_TITLE":
      return { type: "title" }
    default:
      return state
  }
}
