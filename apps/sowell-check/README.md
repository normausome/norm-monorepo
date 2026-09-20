# Sowell Check

Client-only Thomas Sowell themed quiz. Fourteen multiple-choice questions with explanations and source lines.

## Question bank

The full Morgan-verified bank lives in `src/data/questions.json`, re-exported from `src/data/questions.ts`.

## Run locally

From this directory:

```bash
bun install
bun run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Optional shareable shuffle:

```text
http://localhost:5173/#seed=my-run-id
```

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Vite dev server |
| `bun run build` | Typecheck + production build |
| `bun test` | Quiz engine tests (score + answer checks) |
| `bun run preview` | Preview production build |

## Stack

Bun, Vite, React, TypeScript, Tailwind CSS v4. No backend or auth.

## Architecture

- `src/data/questions.json` — Morgan question bank (source of truth)
- `src/data/questions.ts` — typed exports
- `src/quiz/engine.ts` — phase state machine (`title` → `question` → `feedback` → `end`)
- `src/quiz/seed.ts` — `#seed=` hash parsing and seeded shuffle
