import type { Salary, WorkMode } from "../../shared/types"
import type { Board } from "../boards"
import { htmlToText, jobIdFor, type Posting } from "../posting"

export type LeverPosting = {
  id: string
  text: string
  hostedUrl: string
  applyUrl?: string
  country?: string
  workplaceType?: string
  categories?: { commitment?: string; location?: string; allLocations?: string[]; team?: string }
  descriptionPlain?: string
  descriptionBodyPlain?: string
  additionalPlain?: string
  lists?: { text: string; content: string }[]
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string } | null
}

export type LeverPayload = LeverPosting[]

export const leverUrl = (slug: string) => `https://api.lever.co/v0/postings/${slug}?mode=json`

const WORKPLACE: Record<string, WorkMode> = { remote: "remote", hybrid: "hybrid", onsite: "onsite", "on-site": "onsite" }

export function leverSalary(p: LeverPosting): Salary | null {
  const r = p.salaryRange
  if (!r || !/year/i.test(r.interval ?? "year")) return null
  if (typeof r.min !== "number" && typeof r.max !== "number") return null
  return { min: r.min ?? null, max: r.max ?? null, currency: r.currency ?? "USD" }
}

export function parseLever(payload: LeverPayload, board: Board): Posting[] {
  return payload.map((p) => {
    const all = p.categories?.allLocations ?? []
    const locations = [...new Set([p.categories?.location, ...all].map((s) => s?.trim()).filter((s): s is string => !!s))]
    const lists = (p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n")
    return {
      jobId: jobIdFor(board, p.id),
      title: p.text.trim(),
      url: p.hostedUrl,
      location: locations.length ? locations.slice(0, 3).join("; ") : null,
      locations,
      text: [p.descriptionBodyPlain ?? p.descriptionPlain ?? "", lists, p.additionalPlain ?? ""].join("\n"),
      workMode: WORKPLACE[(p.workplaceType ?? "").toLowerCase()] ?? null,
      salary: leverSalary(p),
      employmentType: p.categories?.commitment ?? null,
      raw: p,
    }
  })
}
