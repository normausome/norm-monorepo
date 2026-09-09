export type CorridorId = "495" | "66-inside" | "66-outside"

export interface Corridor {
  id: CorridorId
  name: string
  shortName: string
  operator: string
  extent: string
  /** One-line answer to "when am I charged?" */
  whenTolled: string
  /** When tolls apply, this is how the price is set. */
  pricing: string
  rules: string[]
  calculator: {
    url: string
    label: string
    host: string
  }
}

export const CORRIDORS: readonly Corridor[] = [
  {
    id: "495",
    name: "495 Express Lanes",
    shortName: "495",
    operator: "Transurban",
    extent:
      "I-495 (Capital Beltway) from the Springfield Interchange north to the George Washington Memorial Parkway, just before the American Legion Bridge.",
    whenTolled: "Tolled 24 hours a day, 7 days a week.",
    pricing:
      "Dynamic pricing: the toll changes with traffic and is posted on overhead signs before you enter. You pay for the segments you drive.",
    rules: [
      "E-ZPass or E-ZPass Flex is required — no cash, no toll booths.",
      "HOV-3+ rides free with an E-ZPass Flex switched to HOV mode before you enter.",
      "Motorcycles ride free; buses ride free with a properly classified E-ZPass.",
      "The northern extension (opened Nov 2025) adds direct ramps to/from the GW Parkway and Dulles Toll Road.",
    ],
    calculator: {
      url: "https://expresslanes.com/map-your-trip/",
      label: "Open the 495 Express Lanes trip calculator",
      host: "expresslanes.com",
    },
  },
  {
    id: "66-inside",
    name: "I-66 Inside the Beltway",
    shortName: "66 Inside",
    operator: "VDOT",
    extent:
      "I-66 from I-495 (Capital Beltway) east to US-29 in Rosslyn. All lanes become Express Lanes during peak hours.",
    whenTolled:
      "Peak direction only, Monday–Friday: eastbound 5:30–9:30 AM, westbound 3:00–7:00 PM. Free at all other times, including weekends and federal holidays.",
    pricing:
      "Dynamic pricing during peak hours only, based on traffic volume and travel speed. Priced by the distance you travel between gantries.",
    rules: [
      "Every lane is tolled in the peak direction during peak hours — there are no free general-purpose lanes.",
      "E-ZPass or E-ZPass Flex is required during peak hours. No transponder means a mailed invoice (or pay online within 6 days).",
      "HOV-3+ rides free with an E-ZPass Flex switched to HOV mode before you enter (changed from HOV-2 on Dec 5, 2022).",
      "Motorcycles ride free with no E-ZPass required. Buses ride free.",
    ],
    calculator: {
      url: "https://vai66tolls.com/",
      label: "Open the I-66 Inside the Beltway toll calculator",
      host: "vai66tolls.com",
    },
  },
  {
    id: "66-outside",
    name: "I-66 Outside the Beltway",
    shortName: "66 Outside",
    operator: "I-66 Express Mobility Partners",
    extent:
      "Two Express Lanes in each direction of I-66 for 22.5 miles between I-495 (Capital Beltway) and US-29 in Gainesville, alongside three free general-purpose lanes.",
    whenTolled: "Tolled 24 hours a day, 7 days a week.",
    pricing:
      "Dynamic pricing in three segments. The price on the overhead sign locks in for that segment when you pass it; you pay only for segments you drive.",
    rules: [
      "E-ZPass or E-ZPass Flex is required — no cash, no toll booths.",
      "HOV-3+ rides free 24/7 with an E-ZPass Flex switched to HOV mode before you enter.",
      "Larger vehicles (3+ axles, or over 18 ft long / 7 ft tall) pay a higher rate and are not HOV-eligible.",
      "The three general-purpose lanes next to the Express Lanes are always free.",
    ],
    calculator: {
      url: "https://ride66express.com/pricing/plan-your-trip/",
      label: "Open the 66 Express Outside the Beltway trip planner",
      host: "ride66express.com",
    },
  },
]

export const DEFAULT_CORRIDOR: CorridorId = "495"

export function isCorridorId(value: string): value is CorridorId {
  return CORRIDORS.some((c) => c.id === value)
}

/** Caveats that apply no matter which corridor is selected. */
export const SHARED_NOTES: readonly { title: string; body: string }[] = [
  {
    title: "Estimates are estimates",
    body: "Web calculators show typical or recent prices. The toll you actually pay is the price shown on the overhead sign when you enter, which can differ from any web estimate.",
  },
  {
    title: "E-ZPass is required",
    body: "All three corridors are all-electronic. Carry a funded, properly mounted E-ZPass. Use an E-ZPass Flex in HOV mode if you qualify as HOV-3+ and want to ride free.",
  },
  {
    title: "I-66 to I-495 can mean two tolls",
    body: "I-66 Inside the Beltway, I-66 Outside the Beltway and the 495 Express Lanes are run by different operators. A trip that uses two of them is two separate tolls — estimate each leg on its own calculator.",
  },
]
