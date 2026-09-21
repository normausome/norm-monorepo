# VA Express Tolls — Plan

## History trips (Sep 2026)

History charts one real entry-to-exit price. The old corridor average mixed every feed row into one number, so it was not a trip anyone drives.

### What "all combinations" means

A combination is one entry and one exit the operator already treats as a valid trip for that corridor and direction.

- Transurban 495, 395, and 95. Each link in `entry_exit.js` from an entry whose `path` starts with that corridor, in both directions. The price is the sum of the `od_*` feed rows named on that link. A feed row alone is a segment, not a trip. A pair that continues onto another road stays in the list. It is not the full-span default.
- I-66 Outside. Each exit in `EXITS_BY_START` for a start the live planner still lists, eastbound and westbound. The price is the sum of the latest class-1 gantry rates on that chain. One planner response contains every gantry, so this adds no request per pair.
- I-66 Inside. Each exit `ExitIntPartial` returns for an entry from `BeginIntPartial`, eastbound and westbound. Each pair is its own `TollCalcPartial` call.

Not included: a cartesian product of gantries the operator does not connect, and the old mean of every numeric feed row.

### Full span

One pair per direction. It is the upstream entry on that corridor and, among exits that entry can reach that still sit on the corridor, the downstream exit.

Progress is latitude for northbound and southbound, and longitude for eastbound and westbound. Upstream is the smaller progress. Downstream is the larger progress. An exit on another road does not win the full span, even when it is farther away. The pair is stored with `spanning: true`.

### Storage and API

No new table. Each `corridor_snapshots.summary` gains `trips`. Each element is `{ direction, entryId, exitId, entryLabel, exitLabel, spanning, price, status }`. `status` is `open`, `free`, `closed`, or `missing`. `free` is an I-66 Inside toll of $0. `closed` and `missing` store `price: null`.

History reads that array. The min, avg, and max fields are removed. Snapshots from before this change have no `trips`, so they show as a gap.

`GET /api/history/:corridor?hours=&direction=&entry=&exit=` returns the trip catalog from the newest snapshot that has trips, the selected trip, and one price per snapshot. Omit the three trip parameters and the server picks the full-span trip. When `direction_95` names an open direction, that direction's full-span trip wins.

### Cadence and cost

The cron stays every 30 minutes.

Transurban adds one GET of `entry_exit.js` beside the feed it already fetches. On 21 Sep 2026 the mapping exposed 685 links (495: 226, 395: 109, 95: 350). No per-trip request.

I-66 Outside keeps one planner POST. The vendored table has 172 pairs. The rate log prices all of them.

I-66 Inside is the only matrix of live price calls. The same day: 16 entries, 96 reachable pairs, about 0.1 s per toll call and about 0.05 s per exit list. Six calls at a time finishes in well under a minute. Even if every call hit the 15 s timeout, six at a time is about four minutes, inside the 30-minute cron. 96 calls every 30 minutes is about 192 per hour from one host. If VDOT starts refusing bursts, lower the concurrency, or price the two full-span trips every run and rotate the rest. Do not add a second scheduler until that happens.

### Rejected shape

A `trip_snapshots` table would let SQL fetch one pair without opening the JSON. The history window is at most 336 rows, and the series query already pulls the one matching element with `jsonb_array_elements`. A second table would copy `corridor_snapshots` for the same read.

### UI

Corridor and window stay. Direction and trip selects are added. The default trip is the full span. The chart is that trip's price. The min-max band is removed.

## Original plan


## Goal

A public, mobile-friendly site where a Northern Virginia driver picks a corridor and a trip and sees a **dollar estimate in our UI**, sourced live from the operator's own public calculator — clearly labelled as an unofficial estimate that can differ from the overhead sign.

## Scope pivot (v2)

v1 was link-out only. v2 adds a small Bun backend that automates the official calculators and returns structured prices. Deep-links stay as the secondary "open the official calculator" fallback on every result.

## What we automate, per corridor

Findings from reading each calculator's front-end code and, for 66 Outside, from capturing its network traffic in a headless browser. At runtime no browser is involved — all three adapters are plain HTTP:

| Corridor | How the official UI gets its number | Our adapter | Status |
| --- | --- | --- | --- |
| 95 Express Lanes (expresslanes.com, Transurban) | Same mapping (`path: "95"` entries, Route 17 near Fredericksburg → Springfield) and feed; same `direction_95` flag. | Same factory with `pathPrefix: "95"`, `reversible: true`. Labelled "95 Express — Fredericksburg area ↔ north" in the UI. | **Shipped** (current price, open direction only) |
| I-66 Inside the Beltway (vai66tolls.com, VDOT) | Razor page handlers: `GET /Index?handler=BeginIntPartial&rbEastVal=` (entries), `…ExitIntPartial&bIntId=` (valid exits), `…TollCalcPartial&bIntId&eIntId&datePicked&timePicked&rbEastVal&isCurrent` → JSON `{ decToll }`. `isCurrent=false` gives a historical estimate for a past date/time; off-peak returns 0. | `server/adapters/vai66.ts` — three GETs, parse `<option>`s and JSON. | **Shipped** |
| 495 Express Lanes (expresslanes.com, Transurban) | Static `/themes/custom/transurbangroup/js/on-the-road/entry_exit.js` maps entry → exit → O/D ids; `GET /maps-api/infra-price-confirmed-all` returns every O/D price with an hourly timestamp. Multi-road trips (e.g. 95→495) list one O/D per road. | `server/adapters/expresslanes.ts` — parse the mapping as JSON (strip comments, no `eval`), filter to `495*` paths, join with the price feed; one leg per O/D. | **Shipped** (current price only — the feed has no historical mode) |
| 395 Express Lanes (expresslanes.com, Transurban) | Same mapping (`395North` / `395South` entries) and feed. The feed's top-level `direction_95` ("N"/"S") is the operator's live flag for the reversible lanes; rows for the closed direction are `status: closed` with null or stale prices. | Same factory as 495 with `pathPrefix: "395"`, `reversible: true`: surfaces the open direction as a notice, and returns `total: null` for a closed direction instead of a stale figure. Legs onto 95 are labelled "95 and 395 Express Lanes" like the operator's UI; legs onto 495 come back as a second line item. | **Shipped** (current price, open direction only) |
| I-66 Outside the Beltway (ride66express.com) | Obfuscated bundle posts `action=api_call` + `data[starting_gantry_id|first_ending_gantry_id|middle_ending_gantry_id|ending_gantry_id]` + one constant-named field (`data[xvWr]=1`) to the theme's `theme-ajax.php`; the response is today's rate-change log for every gantry. The page prices a trip as the **sum of the latest posted class-1 rate at each gantry the trip passes** (start + exit chain). Verified against three on-page prices ($51.25, $29.05, $4.05). | `server/adapters/ride66.ts` — entry gantries scraped live from the page's mobile `<select>`s; exit chains vendored in `ride66-map.ts` (captured by driving the planner headlessly); token field name read from the live bundle with a fallback; same summation as the page. | **Shipped** (current price only) |

## API (Bun.serve, `server/`)

```
GET /api/corridors                       → corridor metadata + { supported, directions[] }
GET /api/:corridor/points?direction=     → { entries: [{ id, label, exits: [{ id, label }] }] }
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=ISO]
    → { corridor, direction, entry, exit, kind: "current" | "historical",
        total: number | null, currency: "USD",
        legs: [{ road, price, observedAt, status }],
        source: { operator, url, fetchedAt }, notes: string[] }
```

Errors are `{ error: string }` with 4xx/5xx. Everything is cached in memory with single-flight, so bursts of UI clicks don't fan out to the operators: the estimate route caches each trip (corridor + direction + entry + exit + `at`) for 3 minutes when priced, 30 s when unpriced or failed, never for bad requests, and labels responses with `cache: "hit" | "miss"`, `cachedAt`, `expiresAt`; beneath it the adapters cache upstream payloads (points 24h, 495 feed 60s, vai66 historical 24h). Upstream calls have a 15s timeout and a browser-like User-Agent.

In dev, Vite proxies `/api` to the Bun server (`bun run dev` starts both). In production the same Bun server also serves `dist/`.

## Hosting (v3: Railway for dmvtolls.com)

Goal: the API on Railway, public `*.up.railway.app` URL first, `api.dmvtolls.com` later; front end to Vercel later. Decisions (details and Norman's click-through in the README's *Deploying the API* section):

- Fetch-only adapters → runtime is Bun alone: no `node_modules`, no Chromium. Don't add a browser layer until an adapter actually needs one.
- `Dockerfile` on the official `oven/bun:1.4` image rather than `railway.json`/Nixpacks — Railway's config-as-code is deprecated for new services, and a Dockerfile is self-describing and reproducible locally.
- Server: bind `0.0.0.0`:`PORT`, `idleTimeout` 60 s (operators can take 15 s), `GET /api/health`, allow-list CORS (`CORS_ORIGINS`) for dmvtolls.com / www / Vite dev ports.
- Out: buying/configuring Cloudflare (DNS records are documented only), Vercel deploy, Redis, scrape changes.

## Front end (one screen)

0. Mode toggle: **Simple** (everything below) / **Advanced** (address → address, see v4 above).
1. Corridor tabs (unchanged).
2. Trip form: direction → entry → exit (exit list depends on entry). I-66 Inside adds "Right now" vs "A past weekday time" (historical).
3. Result card: the dollar figure, big; per-leg breakdown when more than one road is involved; "No toll" state for off-peak I-66 Inside; source + fetched-at; the unofficial-estimate disclaimer; secondary link to the official calculator.
4. Two-toll hint: when an I-66 trip starts/ends at an I-495 ramp (or a 495 trip at I-66), prompt to price the other leg too (one tap switches corridor).
5. Map (Leaflet + OSM tiles) under the selects: the direction's entries, the exits reachable from the chosen entry, the selected pair highlighted; dots are clickable. Coordinates come from the operators' own map data (`lat`/`lng` on every point).
6. Smart default direction for the reversible 395 and 95: `reversibleStatus()` in `src/lib/schedule.ts` reads day-of-week + Eastern time against Transurban's approximate schedule (learn-the-lanes) and the form pre-selects that direction. It is only an initial value: the user can change it, and the operator's live `direction_95` notice (already fetched with the entry points) stays the source of truth for whether a direction is actually open. In a scheduled reversal window the hint says "probably closed" and pre-selects the direction that opens next rather than pretending either is open. The hint is labelled approximate (holidays, events, incidents) and links the schedule. No server or API change.

## Advanced mode (v4: address → address)

Goal in one sentence: a driver types where they're leaving from and going to, and gets the Express Lanes tolls the drive implies — every corridor on the way, each priced by its own operator, added up — without knowing which corridor is which.

MVP boundary: leaving *now* only; two inputs with suggestions (or raw `lat, lng`); a total, a per-leg breakdown and a map. Out: departure time, alternatives/avoid-tolls routing, HOV pricing, saving trips, turn-by-turn.

Decisions, in the order they were made:

1. **Inspect first.** Every adapter already returns `lat`/`lng` for every entry and exit (the operators' own map data), and `/estimate` is the only pricing surface. So Advanced mode is *routing + matching in front of the same adapters*, not new pricing. The estimate cache moved to `server/estimate.ts` so both modes share it.
2. **Routing provider: OSRM-format Directions, keyless by default.** The public OSRM demo router answers in ~0.5 s from here and gives per-step road refs (`I 495`, `I 66`, `I 395; US 1`), which is exactly what detection needs. It has no SLA and isn't meant for production traffic, so `MAPBOX_TOKEN` switches to Mapbox Directions — same response format, one parser — and `ROUTING_URL` allows a self-hosted OSRM. Google was rejected (no keyless path, incompatible step shape). Geocoding follows the same split: Photon (komoot) by default, Mapbox Geocoding v6 with the token; Nominatim rejected because its policy forbids autocomplete. All calls are server-side and cached; the browser never sees a provider or a key.
3. **Detection is geometric, against the operators' own points.** Prototyped on real routes before any UI work. Per network (95/395 · 495 · 66 Outside · 66 Inside): the route's contiguous steps on that interstate form a stretch; the operator's entries for the direction of travel are projected onto it (≤ 400 m, or ≤ 1200 m in the first/last 300 m where ramps diverge); earliest entry → furthest reachable exit → continue past it. Ambiguities are surfaced rather than papered over: `match: "near-ends"` flags a looser match, `unmatched` reports a stretch that couldn't be lined up (with the official link), a closed reversible direction stays unpriced with the operator's notice, and every leg carries *Adjust in Simple mode* with the same corridor/direction/entry/exit pre-filled. The premise — "you take the Express Lanes wherever your route runs beside them" — is stated on every result, because a router can't know whether you'd pick the free lanes.
4. **95/395 and 495 are separate networks even though Transurban prices a cross-road trip as one.** Tested both ways: merged gave one leg with two line items ($11.85 + $23.85), split gave two legs with the same figures, but merged hid the priceable 495 leg whenever the reversible 95/395 direction was closed. Split matches the operator's own bill lines and degrades better.
5. **Smallest surface.** Two server routes (`/api/geocode`, `/api/route-tolls`), one mode toggle in `App.tsx` (`#advanced`), `AdvancedEstimator` + `RouteMap`, an optional `preset` on `TripEstimator`. Simple mode's behaviour is unchanged.

Deferred: departure time for the 66 Inside historical mode; "avoid tolls" comparison; using OSRM `annotations` to detect when the router itself chose an Express Lanes way; an automated regression check of the verified trips in the README against the live providers.

## Reused from the monorepo

Stack/config from `apps/pstack-playbook-demo` (Bun + Vite + React 19 + Tailwind v4 + shadcn `button`/`card`/`badge`). Added `@types/bun` (dev) for the server and `leaflet` for the map (no API key, SVG circle markers, no react wrapper).

## Not added

No headless browser at runtime, no database, no scheduler, no third-party toll API, no accounts. The only vendored operator data is the 66 Outside exit-chain table (the planner builds it client-side inside the obfuscated bundle); 495 and 66 Inside mappings are fetched and cached at runtime.

## Risks (also in the PR body)

- **Fragility**: all three adapters depend on undocumented internal endpoints and DOM/JS shapes. A redesign breaks them silently → adapters fail closed (`error`, never a made-up number) and the UI always shows the deep-link. 66 Outside is the most fragile: an obfuscated bundle, a vendored exit table, a constant-named form field, and a pricing formula we reproduced rather than read.
- **Rate limits / load**: unknown. Mitigated by caching + single-flight; the 495 feed is one request for all O/Ds; the 66 Outside response is ~350 KB per trip, cached 60 s.
- **ToS / robots**: `robots.txt` on all three sites allows these paths, but none publishes an API or terms for automated use, and ride66express.com obfuscates its planner, which reads as a preference against automation. This is a demo; a production deployment should ask the operators.
- **Latency**: vai66tolls handler calls have been observed to take several seconds.

## Deferred

- Auto-summing the I-66 → 495 combination (mapping the hand-off ramp is ambiguous; we prompt instead)
- Re-capturing the 66 Outside exit table automatically (today it's a checked-in snapshot validated against the live entry list)
- Federal-holiday awareness in the schedule hint
