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

## Two modes

- **Simple** (default) — pick a corridor, then your entry and exit; the price comes from that operator's calculator. This is the original flow and is unchanged.
- **Advanced** (`#advanced`) — type a *from* and a *to* (address, place name, or `lat, lng`). The server routes the drive, works out which Express Lanes it runs beside, and prices every one through the same adapters, giving a total and a per-leg breakdown on a map of the route. See [Advanced mode](#advanced-mode-address--address) below for how detection works and its limits.
- **History** (`#history`) — posted price for one entry-to-exit trip over recent scraper snapshots, read from the sibling `dmv-tolls-scraper` Postgres when `DATABASE_URL` is set. The default trip is the full span. Other pairs the operator exposes are in the trip menu.

## How it works

```
src/                       React front end (Vite, Tailwind v4, shadcn button/card/badge)
  components/TripEstimator.tsx  Simple: direction → entry → exit → estimate; result card; two-toll hint
  components/TripMap.tsx   Leaflet map of entries / reachable exits, synced with the selects
  components/AdvancedEstimator.tsx  Advanced: from/to with suggestions → route → per-corridor legs + total
  components/RouteMap.tsx  Leaflet map of the driven route with each matched entry/exit pinned
  data/corridors.ts        rules, hours, official links, calculator tips
  lib/api-types.ts         API contract shared with the server
  lib/schedule.ts          I-66 Inside peak-window and 95/395 reversible-schedule helpers
server/                    Bun.serve API
  index.ts                 routes, health check, error mapping, static dist/ in production
  history.ts               /api/history/* — scraper snapshots from Postgres (optional DATABASE_URL)
  estimate.ts              adapter registry + the 3-minute per-trip estimate cache (shared by Simple and Advanced)
  cors.ts                  allow-list CORS for a front end on another origin (dmvtolls.com, Vite dev)
  adapters/vai66.ts        I-66 Inside — VDOT Razor page handlers
  adapters/expresslanes.ts 495, 395 and 95 — Transurban entry/exit mapping + price feed (one factory, three corridors)
  adapters/ride66.ts       66 Outside — planner's theme-ajax call + the page's per-gantry summation
  adapters/ride66-map.ts   66 Outside — vendored start → exit-chain table and marker coordinates (captured from the planner)
  route/providers.ts       Advanced: routing (OSRM demo / Mapbox / self-hosted OSRM) and geocoding (Photon / Mapbox)
  route/detect.ts          Advanced: which Express Lanes trips a route implies (geometry against the operators' points)
  route/geometry.ts        haversine + point-to-polyline projection
  route/index.ts           /api/geocode and /api/route-tolls handlers
  cache.ts                 TTL cache with single-flight
```

API:

```
GET /api/health
GET /api/corridors
GET /api/:corridor/points?direction=nb|sb|eb|wb
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=<ISO, past only, 66 Inside>]
GET /api/history/summary
    → { available, latestRun: { startedAt, finishedAt, status } | null,
        corridors: [{ id, latest: HistorySample | null, headline: HistoryTrip | null, samples24h }] }
GET /api/history/:corridor?hours=24[&direction=&entry=&exit=]   (hours clamped 1–168)
    → { corridor, hours, trip: HistoryTrip | null, trips: HistoryTrip[],
        samples: [{ scrapedAt, price, status, openDirection95?, error }] }
GET /api/geocode?q=<text, 3+ chars>                     → { results: [{ label, lat, lng }], provider }
GET /api/route-tolls?from=<lat,lng>&to=<lat,lng>[&fromLabel=&toLabel=]
    → { from, to, route: { provider, distanceMeters, durationSeconds, geometry: [[lat,lng]…] },
        legs: [{ corridor, corridorName, direction, entry, exit, match: "on-route" | "near-ends",
                 estimate: <same shape as /estimate> | null, error: string | null, notice?, calculatorUrl }],
        unmatched: [{ corridor, corridorName, calculatorUrl, reason }],
        total: number | null, currency: "USD", notes: string[] }
```

`/api/health` is the deploy health check: `200 {"ok":true, …}` with `startedAt`, `uptimeSeconds`, the corridor ids, whether `dist/` is being served, and `history` (whether `DATABASE_URL` is set). It never calls an operator.

Every estimate carries `source.operator`, `source.fetchedAt`, per-leg prices, and `notes`. When an operator can't be reached or returns something unexpected, the API returns an `error` — it never fabricates a number.

### Estimate caching

Identical estimate requests don't re-run the operator automation. The server keeps an in-process response cache (`server/cache.ts`, single-flight so concurrent identical requests share one upstream call):

- **Key**: corridor + direction + entry + exit + `at` (normalized to UTC; absent means "now").
- **TTL**: **3 minutes** for a priced estimate (prices are dynamic). A `total: null` answer (closed or reversing lanes, missing feed rows) and operator failures (`502`) are kept **30 s** — long enough to absorb a burst of retries, short enough that a recovery shows quickly. `400` bad requests are never cached.
- **Labels**: every estimate response (and any cached error) includes `cache: "hit" | "miss"`, `cachedAt` and `expiresAt` (ISO 8601), plus an `X-Cache: HIT|MISS` header. `expiresAt` is when the server will ask the operator again; the UI shows it as "refreshes HH:MM". `source.fetchedAt` remains the operator fetch time and the "unofficial estimate — the overhead sign is the price you pay" wording is unchanged.
- Beneath that, the adapters still cache their *upstream* payloads (mappings 24h, the Transurban price feed 60 s shared by every 495/395/95 trip, historical I-66 Inside prices 24h), so different trips on one corridor also share operator calls.

Memory only: a single-node MVP has no Redis/KV in the stack, and a restart just means the first request per trip goes upstream again. The [iOS app](../va-express-tolls-ios/) calls the same `/api/:corridor/estimate` endpoint and therefore gets the same cached answers; the new fields are additive, so its decoder needs no change.

### History (Postgres)

The History tab reads `/api/history/*`, which serves snapshots written every 30 minutes by `apps/dmv-tolls-scraper` into a shared Postgres (`scrape_runs` + `corridor_snapshots`). Each row's `summary.trips` is one entry-to-exit price. Omit `direction`, `entry`, and `exit` and the API returns the full-span trip (upstream entry to the downstream exit that stays on the corridor). Send all three to chart another pair from `trips`. `status` is `open`, `free` (I-66 Inside at $0), `closed`, or `missing`. Snapshots written before trip rows exist show as a gap. Without `DATABASE_URL` the summary endpoint reports `available: false` and the tab shows a setup message.

Points carry `lat`/`lng` so the UI can draw them: a map under the selects shows the direction's entries, then the exits reachable from your entry, and highlights the chosen pair (tapping a dot selects it). Coordinates come from each operator's own map — vai66tolls and expresslanes ship them with their interchange data; for 66 Outside they were captured once from the planner's markers (a few select-only ramps are placed at the same interchange and commented as approximate). Basemap: OpenStreetMap tiles, fine for a demo; a real deployment must follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) or bring its own tiles.

## How each price is obtained

- **I-66 Inside** — the VDOT page's own Razor handlers (`BeginIntPartial`, `ExitIntPartial`, `TollCalcPartial`); the last one returns `{ decToll }`. Supports "now" and a past date/time.
- **495** — Transurban's static entry/exit → O/D mapping plus its `infra-price-confirmed-all` JSON feed; one leg per O/D (multi-road trips are summed).
- **395** and **95** — the same mapping and feed, filtered to `395North` / `395South` or `95` entries (the 95 set runs from Route 17 near Fredericksburg to Springfield). Exits may continue onto the other road or onto 495 and come back as separate legs, mirroring the operator's "95 and 395 Express Lanes" / "495 Express Lanes" line items. The feed's `direction_95` flag says which way the reversible lanes are open; that's surfaced above the form, and a closed direction — or any leg the feed marks `closed` — returns no total even if the feed still carries a stale figure.
- **66 Outside** — the planner's `theme-ajax.php` `api_call` (start gantry + the exit's tolling-gantry chain + one constant-named form field read from the live bundle). The response is today's rate-change log for every gantry; like the page, we sum the latest posted class-1 rate at each gantry the trip passes. The start → exit-chain table is vendored (`ride66-map.ts`) because the planner builds it inside an obfuscated bundle; the live entry list is validated against it and mismatches fail closed.

## Advanced mode (address → address)

Advanced mode is additive: it reuses the corridor adapters and the estimate cache and adds a routing step in front of them. Everything runs server-side, so the browser only talks to `/api` and no third-party key is ever shipped to the client.

### Providers

| Job | Default (no keys) | With `MAPBOX_TOKEN` | Notes |
| --- | --- | --- | --- |
| Driving route | Public **OSRM demo server** (`router.project-osrm.org`), OpenStreetMap data | **Mapbox Directions** (`driving` profile) | Both return the OSRM response format, including a road `ref` per step (`I 495`, `I 66`, …), so one parser serves both. `ROUTING_URL` points the OSRM client at a self-hosted instance instead. |
| Address → coordinates | **Photon** (komoot, OpenStreetMap data), biased to a Fredericksburg–Baltimore / Front Royal–Bay bounding box | **Mapbox Geocoding v6** forward search, same bias | Suggestions appear as you type (350 ms debounce, 3+ characters). Nominatim was ruled out because its usage policy forbids autocomplete. `PHOTON_URL` selects another Photon instance. |

Why this shape: the zero-key default is genuinely usable for a demo (the OSRM demo and Photon both answer in well under a second from Railway's region and were verified against real trips below), but neither has an SLA and the OSRM demo explicitly asks not to carry production traffic. Mapbox is the smallest paid step up — a single token covers both jobs, its free tier (100k directions and 100k geocodes a month at the time of writing) is far above this site's traffic, and switching is one Railway variable with no code change. Google Maps was not chosen: its Directions/Routes responses don't carry per-step road refs in a compatible shape, so it would need a second parser, and it has no keyless path. Responses are cached server-side (routes 10 min, geocodes 24 h, single-flight) on top of the 3-minute estimate cache, so a burst of clicks doesn't fan out to any provider.

### Corridor detection

The route is a polyline plus steps with road refs. For each *network* — the 95/395 Express Lanes (one continuous reversible road, billed as one line item), the 495 Express Lanes, I-66 Outside the Beltway, I-66 Inside the Beltway — the server:

1. Takes the contiguous stretch(es) of steps whose `ref` matches that network's interstate(s) (`I 95`/`I 395`, `I 495`, `I 66`). Unnamed connector ramps under 3 km between two matching steps are bridged so 95 → 395 stays one stretch.
2. Loads the operator's own entry/exit points for the direction of travel (the same `lat`/`lng` the Simple-mode map uses; direction comes from the stretch's displacement — latitude for 95/395/495, longitude for I-66).
3. Projects each entry onto the stretch and keeps those within **400 m** of it, or within **1200 m** when they sit at the first/last 300 m of the stretch (there the route is on an on/off ramp while the Express Lanes' own ramp can land ~1 km away — Route 7 at Tysons, Route 17 at Fredericksburg). The earliest such entry wins; among *its* reachable exits, the furthest along the stretch that passes the same test is the exit. The search then continues past that exit, so a route can use a network twice.
4. Prices each (corridor, direction, entry, exit) through the corridor's adapter — the identical call Simple mode makes — and attaches the operator's live notice (`direction_95`) for the reversible lanes.

What the answer means: **"if you take the Express Lanes wherever your route runs beside them, this is what you'd pay."** The route itself is usually drawn on the free general-purpose lanes; a router can't make that choice for you (and routers generally keep off the reversible 95/395 lanes). I-66 Inside the Beltway tolls every lane at peak, so there it's not a choice.

Where it is honest about not knowing:

- **Ends of a stretch.** An entry or exit matched under the looser end radius is flagged `match: "near-ends"` and the UI shows an amber "check the interchange" badge: the interchange is right, the exact gantry may be one ramp off. Every leg names its entry and exit, and *Adjust in Simple mode* opens that corridor with the same direction/entry/exit pre-filled so you can move them.
- **Nearby but unmatched.** If the route drives on an interstate with Express Lanes and an entry lies within 1 km but no entry→exit pair passes the tests, the network is reported under `unmatched` with the official calculator link, and nothing is priced for it. No guess is ever made.
- **Closed reversible direction.** 95/395 return `total: null` with the operator's notice when the direction you'd travel is closed; the other legs (e.g. 495) are still priced individually and the overall total is withheld.
- **Time.** Advanced mode prices "leaving now" only. The published 95/395 schedule hint from Simple mode is shown on those legs; the operator's live flag decides.

Verified trips (Sep 2026, ~2 PM Eastern, lanes running southbound): Springfield → Tysons: 495 NB Braddock Rd → Route 7, $9.05. Tysons → Fredericksburg: 495 SB Route 7 → Braddock Rd $11.85 + 95 SB Springfield → Courthouse Rd $23.85 = $35.70 (the same $35.70 Transurban quotes for the single cross-road trip). Gainesville → Rosslyn: 66 Outside Western Entry → EB GP Exit $32.90 (three gantries) + 66 Inside I-66 West → Rosslyn, no toll off-peak. Fredericksburg → DC: 95 NB Route 17 → Washington D.C. correctly returns no price with "lanes are open southbound right now". Old Town Alexandria → College Park (GW Parkway, 14th Street Bridge, I-295): no Express Lanes toll.

### Railway

Nothing is required: without variables the deployed site uses the keyless defaults. To move to Mapbox, add **`MAPBOX_TOKEN`** under the service's *Variables* and redeploy — no other change. Because all provider calls originate from the Bun server, there is no CORS or referrer configuration on the Mapbox side (the token can still be restricted by URL if you prefer; the requests come from Railway's egress, not from dmvtolls.com). `/api/health` reports which providers are active under `advanced`. The existing `CORS_ORIGINS` list already covers dmvtolls.com for the two new `/api` routes.

## Fragility and risk

- **Advanced mode's providers.** The OSRM demo server and Photon are best-effort community services with no SLA; if either is down, Advanced mode returns an error (Simple mode is unaffected) and the UI points to Simple mode and the official calculators. `MAPBOX_TOKEN` removes that dependency. OpenStreetMap tags drive the `ref` matching; a retag of a ramp could shift where a stretch begins.
- **Undocumented endpoints.** All three adapters use the internal endpoints the operators' own pages call. A site redesign breaks them silently; the adapters then fail closed and the UI shows the official link. 66 Outside is the most fragile (obfuscated bundle, vendored exit table, constant-named field, reproduced formula).
- **Rate limits are unknown.** Estimates are cached for 3 minutes per trip (see above) on top of the adapters' upstream caches (mappings 24h, price feeds 60s, historical I-66 prices 24h), all with single-flight, so bursts of clicks don't fan out to the operators. The 66 Outside response is ~350 KB per trip.
- **Terms of use.** `robots.txt` on all three sites allows these paths, but none publishes an API or terms for automated access, and ride66express.com obfuscates its planner. This is a demo; a public deployment should get the operators' OK.
- **Latency.** `vai66tolls.com` handlers can take several seconds; upstream calls time out at 15s.

## Deploying the API (Railway)

Target: the estimate API hosted on Railway for **dmvtolls.com** — first on Railway's public `*.up.railway.app` URL, later on `api.dmvtolls.com`. The React front end will move to Vercel separately; until then the same Railway service also serves `dist/`, so the Railway URL is a complete working site.

### Design notes

- **What the server needs at runtime: Bun, and the `postgres` client.** The adapters talk to the operators with plain `fetch` (Transurban's JSON feed, VDOT's Razor handlers, the 66 Outside `theme-ajax` call). There is no Playwright/Puppeteer/Chromium anywhere in `package.json`. The only npm runtime dependency is `postgres` (for `/api/history/*`); everything else the server imports is first-party (`src/data/corridors.ts`, `src/lib/api-types.ts`). The production image copies `node_modules` for that client and still needs **no browser, no Nixpacks/Railpack browser layer**. If a future adapter ever needs a headless browser, that is the moment to add one, not before.
- **Dockerfile, not `railway.json`/Nixpacks.** Railway's per-service config file (`railway.json` / `railway.toml`, "Config as Code") is deprecated: new services can't opt in and existing files stop being read on 2026‑12‑01. Its replacement, Infrastructure as Code (`.railway/railway.ts`), needs the Railway CLI and an npm package and describes a whole project — more than one API service warrants. A `Dockerfile` needs neither: Railway always builds a Dockerfile when it finds one in the service's root directory, and the file itself carries the build and start commands, so the only dashboard settings left are the root directory and the health-check path. Railpack (Railway's zero-config builder) would also boot this app, but it installs "latest Bun" and re-derives the build each deploy; the Dockerfile pins `oven/bun:1.4` (the official image) and is reproducible locally with `docker build`.
- **Image shape.** Two stages: `oven/bun:1.4` runs `bun install --frozen-lockfile` and `bun run build` (typecheck + Vite); `oven/bun:1.4-slim` then gets `server/`, `src/`, `dist/`, `package.json`, the `tsconfig*.json` and `node_modules` (for the `postgres` client), runs as the non-root `bun` user, and starts `bun server/index.ts`. `.dockerignore` keeps `node_modules`, `dist` and `.git` out of the build context.
- **Server changes made for hosting.** `Bun.serve` binds `0.0.0.0` explicitly (Railway routes to all interfaces) on `PORT`; `idleTimeout` is raised to 60 s because Bun's 10 s default would cut off a cold estimate while an operator takes up to 15 s to answer; `/api/health` added; CORS added for the future cross-origin front end (below). Scrape logic, caching and the API contract are unchanged.
- **Caching.** The 3‑minute estimate cache is in-process memory. One Railway replica is the intended shape; with several replicas each would hold its own cache (still correct, just more operator calls). No Redis.

### Environment variables

All optional; the only secret-ish one is `MAPBOX_TOKEN`, and only if you opt into Mapbox. Bun also loads a local `.env` (see [`.env.example`](./.env.example)).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Port to listen on. **Railway injects this** — do not set it yourself there. |
| `HOST` | `0.0.0.0` | Interface to bind. Leave the default on Railway; `127.0.0.1` keeps a local run off the LAN. |
| `CORS_ORIGINS` | `https://dmvtolls.com, https://www.dmvtolls.com, http://localhost:5173, http://127.0.0.1:5173, http://localhost:4173, http://127.0.0.1:4173` | Comma-separated browser origins allowed to call `/api` cross-origin (Vite dev/preview ports included for local front-end work against the hosted API). Setting it **replaces** the list; `*` allows any origin. |
| `MAPBOX_TOKEN` | unset | Advanced mode: when set, routing uses Mapbox Directions and geocoding uses Mapbox Geocoding v6 instead of the keyless OSRM demo + Photon. Server-side only; never sent to the browser. See [Advanced mode](#advanced-mode-address--address). |
| `ROUTING_URL` | `https://router.project-osrm.org` | Advanced mode: any OSRM-compatible router to use instead of the demo server (ignored when `MAPBOX_TOKEN` is set). |
| `PHOTON_URL` | `https://photon.komoot.io` | Advanced mode: alternative Photon geocoder instance (ignored when `MAPBOX_TOKEN` is set). |
| `DATABASE_URL` | unset | Optional Postgres URL for `/api/history/*`. When set, the History tab serves scraper snapshots from the same database the `dmv-tolls-scraper` cron writes to (on Railway, reference that Postgres service's `DATABASE_URL`). When unset, `/api/history/summary` returns `available: false` and `/api/health` reports `history: false`. |

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
