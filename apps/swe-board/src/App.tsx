import { useEffect, useState } from "react"
import { jobQueryToParams, parseJobQuery, type JobQuery } from "@shared/query"
import type { Job, MetaResponse } from "@shared/types"
import { Filters } from "@/components/Filters"
import { JobsTable } from "@/components/JobsTable"
import { fetchJobs, fetchMeta } from "@/lib/api"
import { timeAgo } from "@/lib/format"

const queryFromUrl = () => parseJobQuery(new URLSearchParams(location.search))

export function App() {
  const [query, setQuery] = useState<JobQuery>(queryFromUrl)
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<MetaResponse | null>(null)

  useEffect(() => {
    const params = jobQueryToParams(query).toString()
    history.replaceState(null, "", params ? `?${params}` : location.pathname)
  }, [query])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchMeta(ctrl.signal)
      .then(setMeta)
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      fetchJobs(query, ctrl.signal)
        .then((res) => {
          setJobs((prev) => (query.offset > 0 ? [...prev, ...res.jobs] : res.jobs))
          setTotal(res.total)
          setError(null)
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return
          setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false)
        })
    }, 150)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query])

  const hasMore = jobs.length < total

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SWE Board</h1>
          <p className="text-sm text-slate-600">Software engineering roles from public Greenhouse, Ashby, and Lever boards. Read only.</p>
        </div>
        <dl className="flex gap-6 text-sm text-slate-600">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Last scrape</dt>
            <dd className="font-medium text-slate-800" title={meta?.lastScrapeAt ?? undefined}>
              {meta ? (meta.lastScrapeAt ? timeAgo(meta.lastScrapeAt) : "never") : "…"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Active jobs</dt>
            <dd className="font-medium text-slate-800">{meta ? meta.activeJobs.toLocaleString() : "…"}</dd>
          </div>
          {meta?.lastRun && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Boards</dt>
              <dd className="font-medium text-slate-800">
                {meta.lastRun.boardsOk} ok{meta.lastRun.boardsFailed ? `, ${meta.lastRun.boardsFailed} failed` : ""}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <Filters query={query} companies={meta?.companies ?? []} onChange={setQuery} />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{loading && jobs.length === 0 ? "Loading…" : `Showing ${jobs.length.toLocaleString()} of ${total.toLocaleString()} jobs`}</span>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <JobsTable jobs={jobs} loading={loading} />

      {hasMore && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setQuery((q) => ({ ...q, offset: jobs.length }))}
          className="mx-auto h-10 rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Load {Math.min(query.limit, total - jobs.length)} more
        </button>
      )}

      <footer className="pt-4 text-xs text-slate-400">
        Hover a LatAm badge for the SWE Radar tier and the quoted evidence. Pay filter compares the listed top end. Unlisted pay is kept.
      </footer>
    </div>
  )
}
