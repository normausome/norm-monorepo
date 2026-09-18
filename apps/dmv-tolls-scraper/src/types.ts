export type CorridorId = "495" | "395" | "95" | "66-inside" | "66-outside"

export interface CorridorMeta {
  id: CorridorId
  name: string
  operator: string
  sourceUrl: string
}

export interface ScrapeResult {
  corridor: CorridorId
  operator: string
  sourceUrl: string
  payload: unknown
  summary: Record<string, unknown>
  error?: string
}

export interface ScrapeRunSummary {
  startedAt: string
  finishedAt: string
  status: "ok" | "partial" | "failed"
  corridors: { id: CorridorId; ok: boolean; error?: string }[]
}
