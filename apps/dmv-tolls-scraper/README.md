# DMV tolls scraper

Railway cron job that scrapes the five Northern Virginia Express Lanes operators every 30 minutes and stores snapshots in Postgres. Built as a companion to [va-express-tolls](../va-express-tolls/) (dmvtolls.com).

| Corridor | Operator | What we store |
| --- | --- | --- |
| 495 Express Lanes | Transurban | Filtered rows from `infra-price-confirmed-all` |
| 395 Express Lanes | Transurban | Same feed, 395/95 road tags |
| 95 Express Lanes | Transurban | Same feed + `direction_95` reversible flag |
| I-66 Inside the Beltway | VDOT | Two spanning benchmark trips (EB + WB) |
| I-66 Outside the Beltway | 66 Express | Full gantry rate log from the planner API |

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
- `corridor_snapshots` — one row per corridor per run (`payload` JSONB is the raw scrape, `summary` JSONB has quick stats)

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
