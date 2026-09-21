# SWE Board

Read-only board of software engineering jobs scraped from public Greenhouse, Ashby, and Lever boards into Postgres. Filter by work mode, level, LatAm eligibility, company, pay, and status. Each row links to the posting.

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
| `bun run backfill:seniority` | Recompute `seniority` for every stored job. See [Backfill seniority](#backfill-seniority). |
| `bun run migrate` | Apply `db/migrations/*.sql` |
| `bun test` | Store contract, run loop, classifiers, adapters, query parser |

`bun test` runs the store contract against `MemoryStore`. Set `TEST_DATABASE_URL` to also run it, the read queries, and the backfill against Postgres. The suite truncates `jobs` and `scrape_runs` in that database.

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | yes | | Postgres connection string |
| `PORT` | no | `8790` | API port. Railway sets it. |
| `HOST` | no | `0.0.0.0` | Bind address |
| `MAX_MISSED_RUNS` | no | `3` | Consecutive misses before a job goes inactive |

## Layout

- `db/migrations/` is the schema, one file per change. `db/migrate.ts` applies the ones not yet recorded under an advisory lock.
- `db/store.ts` has the `ScrapeStore` contract, `PgStore`, and `MemoryStore`. `db/read.ts` has the API queries.
- `scraper/boards.ts` is the board list. `scraper/ats/` has one adapter per ATS. `scraper/classify.ts` has the title, pay, work mode, and geo rules. `scraper/seniority.ts` has the level rules. `scraper/run.ts` runs one scrape. `scraper/cli.ts` is `bun run scrape`. `scraper/backfill-seniority.ts` is `bun run backfill:seniority`.
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
| `salary_min`, `salary_max` | integer, nullable | Annual, in `salary_currency` |
| `salary_currency` | text, nullable | ISO code, `USD` when the posting used a bare `$` |
| `latam_eligibility` | text | `latam_mx_br`, `us_only`, `unknown` |
| `remote_notes` | text, nullable | SWE Radar tier and the quoted evidence, e.g. `Tier C: "Remote US"` |
| `seniority` | text | `entry`, `associate`, `mid`, `senior`, `staff`, `principal`, `manager`, `unknown`. Read from the title, see [Seniority](#seniority). |
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

Geo tiers, stored in `remote_notes` and mapped to `latam_eligibility`:

| Tier | Meaning | `latam_eligibility` |
|------|---------|---------------------|
| A | Posting says it hires from anywhere, the Americas, or names the US together with Mexico, Brazil, or LatAm | `latam_mx_br` |
| B | Location is a LatAm country or city (local hire) | `latam_mx_br` |
| C | Location says Remote US or US only, the text says must live in the US or W-2, or the role is on-site or hybrid in a US location | `us_only` |
| D | No geo statement | `unknown` |

Tier B is not US-abroad friendly. The UI shows the tier and quote when you hover the LatAm badge.

Geo classification runs at scrape time. Marketing copy such as “work together in real time from anywhere in the world” is ignored; explicit US hub or US-remote hiring language wins over that fluff. After changing geo rules, run `bun run scrape` to refresh `latam_eligibility` and `remote_notes` on existing rows (upsert overwrites those fields each run).

## Seniority

`inferSeniority` in `scraper/seniority.ts` reads the level from the title alone. It walks an ordered rule table and the first match wins, so the order below is the precedence.

| Order | Words (case-insensitive, whole words) | Bucket |
|-------|----------------------------------------|--------|
| 1 | manager, mgr, director, head, supervisor, vp, rvp, svp, evp, avp, vice president, president, chief | `manager` |
| 2 | principal, distinguished, fellow | `principal` |
| 3 | staff, especialista | `staff` |
| 4 | senior, sênior, sr, lead | `senior` |
| 5 | associate | `associate` |
| 6 | junior, júnior, jr, entry-level, new grad, graduate, intern, internship, apprentice, early career, trainee, estagiário, stagiaire, pasante, becario | `entry` |
| 7 | mid-level, intermediate, pleno | `mid` |
| 8 | a role word then `I` or `1` | `entry` |
| 9 | a role word then `II`, `III`, `2`, or `3` | `mid` |
| 10 | a role word then `IV`, `V`, `VI`, `4`, `5`, or `6` | `senior` |
| 11 | no rule matched, title has a role word | `mid` |
| 12 | no rule matched, no role word | `unknown` |

A role word is engineer, eng, developer, programmer, SDE, SWE, MTS, or the Portuguese, Spanish, and French forms desenvolvedor, desarrollador, développeur, engenheiro, ingeniero, and programador, with their feminine endings. Rules 8 to 10 need the level right after the role word, with an optional comma, dash, or parentheses, so "Software Engineer in Test" and "Software Engineer, Series I" do not read as levels.

Consequences of the order:

- Management beats every IC level. "Senior Engineering Manager", "Staff Engineering Manager", and "Director of Engineering" are `manager`.
- The higher IC word beats the lower one. "Senior Staff Engineer" is `staff`. "Senior Principal Engineer" is `principal`. A range such as "Senior / Staff Engineer" takes the higher end.
- A level word beats a numeral. "Senior Software Engineer II" is `senior`.
- "Lead" is `senior`, so "Lead Software Engineer" and "Tech Lead" are `senior`.
- "Distinguished" and "Fellow" are `principal`. The title filter drops fellowships before this step, so `fellow` here means the senior IC title.
- "Especialista" is `staff`. On the Brazilian ladder it sits above Sênior.
- "Chief" is `manager`. The abbreviations CTO, CEO, and COO are not read, because they name teams as often as roles. "Forward Deployed Engineer [Office of the CTO]" is `mid`.
- "Member of Technical Staff" is a level-less IC title. It is read as `MTS` before the rules run, so it is `mid`, and "Senior Member of Technical Staff" is `senior`.
- "Founding Engineer" and "Software Engineer" are `mid`. No level word means mid, not unknown, when the title names an engineering role.
- `L3`, `L5`, and other company grades are not read. They mean different levels at different companies. The Portuguese abbreviation `PL` for pleno is not read either.

On a full scrape of the 50 boards on 2026-09-21, 2,793 of 2,794 titles got a bucket and one stayed `unknown`. `bun run backfill:seniority` prints the current counts.

`scraper/seniority.test.ts` lists the sample titles per bucket.

`classify()` sets `seniority` when a posting is scraped, and the upsert overwrites it on every re-see. A rule change reaches active jobs on the next `bun run scrape`. Inactive jobs keep their old bucket until you run the backfill.

### Backfill seniority

Rows that predate migration `002_seniority.sql` have `seniority = 'unknown'`. To classify them, or to apply a rule change to every row, run the backfill against the same `DATABASE_URL` the server uses:

```bash
cd apps/swe-board
bun run migrate               # optional, the backfill migrates first
bun run backfill:seniority
```

It prints the rows scanned, the rows rewritten, and a count per bucket. It reads every row, active or not, and writes only the rows whose bucket changed. Running it twice rewrites nothing the second time.

On Railway, run it once from the scraper service's shell with the service's variables: `railway run bun run backfill:seniority`.

## API

`GET /api/jobs` takes the same query string the UI writes. Multi-value filters accept a comma list, repeated keys, or both. Unknown values are dropped. A list with no known value applies no filter.

```
/api/jobs?seniority=senior,staff
/api/jobs?seniority=senior&seniority=staff
/api/jobs?seniority=principal&work_mode=remote&latam=latam_mx_br
/api/jobs?seniority=mid,senior&salary_min=200000&sort=salary
```

Every row carries `seniority`.

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
