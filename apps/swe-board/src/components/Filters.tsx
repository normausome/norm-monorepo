import { ACTIVE_FILTERS, DEFAULT_QUERY, SORTS, type ActiveFilter, type JobQuery, type Sort } from "@shared/query"
import { LATAM_ELIGIBILITIES, WORK_MODES, type LatamEligibility, type WorkMode } from "@shared/types"
import { LATAM_LABEL, WORK_MODE_LABEL } from "@/lib/format"

const ACTIVE_LABEL: Record<ActiveFilter, string> = { active: "Active", inactive: "Inactive", all: "Active and inactive" }
const SORT_LABEL: Record<Sort, string> = { last_seen: "Last seen", first_seen: "Newest", salary: "Pay", company: "Company" }
const PAY_FLOORS = [100_000, 150_000, 200_000, 250_000, 300_000]

const selectClass =
  "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"

type Props = {
  query: JobQuery
  companies: string[]
  onChange(next: JobQuery): void
}

export function Filters({ query, companies, onChange }: Props) {
  const set = <K extends keyof JobQuery>(key: K, value: JobQuery[K]) => onChange({ ...query, [key]: value, offset: 0 })
  const toggleMode = (mode: WorkMode) =>
    set("workModes", query.workModes.includes(mode) ? query.workModes.filter((m) => m !== mode) : [...query.workModes, mode])
  const isDefault = JSON.stringify({ ...query, offset: 0 }) === JSON.stringify(DEFAULT_QUERY)

  return (
    <section aria-label="Filters" className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search title or company"
          aria-label="Search title or company"
          className="h-9 min-w-64 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div role="group" aria-label="Work mode" className="flex overflow-hidden rounded-md border border-slate-300 shadow-sm">
          {WORK_MODES.map((mode) => {
            const on = query.workModes.includes(mode)
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={on}
                onClick={() => toggleMode(mode)}
                className={`h-9 px-3 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  on ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                } border-r border-slate-300 last:border-r-0`}
              >
                {WORK_MODE_LABEL[mode]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          LatAm
          <select className={selectClass} value={query.latam ?? ""} onChange={(e) => set("latam", (e.target.value || null) as LatamEligibility | null)}>
            <option value="">Any</option>
            {LATAM_ELIGIBILITIES.map((v) => (
              <option key={v} value={v}>
                {LATAM_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Company
          <select className={`${selectClass} max-w-48`} value={query.company} onChange={(e) => set("company", e.target.value)}>
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Pay
          <select className={selectClass} value={query.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value ? Number(e.target.value) : null)}>
            <option value="">Any (incl. unlisted)</option>
            {PAY_FLOORS.map((n) => (
              <option key={n} value={n}>
                ${n / 1000}k or more
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Status
          <select className={selectClass} value={query.active} onChange={(e) => set("active", e.target.value as ActiveFilter)}>
            {ACTIVE_FILTERS.map((v) => (
              <option key={v} value={v}>
                {ACTIVE_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sort
          <select className={selectClass} value={query.sort} onChange={(e) => set("sort", e.target.value as Sort)}>
            {SORTS.map((v) => (
              <option key={v} value={v}>
                {SORT_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        {!isDefault && (
          <button type="button" onClick={() => onChange(DEFAULT_QUERY)} className="h-9 rounded-md px-3 text-sm font-medium text-blue-700 hover:bg-blue-50">
            Reset
          </button>
        )}
      </div>
    </section>
  )
}
