# DMV tolls scraper

## History trips (Sep 2026)

Each corridor snapshot stores `summary.trips`, one record per valid entry-to-exit pair. The record shape, the meaning of "all combinations", the full-span rule, and the cost notes live in [va-express-tolls/PLAN.md](../va-express-tolls/PLAN.md).

Cadence stays `*/30 * * * *`.

- 495, 395, and 95 reuse the price feed. One extra GET loads `entry_exit.js`. Trip price is the sum of the link's `od_*` rows. Measured 685 links, no per-trip call.
- I-66 Outside reuses the one planner POST. All 172 vendored pairs are sums of class-1 gantry rates.
- I-66 Inside calls `TollCalcPartial` for each of the 96 reachable pairs, six at a time. That is the only place a full matrix costs a live call per pair.

The min, avg, and max rollup is not written anymore.

## Goal

Run a Railway cron job every 30 minutes that scrapes the five Northern Virginia Express Lanes operators used by [va-express-tolls](../va-express-tolls/) and stores timestamped snapshots in Postgres.

## MVP scope

- Scrape all five corridors (495, 395, 95, I-66 Inside, I-66 Outside) in one run.
- Persist one row per corridor per run in Postgres (`corridor_snapshots`), grouped under `scrape_runs`.
- Exit cleanly after each run (Railway cron requirement).
- Self-contained Bun app under `apps/dmv-tolls-scraper/`.

## Out of scope

- HTTP API to query history (read Postgres directly or add later).
- A second scheduler. I-66 Inside prices every reachable pair on the same 30-minute run (96 calls, measured well under a minute).
- Redis, queues, or multi-replica coordination.
- Modifying `va-express-tolls` (scraper vendors minimal fetch logic).

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Runtime | Bun | Monorepo default |
| DB | Railway Postgres | Managed, lightweight, JSONB for raw payloads |
| Scheduler | Railway cron (`*/30 * * * *`) | Native, no always-on worker |
| Deploy | Dockerfile in app folder | Same pattern as va-express-tolls |

## Data shape

- **Transurban (495/395/95):** one feed fetch, split into three corridor payloads (filtered O/D rows + `direction_95`).
- **66 Inside:** two spanning benchmark trips (EB + WB), current toll from VDOT Razor handlers.
- **66 Outside:** one planner POST returns the full gantry rate log (~350 KB); store raw + summary stats.

## Tasks

1. Bulk scrapers + Postgres schema
2. Dockerfile + Railway README (Postgres plugin, cron schedule, `DATABASE_URL` reference)
3. Local dry-run verification against live operators

## Deferred

- Historical vai66 full-matrix scraping
- Retention policy / partition pruning
- Wire scraped history into dmvtolls.com charts
