# SWE Board plan

## Goal

Scrape public Greenhouse, Ashby, and Lever boards for software engineering jobs into Postgres and show them in a read-only, filterable table.

## MVP

- One app folder. `scraper/` writes, `server/` reads and serves `dist/`, `src/` is the Vite React UI, `shared/` holds the types both sides import.
- Postgres schema in `db/migrations/001_init.sql`. `jobs` keyed by `job_id`, `scrape_runs` for the last scrape time.
- `bun run scrape` runs every board once and reconciles. A job missed on N consecutive successful scrapes of its board goes inactive (`MAX_MISSED_RUNS`, default 3).
- `bun run dev` starts the API and Vite. `bun run start` serves the built UI and the API from one Bun process.
- `bun test` covers the store contract (upsert, dedupe, deactivation), the classifiers, and the query parser.

## Out of scope

Auth, applying, notifications, salary currency conversion, Railway deploy.

## Design decision

Two shapes were on the table for the write path.

| Shape | Pros | Cons |
|-------|------|------|
| Pure `reconcile(existing, scraped)` that returns row diffs, thin store writes them | Pure function is trivial to unit test | Duplicates in JS what one `INSERT ... ON CONFLICT` plus one `UPDATE ... WHERE job_id <> ALL(...)` do atomically. Two sources of truth for the dedupe rule. |
| `ScrapeStore` interface with `PgStore` and `MemoryStore`, one contract test suite run against both | The rule lives in SQL where it runs in production. One test file proves both stores. | The memory store restates the rule in JS, but a shared test pins the two together. |

The second shape shipped. The Postgres half of the contract test runs when `TEST_DATABASE_URL` is set and skips otherwise, so `bun test` stays green on a machine without Postgres.

Classifiers (title, salary, work mode, geo tier) are pure functions over a table of rules. Adding a rule is a table row, not a new branch.

## Deferred

- Currency conversion for the $100k rule. Non-USD listed pay is stored and shown but not filtered.
- Full-text search index. `ILIKE` on title and company is enough at a few thousand rows.
- Per-board scrape concurrency tuning.
