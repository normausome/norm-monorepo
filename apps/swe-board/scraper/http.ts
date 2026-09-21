const USER_AGENT = "swe-board-demo/0.1 (+https://github.com/normausome/norm-monorepo)"

export class BoardFetchError extends Error {
  constructor(url: string, message: string) {
    super(`${message} (${url})`)
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 45_000): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  }).catch((err: unknown) => {
    throw new BoardFetchError(url, err instanceof Error ? err.message : String(err))
  })
  if (!res.ok) throw new BoardFetchError(url, `HTTP ${res.status}`)
  try {
    return (await res.json()) as T
  } catch {
    throw new BoardFetchError(url, "response was not JSON")
  }
}
