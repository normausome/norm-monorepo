import { SQL } from "bun"

export type Sql = SQL

export function connect(url = process.env.DATABASE_URL): Sql {
  if (!url) {
    throw new Error("DATABASE_URL is required (postgresql://user:pass@host:5432/db)")
  }
  return new SQL(url, { max: 5 })
}
