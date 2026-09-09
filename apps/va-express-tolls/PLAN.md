# VA Express Tolls — Plan

## Goal

One public, mobile-friendly page where a Northern Virginia driver picks a corridor, reads the rules in plain English, and jumps straight to that corridor's **official** toll calculator — without hunting across three operator sites.

## Single-user MVP

1. Pick a corridor: **495 Express Lanes** · **I-66 Inside the Beltway** · **I-66 Outside the Beltway**
2. Read that corridor's rules (hours, HOV-3+ / E-ZPass Flex, what's free)
3. Tap one primary button that opens the official calculator for that corridor
4. Read the caveats that trip people up (estimates vs. gantry price, E-ZPass required, 66→495 = two operators = two tolls)

Corridor selection is mirrored into the URL hash (`#66-inside`) so a link can be shared to a specific corridor. No login, no backend, no analytics.

## Explicitly out of scope

- Live or "estimated" prices rendered by this app — there is no public API and we will **not** fake numbers. The operator calculators are the single source of truth.
- Scraping operator sites.
- Accounts, E-ZPass / HOV Flex linking, trip history.
- 95/395 Express Lanes, Dulles Toll Road (different corridors; easy to add later as data rows).

## What is reused from the monorepo

- Stack and config copied verbatim from `apps/pstack-playbook-demo`: Bun + Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (`new-york`, neutral), oxlint. Same `tsconfig*`, `vite.config.ts`, `components.json`, `bunfig.toml` (`minimumReleaseAge = 259200`), `index.css` theme.
- shadcn primitives copied as-is: `button`, `card`, `badge`. Nothing else pulled in.

## What is NOT added

- No router library (URL hash is enough for one screen).
- No state library, no data fetching, no forms, no select/dialog components.
- No new shared packages or monorepo-level tooling.
- No media committed to the branch (screenshots/video live only as PR artifacts).

## Structure

```
src/
  data/corridors.ts     — the three corridors: rules, caveats, official calculator URL
  lib/schedule.ts       — pure helper: is 66 Inside tolling right now (America/New_York)
  App.tsx               — one screen: picker → rules → CTA → notes
  components/ui/        — button, card, badge (copied from sibling app)
```

## Tasks (vertical slices)

1. Scaffold from sibling app; `bun install` succeeds.
2. Corridor data + picker + rules card + official-calculator CTA render for all three corridors.
3. Shared caveats section; hash-synced selection; 66 Inside "tolling now?" hint.
4. README, typecheck/lint/build clean, PR with screenshot + video artifacts.

## Deferred

- 95/395 Express Lanes and Dulles Toll Road rows
- Federal-holiday awareness for the 66 Inside status hint (currently a schedule-only hint with a caveat)
- Cloudflare Pages preview wiring (monorepo-level, not per app)

## Success criteria

- `bun install && bun run dev` works from `apps/va-express-tolls/`
- Every corridor shows correct rules and a working deep-link to its official calculator
- No prices anywhere in the UI
- PR includes at least one screenshot and one video of the running app
