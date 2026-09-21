import type { Direction } from "./trips"

/**
 * Exit options per (direction, starting gantry) as generated client-side by the
 * ride66express.com trip planner. Each exit lists the tolling-gantry chain the
 * planner submits (first, middle, ending). Captured from the live planner on
 * 2026-09-09 by selecting every start in the mobile <select>s; the entry list
 * itself is still scraped live and validated against these keys at runtime.
 */
export const EXITS_BY_START: Record<Extract<Direction, "eb" | "wb">, Record<string, { label: string; chain: string[] }[]>> = {
  eb: {
    // Western Entry
    "401": [
      { label: "Walney Rd/Rt28", chain: ["401"] },
      { label: "GP Exit/Fairfax County Pkwy", chain: ["401"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // University Boulevard
    "402": [
      { label: "Walney Rd/Rt28", chain: ["402"] },
      { label: "GP Exit/Fairfax County Pkwy", chain: ["402"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // Century Park/Balls Ford
    "403": [
      { label: "Walney Rd/Rt28", chain: ["403"] },
      { label: "GP Exit/Fairfax County Pkwy", chain: ["403"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // EB Slip Ramp Sudley Road
    "404": [
      { label: "Walney Rd/Rt28", chain: ["404"] },
      { label: "GP Exit/Fairfax County Pkwy", chain: ["404"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // Sudley Road
    "400": [
      { label: "Walney Rd/Rt28", chain: ["400"] },
      { label: "GP Exit/Fairfax County Pkwy", chain: ["400"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // EB Slip Ramp Rt 28
    "405": [
      { label: "GP Exit/Fairfax County Pkwy", chain: ["405"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // Rt 28 SB
    "406": [
      { label: "GP Exit/Fairfax County Pkwy", chain: ["406"] },
      { label: "Monument Dr", chain: ["407"] },
      { label: "Chain Bridge Rd", chain: ["407"] },
      { label: "Vaden Dr", chain: ["407","411"] },
      { label: "I-495 NB General Purpose", chain: ["407","411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["407","411"] },
      { label: "I-495 SB General Purpose", chain: ["407","411"] },
      { label: "EB GP Exit", chain: ["407","411"] },
    ],
    // Stringfellow Rd
    "408": [
      { label: "Monument Dr", chain: ["408"] },
      { label: "Chain Bridge Rd", chain: ["408"] },
      { label: "Vaden Dr", chain: ["408"] },
      { label: "I-495 NB General Purpose", chain: ["411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["411"] },
      { label: "I-495 SB General Purpose", chain: ["411"] },
      { label: "EB GP Exit", chain: ["411"] },
    ],
    // EB Monument Drive
    "409": [
      { label: "Chain Bridge Rd", chain: ["409"] },
      { label: "Vaden Dr", chain: ["411"] },
      { label: "I-495 NB General Purpose", chain: ["411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["411"] },
      { label: "I-495 SB General Purpose", chain: ["411"] },
      { label: "EB GP Exit", chain: ["411"] },
    ],
    // US-50 EB
    "410": [
      { label: "Chain Bridge Rd", chain: ["410"] },
      { label: "Vaden Dr", chain: ["411"] },
      { label: "I-495 NB General Purpose", chain: ["411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["411"] },
      { label: "I-495 SB General Purpose", chain: ["411"] },
      { label: "EB GP Exit", chain: ["411"] },
    ],
    // Chain Bridge Rd
    "411": [
      { label: "I-495 NB General Purpose", chain: ["411"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["411"] },
      { label: "I-495 SB General Purpose", chain: ["411"] },
      { label: "EB GP Exit", chain: ["411"] },
    ],
    // EB Braided Ramp
    "412": [
      { label: "I-495 NB General Purpose", chain: ["412"] },
      { label: "I-495 Express Lanes (NB & SB)", chain: ["412"] },
      { label: "I-495 SB General Purpose", chain: ["412"] },
      { label: "EB GP Exit", chain: ["412"] },
    ],
  },
  wb: {
    // Eastern Entry
    "417": [
      { label: "Chain Bridge Rd", chain: ["417"] },
      { label: "US-50 EB", chain: ["417"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // I-495 NB GP
    "416": [
      { label: "Chain Bridge Rd", chain: ["416"] },
      { label: "US-50 EB", chain: ["416"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // I-495 SB EL
    "414": [
      { label: "Chain Bridge Rd", chain: ["414"] },
      { label: "US-50 EB", chain: ["414"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // I-495 SB GP
    "413": [
      { label: "Chain Bridge Rd", chain: ["413"] },
      { label: "US-50 EB", chain: ["413"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // I-495 NB EL
    "415": [
      { label: "Chain Bridge Rd", chain: ["415"] },
      { label: "US-50 EB", chain: ["415"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // Vaden Drive
    "418": [
      { label: "Chain Bridge Rd", chain: ["418"] },
      { label: "US-50 EB", chain: ["418"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // WB Chain Bridge
    "419": [
      { label: "US-50 EB", chain: ["419"] },
      { label: "Monument Dr", chain: ["420"] },
      { label: "Stringfellow Rd", chain: ["420"] },
      { label: "GP Exit/Rt28 SB", chain: ["420"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["420"] },
      { label: "GP Exit/Sudley Rd", chain: ["420","423"] },
      { label: "Century Park", chain: ["420","423","425"] },
      { label: "University Blvd", chain: ["420","423","425"] },
      { label: "WB GP Exit", chain: ["420","423","425"] },
    ],
    // WB Monument Drive
    "421": [
      { label: "Stringfellow Rd", chain: ["421"] },
      { label: "GP Exit/Rt28 SB", chain: ["421"] },
      { label: "Rt28 NB/Walney Rd/Braddock Rd", chain: ["421"] },
      { label: "GP Exit/Sudley Rd", chain: ["423"] },
      { label: "Century Park", chain: ["423","425"] },
      { label: "University Blvd", chain: ["423","425"] },
      { label: "WB GP Exit", chain: ["423","425"] },
    ],
    // WB Cont Rt 28
    "423": [
      { label: "GP Exit/Sudley Rd", chain: ["423"] },
      { label: "Century Park", chain: ["425"] },
      { label: "University Blvd", chain: ["425"] },
      { label: "WB GP Exit", chain: ["425"] },
    ],
    // Rt 28 SB/Braddock Road
    "424": [
      { label: "GP Exit/Sudley Rd", chain: ["424"] },
      { label: "Century Park", chain: ["425"] },
      { label: "University Blvd", chain: ["425"] },
      { label: "WB GP Exit", chain: ["425"] },
    ],
  },
}

type LatLng = [number, number]

/**
 * Marker positions from the ride66express.com planner map, captured on 2026-09-09
 * by clicking every marker headlessly and reading the planner's gantry_id /
 * gantry_title globals. Entries are keyed by gantry id (the <select> value),
 * exits by label (their <select> values are tolling chains, not places).
 */
export const ENTRY_COORDS: Record<"eb" | "wb", Record<string, LatLng>> = {
  eb: {
    "401": [38.797889, -77.586642], // Western Entry
    "403": [38.799847, -77.541056], // Century Park/Balls Ford
    "400": [38.802642, -77.509267], // Sudley Road
    "406": [38.846317, -77.430192], // Rt 28 NB
    "408": [38.851894, -77.402242], // Stringfellow Rd
    "410": [38.862433, -77.343819], // US-50 EB
    "412": [38.879892, -77.238028], // EB Braided Ramp
    // Ramps below have no marker of their own on the planner map; positioned at the
    // same interchange using the planner's marker for the matching exit (approximate).
    "402": [38.797997, -77.585217], // University Boulevard (from WB exit University Blvd)
    "404": [38.805119, -77.502617], // EB Slip Ramp Sudley Road (from WB exit GP Exit/Sudley Rd)
    "405": [38.844561, -77.436311], // EB Slip Ramp Rt 28 (from EB exit Walney Rd/Rt28)
    "409": [38.857897, -77.369211], // EB Monument Drive (from EB exit Monument Dr)
    "411": [38.8668, -77.315938], // Chain Bridge Rd (from EB exit Chain Bridge Rd)
  },
  wb: {
    "417": [38.888133, -77.216675], // Eastern Entry
    "414": [38.887083, -77.220383], // I-495 SB EL
    "415": [38.883506, -77.223342], // I-495 NB EL
    "419": [38.868494, -77.311281], // WB Chain Bridge
    "423": [38.846267, -77.434333], // WB Cont Rt 28
    // Same approximation as above for select-only ramps.
    "416": [38.88349, -77.227531], // I-495 NB GP (from EB exit I-495 NB General Purpose)
    "413": [38.8863, -77.218878], // I-495 SB GP (from EB exit I-495 SB General Purpose)
    "418": [38.875846, -77.278247], // Vaden Drive (from EB exit Vaden Dr)
    "421": [38.860372, -77.356586], // WB Monument Drive (from WB exit Monument Dr)
    "424": [38.847313, -77.424212], // Rt 28 SB/Braddock Road (from WB exit Rt28 NB/Walney Rd/Braddock Rd)
  },
}

export const EXIT_COORDS: Record<"eb" | "wb", Record<string, LatLng>> = {
  eb: {
    "Walney Rd/Rt28": [38.844561, -77.436311],
    "GP Exit/Fairfax County Pkwy": [38.850375, -77.412569],
    "Monument Dr": [38.857897, -77.369211],
    "Chain Bridge Rd": [38.8668, -77.315938],
    "Vaden Dr": [38.875846, -77.278247],
    "I-495 NB General Purpose": [38.88349, -77.227531],
    "I-495 Express Lanes (NB & SB)": [38.885315, -77.221303],
    "I-495 SB General Purpose": [38.8863, -77.218878],
    "EB GP Exit": [38.888372, -77.215132],
  },
  wb: {
    "WB GP Exit": [38.799638, -77.59638],
    "University Blvd": [38.797997, -77.585217],
    "Century Park": [38.799875, -77.543156],
    "GP Exit/Sudley Rd": [38.805119, -77.502617],
    "GP Exit/Rt28 SB": [38.851142, -77.408053],
    "Rt28 NB/Walney Rd/Braddock Rd": [38.847313, -77.424212],
    "Stringfellow Rd": [38.853567, -77.394911],
    "Monument Dr": [38.860372, -77.356586],
    "US-50 EB": [38.864697, -77.337801],
    "Chain Bridge Rd": [38.870742, -77.302067],
  },
}
