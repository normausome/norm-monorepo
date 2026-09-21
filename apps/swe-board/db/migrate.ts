import { readdir } from "node:fs/promises"
import path from "node:path"
import { connect, type Sql } from "./sql"

const MIGRATIONS_DIR = path.join(import.meta.dir, "migrations")
const LOCK_KEY = 7_260_001

/** Apply every `db/migrations/*.sql` not yet recorded. Safe to run on every start. */
export async function migrate(sql: Sql): Promise<string[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort()
  const applied: string[] = []
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`
    await tx`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`
    const done = new Set((await tx`select name from schema_migrations`).map((r: { name: string }) => r.name))
    for (const file of files) {
      if (done.has(file)) continue
      const body = await Bun.file(path.join(MIGRATIONS_DIR, file)).text()
      await tx.unsafe(body)
      await tx`insert into schema_migrations (name) values (${file})`
      applied.push(file)
    }
  })
  return applied
}

if (import.meta.main) {
  const sql = connect()
  const applied = await migrate(sql)
  console.log(applied.length ? `applied ${applied.join(", ")}` : "schema up to date")
  await sql.end()
}
