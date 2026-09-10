# VA Express Tolls (iOS)

Native SwiftUI client for the same Bun API as [`apps/va-express-tolls/`](../va-express-tolls/). It is a second front end — corridor labels, hours, and official calculator URLs ship in the app so the list works offline; live entry/exit lists and prices come from `/api`.

This is not a port of the playbook demo and it does not reimplement operator adapters.

## API base URL

Default is the Railway production host:

```text
https://dmvtolls.com
```

Same paths as the web app (`/api/corridors`, `/api/:corridor/points`, `/api/:corridor/estimate`). Native `URLSession` does not need CORS. HTTPS needs no ATS exception.

For a local Bun server instead:

```bash
cd apps/va-express-tolls && bun run dev
# In Xcode scheme env, or when launching:
TOLL_API_BASE=http://127.0.0.1:8787
```

`api.dmvtolls.com` is not configured yet. Use `https://dmvtolls.com` until that CNAME exists.

## Open in Xcode

```bash
cd apps/va-express-tolls-ios
xcodegen generate
open VAExpressTolls.xcodeproj
```

Pick the **iPhone 17** simulator and Run. The five corridors render from the bundled catalog even if the API is down. With production (or local Bun) up, choose a direction / entry / exit and tap **Get estimate**.

### App Transport Security

Production HTTPS needs nothing extra. Local HTTP still works via:

- `NSAllowsLocalNetworking`
- exception domains for `127.0.0.1` and `localhost`

## Build and test (iPhone 17, iOS 26.5)

From `apps/va-express-tolls-ios/`:

```bash
xcodegen generate

xcodebuild \
  -scheme VAExpressTolls \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' \
  -derivedDataPath build \
  test

xcodebuild \
  -scheme VAExpressTolls \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' \
  -derivedDataPath build \
  build
```

Unit tests decode fixture estimates (`total` 23.15, `0`, and `null`) through `Decimal(string:)` so money never round-trips a `Double`. Those tests do not need the API. A live estimate still needs `bun run dev`.

## API used

Same contract as `apps/va-express-tolls/src/lib/api.ts`:

```
GET /api/corridors
GET /api/:corridor/points?direction=
GET /api/:corridor/estimate?direction=&entry=&exit=[&at=ISO]
```

`at` is a zone-less `YYYY-MM-DDTHH:mm` Eastern wall-clock, used only for I-66 Inside historical times.

## Layout

```
VAExpressTolls/           SwiftUI app (iOS 17+)
  API/TollAPIClient.swift URLSession
  Store/EstimatorStore.swift  corridor + draft trip + QuoteState
  Catalog/                bundled corridors + I-66 Inside schedule
  Domain/                 api-types.swift shapes, Decimal estimate decode
VAExpressTollsTests/      JSON fixtures + schedule tests
project.yml               XcodeGen
```
