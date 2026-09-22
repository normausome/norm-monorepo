# Williams Check

## Goal

A client-only Walter E. Williams quiz in the same family as Sowell Check.

## How Sowell Check works

`apps/sowell-check` is a Vite + React app with no backend. `questions.json` is the bank. `questions.ts` types it. `QuizPhase` is a discriminated union (`title`, `question`, `feedback`, `end`). `quizReducer` is the only state change. Score is one point per choice whose id matches `correctId`. The mix of formats is the `kind` field, `trivia` or `scenario`, under that one scoring rule. `#seed=` shuffles order. The app is not a workspace member. It runs with `bun install && bun run dev` from its own folder.

## Design

Two shapes.

**Clone the sibling.** Keep `Question`, `QuizPhase`, the reducer, the seed, and one-point scoring. Replace the bank, the takeaway strings, and the chrome. Shift the theme hue so the layout matches and the quiz is visibly a different one.

**Add a second interaction.** True/false or a ranking item, with its own scoring rule.

Clone wins. A second control would be a new stack. The ask is to copy Sowell Check. Mixed format stays trivia plus scenario. Williams-specific content lives in the bank.

## MVP

- `apps/williams-check`, package name `williams-check`
- 14 questions, 7 trivia and 7 scenario
- Themes in the bank: markets, unintended consequences, race and economics, price controls, licensing, minimum wages
- Same scripts as Sowell Check
- No backend, no deploy

## Attribution rule

Paraphrase published arguments. Do not invent quotations. If a detail comes from a review of a book, the source line names both the book and the review.
