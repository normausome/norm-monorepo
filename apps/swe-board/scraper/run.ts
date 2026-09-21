import { ADAPTERS } from "./ats"
import { BOARDS, sourceOf, type Board } from "./boards"
import { classify } from "./classify"
import { fetchJson } from "./http"
import type { BoardReport, RunReport, ScrapeStore } from "../db/store"

export const DEFAULT_MAX_MISSED_RUNS = 3

export type RunOptions = {
  boards?: Board[]
  maxMissedRuns?: number
  concurrency?: number
  fetchJson?: typeof fetchJson
  log?: (line: string) => void
}

async function scrapeBoard(board: Board, store: ScrapeStore, seenAt: Date, maxMissedRuns: number, fetcher: typeof fetchJson): Promise<BoardReport> {
  const source = sourceOf(board)
  const adapter = ADAPTERS[board.ats]
  try {
    const payload = await fetcher<unknown>(adapter.url(board.slug))
    const postings = adapter.parse(payload, board)
    const jobs = postings.map((p) => classify(p, board)).filter((j) => j !== null)
    await store.applyBoard(source, jobs, seenAt, maxMissedRuns)
    return { source, ok: true, seen: postings.length, matched: jobs.length }
  } catch (err) {
    return { source, ok: false, seen: 0, matched: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Scrape every board once. Every board in a run shares one `last_seen_at`. A board
 * that fails to fetch or parse is reported and skipped, so its jobs keep their
 * `missed_runs` untouched.
 */
export async function runScrape(store: ScrapeStore, opts: RunOptions = {}): Promise<RunReport> {
  const boards = opts.boards ?? BOARDS
  const maxMissedRuns = opts.maxMissedRuns ?? DEFAULT_MAX_MISSED_RUNS
  const concurrency = opts.concurrency ?? 4
  const fetcher = opts.fetchJson ?? fetchJson
  const log = opts.log ?? (() => {})
  const startedAt = new Date()
  const reports: BoardReport[] = []

  const queue = [...boards]
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let board = queue.shift(); board; board = queue.shift()) {
        const report = await scrapeBoard(board, store, startedAt, maxMissedRuns, fetcher)
        reports.push(report)
        log(report.ok ? `${report.source}: ${report.matched}/${report.seen} matched` : `${report.source}: FAILED ${report.error}`)
      }
    }),
  )

  const run: RunReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    boardsOk: reports.filter((r) => r.ok).length,
    boardsFailed: reports.filter((r) => !r.ok).length,
    jobsSeen: reports.reduce((n, r) => n + r.seen, 0),
    jobsMatched: reports.reduce((n, r) => n + r.matched, 0),
    boards: reports,
  }
  await store.recordRun(run)
  return run
}
