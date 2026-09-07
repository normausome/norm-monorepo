import {
  FALLBACK_PLAYBOOK_ID,
  PLAYBOOKS,
  type Playbook,
} from "@/data/playbooks"

export type RouteResult = {
  playbook: Playbook
  score: number
  matchedKeywords: string[]
  confidence: "high" | "medium" | "low"
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "in",
  "on",
  "at",
  "is",
  "it",
  "this",
  "that",
  "with",
  "for",
  "of",
  "i",
  "me",
  "my",
  "we",
  "you",
  "be",
  "by",
  "as",
  "so",
  "if",
  "when",
  "even",
  "then",
  "first",
  "want",
  "has",
  "have",
  "do",
  "does",
  "can",
  "will",
  "just",
  "really",
  "tell",
  "going",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

function scorePlaybook(playbook: Playbook, tokens: string[]): RouteResult {
  const matchedKeywords: string[] = []
  let score = 0

  for (const keyword of playbook.keywords) {
    const normalized = keyword.toLowerCase()
    const hit =
      tokens.some((token) => token.includes(normalized) || normalized.includes(token)) ||
      tokens.join(" ").includes(normalized)

    if (hit) {
      matchedKeywords.push(keyword)
      score += normalized.includes(" ") ? 3 : 2
    }
  }

  return { playbook, score, matchedKeywords, confidence: "low" }
}

function confidenceFromScore(score: number): RouteResult["confidence"] {
  if (score >= 6) return "high"
  if (score >= 3) return "medium"
  return "low"
}

export function routeGoal(goal: string): RouteResult {
  const trimmed = goal.trim()
  if (!trimmed) {
    const fallback = PLAYBOOKS.find((p) => p.id === FALLBACK_PLAYBOOK_ID)!
    return {
      playbook: fallback,
      score: 0,
      matchedKeywords: [],
      confidence: "low",
    }
  }

  const tokens = tokenize(trimmed)
  const results = PLAYBOOKS.filter((p) => p.id !== FALLBACK_PLAYBOOK_ID).map(
    (playbook) => scorePlaybook(playbook, tokens),
  )

  results.sort((a, b) => b.score - a.score)
  const best = results[0]

  if (!best || best.score === 0) {
    const fallback = PLAYBOOKS.find((p) => p.id === FALLBACK_PLAYBOOK_ID)!
    return {
      playbook: fallback,
      score: 0,
      matchedKeywords: [],
      confidence: "low",
    }
  }

  return {
    ...best,
    confidence: confidenceFromScore(best.score),
  }
}

export function getPlaybookById(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id)
}
