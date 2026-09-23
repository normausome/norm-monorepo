import bank from "./questions.json"

export type QuestionKind = "trivia" | "scenario"

export const SECTION_IDS = [
  "personal",
  "economics",
  "race-culture",
  "education",
  "policy",
  "books",
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export type SectionChoice = SectionId | "all"

export const SECTION_LABELS: Record<SectionId, string> = {
  personal: "Personal Life",
  economics: "Economics",
  "race-culture": "Race & Culture",
  education: "Education",
  policy: "Policy & Government",
  books: "Books & Ideas",
}

export type Choice = {
  id: string
  text: string
}

export type Question = {
  id: string
  section: SectionId
  kind: QuestionKind
  prompt: string
  choices: [Choice, Choice, Choice, Choice]
  correctId: string
  explain: string
  source: string
}

function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value)
}

function parseBank(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    throw new Error("question bank must be an array")
  }
  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("question must be an object")
    }
    const q = item as Question
    if (!isSectionId(q.section)) {
      throw new Error(`${q.id} has an unknown section`)
    }
    if (q.kind !== "trivia" && q.kind !== "scenario") {
      throw new Error(`${q.id} has an unknown kind`)
    }
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      throw new Error(`${q.id} needs four choices`)
    }
    if (!q.choices.some((choice) => choice.id === q.correctId)) {
      throw new Error(`${q.id} correctId is missing`)
    }
    return q
  })
}

export const QUESTIONS = parseBank(bank)

export const QUESTION_COUNT = QUESTIONS.length

export function questionsIn(section: SectionChoice): Question[] {
  if (section === "all") return [...QUESTIONS]
  return QUESTIONS.filter((question) => question.section === section)
}

export function sectionLabel(section: SectionChoice): string {
  if (section === "all") return "All"
  return SECTION_LABELS[section]
}
