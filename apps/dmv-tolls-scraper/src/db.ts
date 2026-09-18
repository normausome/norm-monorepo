import postgres from "postgres"
import type { ScrapeResult, ScrapeRunSummary } from "./types"

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scrape_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS corridor_snapshots (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  corridor_id TEXT NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL,
  operator TEXT NOT NULL,
  source_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  UNIQUE (run_id, corridor_id)
);

CREATE INDEX IF NOT EXISTS corridor_snapshots_corridor_scraped_idx
  ON corridor_snapshots (corridor_id, scraped_at DESC);
`

export function connectDb(url: string) {
  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10 })
  return { sql, close: () => sql.end({ timeout: 5 }) }
}

export async function ensureSchema(sql: postgres.Sql) {
  await sql.unsafe(SCHEMA)
}

export async function persistRun(
  sql: postgres.Sql,
  startedAt: Date,
  results: ScrapeResult[],
): Promise<ScrapeRunSummary> {
  const finishedAt = new Date()
  const okCount = results.filter((r) => !r.error).length
  const status = okCount === results.length ? "ok" : okCount === 0 ? "failed" : "partial"
  const notes =
    okCount === results.length
      ? null
      : `${okCount}/${results.length} corridors succeeded`

  const [run] = await sql<{ id: number }[]>`
    INSERT INTO scrape_runs (started_at, finished_at, status, notes)
    VALUES (${startedAt}, ${finishedAt}, ${status}, ${notes})
    RETURNING id
  `

  for (const r of results) {
    const scrapedAt = (r.summary.scrapedAt as string | undefined) ?? finishedAt.toISOString()
    await sql`
      INSERT INTO corridor_snapshots (
        run_id, corridor_id, scraped_at, operator, source_url, payload, summary, error
      ) VALUES (
        ${run.id},
        ${r.corridor},
        ${scrapedAt},
        ${r.operator},
        ${r.sourceUrl},
        ${sql.json(r.payload as postgres.JSONValue)},
        ${sql.json(r.summary as postgres.JSONValue)},
        ${r.error ?? null}
      )
    `
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    status,
    corridors: results.map((r) => ({ id: r.corridor, ok: !r.error, error: r.error })),
  }
}
