# VA Express Tolls

Public, mobile-friendly toll estimates for Northern Virginia's Express Lanes. Pick a corridor and a trip, and the site fetches the number the operator's **own** public calculator shows right now — structured, in our UI, clearly labelled as an unofficial estimate. Deep-links to the official calculators remain as the fallback.

| Corridor | Operator | Live estimate on this site | Official calculator |
| --- | --- | --- | --- |
| 495 Express Lanes | Transurban | Yes (current price) | https://expresslanes.com/map-your-trip/ |
| I-66 Inside the Beltway | VDOT | Yes (current, or a past weekday time) | https://vai66tolls.com/ |
| I-66 Outside the Beltway | I-66 Express Mobility Partners | No — link only (see below) | https://ride66express.com/pricing/plan-your-trip/ |

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
  data/corridors.ts        rules, hours, official links, calculator tips
  lib/api-types.ts         API contract shared with the server
  lib/schedule.ts          I-66 Inside peak-window helper
server/                    Bun.serve API
  index.ts                 routes, error mapping, static dist/ in production
  adapters/vai66.ts        I-66 Inside — VDOT Razor page handlers
  adapters/expresslanes.ts 495 — Transurban entry/exit mapping + price feed
  adapters/ride66.ts       66 Outside — not automated (returns the reason)
  cache.ts                 TTL cache with single-flight
```

API:

```
GET /api/corridors
GET /api/:corridor/points?direction=nb|sb|eb|wb
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=<ISO, past only, 66 Inside>]
```

Every estimate carries `source.operator`, `source.fetchedAt`, per-leg prices, and `notes`. When an operator can't be reached or returns something unexpected, the API returns an `error` — it never fabricates a number.

## Why 66 Outside is link-only

`ride66express.com` serves its trip planner from a deliberately obfuscated JavaScript bundle that posts to a theme `ajax.php`. We read that as a do-not-automate signal and did not reverse it. The adapter slot exists; enabling it should start with a conversation with the operator.

## Fragility and risk

- **Undocumented endpoints.** Both adapters use the internal endpoints the operators' own pages call. A site redesign breaks them silently; the adapters then fail closed and the UI shows the official link.
- **Rate limits are unknown.** Responses are cached (mappings 24h, 495 feed and current I-66 prices 60s, historical I-66 prices 24h) with single-flight, so bursts of clicks don't fan out to the operators.
- **Terms of use.** `robots.txt` on both sites allows these paths, but neither publishes an API or terms for automated access. This is a demo; a public deployment should get the operators' OK.
- **Latency.** `vai66tolls.com` handlers can take several seconds; upstream calls time out at 15s.

## Out of scope

Live prices for 66 Outside, accounts, E-ZPass / HOV Flex linking, scraping beyond the calls above. See [PLAN.md](./PLAN.md).

Rules are summarized from VDOT, Transurban and 66 Express public pages (checked Sep 2026). Unofficial; not affiliated with any operator or E-ZPass.
