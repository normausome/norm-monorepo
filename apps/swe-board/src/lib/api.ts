import { jobQueryToParams, type JobQuery } from "@shared/query"
import type { JobsResponse, MetaResponse } from "@shared/types"

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { accept: "application/json" } })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `${url} responded ${res.status}`)
  }
  return (await res.json()) as T
}

export const fetchJobs = (query: JobQuery, signal?: AbortSignal) =>
  getJson<JobsResponse>(`/api/jobs?${jobQueryToParams(query)}`, signal)

export const fetchMeta = (signal?: AbortSignal) => getJson<MetaResponse>("/api/meta", signal)
