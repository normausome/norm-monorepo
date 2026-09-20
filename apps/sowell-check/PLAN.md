# Sowell Check — MVP plan

## Goal

Client-only Thomas Sowell themed quiz (14 MC questions) with title, feedback, score screen, optional `#seed=` shuffle.

## MVP

- Vite + React + TS + Tailwind (match monorepo demo apps)
- Pure `questions.ts`, thin engine with discriminated union phases
- `bun test` for scoring and answer checks
- README, PR with screenshot + video

## Out of scope

Backend, auth, leaderboard, AI.

## Tasks

1. Scaffold app + bunfig
2. Question bank (Morgan JSON, 14 items)
3. Engine + seed shuffle
4. UI screens
5. Tests + build + walkthrough
