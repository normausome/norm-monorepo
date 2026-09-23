import type { Question, SectionChoice } from "@/data/questions"

export type QuizPhase =
  | { type: "title" }
  | {
      type: "question"
      section: SectionChoice
      index: number
      order: Question[]
      answers: (string | null)[]
    }
  | {
      type: "feedback"
      section: SectionChoice
      index: number
      order: Question[]
      answers: (string | null)[]
      selectedId: string
    }
  | {
      type: "end"
      section: SectionChoice
      order: Question[]
      answers: (string | null)[]
    }

export type QuizAction =
  | { type: "START"; seed: string | null; section: SectionChoice }
  | { type: "ANSWER"; choiceId: string }
  | { type: "NEXT" }
  | { type: "JUMP"; index: number }
  | { type: "PLAY_AGAIN"; seed: string | null; section: SectionChoice }
  | { type: "TO_TITLE" }
