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
