/**
 * Browser-facing CORS for /api when the front end is served from another
 * origin (dmvtolls.com on Vercel, or Vite's dev server hitting a deployed API).
 * Same-origin requests (the API also serving dist/) carry no Origin header and
 * are untouched. No credentials are used, so allow-list + echo is enough.
 */
const DEFAULT_ORIGINS = [
  "https://dmvtolls.com",
  "https://www.dmvtolls.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]

function parseOrigins(raw: string | undefined): Set<string> {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean)
  return new Set(list.length ? list : DEFAULT_ORIGINS)
}

export const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS)

export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false
  return allowedOrigins.has("*") || allowedOrigins.has(origin)
}

/** Preflight response for /api routes; null when the request isn't a preflight. */
export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS" || !req.headers.has("access-control-request-method")) return null
  const origin = req.headers.get("origin")
  if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 })
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": req.headers.get("access-control-request-headers") ?? "accept, content-type",
      "access-control-max-age": "86400",
      vary: "Origin",
    },
  })
}

/** Add CORS headers to an /api response when the request came from an allowed origin. */
export function withCors(req: Request, res: Response): Response {
  const origin = req.headers.get("origin")
  if (!isAllowedOrigin(origin)) return res
  res.headers.set("access-control-allow-origin", origin)
  res.headers.set("access-control-expose-headers", "x-cache")
  res.headers.append("vary", "Origin")
  return res
}
