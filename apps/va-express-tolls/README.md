# VA Express Tolls

One public page for Northern Virginia drivers: pick a corridor, read the tolling rules in plain English, and open that corridor's **official** toll calculator. No login, no fake prices.

Corridors covered:

| Corridor | Operator | Official calculator |
| --- | --- | --- |
| 495 Express Lanes | Transurban | https://expresslanes.com/map-your-trip/ |
| I-66 Inside the Beltway | VDOT | https://vai66tolls.com/ |
| I-66 Outside the Beltway | I-66 Express Mobility Partners | https://ride66express.com/pricing/plan-your-trip/ |

## Quick start

```bash
cd apps/va-express-tolls
bun install
bun run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

Other scripts: `bun run build` (typecheck + production build to `dist/`), `bun run preview`, `bun run lint`.

## What it does

1. Choose a corridor. The choice is mirrored into the URL hash (`#495`, `#66-inside`, `#66-outside`) so you can share a link to a specific corridor.
2. Read that corridor's rules: when tolls apply, how the price is set, HOV-3+ / E-ZPass Flex, what's free. For I-66 Inside the Beltway there is a schedule-based "tolling now / free right now" hint (weekday peak windows, Eastern time; it does not know about federal holidays).
3. Tap the primary button to open the operator's official calculator in a new tab. That calculator is the only source of prices. Underneath, "What you'll see there" explains the official UI (they are map/gantry pickers, not address search; one shows historical averages; one needs a Refresh tap), and small links to the other two calculators cover trips that cross operators.
4. Read the caveats: the overhead sign is the real price and web estimates can differ from it, E-ZPass is required, and an I-66 → I-495 trip crosses operators so it is two tolls.

## Out of scope

Live toll APIs (none are public), scraping, any price shown by this app, accounts, E-ZPass / HOV Flex linking. See [PLAN.md](./PLAN.md).

## Stack

- Bun + Vite + React 19 + TypeScript (mirrors `apps/pstack-playbook-demo`)
- Tailwind v4 + shadcn/ui (`button`, `card`, `badge` only)

## Project layout

```
src/
  data/corridors.ts   — corridor rules, notes, official calculator links
  lib/schedule.ts     — I-66 Inside the Beltway peak-window helper
  components/ui/      — shadcn primitives
  App.tsx             — one-screen flow
```

Rules are summarized from VDOT, Transurban and 66 Express public pages (checked Sep 2026). This is an unofficial guide, not affiliated with any operator or E-ZPass.
