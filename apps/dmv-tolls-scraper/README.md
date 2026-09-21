# DMV tolls scraper

Railway cron job that scrapes the five Northern Virginia Express Lanes operators every 30 minutes and stores snapshots in Postgres. Built as a companion to [va-express-tolls](../va-express-tolls/) (dmvtolls.com).

| Corridor | Operator | What we store |
| --- | --- | --- |
| 495 Express Lanes | Transurban | Every mapped entry-exit trip. Price is the sum of that link's `od_*` feed rows. |
| 395 Express Lanes | Transurban | Same feed and mapping, entries whose path starts with `395`. |
| 95 Express Lanes | Transurban | Same, plus `direction_95`. A closed reversible direction stores `price: null`. |
| I-66 Inside the Beltway | VDOT | Every reachable entry-exit pair from the Razor handlers, six toll calls at a time. |
| I-66 Outside the Beltway | 66 Express | Every vendored entry-exit pair, summed from the one planner rate log. |

## Quick start (local)

```bash
cd apps/dmv-tolls-scraper
bun install
bun run scrape:dry    # hits live operators, skips Postgres
```

To write to a local Postgres:

```bash
export DATABASE_URL=postgresql://...
bun run scrape
```

## Database

Two tables, created automatically on first run:

- `scrape_runs` — one row per cron execution (`status`: `ok` | `partial` | `failed`)
- `corridor_snapshots` — one row per corridor per run. `payload` JSONB is the raw scrape. `summary.trips` is every valid entry-to-exit price for that run, including `spanning: true` on the full-span pair in each direction.

Example query (latest 495 snapshot):

```sql
SELECT scraped_at, summary, payload
FROM corridor_snapshots
WHERE corridor_id = '495'
ORDER BY scraped_at DESC
LIMIT 1;
```

## Deploy on Railway

You need **two services** in one project:

1. **Postgres** — Add from the Railway template/library. Note the `DATABASE_URL`.
2. **Scraper (cron)** — Deploy from this monorepo.

### Scraper service settings

| Setting | Value |
| --- | --- |
| Root directory | `apps/dmv-tolls-scraper` |
| Builder | Dockerfile (auto-detected) |
| Cron schedule | `*/30 * * * *` (every 30 minutes, UTC) |
| Watch paths | `apps/dmv-tolls-scraper/**` |

### Variables

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | Reference the Postgres service's `DATABASE_URL` |

No other secrets are required. The scraper uses the same public operator endpoints as va-express-tolls.

### Cron behaviour

Railway runs the container start command (`bun src/main.ts`), waits for it to **exit**, then schedules the next run. If a scrape is still running when the next tick fires, the new run is skipped. Keep upstream timeouts at 15 s so a single run finishes well under 30 minutes.

## Scripts

- `bun run scrape` — scrape and persist (needs `DATABASE_URL`)
- `bun run scrape:dry` — scrape only, print summaries
- `bun run lint`

## Fragility

Same upstream risks as [va-express-tolls](../va-express-tolls/README.md#fragility-and-risk). The scraper fails closed per corridor (records `error` on the snapshot row) and marks the run `partial` when some corridors succeed.

Unofficial demo tooling. Not affiliated with VDOT, Transurban, or 66 Express.
