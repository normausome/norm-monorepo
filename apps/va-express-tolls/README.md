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

No environment variables or secrets are needed.

## How it works

```
src/                       React front end (Vite, Tailwind v4, shadcn button/card/badge)
  components/TripEstimator.tsx  direction → entry → exit → estimate; result card; two-toll hint
  components/TripMap.tsx   Leaflet map of entries / reachable exits, synced with the selects
  data/corridors.ts        rules, hours, official links, calculator tips
  lib/api-types.ts         API contract shared with the server
  lib/schedule.ts          I-66 Inside peak-window helper
server/                    Bun.serve API
  index.ts                 routes, error mapping, static dist/ in production
  adapters/vai66.ts        I-66 Inside — VDOT Razor page handlers
  adapters/expresslanes.ts 495, 395 and 95 — Transurban entry/exit mapping + price feed (one factory, three corridors)
  adapters/ride66.ts       66 Outside — planner's theme-ajax call + the page's per-gantry summation
  adapters/ride66-map.ts   66 Outside — vendored start → exit-chain table and marker coordinates (captured from the planner)
  cache.ts                 TTL cache with single-flight
```

API:

```
GET /api/corridors
GET /api/:corridor/points?direction=nb|sb|eb|wb
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=<ISO, past only, 66 Inside>]
```

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

## Out of scope

Historical pricing for 495 / 66 Outside (their sites don't offer it), accounts, E-ZPass / HOV Flex linking, scraping beyond the calls above. See [PLAN.md](./PLAN.md).

Rules are summarized from VDOT, Transurban and 66 Express public pages (checked Sep 2026). Unofficial; not affiliated with any operator or E-ZPass.
