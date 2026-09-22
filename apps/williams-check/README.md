# Williams Check

Client-only Walter E. Williams quiz. Fourteen multiple-choice questions, mixed trivia and scenarios, with an explanation and a source line after each answer.

## Question bank

The bank lives in `src/data/questions.json` and is re-exported from `src/data/questions.ts`.

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

- `src/data/questions.json` holds the question bank.
- `src/data/questions.ts` exports the typed bank.
- `src/quiz/engine.ts` is the phase state machine (`title`, then `question`, then `feedback`, then `end`).
- `src/quiz/seed.ts` parses `#seed=` and shuffles with that seed.
