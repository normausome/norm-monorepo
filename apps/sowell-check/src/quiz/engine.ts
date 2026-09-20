import { QUESTIONS } from "@/data/questions"
import type { Question } from "@/data/questions"
import { shuffleWithSeed } from "@/quiz/seed"
import type { QuizAction, QuizPhase } from "@/quiz/types"

export function orderQuestions(seed: string | null): Question[] {
  if (!seed) return [...QUESTIONS]
  return shuffleWithSeed(QUESTIONS, seed)
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
      const order = orderQuestions(action.seed)
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
      return quizReducer({ type: "title" }, { type: "START", seed: action.seed })
    default:
      return state
  }
}
