# VA Express Tolls — iOS

Native SwiftUI iPhone client for the [`va-express-tolls`](../va-express-tolls) API. Pick a corridor (495, 395, 95 Express, I-66 Inside, I-66 Outside), an entry and an exit, and the app shows the unofficial estimate the operator's own public calculator reports right now — fetched by the Bun API, never computed on the phone.

This is a Swift package plus an XcodeGen spec, not a Bun app: `bun run dev` does not apply here. The API it needs is the sibling app.

```
project.yml                  XcodeGen spec → VAExpressTolls.xcodeproj (generated, git-ignored)
App/                         SwiftUI app target (iOS 17+): corridor list → trip → estimate, API settings
TollsKit/                    Swift package, Foundation only: API models + client, I-66 Inside schedule, static caveats
  Tests/TollsKitTests/       15 tests: decoding fixtures, fail-closed rules, URL building, schedule, formatting
PLAN.md                      design notes
```

## 1. Run the API

The app talks to `GET /api/corridors`, `GET /api/:corridor/points`, `GET /api/:corridor/estimate` — the routes documented in [`../va-express-tolls/README.md`](../va-express-tolls/README.md).

```bash
cd apps/va-express-tolls
bun install
bun run dev:api            # Bun API only, on http://localhost:8787
```

The app's default base URL is `http://localhost:8787`. In the iOS Simulator, localhost is the Mac's localhost, so that is all you need. On a physical iPhone, open the gear icon and enter the Mac's LAN address (`http://192.168.x.y:8787`; plain `http` is permitted for local networks only via `NSAllowsLocalNetworking`). Any non-local deployment must be `https`.

## 2. Build in Xcode (Mac)

Requires Xcode 15.3+ (iOS 17 SDK). Two ways to get a project:

**With XcodeGen** (recommended; the `.xcodeproj` is generated and git-ignored):

```bash
brew install xcodegen
cd apps/va-express-tolls-ios
xcodegen generate
open VAExpressTolls.xcodeproj
```

Pick an iPhone simulator and press Run. For a device, set your team under Signing & Capabilities (or `DEVELOPMENT_TEAM=ABCDE12345 xcodegen generate`).

**Without XcodeGen:** in Xcode, File → New → Project → iOS → App, name `VAExpressTolls`, interface SwiftUI, save it into this folder. Delete the template `ContentView.swift`/`VAExpressTollsApp.swift`, drag the `App/` folder into the target, then File → Add Package Dependencies → Add Local… → choose `TollsKit/` and add the `TollsKit` library to the target. In the target's Info tab add `App Transport Security Settings → Allows Local Networking = YES`.

Command line, from this folder after `xcodegen generate`:

```bash
xcodebuild -project VAExpressTolls.xcodeproj -scheme VAExpressTolls \
  -destination 'platform=iOS Simulator,name=iPhone 16' build

(cd TollsKit && swift test)      # API-layer unit tests; no Xcode project needed
```

## 3. Screenshots / recording from the Simulator

With the app running in the Simulator and the API up:

```bash
xcrun simctl io booted screenshot ~/Desktop/va-tolls-495.png
xcrun simctl io booted recordVideo ~/Desktop/va-tolls-demo.mp4   # Ctrl-C to stop
```

Suggested proof: 495 (or 395/95 in its open direction) trip → price, and one I-66 corridor. Outside weekday peaks I-66 Inside correctly shows `$0.00` / "No toll".

## What the app does with the API

- `total: null` from the server (a closed reversible direction, a feed gap) is shown as **"No price published"** with the server's notes. `{ "error": ... }` responses are shown verbatim. The app never sums, derives or defaults a dollar figure.
- The `notice` returned by `/points` for 395/95 (which way the reversible lanes are open) sits above the trip form; a closed direction still lists points but every estimate comes back without a total.
- I-66 Inside shows a live schedule line ("Tolling now eastbound until 9:30 AM" / "Not tolled right now — …") computed from the weekday peak windows in Eastern time; it does not know about federal holidays, and the server's answer wins.
- Static HOV-3+ / E-ZPass Flex / schedule caveats per corridor, the unofficial-estimate disclaimer, the scrape-fragility and terms-of-use caveat, and a link to the official calculator appear under every result.

## Verified without a Mac

This folder was written on a Linux VM with no Xcode. What was proven there, with a Swift 6.3 toolchain:

- `swift build` and `swift test` in `TollsKit/` — 15/15 passing.
- An end-to-end smoke script using `TollsKit` against the live Bun API returned real prices for all five corridors (e.g. 495 Route 267 → GW Pkwy `$13.25`, 66 Inside Washington → I-66 West `$8.60`), `nil` totals for the closed 95/395 northbound direction, and an error (not a number) for an unreachable exit.
- `swiftc -parse` on every file in `App/`.

Not proven there: compiling the SwiftUI views against the iOS SDK and running in the Simulator. Both require a Mac; the steps above are what to run.

## Not in this cut

Map, historical I-66 Inside pricing, the I-66 ↔ 495 two-toll prompt, widgets, iPad layout. Unofficial; not affiliated with any operator or E-ZPass.
