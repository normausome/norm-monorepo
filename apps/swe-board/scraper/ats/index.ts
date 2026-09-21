import type { Ats, Board } from "../boards"
import type { Posting } from "../posting"
import { ashbyUrl, parseAshby, type AshbyPayload } from "./ashby"
import { greenhouseUrl, parseGreenhouse, type GreenhousePayload } from "./greenhouse"
import { leverUrl, parseLever, type LeverPayload } from "./lever"

export type Adapter = {
  url(slug: string): string
  parse(payload: unknown, board: Board): Posting[]
}

/** The payloads are external JSON. Check the top-level shape, then trust the ATS types. */
function jobsArray<T>(payload: unknown, ats: Ats): T {
  const jobs = Array.isArray(payload) ? payload : (payload as { jobs?: unknown } | null)?.jobs
  if (!Array.isArray(jobs)) throw new Error(`${ats} payload has no jobs array`)
  return payload as T
}

/** One adapter per ATS. The run loop picks by `board.ats`. */
export const ADAPTERS: Record<Ats, Adapter> = {
  greenhouse: { url: greenhouseUrl, parse: (p, b) => parseGreenhouse(jobsArray<GreenhousePayload>(p, "greenhouse"), b) },
  ashby: { url: ashbyUrl, parse: (p, b) => parseAshby(jobsArray<AshbyPayload>(p, "ashby"), b) },
  lever: { url: leverUrl, parse: (p, b) => parseLever(jobsArray<LeverPayload>(p, "lever"), b) },
}
