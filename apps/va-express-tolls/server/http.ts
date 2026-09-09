const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36 va-express-tolls-demo"

export class UpstreamError extends Error {
  readonly status: number
  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

/** Fetch an operator page/endpoint as text with a timeout and a browser-like UA. */
export async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json;q=0.9,*/*;q=0.8", ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  }).catch((err: unknown) => {
    throw new UpstreamError(`Could not reach ${new URL(url).host}: ${err instanceof Error ? err.message : String(err)}`)
  })
  if (!res.ok) throw new UpstreamError(`${new URL(url).host} responded ${res.status}`)
  return res.text()
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const text = await fetchText(url, init, timeoutMs)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new UpstreamError(`${new URL(url).host} returned non-JSON where JSON was expected`)
  }
}

/** Decode the handful of entities the operator pages use in <option> labels. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

/** Parse `<option value="…">label</option>` pairs, skipping the empty placeholder option. */
export function parseOptions(html: string): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = []
  const re = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi
  for (const m of html.matchAll(re)) {
    const id = m[1].trim()
    if (id) out.push({ id, label: decodeEntities(m[2]) })
  }
  return out
}
