import type { Job, LatamEligibility, Seniority, WorkMode } from "@shared/types"

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "Unknown",
}

export const LATAM_LABEL: Record<LatamEligibility, string> = {
  latam_mx_br: "LatAm MX/BR",
  us_only: "US only",
  unknown: "Unknown",
}

export const SENIORITY_LABEL: Record<Seniority, string> = {
  entry: "Entry",
  associate: "Associate",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  manager: "Manager",
  unknown: "Unknown",
}

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

const SYMBOL: Record<string, string> = { USD: "$", CAD: "CA$", AUD: "A$", EUR: "€", GBP: "£" }

/** "$165k-$225k", "$185k", "€86k-€122k", or "Not listed". */
export function formatPay(job: Pick<Job, "salaryMin" | "salaryMax" | "salaryCurrency">): string {
  const { salaryMin: min, salaryMax: max } = job
  if (min === null && max === null) return "Not listed"
  const sym = SYMBOL[job.salaryCurrency ?? "USD"] ?? `${job.salaryCurrency} `
  if (min !== null && max !== null && min !== max) return `${sym}${compact(min)}-${sym}${compact(max)}`
  return `${sym}${compact(max ?? min ?? 0)}`
}

const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.35, "week"],
  [12, "month"],
]

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function timeAgo(iso: string, now = Date.now()): string {
  let value = (Date.parse(iso) - now) / 1000
  for (const [step, unit] of UNITS) {
    if (Math.abs(value) < step) return rtf.format(Math.round(value), unit)
    value /= step
  }
  return rtf.format(Math.round(value), "year")
}
