export type InsideBeltwayStatus =
  | { tolling: true; direction: "eastbound" | "westbound"; until: string }
  | { tolling: false; next: string }

const TZ = "America/New_York"

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const hour = Number(get("hour")) % 24
  const minute = Number(get("minute"))
  return { weekday: get("weekday"), minutes: hour * 60 + minute }
}

/**
 * Schedule-only view of I-66 Inside the Beltway tolling (weekdays, EB 5:30–9:30 AM,
 * WB 3:00–7:00 PM Eastern). Does not account for federal holidays, when the lanes are free.
 */
export function insideBeltwayStatus(now = new Date()): InsideBeltwayStatus {
  const { weekday, minutes } = easternParts(now)
  const weekend = weekday === "Sat" || weekday === "Sun"
  const am = { start: 5 * 60 + 30, end: 9 * 60 + 30 }
  const pm = { start: 15 * 60, end: 19 * 60 }

  if (!weekend) {
    if (minutes >= am.start && minutes < am.end) {
      return { tolling: true, direction: "eastbound", until: "9:30 AM" }
    }
    if (minutes >= pm.start && minutes < pm.end) {
      return { tolling: true, direction: "westbound", until: "7:00 PM" }
    }
    if (minutes < am.start) return { tolling: false, next: "eastbound tolls start 5:30 AM" }
    if (minutes < pm.start) return { tolling: false, next: "westbound tolls start 3:00 PM" }
  }
  return {
    tolling: false,
    next: weekday === "Fri" || weekend ? "eastbound tolls resume Monday 5:30 AM" : "eastbound tolls resume 5:30 AM tomorrow",
  }
}

export type ReversibleDirection = "nb" | "sb"
export type ReversibleStatus =
  | { open: ReversibleDirection; until: string }
  | { open: null; next: ReversibleDirection; opensAt: string }

/**
 * Approximate direction of the reversible 95/395 Express Lanes from Transurban's
 * published schedule (expresslanes.com/learn-the-lanes), Eastern time. Weekdays: NB
 * ~2:30–10 AM, SB noon–1 AM, closed for reversal in between (no 1–2:30 AM closure
 * on Monday, when Sunday's northbound run continues). Saturday: SB until 2 PM, closed
 * 2–4 PM, NB from 4 PM. Sunday: NB all day. Holidays, events and incidents differ —
 * the operator's live feed and the signs always win.
 */
export function reversibleStatus(now = new Date()): ReversibleStatus {
  const { weekday, minutes } = easternParts(now)
  const nb = (until: string): ReversibleStatus => ({ open: "nb", until })
  const sb = (until: string): ReversibleStatus => ({ open: "sb", until })
  const closed = (next: ReversibleDirection, opensAt: string): ReversibleStatus => ({ open: null, next, opensAt })

  if (weekday === "Sun") return nb("about 10 AM Monday")
  if (weekday === "Sat") {
    if (minutes < 14 * 60) return sb("about 2 PM")
    if (minutes < 16 * 60) return closed("nb", "about 4 PM")
    return nb("about 10 AM Monday")
  }
  if (weekday !== "Mon") {
    if (minutes < 60) return sb("about 1 AM")
    if (minutes < 2 * 60 + 30) return closed("nb", "about 2:30 AM")
  }
  if (minutes < 10 * 60) return nb("about 10 AM")
  if (minutes < 12 * 60) return closed("sb", "about noon")
  return sb(weekday === "Fri" ? "about 2 PM Saturday" : "about 1 AM")
}
