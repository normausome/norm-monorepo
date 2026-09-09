# VA Express Tolls — Plan

## Goal

A public, mobile-friendly site where a Northern Virginia driver picks a corridor and a trip and sees a **dollar estimate in our UI**, sourced live from the operator's own public calculator — clearly labelled as an unofficial estimate that can differ from the overhead sign.

## Scope pivot (v2)

v1 was link-out only. v2 adds a small Bun backend that automates the official calculators and returns structured prices. Deep-links stay as the secondary "open the official calculator" fallback on every result.

## What we automate, per corridor

Findings from reading each calculator's front-end code (no headless browser needed for the two we ship):

| Corridor | How the official UI gets its number | Our adapter | Status |
| --- | --- | --- | --- |
| I-66 Inside the Beltway (vai66tolls.com, VDOT) | Razor page handlers: `GET /Index?handler=BeginIntPartial&rbEastVal=` (entries), `…ExitIntPartial&bIntId=` (valid exits), `…TollCalcPartial&bIntId&eIntId&datePicked&timePicked&rbEastVal&isCurrent` → JSON `{ decToll }`. `isCurrent=false` gives a historical estimate for a past date/time; off-peak returns 0. | `server/adapters/vai66.ts` — three GETs, parse `<option>`s and JSON. | **Shipped** |
| 495 Express Lanes (expresslanes.com, Transurban) | Static `/themes/custom/transurbangroup/js/on-the-road/entry_exit.js` maps entry → exit → O/D ids; `GET /maps-api/infra-price-confirmed-all` returns every O/D price with an hourly timestamp. Multi-road trips (e.g. 95→495) list one O/D per road. | `server/adapters/expresslanes.ts` — parse the mapping as JSON (strip comments, no `eval`), filter to `495*` paths, join with the price feed; one leg per O/D. | **Shipped** (current price only — the feed has no historical mode) |
| I-66 Outside the Beltway (ride66express.com) | WordPress theme `theme-ajax.php`, called from a deliberately obfuscated bundle (`javascript-obfuscator` output). | `server/adapters/ride66.ts` — returns `supported: false` with the deep-link. | **Not automated** — obfuscation is a do-not-automate signal; revisit only with operator OK. |

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
4. Two-toll hint: when an I-66 Inside trip starts/ends at an I-495 ramp, prompt to price the 495 leg too (one tap switches corridor).
5. 66 Outside shows the rules and the deep-link only, labelled as not automated.

## Reused from the monorepo

Stack/config from `apps/pstack-playbook-demo` (Bun + Vite + React 19 + Tailwind v4 + shadcn `button`/`card`/`badge`). Added only `@types/bun` (dev) for the server.

## Not added

No headless browser, no database, no scheduler, no third-party toll API, no accounts. No vendored operator data (mappings are fetched and cached at runtime so they stay current).

## Risks (also in the PR body)

- **Fragility**: both adapters depend on undocumented internal endpoints and DOM/JS shapes. A redesign breaks them silently → adapters fail closed (`error`, never a made-up number) and the UI always shows the deep-link.
- **Rate limits / load**: unknown. Mitigated by caching + single-flight; the 495 feed is one request for all O/Ds.
- **ToS / robots**: `robots.txt` on both sites allows these paths, but neither site publishes an API or terms for automated use. This is a demo; a production deployment should ask the operators.
- **Latency**: vai66tolls handler calls have been observed to take several seconds.

## Deferred

- 66 Outside automation (needs operator conversation)
- Auto-summing the I-66 → 495 combination (mapping the hand-off ramp is ambiguous; we prompt instead)
- 95/395 Express Lanes (already in the Transurban feed — a data filter away)
- Federal-holiday awareness in the schedule hint
