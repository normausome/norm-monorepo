import type { Question, SectionChoice } from "@/data/questions"

export type QuizPhase =
  | { type: "title" }
  | {
      type: "question"
      index: number
      order: Question[]
      answers: (string | null)[]
    }
  | {
      type: "feedback"
      index: number
      order: Question[]
      answers: (string | null)[]
      selectedId: string
    }
  | {
      type: "end"
      order: Question[]
      answers: (string | null)[]
    }

export type QuizAction =
  | { type: "START"; seed: string | null; section: SectionChoice }
  | { type: "ANSWER"; choiceId: string }
  | { type: "NEXT" }
  | { type: "PLAY_AGAIN"; seed: string | null; section: SectionChoice }
  | { type: "BACK_TO_TITLE" }
