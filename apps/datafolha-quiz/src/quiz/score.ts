import type { Axis, Item } from "@/quiz/items"

export type QuizScore = {
  behavior: number
  economy: number
  overall: number
}

export function scoreQuiz(
  items: readonly Item[],
  picks: Readonly<Record<string, string>>,
): QuizScore | null {
  const axes: readonly Axis[] = ["behavior", "economy"]
  const scores = { behavior: 0, economy: 0 }

  for (const axis of axes) {
    const group = items.filter((entry) => entry.axis === axis)
    if (group.length === 0) return null
    let right = 0
    for (const entry of group) {
      const pick = picks[entry.id]
      if (!pick) return null
      const statement = entry.statements.find((choice) => choice.id === pick)
      if (!statement) return null
      if (statement.pole === "right") right += 1
    }
    scores[axis] = (right * 100) / group.length
  }

  return {
    behavior: scores.behavior,
    economy: scores.economy,
    overall: (scores.behavior + scores.economy) / 2,
  }
}
