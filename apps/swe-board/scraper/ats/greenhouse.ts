import type { Board } from "../boards"
import { htmlToText, jobIdFor, type Posting } from "../posting"

export type GreenhouseJob = {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  offices?: { name?: string; location?: string | null }[]
  content?: string
  updated_at?: string
}

export type GreenhousePayload = { jobs: GreenhouseJob[] }

export const greenhouseUrl = (slug: string) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`

export function parseGreenhouse(payload: GreenhousePayload, board: Board): Posting[] {
  return payload.jobs.map((j) => {
    const primary = j.location?.name?.trim() || null
    const offices = (j.offices ?? []).map((o) => o.location ?? o.name ?? "").filter(Boolean)
    return {
      jobId: jobIdFor(board, j.id),
      title: j.title.trim(),
      url: j.absolute_url,
      location: primary,
      locations: [...new Set([primary, ...offices].filter((s): s is string => !!s))],
      text: htmlToText(j.content ?? ""),
      workMode: null,
      salary: null,
      employmentType: null,
      raw: j,
    }
  })
}
