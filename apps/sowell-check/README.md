# Sowell Check

Client-only Thomas Sowell quiz. Each question is multiple choice, with an explanation and a source line after you answer. The score is correct answers out of the questions in that run.

## Sections

The title screen is a section picker. Choose one bucket, or **All**.

| Section | What it covers |
| --- | --- |
| Personal Life | Birth, Harlem, the Marines, degrees, Hoover |
| Economics | Prices, rent control, wages, stage-one thinking, Say's Law |
| Race & Culture | Disparities, culture, group preferences, middleman minorities |
| Education | Dunbar, schooling books, late talking, Cornell, charters |
| Policy & Government | Incentives, controls, knowledge and decisions, wage floors |
| Books & Ideas | Conflict of visions, trade-offs, intellectuals, Basic Economics |
| Sowell (1993): Economic vs Political Decision-Making | Oct 14, 1993 Jacksonville talk, with a YouTube link on the picker |

**All** shuffles the full bank when you set a seed, and the score screen breaks the result down by section. A single section scores only that section. **Play again** repeats the same section. **Choose section** returns to the picker.

The original fourteen questions are still in the bank. Newer items use the same shape and carry a `section` field.

## Run locally

From this directory:

```bash
bun install
bun run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Optional shareable shuffle of whatever set you start:

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

- `src/data/questions.json` is the question bank. Each item has a section.
- `src/data/questions.ts` parses that bank and exports the section labels.
- `src/quiz/engine.ts` runs the phases title, question, feedback, and end, and scores by section.
- `src/quiz/seed.ts` reads `#seed=` from the URL hash and shuffles the chosen set.

## Sources

Questions paraphrase public records. They do not invent quotations. Pages checked for the added items include the Hoover Institution profile and fellow profile, the Library of Congress name authority, the National Endowment for the Humanities medal biography, Sowell's essay "The Education of Minority Children," the January 1999 Imprimis lecture on minority schools, the New York Times report of the Cornell resignation on June 2, 1969, his essay "The Day Cornell Died," the opening of Applied Economics on stage-one thinking, and the publisher descriptions of Knowledge and Decisions, Education: Assumptions versus History, and Charter Schools and Their Enemies. Book dates follow those pages. When a claim is Sowell's interpretation, the explanation says so.
