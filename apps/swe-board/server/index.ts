import { existsSync } from "node:fs"
import path from "node:path"
import { migrate } from "../db/migrate"
import { queryJobs, readMeta } from "../db/read"
import { connect } from "../db/sql"
import { parseJobQuery } from "../shared/query"

// Railway injects PORT. 8790 keeps a local run clear of va-express-tolls on 8787.
const PORT = Number(process.env.PORT ?? 8790)
const HOST = process.env.HOST ?? "0.0.0.0"
const DIST = path.resolve(import.meta.dir, "../dist")
const serveStatic = existsSync(DIST)
const startedAt = new Date()

const sql = connect()
await migrate(sql)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  })

async function handleApi(url: URL): Promise<Response> {
  switch (url.pathname) {
    case "/api/health":
      return json({ ok: true, service: "swe-board", startedAt: startedAt.toISOString(), uptimeSeconds: Math.round(process.uptime()), static: serveStatic })
    case "/api/jobs":
      return json(await queryJobs(sql, parseJobQuery(url.searchParams)))
    case "/api/meta":
      return json(await readMeta(sql))
    default:
      return json({ error: "not found" }, 404)
  }
}

async function serveDist(pathname: string): Promise<Response> {
  const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "")
  const file = Bun.file(path.join(DIST, safe))
  if (safe !== "/" && (await file.exists())) {
    const immutable = safe.startsWith("/assets/")
    return new Response(file, { headers: { "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache" } })
  }
  return new Response(Bun.file(path.join(DIST, "index.html")), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } })
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "method not allowed" }, 405)
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(url)
      } catch (err) {
        console.error(err)
        return json({ error: "Unexpected server error" }, 500)
      }
    }
    if (serveStatic) return serveDist(url.pathname)
    return json({ error: "dist/ not built. Run `bun run build`, or use `bun run dev` for Vite." }, 404)
  },
})

console.log(`swe-board api on http://${server.hostname}:${server.port} (static: ${serveStatic ? "dist/" : "off"})`)
