import type { Direction } from "../../src/lib/api-types"

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
