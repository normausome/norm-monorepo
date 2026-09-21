import type { Job, LatamEligibility, WorkMode } from "@shared/types"
import { LATAM_LABEL, SENIORITY_LABEL, WORK_MODE_LABEL, formatPay, timeAgo } from "@/lib/format"

const MODE_CLASS: Record<WorkMode, string> = {
  remote: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  hybrid: "bg-amber-50 text-amber-700 ring-amber-200",
  onsite: "bg-slate-100 text-slate-700 ring-slate-200",
  unknown: "bg-slate-50 text-slate-500 ring-slate-200",
}

const LATAM_CLASS: Record<LatamEligibility, string> = {
  latam_mx_br: "bg-blue-50 text-blue-700 ring-blue-200",
  us_only: "bg-rose-50 text-rose-700 ring-rose-200",
  unknown: "bg-slate-50 text-slate-500 ring-slate-200",
}

const Badge = ({ className, title, children }: { className: string; title?: string; children: string }) => (
  <span title={title} className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
    {children}
  </span>
)

type Props = { jobs: Job[]; loading: boolean }

export function JobsTable({ jobs, loading }: Props) {
  if (!loading && jobs.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No jobs match these filters.</p>
  }
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm ${loading ? "opacity-60" : ""}`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Pay</th>
            <th className="px-4 py-3 font-medium">LatAm</th>
            <th className="px-4 py-3 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.jobId} className={`hover:bg-slate-50 ${job.isActive ? "" : "text-slate-400"}`}>
              <td className="max-w-md px-4 py-3">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 hover:underline">
                  {job.title}
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{job.location ?? "Location not listed"}</span>
                  {job.seniority !== "unknown" && <Badge className="bg-violet-50 text-violet-700 ring-violet-200">{SENIORITY_LABEL[job.seniority]}</Badge>}
                  {!job.isActive && <Badge className="bg-slate-100 text-slate-500 ring-slate-200">inactive</Badge>}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{job.company}</td>
              <td className="px-4 py-3">
                <Badge className={MODE_CLASS[job.workMode]}>{WORK_MODE_LABEL[job.workMode]}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatPay(job)}</td>
              <td className="px-4 py-3">
                <Badge className={LATAM_CLASS[job.latamEligibility]} title={job.remoteNotes ?? undefined}>
                  {LATAM_LABEL[job.latamEligibility]}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500" title={job.lastSeenAt}>
                {timeAgo(job.lastSeenAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
