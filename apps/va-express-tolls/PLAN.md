# VA Express Tolls — Plan

## Goal

A public, mobile-friendly site where a Northern Virginia driver picks a corridor and a trip and sees a **dollar estimate in our UI**, sourced live from the operator's own public calculator — clearly labelled as an unofficial estimate that can differ from the overhead sign.

## Scope pivot (v2)

v1 was link-out only. v2 adds a small Bun backend that automates the official calculators and returns structured prices. Deep-links stay as the secondary "open the official calculator" fallback on every result.

## What we automate, per corridor

Findings from reading each calculator's front-end code and, for 66 Outside, from capturing its network traffic in a headless browser. At runtime no browser is involved — all three adapters are plain HTTP:

| Corridor | How the official UI gets its number | Our adapter | Status |
| --- | --- | --- | --- |
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

Errors are `{ error: string }` with 4xx/5xx. Everything is cached in memory (points 24h, 495 feed 60s, vai66 current 60s per O/D, historical 24h) with single-flight, so bursts of UI clicks don't fan out to the operators. Upstream calls have a 15s timeout and a browser-like User-Agent.

In dev, Vite proxies `/api` to the Bun server (`bun run dev` starts both). In production the same Bun server also serves `dist/`.

## Front end (one screen)

1. Corridor tabs (unchanged).
2. Trip form: direction → entry → exit (exit list depends on entry). I-66 Inside adds "Right now" vs "A past weekday time" (historical).
3. Result card: the dollar figure, big; per-leg breakdown when more than one road is involved; "No toll" state for off-peak I-66 Inside; source + fetched-at; the unofficial-estimate disclaimer; secondary link to the official calculator.
4. Two-toll hint: when an I-66 trip starts/ends at an I-495 ramp (or a 495 trip at I-66), prompt to price the other leg too (one tap switches corridor).
5. Map (Leaflet + OSM tiles) under the selects: the direction's entries, the exits reachable from the chosen entry, the selected pair highlighted; dots are clickable. Coordinates come from the operators' own map data (`lat`/`lng` on every point).

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
- 95 Express Lanes south of Springfield as its own corridor (already in the Transurban feed — the same factory with `pathPrefix: "95"`); 395 trips that continue onto 95 are already priced
- Federal-holiday awareness in the schedule hint
