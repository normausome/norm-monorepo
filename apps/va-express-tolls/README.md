# VA Express Tolls

Public, mobile-friendly toll estimates for Northern Virginia's Express Lanes. Pick a corridor and a trip, and the site fetches the number the operator's **own** public calculator shows right now — structured, in our UI, clearly labelled as an unofficial estimate. Deep-links to the official calculators remain as the fallback.

| Corridor | Operator | Live estimate on this site | Official calculator |
| --- | --- | --- | --- |
| 495 Express Lanes | Transurban | Yes (current price) | https://expresslanes.com/map-your-trip/ |
| 395 Express Lanes (reversible) | Transurban | Yes (current price, open direction only) | https://expresslanes.com/map-your-trip/ |
| 95 Express — Fredericksburg area ↔ Springfield (reversible) | Transurban | Yes (current price, open direction only) | https://expresslanes.com/map-your-trip/ |
| I-66 Inside the Beltway | VDOT | Yes (current, or a past weekday time) | https://vai66tolls.com/ |
| I-66 Outside the Beltway | I-66 Express Mobility Partners | Yes (current price) | https://ride66express.com/pricing/plan-your-trip/ |

## Quick start

```bash
cd apps/va-express-tolls
bun install
bun run dev
```

Open `http://localhost:5173/`. `bun run dev` starts both the Bun API (port `8787`) and Vite; Vite proxies `/api` to the API.

Other scripts:

- `bun run build` — typecheck (app + server) and build the front end to `dist/`
- `bun run start` — serve `dist/` and the API from one Bun process (production)
- `bun run dev:web` / `bun run dev:api` — run either half alone
- `bun run lint`

No environment variables or secrets are needed locally. See [Deploying the API (Railway)](#deploying-the-api-railway) for the optional production knobs.

## How it works

```
src/                       React front end (Vite, Tailwind v4, shadcn button/card/badge)
  components/TripEstimator.tsx  direction → entry → exit → estimate; result card; two-toll hint
  components/TripMap.tsx   Leaflet map of entries / reachable exits, synced with the selects
  data/corridors.ts        rules, hours, official links, calculator tips
  lib/api-types.ts         API contract shared with the server
  lib/schedule.ts          I-66 Inside peak-window helper
server/                    Bun.serve API
  index.ts                 routes, health check, error mapping, static dist/ in production
  cors.ts                  allow-list CORS for a front end on another origin (dmvtolls.com, Vite dev)
  adapters/vai66.ts        I-66 Inside — VDOT Razor page handlers
  adapters/expresslanes.ts 495, 395 and 95 — Transurban entry/exit mapping + price feed (one factory, three corridors)
  adapters/ride66.ts       66 Outside — planner's theme-ajax call + the page's per-gantry summation
  adapters/ride66-map.ts   66 Outside — vendored start → exit-chain table and marker coordinates (captured from the planner)
  cache.ts                 TTL cache with single-flight
```

API:

```
GET /api/health
GET /api/corridors
GET /api/:corridor/points?direction=nb|sb|eb|wb
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=<ISO, past only, 66 Inside>]
```

`/api/health` is the deploy health check: `200 {"ok":true, …}` with `startedAt`, `uptimeSeconds`, the corridor ids and whether `dist/` is being served. It never calls an operator.

Every estimate carries `source.operator`, `source.fetchedAt`, per-leg prices, and `notes`. When an operator can't be reached or returns something unexpected, the API returns an `error` — it never fabricates a number.

### Estimate caching

Identical estimate requests don't re-run the operator automation. The server keeps an in-process response cache (`server/cache.ts`, single-flight so concurrent identical requests share one upstream call):

- **Key**: corridor + direction + entry + exit + `at` (normalized to UTC; absent means "now").
- **TTL**: **3 minutes** for a priced estimate (prices are dynamic). A `total: null` answer (closed or reversing lanes, missing feed rows) and operator failures (`502`) are kept **30 s** — long enough to absorb a burst of retries, short enough that a recovery shows quickly. `400` bad requests are never cached.
- **Labels**: every estimate response (and any cached error) includes `cache: "hit" | "miss"`, `cachedAt` and `expiresAt` (ISO 8601), plus an `X-Cache: HIT|MISS` header. `expiresAt` is when the server will ask the operator again; the UI shows it as "refreshes HH:MM". `source.fetchedAt` remains the operator fetch time and the "unofficial estimate — the overhead sign is the price you pay" wording is unchanged.
- Beneath that, the adapters still cache their *upstream* payloads (mappings 24h, the Transurban price feed 60 s shared by every 495/395/95 trip, historical I-66 Inside prices 24h), so different trips on one corridor also share operator calls.

Memory only: a single-node MVP has no Redis/KV in the stack, and a restart just means the first request per trip goes upstream again. The [iOS app](../va-express-tolls-ios/) calls the same `/api/:corridor/estimate` endpoint and therefore gets the same cached answers; the new fields are additive, so its decoder needs no change.

Points carry `lat`/`lng` so the UI can draw them: a map under the selects shows the direction's entries, then the exits reachable from your entry, and highlights the chosen pair (tapping a dot selects it). Coordinates come from each operator's own map — vai66tolls and expresslanes ship them with their interchange data; for 66 Outside they were captured once from the planner's markers (a few select-only ramps are placed at the same interchange and commented as approximate). Basemap: OpenStreetMap tiles, fine for a demo; a real deployment must follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) or bring its own tiles.

## How each price is obtained

- **I-66 Inside** — the VDOT page's own Razor handlers (`BeginIntPartial`, `ExitIntPartial`, `TollCalcPartial`); the last one returns `{ decToll }`. Supports "now" and a past date/time.
- **495** — Transurban's static entry/exit → O/D mapping plus its `infra-price-confirmed-all` JSON feed; one leg per O/D (multi-road trips are summed).
- **395** and **95** — the same mapping and feed, filtered to `395North` / `395South` or `95` entries (the 95 set runs from Route 17 near Fredericksburg to Springfield). Exits may continue onto the other road or onto 495 and come back as separate legs, mirroring the operator's "95 and 395 Express Lanes" / "495 Express Lanes" line items. The feed's `direction_95` flag says which way the reversible lanes are open; that's surfaced above the form, and a closed direction — or any leg the feed marks `closed` — returns no total even if the feed still carries a stale figure.
- **66 Outside** — the planner's `theme-ajax.php` `api_call` (start gantry + the exit's tolling-gantry chain + one constant-named form field read from the live bundle). The response is today's rate-change log for every gantry; like the page, we sum the latest posted class-1 rate at each gantry the trip passes. The start → exit-chain table is vendored (`ride66-map.ts`) because the planner builds it inside an obfuscated bundle; the live entry list is validated against it and mismatches fail closed.

## Fragility and risk

- **Undocumented endpoints.** All three adapters use the internal endpoints the operators' own pages call. A site redesign breaks them silently; the adapters then fail closed and the UI shows the official link. 66 Outside is the most fragile (obfuscated bundle, vendored exit table, constant-named field, reproduced formula).
- **Rate limits are unknown.** Estimates are cached for 3 minutes per trip (see above) on top of the adapters' upstream caches (mappings 24h, price feeds 60s, historical I-66 prices 24h), all with single-flight, so bursts of clicks don't fan out to the operators. The 66 Outside response is ~350 KB per trip.
- **Terms of use.** `robots.txt` on all three sites allows these paths, but none publishes an API or terms for automated access, and ride66express.com obfuscates its planner. This is a demo; a public deployment should get the operators' OK.
- **Latency.** `vai66tolls.com` handlers can take several seconds; upstream calls time out at 15s.

## Deploying the API (Railway)

Target: the estimate API hosted on Railway for **dmvtolls.com** — first on Railway's public `*.up.railway.app` URL, later on `api.dmvtolls.com`. The React front end will move to Vercel separately; until then the same Railway service also serves `dist/`, so the Railway URL is a complete working site.

### Design notes

- **What the server needs at runtime: Bun, and nothing else.** The adapters talk to the operators with plain `fetch` (Transurban's JSON feed, VDOT's Razor handlers, the 66 Outside `theme-ajax` call). There is no Playwright/Puppeteer/Chromium anywhere in `package.json`, and `server/` imports no npm package at all — only `src/data/corridors.ts` and `src/lib/api-types.ts`. So the production image needs **no `node_modules`, no browser, no Nixpacks/Railpack browser layer**. If a future adapter ever needs a headless browser, that is the moment to add one, not before.
- **Dockerfile, not `railway.json`/Nixpacks.** Railway's per-service config file (`railway.json` / `railway.toml`, "Config as Code") is deprecated: new services can't opt in and existing files stop being read on 2026‑12‑01. Its replacement, Infrastructure as Code (`.railway/railway.ts`), needs the Railway CLI and an npm package and describes a whole project — more than one API service warrants. A `Dockerfile` needs neither: Railway always builds a Dockerfile when it finds one in the service's root directory, and the file itself carries the build and start commands, so the only dashboard settings left are the root directory and the health-check path. Railpack (Railway's zero-config builder) would also boot this app, but it installs "latest Bun" and re-derives the build each deploy; the Dockerfile pins `oven/bun:1.4` (the official image) and is reproducible locally with `docker build`.
- **Image shape.** Two stages: `oven/bun:1.4` runs `bun install --frozen-lockfile` and `bun run build` (typecheck + Vite); `oven/bun:1.4-slim` then gets only `server/`, `src/`, `dist/`, `package.json` and the `tsconfig*.json`, runs as the non-root `bun` user, and starts `bun server/index.ts`. `.dockerignore` keeps `node_modules`, `dist` and `.git` out of the build context.
- **Server changes made for hosting.** `Bun.serve` binds `0.0.0.0` explicitly (Railway routes to all interfaces) on `PORT`; `idleTimeout` is raised to 60 s because Bun's 10 s default would cut off a cold estimate while an operator takes up to 15 s to answer; `/api/health` added; CORS added for the future cross-origin front end (below). Scrape logic, caching and the API contract are unchanged.
- **Caching.** The 3‑minute estimate cache is in-process memory. One Railway replica is the intended shape; with several replicas each would hold its own cache (still correct, just more operator calls). No Redis.

### Environment variables

All optional; there are no secrets. Bun also loads a local `.env` (see [`.env.example`](./.env.example)).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Port to listen on. **Railway injects this** — do not set it yourself there. |
| `HOST` | `0.0.0.0` | Interface to bind. Leave the default on Railway; `127.0.0.1` keeps a local run off the LAN. |
| `CORS_ORIGINS` | `https://dmvtolls.com, https://www.dmvtolls.com, http://localhost:5173, http://127.0.0.1:5173, http://localhost:4173, http://127.0.0.1:4173` | Comma-separated browser origins allowed to call `/api` cross-origin (Vite dev/preview ports included for local front-end work against the hosted API). Setting it **replaces** the list; `*` allows any origin. |

CORS behaviour: same-origin requests (the API serving `dist/`, or a curl) send no `Origin` header and are untouched. An allowed cross-origin request gets `Access-Control-Allow-Origin: <that origin>`, `Vary: Origin` and `Access-Control-Expose-Headers: x-cache`, on successes and API errors alike; a disallowed origin gets the normal response with no CORS headers (so the browser blocks it). Preflights (`OPTIONS` with `Access-Control-Request-Method`) return `204` for allowed origins, `403` otherwise; methods `GET, HEAD, OPTIONS`, `max-age` 24 h, no credentials.

### Step 1 — connect GitHub → Railway (dashboard)

1. In [Railway](https://railway.com) create a project → **Deploy from GitHub repo** → pick this monorepo (authorise the Railway GitHub App for it if asked).
2. Open the new service → **Settings**:
   - **Source → Root Directory**: `apps/va-express-tolls`. Railway then finds `apps/va-express-tolls/Dockerfile` and builds with it (the builder shows as *Dockerfile*; no build or start command to type — they're in the image).
   - **Source → Watch Paths** (optional but recommended in a monorepo): `apps/va-express-tolls/**`, so commits to other apps don't redeploy this one.
   - **Deploy → Healthcheck Path**: `/api/health`. Leave the timeout at the default (300 s); the server is up in well under a second.
   - **Deploy → Restart Policy**: *On failure* is fine.
   - **Variables**: nothing required. Add `CORS_ORIGINS` only if the front-end origin list needs to differ from the default above.
3. Wait for the first deploy (build ≈ 1–2 min: `bun install`, typecheck, Vite build). Logs should end with `va-express-tolls API on http://localhost:<PORT> (also serving dist/); CORS origins: …`.
4. **Settings → Networking → Public Networking → Generate Domain**. Railway detects the listening port (the injected `PORT`); if it asks, choose that one. You get `https://<service>-<hash>.up.railway.app`.
5. Check:

```bash
curl https://<service>.up.railway.app/api/health
curl "https://<service>.up.railway.app/api/495/points?direction=nb"
curl -i -H "Origin: https://dmvtolls.com" https://<service>.up.railway.app/api/corridors | grep -i access-control
```

Opening the Railway URL in a browser shows the full site (the image contains `dist/`). Every push to `main` that touches `apps/va-express-tolls/` redeploys; the health check gates traffic so a broken build never replaces a working one.

Local check of the same image (needs Docker):

```bash
cd apps/va-express-tolls
docker build -t va-express-tolls .
docker run --rm -p 8787:8787 va-express-tolls
curl http://localhost:8787/api/health
```

### Step 2 (later) — custom domain `api.dmvtolls.com`

Only after Step 1 works. Nothing here buys or configures Cloudflare; it's the records to create wherever `dmvtolls.com`'s DNS lives (Cloudflare is assumed below because it also handles the apex for the future Vercel site).

1. Railway → service → **Settings → Public Networking → + Custom Domain** → `api.dmvtolls.com` → pick the same target port. Railway shows **two** records to create: a `CNAME` target (like `xxxxxx.up.railway.app`) and a `TXT` record that proves ownership. Both are required — with only the CNAME the domain resolves but Railway answers `404`.
2. In the DNS provider (Cloudflare → *DNS → Records*), create exactly what Railway displayed:

| Type | Name | Content / target | Cloudflare proxy |
| --- | --- | --- | --- |
| `CNAME` | `api` | `<value from Railway>.up.railway.app` | either. Proxied (orange cloud) is fine **only** with *SSL/TLS → Overview → Full* (not *Full (strict)*, not *Flexible*). *DNS only* (grey cloud) lets Railway issue its own Let's Encrypt certificate and is the simplest choice. |
| `TXT` | `<name from Railway>` | `<value from Railway>` | n/a |

   A subdomain is a plain `CNAME`, so no `A` record is needed. (If the DNS provider can't do CNAMEs on a name you need — only an issue for the apex `dmvtolls.com`, which is Vercel's job later — Cloudflare's CNAME flattening handles it; an `A` record would otherwise require Railway to publish a fixed IP, which it doesn't.)
3. Back in Railway, wait for the green check next to `api.dmvtolls.com` (verification is usually minutes; DNS propagation can take longer). Then `curl https://api.dmvtolls.com/api/health`.
4. `https://dmvtolls.com` and `https://www.dmvtolls.com` are already in the default CORS list, so a Vercel front end at either origin can call `https://api.dmvtolls.com/api/...` with no variable changes. If Vercel preview URLs need access too, set `CORS_ORIGINS` to the full list (Railway → Variables) and redeploy.

Follow-up for the Vercel move (not in this change): the front end currently calls `/api/...` relative to its own origin (`src/lib/api.ts`); it will need a build-time base URL such as `VITE_API_BASE=https://api.dmvtolls.com` once it's hosted apart from the API.

## Out of scope

Historical pricing for 495 / 66 Outside (their sites don't offer it), accounts, E-ZPass / HOV Flex linking, scraping beyond the calls above. See [PLAN.md](./PLAN.md).

Rules are summarized from VDOT, Transurban and 66 Express public pages (checked Sep 2026). Unofficial; not affiliated with any operator or E-ZPass.
