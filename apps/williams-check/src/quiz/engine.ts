import { questionsIn, sectionLabel } from "@/data/questions"
import type { Question, SectionChoice } from "@/data/questions"
import { shuffleWithSeed } from "@/quiz/seed"
import type { QuizAction, QuizPhase } from "@/quiz/types"

export function orderQuestions(
  seed: string | null,
  section: SectionChoice,
): Question[] {
  const pool = questionsIn(section)
  if (!seed) return pool
  return shuffleWithSeed(pool, seed)
}

export function isAnswerCorrect(question: Question, choiceId: string): boolean {
  return question.correctId === choiceId
}

export function tallyScore(
  order: Question[],
  answers: (string | null)[],
): number {
  let score = 0
  for (let i = 0; i < order.length; i++) {
    const q = order[i]
    const pick = answers[i]
    if (q && pick && isAnswerCorrect(q, pick)) score += 1
  }
  return score
}

const SECTION_NOTE: Record<Exclude<SectionChoice, "all">, string> = {
  personal:
    "The path runs from the Richard Allen projects through the Army and UCLA to the last class at George Mason.",
  economics:
    "The question is what a wage floor, a license, or a price ceiling does to the least-skilled worker.",
  "race-culture":
    "He separates a racial preference from the government rules that change its cost, and he treats family structure as its own evidence.",
  education:
    "Schooling shows up as his own path, as Economics for the Citizen, and as a limit on what a budget can do.",
  policy:
    "The policy claims are about statutes and committee work, especially wages, licensing, and Davis-Bacon.",
  books:
    "The ten books and the two PBS documentaries are the shelf his own biographical sketch names.",
}

export function scoreTakeaway(
  score: number,
  total: number,
  section: SectionChoice,
): string {
  const ratio = total > 0 ? score / total : 0
  if (section === "all") {
    if (ratio >= 0.93) {
      return "Strong grasp of Williams's themes on markets, price controls, and rules that close the bottom rung."
    }
    if (ratio >= 0.64) {
      return "Solid start. Revisit The State Against Blacks and Race and Economics for the wage and licensing arguments."
    }
    return "Worth another pass. Williams's core move is to ask what a well-meant rule does to the least-skilled worker."
  }
  const note = SECTION_NOTE[section]
  const label = sectionLabel(section)
  if (ratio >= 0.93) return `Strong run on ${label}. ${note}`
  if (ratio >= 0.64) return `Solid start on ${label}. ${note}`
  return `Worth another pass on ${label}. ${note}`
}

export const initialQuizPhase: QuizPhase = { type: "title" }

export function quizReducer(state: QuizPhase, action: QuizAction): QuizPhase {
  switch (action.type) {
    case "START": {
      const order = orderQuestions(action.seed, action.section)
      if (order.length === 0) return { type: "title" }
      return {
        type: "question",
        section: action.section,
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
        section: state.section,
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
          section: state.section,
          order: state.order,
          answers: state.answers,
        }
      }
      return {
        type: "question",
        section: state.section,
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
    case "TO_TITLE":
      return { type: "title" }
    default:
      return state
  }
}
