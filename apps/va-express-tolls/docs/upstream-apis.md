# Upstream operator HTTP calls

Every price this app shows comes from an HTTP call to an operator's own public
calculator. None of these endpoints is documented or versioned by the operator;
this file records exactly what we call, what we read from the answer, and how it
is likely to break. Field names below are the ones the adapters actually depend on
(see the `interface` declarations in each adapter); everything else in the
responses is ignored.

Common to all calls (`server/http.ts`): browser-like `User-Agent` with a
`va-express-tolls-demo` suffix, `Accept: text/html,application/json;q=0.9,*/*;q=0.8`,
15 s timeout, redirects followed, non-2xx → `UpstreamError` (502). Fixtures below
are shape-only: trimmed to the fields we read, with illustrative values.

## 1. Transurban — 495 / 395 / 95 Express Lanes

Adapter: `server/adapters/expresslanes.ts` (one factory, three corridors; `pathPrefix`
`495` / `395` / `95` selects the entries). Two calls, both shared by all three corridors.

### 1a. Entry/exit → O/D mapping

| | |
| --- | --- |
| Method / URL | `GET https://expresslanes.com/themes/custom/transurbangroup/js/on-the-road/entry_exit.js` |
| Params / headers | none beyond the common ones |
| Response | JavaScript: `var entryExits = {…};` — a JSON-ish literal with a few `//` comment lines and trailing commas |
| Cache | 24 h (`xl:mapping`) |

Fields we depend on:

- `entryExits.Northbound` / `.Southbound` → `{ entries: Record<id, Entry>, exits: Record<id, Point> }`
- `Point`: `id`, `label`, `path` (road tag such as `495North`, `395South`, `95`; matched by prefix), `latitude`, `longitude` (strings; dropped if not finite)
- `Entry` additionally has `exits: [{ id, ods: string[] }]` — the O/D ids to price for that entry→exit pair (one per road crossed)

Fixture (shape):

```js
var entryExits = {
  "Northbound": {
    "entries": {
      "e1": { "id": "e1", "label": "Example Rd", "path": "495North", "latitude": "38.80", "longitude": "-77.20",
              "exits": [ { "id": "x1", "ods": ["101"] }, { "id": "x2", "ods": ["101", "205"] } ] }, // trailing comma tolerated
    },
    "exits": { "x1": { "id": "x1", "label": "Example Pkwy", "path": "495North", "latitude": "38.85", "longitude": "-77.22" } }
  },
  "Southbound": { "entries": {}, "exits": {} }
};
```

### 1b. Live price feed

| | |
| --- | --- |
| Method / URL | `GET https://expresslanes.com/maps-api/infra-price-confirmed-all` |
| Params / headers | `Referer: https://expresslanes.com/map-your-trip/` (sent to look like the operator's page; not verified to be required) |
| Response | JSON |
| Cache | 60 s (`xl:feed`), then the 3 min per-trip estimate cache in `server/index.ts` |

Fields we depend on:

- `error` — must be the string `"0"`; otherwise we surface `error_text`
- `response[]` rows: `od` (`"od_<id>"`, joined to the mapping's `ods`), `price` (string, parsed as float), `road` (`"495"`, `"395"`, `"95"` or `"null"`; 95 and 395 are labelled as one road), `time` (`"YYYY-MM-DD HH:mm:ss"` Eastern, or `"null"`), `status` (`"closed"` suppresses the total)
- `direction_95` — `"N"` or `"S"`: which way the reversible 95/395 lanes are open. Missing/other → treated as "reversing".

Fixture (shape):

```json
{
  "error": "0",
  "error_text": "",
  "direction_95": "N",
  "response": [
    { "od": "od_101", "price": "3.25", "road": "495", "time": "2026-09-09 08:00:00", "status": "open" },
    { "od": "od_205", "price": "1.10", "road": "95",  "time": "2026-09-09 08:00:00", "status": "open" }
  ]
}
```

Fragility:

- The mapping is parsed by slicing between `var entryExits =` and the first `\n};`, stripping `//` lines and trailing commas, then `JSON.parse`. Any other JS syntax (single quotes, functions, a renamed variable, a different closing indent) fails closed with "file has changed shape". We deliberately never `eval` it.
- The mapping URL is a theme asset path (`themes/custom/transurbangroup/...`); a Drupal theme rename or asset hashing breaks it.
- `price` for a closed reversible direction can be a stale figure; we rely on `direction_95` and `status` to suppress it. If either field disappears, stale prices would be shown as current.
- The feed refreshes roughly hourly on the operator's side; `time` is assumed Eastern (`-04:00` is appended, which is wrong during standard time).

## 2. VDOT — I-66 Inside the Beltway (vai66tolls.com)

Adapter: `server/adapters/vai66.ts`. All calls are Razor Pages handlers on one page:
`GET https://www.vai66tolls.com/Index?handler=<Name>&…`. Direction is passed as
`rbEastVal=true|false` (eastbound / westbound).

| Handler | Query params | Response | Cache |
| --- | --- | --- | --- |
| `BeginIntPartial` | `rbEastVal` | HTML fragment: `<option value="<id>">label</option>` list of entry interchanges + inline `new Exit(...)` script | 24 h (part of `vai66:points:<eb>`) |
| `ExitIntPartial` | `bIntId=<entryId>`, `rbEastVal` | same shape, exits reachable from that entry (one call per entry, fanned out in parallel) | 24 h (same key) |
| `TollCalcPartial` | `bIntId`, `eIntId`, `datePicked=MM/DD/YYYY`, `timePicked=h : mm am`, `rbEastVal`, `isCurrent=true|false` | JSON `{ decToll, jsToRun? }` | 60 s for current, 24 h for historical (`vai66:est:<params>`) |

Fields we depend on:

- `<option value="…">…</option>` pairs (`parseOptions`); an empty `value` is the placeholder and skipped. Zero entry options → `UpstreamError`.
- Coordinates: regex over the inline script `new Exit('Name', 0, 0, 'eb'|'wb', <id>, <lat>, <lng>, …)`; missing coordinates are tolerated (points render without a map marker).
- `TollCalcPartial.decToll` — number or numeric string; `0` means "not tolled at that time". Non-numeric → `UpstreamError`.

Fixtures (shape):

```html
<!-- BeginIntPartial / ExitIntPartial -->
<option value="">Select</option>
<option value="12">Example Interchange</option>
<script>markers.push(new Exit('Example Interchange', 0, 0, 'eb', 12, 38.88, -77.20, 'ex'));</script>
```

```json
{ "decToll": 4.5, "jsToRun": "" }
```

Fragility:

- `datePicked` / `timePicked` are the page's exact form formats (note the spaces in `"8 : 05 am"`), built with `Intl` in `America/New_York`; a form redesign changes both.
- Historical pricing is only accepted for past times; the operator ignores future dates, so we reject them client-side.
- Handlers are slow (several seconds each); `points()` issues one `ExitIntPartial` per entry, so a cold cache is ~N+1 calls. Any anti-forgery token added to these handlers would break all three.
- Razor handler names (`?handler=…`) and parameter names (`bIntId`, `eIntId`, `rbEastVal`) are internal to the page and unversioned.

## 3. 66 Express Mobility Partners — I-66 Outside the Beltway (ride66express.com)

Adapter: `server/adapters/ride66.ts`, with the vendored start → exit-chain table and
marker coordinates in `server/adapters/ride66-map.ts`.

### 3a. Planner page (entry gantries + bundle URL)

| | |
| --- | --- |
| Method / URL | `GET https://ride66express.com/pricing/plan-your-trip/` |
| Response | HTML |
| Cache | 24 h (`r66:page`) |

Fields we depend on: `<select id="gantry-start-east">` / `gantry-start-west` containing
`<option value="<gantryId>">label</option>` (the planner's mobile fallback UI), and the
`src` of the `plan-your-trip.js` bundle.

### 3b. Bundle (token field name)

`GET <src of plan-your-trip.js>` — cached 24 h (`r66:token`). Regex for
`const <name> = …;function _0x…(){…}let map,gantry_id` to read the name of one extra
form field the planner posts. Falls back to the hard-coded `xvWr` on any failure, and
the estimate retries once with the fallback if the live name is rejected.

### 3c. Price call

| | |
| --- | --- |
| Method / URL | `POST https://ride66express.com/wp-content/themes/i66/theme-ajax.php` |
| Headers | `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`, `X-Requested-With: XMLHttpRequest`, `Referer: https://ride66express.com/pricing/plan-your-trip/`, `Origin: https://ride66express.com` |
| Body | `action=api_call`, `data[starting_gantry_id]`, `data[ending_gantry_id]`, `data[middle_ending_gantry_id]`, `data[first_ending_gantry_id]` (the exit's tolling chain, last/middle/first; blank when shorter), `data[<token>]=1`, `data[response]=` |
| Response | JSON, ~350 KB (today's full rate-change log for every gantry) |
| Cache | 60 s (`r66:est:<start>:<chain>`), then the 3 min estimate cache |

Fields we depend on:

- `success` (boolean); on `false`, `data.error` is surfaced
- `data.curl_response.rates[]`: `rateStartDate` (`"YYYY-MM-DD HH:mm:ss"`, compared as strings to pick the latest per gantry), `gantry.gantryId` (number), `gantry.vehicleClasses[].vehicleClassId` (we use class `1`) and `.rateAmountTag` (number, dollars)
- Total = sum of the latest class-1 `rateAmountTag` at each gantry in `[start, …chain]`; any gantry with no rate today → `total: null`.

Fixture (shape, trimmed to two rates):

```json
{
  "success": true,
  "data": {
    "date": "2026-09-09",
    "curl_response": {
      "result": 0,
      "description": "OK",
      "rates": [
        { "rateStartDate": "2026-09-09 07:00:00",
          "gantry": { "gantryId": 407, "vehicleClasses": [ { "vehicleClassId": 1, "rateAmountTag": 2.75 } ] } },
        { "rateStartDate": "2026-09-09 07:30:00",
          "gantry": { "gantryId": 407, "vehicleClasses": [ { "vehicleClassId": 1, "rateAmountTag": 3.1 } ] } }
      ]
    }
  }
}
```

Fragility (highest of the three):

- The start → exit → gantry-chain table is not served by any endpoint; the planner builds it inside an obfuscated bundle, so it is vendored in `ride66-map.ts` (captured 2026-09-09). The live `<select>` entry list is validated against it and mismatches fail closed rather than guessing.
- The token field name is read by a regex against minified/obfuscated code; a rebuild that reorders declarations silently drops us to the `xvWr` fallback, which stops working whenever the operator rotates it.
- The per-gantry summation and "latest rate wins" rule are reproduced from the page's JavaScript, not from any spec; if the planner changes its arithmetic our totals diverge without error.
- WordPress theme path (`wp-content/themes/i66/`) and `action=api_call` are theme internals; the response is large and unpaginated, so a slower origin can hit the 15 s timeout.
- `rateStartDate` is assumed Eastern; `-04:00` is appended unconditionally.

## Where things fail closed

All adapters throw `UpstreamError` (502) or `BadRequest` (400) rather than returning a
number they cannot justify; `server/index.ts` maps those to `{ error }` and negative-caches
failures for 30 s. See the README's "Fragility and risk" section for the product-level view.
