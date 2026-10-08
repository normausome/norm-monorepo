# Two-axis alignment

A browser quiz in the Datafolha forced-choice style. You pick one statement from each pair. The page scores behavior and economy, then the mean of those two axes. It stores nothing.

## Run locally

From this directory:

```bash
bun install
bun run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Typecheck and production build |
| `bun test` | Score checks |
| `bun run preview` | Preview the production build |

## Scoring

`scoreQuiz` in `src/quiz/score.ts` is the only scorer. Each axis is 0 to 100. The number is the share of answers on the conservative pole or the market pole. Overall is the mean of the two axis scores. Each statement carries its pole in the item table. Position on screen does not score.

## Deploy

This app builds like Sowell Check and Williams Check. Railway Railpack, root directory `apps/datafolha-quiz`, build command `bun install && bun run build`, start command `bunx --bun serve -s dist -l $PORT`. Railway injects `PORT`. No environment variables.
