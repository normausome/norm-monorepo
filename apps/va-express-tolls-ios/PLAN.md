# VA Express Tolls iOS — Plan

## Goal

A native SwiftUI iPhone app where a Northern Virginia driver picks a corridor, an entry and an exit and sees the same unofficial dollar estimate the web app shows — fetched from the existing `apps/va-express-tolls` Bun API, never computed on-device.

## Where it lives

`apps/va-express-tolls-ios/`, next to the API it consumes. The monorepo is "one app per folder under `apps/`"; this is the iOS face of the same pick. It is **not** a Bun app (`bun run dev` does not apply); it is a Swift package plus an XcodeGen spec, and the README says so.

```
apps/va-express-tolls-ios/
  project.yml                 XcodeGen spec → VAExpressTolls.xcodeproj (generated, git-ignored)
  App/                        SwiftUI app target (iOS 17+)
  TollsKit/                   Swift package, Foundation only: models, API client, schedule, notes
    Sources/TollsKit/
    Tests/TollsKitTests/      decoding fixtures, fail-closed behaviour, schedule — runs on Linux too
```

The split exists for one reason: everything that can be compiled and tested without Xcode (the API contract and the fail-closed rules) lives in `TollsKit`, so `swift test` proves it on any Swift toolchain, including the Linux VM this was written on. The SwiftUI layer is thin and stays in `App/`.

## How it talks to the API

Plain `URLSession` + `Codable` against the three existing routes, mirroring `src/lib/api-types.ts` field for field:

```
GET /api/corridors                                → [Corridor]      (supported, directions, historical, calculatorUrl)
GET /api/:corridor/points?direction=              → PointsResponse  (entries[].exits[], optional notice)
GET /api/:corridor/estimate?direction=&entry=&exit= → Estimate      (total: Double?, legs, source, notes)
```

- Base URL is a setting (`@AppStorage`), default `http://localhost:8787` — the simulator's localhost is the Mac's, so `bun run dev:api` in `apps/va-express-tolls` is all a Mac needs. A LAN IP works on a device (`NSAllowsLocalNetworking`); anything further away must be `https`.
- No scraping, no adapters, no vendored operator tables on the phone. The server already caches and fails closed; the app just relays.
- Non-2xx → decode `{ error }` and surface it verbatim. `total == null` → "No price published", with the server's `notes`. The app never derives, sums or defaults a dollar figure.
- Reversible 95/395: the `notice` string the API returns for a direction (which way the lanes are open right now) is shown above the form; a closed direction still lists points but prices come back `null`, which the app shows as such.

## MVP surface (one flow)

1. **Corridors** — list from `/api/corridors`; unsupported ones are disabled with the server's reason. Footer: unofficial disclaimer.
2. **Trip** — direction (segmented, when more than one), entry picker, exit picker (filtered by entry), "Get estimate".
3. **Result** — the figure, big; per-leg lines when >1; source + fetched-at; server `notes`; static corridor caveats (HOV-3+ / schedule, reversible warning, 66 Inside peak windows with a live "tolling now?" line); link to the official calculator.
4. **Settings** — API base URL.

## Out of scope (deferred)

Map, historical I-66 Inside pricing (`at=`), the I-66 ↔ 495 two-toll hint, widgets/Live Activities, offline caching, App Store assets, iPad layout.

## Verification on this VM

No Mac was reachable. A Linux Swift 6 toolchain compiles and tests `TollsKit`; the SwiftUI files are syntax-checked with `swiftc -parse` and reviewed by hand. Simulator screenshots are a documented gap in the PR, with the exact Mac steps in the README.
