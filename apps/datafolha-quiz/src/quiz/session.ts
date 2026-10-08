import type { Item, Statement } from "@/quiz/items"

export type Run = {
  order: readonly string[]
  swap: Readonly<Record<string, boolean>>
  picks: Readonly<Record<string, string>>
  index: number
}

export type QuizState =
  | { screen: "intro" }
  | (Run & { screen: "question" | "results" })

export const initialQuizState: QuizState = { screen: "intro" }

export type QuizAction =
  | {
      type: "START" | "RETAKE"
      order: readonly string[]
      swap: Readonly<Record<string, boolean>>
    }
  | { type: "PICK"; itemId: string; statementId: string }
  | { type: "JUMP"; index: number }
  | { type: "BACK" }
  | { type: "NEXT" }
  | { type: "RESULTS" }
  | { type: "EDIT" }

export function shuffleItems(items: readonly Item[], rng: () => number): Item[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const current = next[i]
    next[i] = next[j]!
    next[j] = current!
  }
  return next
}

export function displaySwap(
  items: readonly Item[],
  rng: () => number,
): Record<string, boolean> {
  const swap: Record<string, boolean> = {}
  for (const item of items) swap[item.id] = rng() < 0.5
  return swap
}

export function statementsInOrder(
  item: Item,
  swap: boolean,
): readonly [Statement, Statement] {
  return swap ? [item.statements[1], item.statements[0]] : item.statements
}

export function allAnswered(run: Run): boolean {
  return run.order.length > 0 && run.order.every((id) => run.picks[id] !== undefined)
}

function begin(
  order: readonly string[],
  swap: Readonly<Record<string, boolean>>,
): QuizState {
  if (order.length === 0) return { screen: "intro" }
  return { screen: "question", order, swap, picks: {}, index: 0 }
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START":
    case "RETAKE":
      return begin(action.order, action.swap)
    case "PICK": {
      if (state.screen !== "question") return state
      if (!state.order.includes(action.itemId)) return state
      return {
        ...state,
        picks: { ...state.picks, [action.itemId]: action.statementId },
      }
    }
    case "JUMP": {
      if (state.screen === "intro") return state
      if (action.index < 0 || action.index >= state.order.length) return state
      return { ...state, screen: "question", index: action.index }
    }
    case "BACK": {
      if (state.screen === "results") {
        return { ...state, screen: "question", index: state.order.length - 1 }
      }
      if (state.screen !== "question" || state.index === 0) return state
      return { ...state, index: state.index - 1 }
    }
    case "NEXT": {
      if (state.screen !== "question") return state
      const current = state.order[state.index]
      if (!current || state.picks[current] === undefined) return state
      if (state.index < state.order.length - 1) {
        return { ...state, index: state.index + 1 }
      }
      if (!allAnswered(state)) return state
      return { ...state, screen: "results" }
    }
    case "RESULTS": {
      if (state.screen === "intro" || !allAnswered(state)) return state
      return { ...state, screen: "results" }
    }
    case "EDIT": {
      if (state.screen !== "results") return state
      return { ...state, screen: "question" }
    }
    default:
      return state
  }
}
