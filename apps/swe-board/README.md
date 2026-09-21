# SWE Board

Read-only board of software engineering jobs scraped from public Greenhouse, Ashby, and Lever boards into Postgres. Filter by work mode, seniority, LatAm eligibility, company, pay, and status. Each row links to the posting.

## Run locally

You need Bun and a Postgres database.

```bash
cd apps/swe-board
bun install
cp .env.example .env            # set DATABASE_URL
bun run migrate                 # creates jobs and scrape_runs
bun run scrape                  # scrapes every board once (under 30 s)
bun run dev                     # API on :8790, Vite on :5173
```

Open the URL Vite prints. The API and the scraper both run `migrate` on start, so `bun run migrate` is optional.

To scrape a subset, pass `--boards`:

```bash
bun run scrape --boards greenhouse:affirm,ashby:ramp,lever:spotify
```

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | API server with reload plus Vite |
| `bun run build` | Typecheck and build `dist/` |
| `bun run start` | Serve `dist/` and the API from one Bun process |
| `bun run scrape` | Scrape every board once and reconcile |
| `bun run migrate` | Apply `db/migrations/*.sql` |
| `bun run backfill:seniority` | Reclassify `jobs.seniority` from every title with the current rules |
| `bun test` | Store contract, run loop, classifiers, adapters, query parser, backfill |

`bun test` runs the store contract against `MemoryStore`. Set `TEST_DATABASE_URL` to also run it and the backfill test against Postgres. The suite truncates `jobs` and `scrape_runs` in that database.

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | yes | | Postgres connection string |
| `PORT` | no | `8790` | API port. Railway sets it. |
| `HOST` | no | `0.0.0.0` | Bind address |
| `MAX_MISSED_RUNS` | no | `3` | Consecutive misses before a job goes inactive |

## Layout

- `db/migrations/001_init.sql` is the schema, `002_seniority.sql` adds the `seniority` column. `db/migrate.ts` applies migrations under an advisory lock. `db/backfill-seniority.ts` is `bun run backfill:seniority`.
- `db/store.ts` has the `ScrapeStore` contract, `PgStore`, and `MemoryStore`. `db/read.ts` has the API queries.
- `scraper/boards.ts` is the board list. `scraper/ats/` has one adapter per ATS. `scraper/classify.ts` has the title, seniority, pay, work mode, and geo rules. `scraper/run.ts` runs one scrape. `scraper/cli.ts` is `bun run scrape`.
- `server/index.ts` is the HTTP server.
- `shared/` has the types and the query parser that the server and the web both import.
- `src/` is the Vite React UI.

## Schema

`jobs`

| Column | Type | Notes |
|--------|------|-------|
| `job_id` | text, primary key | `{ats}:{board_slug}:{native_id}`. Dedupe key for the life of the posting. |
| `title`, `company`, `url` | text | |
| `location` | text, nullable | Primary location as the board lists it |
| `work_mode` | text | `remote`, `hybrid`, `onsite`, `unknown` |
| `seniority` | text | `entry`, `associate`, `mid`, `senior`, `staff`, `principal`, `manager`, `unknown`. Read from the title at upsert. |
| `salary_min`, `salary_max` | integer, nullable | Annual, in `salary_currency` |
| `salary_currency` | text, nullable | ISO code, `USD` when the posting used a bare `$` |
| `latam_eligibility` | text | `latam_mx_br`, `us_only`, `unknown` |
| `remote_notes` | text, nullable | SWE Radar tier and the quoted evidence, e.g. `Tier C: "Remote US"` |
| `source` | text | `{ats}:{board_slug}`, e.g. `greenhouse:affirm` |
| `first_seen_at` | timestamptz | Set once on insert |
| `last_seen_at` | timestamptz | Set on every successful re-see |
| `missed_runs` | integer | Consecutive successful board scrapes that did not list the job |
| `is_active` | boolean | `false` once `missed_runs` reaches `MAX_MISSED_RUNS` |
| `raw_json` | jsonb | The posting as the ATS returned it |

Indexes: `(is_active, last_seen_at desc)`, `(source)`, and partial indexes on active rows for `work_mode`, `seniority`, `latam_eligibility`, `lower(company)`, and `salary_max`.

`scrape_runs` records one row per `bun run scrape`: `started_at`, `finished_at`, `boards_ok`, `boards_failed`, `jobs_seen`, `jobs_matched`, and a `boards` JSON array with the per-board outcome. The UI shows `max(finished_at)` where `boards_ok > 0` as the last scrape time.

## job_id format

`{ats}:{board_slug}:{native_id}`, matching SWE Radar.

| ATS | Example |
|-----|---------|
| Greenhouse | `gh:affirm:7764109003` |
| Ashby | `ashby:ramp:34413f8d-26bf-4bbc-8ade-eb309a0e2245` |
| Lever | `lever:spotify:2193db3f-77c5-43b8-b030-8f92c9882bf1` |

## Boards

Public JSON endpoints, no keys. Edit `scraper/boards.ts` to change the list.

Greenhouse, `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`:
affirm, airbnb, gitlab, anthropic, elastic, okta, stripe, reddit, coinbase, scaleai, mongodb, robinhood, cloudflare, samsara, datadog, brex, pinterest, twilio, block, discord, figma, chime, dropbox, andurilindustries, databricks, praxent, sezzle, nortal, able, engine, caylent, orium, lumimeds, remotecom, remote, duolingo, doordashusa, lyft, instacart.

Ashby, `https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`:
openai, ramp, notion, reacher, linear, cursor, buffer, ashby.

Lever, `https://api.lever.co/v0/postings/{slug}?mode=json`:
tryjeeves, jobgether, spotify.

## Filters

A posting is written when all of these hold.

- The title matches a software engineering pattern (software engineer or developer, backend, frontend, full-stack, staff or principal engineer, ML engineer, SRE, AppSec or security engineer, director of engineering, forward deployed engineer, member of technical staff) and none of the exclusions (contract, intern, sales or solutions engineer, hardware, data or analytics, manager, and similar).
- The ATS employment type is not contract, temporary, intern, or part-time.
- Listed USD pay has a top end of at least $100,000. Unlisted pay is kept with null salary columns. Non-USD pay is kept and not converted.

Work mode comes from the ATS field when Ashby or Lever provide one. Otherwise the title and locations are checked for hybrid, remote, and on-site words, then the description.

### Seniority

`classifySeniority(title)` in `scraper/classify.ts` reads the ladder rung from the title alone. Rules are checked in this order and the first hit wins.

| Bucket | Title words (case-insensitive, whole words) |
|--------|---------------------------------------------|
| `manager` | manager, mgr, director, head of, vp, vice president |
| `principal` | principal, distinguished, fellow |
| `staff` | staff, except in "technical staff" or "of staff" |
| `senior` | senior, sr, snr, lead |
| `associate` | associate |
| `entry` | entry level, junior, jr, new grad, graduate, intern, internship, co-op, apprentice, early career |
| `mid` | no rung word, but engineer, engineering, developer, programmer, sde, swe, or sre |
| `unknown` | nothing above matched |

The order is highest rung first, so the highest rung named in a title decides. A stacked modifier names a sub-grade inside the higher rung rather than a rung of its own, and a title with a management word is a management role whatever IC word precedes it.

| Title | Bucket | Why |
|-------|--------|-----|
| Senior Staff Engineer | `staff` | staff outranks senior |
| Staff Software Engineer | `staff` | |
| Principal Staff Engineer | `principal` | principal outranks staff |
| Senior Principal Software Engineer | `principal` | |
| Distinguished Engineer, Fellow | `principal` | top IC rungs, folded into principal |
| Engineering Manager, Senior Engineering Manager | `manager` | manager outranks every IC word |
| Director of Engineering, Head of Engineering, VP Engineering | `manager` | |
| Junior Software Engineer, Software Engineer Intern, Co-op | `entry` | |
| Sr. Software Engineer, Sr Backend Engineer | `senior` | abbreviations count |
| Lead Software Engineer, Tech Lead | `senior` | a lead is a senior IC with coordination duties, not a rung above staff |
| Software Engineer, Software Engineer II, Software Engineer III, SDE 2 | `mid` | numerals do not move the rung, ladders differ per company |
| Senior Software Engineer II | `senior` | the word wins over the numeral |
| Member of Technical Staff, Senior Member of Technical Staff | `unknown`, `senior` | "technical staff" is not staff level |
| Chief of Staff | `unknown` | "of staff" is not staff level |

In practice the SWE title filter above drops interns, new grads, managers, heads, and VPs before they reach the store, so `entry` mostly holds junior titles and `manager` mostly holds directors. The classifier still handles them so a filter change never leaves rows misclassified.

The column is written at upsert from the same function. After changing the rules, reclassify existing rows:

```bash
bun run backfill:seniority       # scanned 1234 jobs, updated 56
```

It runs `migrate`, reads `jobs` in batches of 500, and writes only rows whose value changes, so it is safe to rerun and a second run reports `updated 0`.

The API and the URL take `seniority=senior,staff` or `seniority=senior&seniority=staff`. Unknown values are dropped, so `seniority=vp` is the same as no filter.

Geo tiers, stored in `remote_notes` and mapped to `latam_eligibility`:

| Tier | Meaning | `latam_eligibility` |
|------|---------|---------------------|
| A | Posting says it hires from anywhere, the Americas, or names the US together with Mexico, Brazil, or LatAm | `latam_mx_br` |
| B | Location is a LatAm country or city (local hire) | `latam_mx_br` |
| C | Location says Remote US or US only, the text says must live in the US or W-2, or the role is on-site or hybrid in a US location | `us_only` |
| D | No geo statement | `unknown` |

Tier B is not US-abroad friendly. The UI shows the tier and quote when you hover the LatAm badge.

## Reconciliation

One `bun run scrape` fetches every board. For each board that fetched and parsed:

1. Upsert every matching posting by `job_id`. Insert sets `first_seen_at`. Insert and update both set `last_seen_at`, `missed_runs = 0`, `is_active = true`.
2. For every other row with the same `source`, `missed_runs += 1` and `is_active = missed_runs < MAX_MISSED_RUNS`.

A board that fails to fetch is reported in `scrape_runs.boards` and skipped, so its jobs do not accrue misses. Duplicate ids inside one response are written once.

## Railway

Not deployed. Two services from one Dockerfile, both with Root Directory `apps/swe-board`.

| Service | Start command | Notes |
|---------|---------------|-------|
| `swe-board-web` | `bun server/index.ts` (image default) | Set `DATABASE_URL` from the Postgres service. Railway injects `PORT`. Health check `/api/health`. |
| `swe-board-scraper` | `bun scraper/cli.ts` | Cron schedule `0 */6 * * *`. Set `DATABASE_URL`. Exits 0 when at least one board succeeded. |

Without the Dockerfile, Nixpacks detects Bun from `bun.lock`. Set the build command to `bun install --frozen-lockfile && bun run build` and the start commands above.
