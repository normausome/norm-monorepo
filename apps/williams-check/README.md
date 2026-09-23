# Williams Check

Client-only quiz on Walter E. Williams. Each item is multiple choice, with an explanation and a source line after the answer.

## Sections

The bank is tagged by section. On the title screen, pick one section or **All**.

| Section | What it covers |
| --- | --- |
| Personal Life | Philadelphia childhood, the Army, marriage, George Mason, and his death |
| Economics | Minimum wages, licensing, taxi medallions, and price controls |
| Race & Culture | Family structure, labor-force history, and his definition of discrimination |
| Education | His schooling, Economics for the Citizen, and what a school budget cannot do |
| Policy & Government | The 1977 Joint Economic Committee study, Davis-Bacon, and statutes that change the cost of a preference |
| Books & Ideas | The ten books named in his biographical sketch, and the two PBS documentaries |

**All** plays the whole bank. A section plays only that section. The score is the number correct in the set you started. **Replay** runs that same set again. **Sections** returns to the picker and drops the current run.

The questions are paraphrases of published arguments and biographical facts. The source line names the book, column, or profile. The quiz does not invent quotations.

## Run locally

From this directory:

```bash
bun install
bun run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

Optional shareable shuffle of the set you pick:

```text
http://localhost:5173/#seed=my-run-id
```

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | Typecheck and production build |
| `bun test` | Bank checks and the quiz phase machine |
| `bun run preview` | Preview the production build |

## Stack

Bun, Vite, React, TypeScript, Tailwind CSS v4. No backend.

## Where the quiz lives

`src/data/questions.json` is the bank. Each question has a `section` field. `src/data/questions.ts` parses that file and filters it. `src/quiz/engine.ts` is the phase machine: title, question, feedback, end. `START` takes the section you picked. `src/quiz/seed.ts` reads `#seed=` and shuffles that section.
