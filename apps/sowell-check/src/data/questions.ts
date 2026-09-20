import bank from "./questions.json"

export type QuestionKind = "trivia" | "scenario"

export type Choice = {
  id: string
  text: string
}

export type Question = {
  id: string
  kind: QuestionKind
  prompt: string
  choices: [Choice, Choice, Choice, Choice]
  correctId: string
  explain: string
  source: string
}

/** Morgan-verified full bank (14 questions). Source of truth: `questions.json`. */
export const QUESTIONS = bank as Question[]

export const QUESTION_COUNT = QUESTIONS.length
