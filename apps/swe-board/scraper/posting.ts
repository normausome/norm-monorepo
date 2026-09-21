import type { JobId, Salary, WorkMode } from "../shared/types"
import { ATS_ID_PREFIX, type Board } from "./boards"

/**
 * The ATS-neutral view of one posting. Adapters produce it, classifiers read it.
 * `workMode` is set only when the ATS states it as structured data.
 */
export type Posting = {
  jobId: JobId
  title: string
  url: string
  location: string | null
  /** Every location string the posting lists, for geo classification. */
  locations: string[]
  /** Plain-text description, HTML stripped. */
  text: string
  workMode: WorkMode | null
  salary: Salary | null
  /** Employment type as the ATS states it ("FullTime", "Contract", ...). */
  employmentType: string | null
  raw: unknown
}

export const jobIdFor = (board: Board, nativeId: string | number): JobId =>
  `${ATS_ID_PREFIX[board.ats]}:${board.slug}:${nativeId}`

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  mdash: "-",
  ndash: "-",
  hellip: "...",
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

/** Greenhouse double-encodes content (`&lt;p&gt;`), so decode, strip tags, decode again. */
export function htmlToText(html: string): string {
  return decodeEntities(
    decodeEntities(html)
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}
