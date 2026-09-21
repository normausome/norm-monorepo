import { migrate } from "../db/migrate"
import { connect } from "../db/sql"
import { PgStore } from "../db/store"
import { BOARDS } from "./boards"
import { DEFAULT_MAX_MISSED_RUNS, runScrape } from "./run"

// bun run scrape [--boards greenhouse:affirm,ashby:ramp]
// MAX_MISSED_RUNS (default 3) sets how many consecutive misses deactivate a job.
const args = process.argv.slice(2)
const boardsArg = args[args.indexOf("--boards") + 1]
const only = args.includes("--boards") && boardsArg ? new Set(boardsArg.split(",")) : null
const boards = only ? BOARDS.filter((b) => only.has(`${b.ats}:${b.slug}`)) : BOARDS
if (only && boards.length !== only.size) {
  const known = new Set(BOARDS.map((b) => `${b.ats}:${b.slug}`))
  console.error(`unknown boards: ${[...only].filter((s) => !known.has(s)).join(", ")}`)
  process.exit(2)
}

const maxMissedRuns = Number(process.env.MAX_MISSED_RUNS ?? DEFAULT_MAX_MISSED_RUNS)
if (!Number.isInteger(maxMissedRuns) || maxMissedRuns < 1) {
  console.error("MAX_MISSED_RUNS must be a positive integer")
  process.exit(2)
}

const sql = connect()
await migrate(sql)
const run = await runScrape(new PgStore(sql), { boards, maxMissedRuns, log: console.log })
console.log(
  `done: ${run.boardsOk} boards ok, ${run.boardsFailed} failed, ${run.jobsMatched}/${run.jobsSeen} postings matched in ${Math.round(
    (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000,
  )}s`,
)
await sql.end()
process.exit(run.boardsOk === 0 ? 1 : 0)
