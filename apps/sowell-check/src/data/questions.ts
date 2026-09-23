import bank from "./questions.json"

export const SECTION_ORDER = [
  "personal",
  "economics",
  "race-culture",
  "education",
  "policy",
  "books",
  "economic-vs-political-1993",
  "economics-politics-race-1983",
] as const

export type SectionId = (typeof SECTION_ORDER)[number]

export type SectionChoice = SectionId | "all"

export const SECTION_LABEL: Record<SectionId, string> = {
  personal: "Personal Life",
  economics: "Economics",
  "race-culture": "Race & Culture",
  education: "Education",
  policy: "Policy & Government",
  books: "Books & Ideas",
  "economic-vs-political-1993": "Sowell (1993): Economic vs Political Decision-Making",
  "economics-politics-race-1983":
    "Sowell (1983): Economics & Politics of Race (Firing Line)",
}

export const SECTION_SOURCE_URL: Partial<Record<SectionId, string>> = {
  "economic-vs-political-1993": "https://www.youtube.com/watch?v=Wh-qTnq-cwM",
  "economics-politics-race-1983": "https://www.youtube.com/watch?v=TEBPCOG5RHs",
}

export const SECTION_SOURCE_LINK_TEXT: Partial<Record<SectionId, string>> = {
  "economic-vs-political-1993": "Watch the 1993 talk",
  "economics-politics-race-1983": "Watch the 1983 Firing Line",
}

export type QuestionKind = "trivia" | "scenario"

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
  return (SECTION_ORDER as readonly string[]).includes(value)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function parseChoice(value: unknown, questionId: string, index: number): Choice {
  if (!value || typeof value !== "object") {
    throw new Error(`${questionId} choice ${index} is not an object`)
  }
  const choice = value as Record<string, unknown>
  return {
    id: requireString(choice.id, `${questionId} choice ${index} id`),
    text: requireString(choice.text, `${questionId} choice ${index} text`),
  }
}

function parseQuestion(value: unknown, index: number): Question {
  if (!value || typeof value !== "object") {
    throw new Error(`question ${index} is not an object`)
  }
  const raw = value as Record<string, unknown>
  const id = requireString(raw.id, `question ${index} id`)
  const section = requireString(raw.section, `${id} section`)
  if (!isSectionId(section)) {
    throw new Error(`${id} has unknown section ${section}`)
  }
  if (raw.kind !== "trivia" && raw.kind !== "scenario") {
    throw new Error(`${id} has unknown kind`)
  }
  if (!Array.isArray(raw.choices) || raw.choices.length !== 4) {
    throw new Error(`${id} must have four choices`)
  }
  const choices: [Choice, Choice, Choice, Choice] = [
    parseChoice(raw.choices[0], id, 0),
    parseChoice(raw.choices[1], id, 1),
    parseChoice(raw.choices[2], id, 2),
    parseChoice(raw.choices[3], id, 3),
  ]
  const correctId = requireString(raw.correctId, `${id} correctId`)
  if (!choices.some((choice) => choice.id === correctId)) {
    throw new Error(`${id} correctId is not one of its choices`)
  }
  return {
    id,
    section,
    kind: raw.kind,
    prompt: requireString(raw.prompt, `${id} prompt`),
    choices,
    correctId,
    explain: requireString(raw.explain, `${id} explain`),
    source: requireString(raw.source, `${id} source`),
  }
}

export function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    throw new Error("question bank must be an array")
  }
  const questions = raw.map((item, index) => parseQuestion(item, index))
  const ids = new Set<string>()
  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new Error(`duplicate question id ${question.id}`)
    }
    ids.add(question.id)
  }
  return questions
}

export const QUESTIONS: Question[] = parseQuestions(bank)

export const QUESTION_COUNT = QUESTIONS.length

export function sectionLabel(id: SectionId): string {
  return SECTION_LABEL[id]
}

export function questionsFor(section: SectionChoice): Question[] {
  if (section === "all") return QUESTIONS
  return QUESTIONS.filter((question) => question.section === section)
}

export function choiceLabel(section: SectionChoice): string {
  if (section === "all") return "All"
  return SECTION_LABEL[section]
}
