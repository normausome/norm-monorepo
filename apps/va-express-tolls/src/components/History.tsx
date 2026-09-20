import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CORRIDORS, type CorridorId } from "@/data/corridors"
import { fetchHistory, fetchHistorySummary, formatTime, formatUsd } from "@/lib/api"
import type { HistorySample, HistorySummaryResponse } from "@/lib/api-types"
import { cn } from "@/lib/utils"
import { LoaderCircle } from "lucide-react"

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

const WINDOWS = [
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
] as const

const RUN_BADGE = { ok: "default", partial: "secondary", failed: "destructive" } as const

type SummaryState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: HistorySummaryResponse }

type SeriesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; samples: HistorySample[] }

const ET_WEEKDAY_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
})

function formatAxisTime(iso: string, hours: number) {
  return hours <= 24 ? formatTime(iso) : ET_WEEKDAY_HOUR.format(new Date(iso))
}

function formatPrice(n: number | null) {
  return n == null ? "—" : formatUsd(n)
}

function sampleNote(s: HistorySample) {
  if (s.error) return s.error
  if (s.currentlyTolled === false) return "free"
  if (s.openDirection95 === "nb") return "open nb"
  if (s.openDirection95 === "sb") return "open sb"
  if (s.openDirection95 === null) return "lanes reversing"
  return ""
}

function latestLabel(sample: HistorySample | null) {
  if (!sample) return "no data"
  if (sample.avg != null) return formatUsd(sample.avg)
  if (sample.error) return "scrape failed"
  if (sample.currentlyTolled === false) return "free"
  return "no data"
}

function niceMax(raw: number) {
  if (!(raw > 0)) return 5
  const padded = raw * 1.08
  const mag = 10 ** Math.floor(Math.log10(padded))
  const n = padded / mag
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : 10
  return nice * mag
}

function formatY(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Current width of the referenced element, tracked across resizes. 0 until first layout. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-xl">Couldn&apos;t load history</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  )
}

export default function History() {
  const [summary, setSummary] = useState<SummaryState>({ status: "loading" })
  const [corridor, setCorridor] = useState<CorridorId>("495")
  const [hours, setHours] = useState(24)
  const [series, setSeries] = useState<SeriesState>({ status: "loading" })
  const [summaryTick, setSummaryTick] = useState(0)
  const [seriesTick, setSeriesTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchHistorySummary()
      .then((data) => {
        if (cancelled) return
        setSummary(data.available ? { status: "ready", summary: data } : { status: "unavailable" })
      })
      .catch((err: Error) => {
        if (!cancelled) setSummary({ status: "error", message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [summaryTick])

  useEffect(() => {
    if (summary.status !== "ready") return
    let cancelled = false
    fetchHistory(corridor, hours)
      .then((data) => {
        if (!cancelled) setSeries({ status: "ready", samples: data.samples })
      })
      .catch((err: Error) => {
        if (!cancelled) setSeries({ status: "error", message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [corridor, hours, summary.status, seriesTick])

  function retrySummary() {
    setSummary({ status: "loading" })
    setSummaryTick((n) => n + 1)
  }

  function retrySeries() {
    setSeries({ status: "loading" })
    setSeriesTick((n) => n + 1)
  }

  // Re-selecting the current value would flip to "loading" without re-running the
  // fetch effect (its deps are unchanged), leaving the spinner up forever.
  function selectCorridor(id: CorridorId) {
    if (id === corridor) return
    setCorridor(id)
    setSeries({ status: "loading" })
  }

  function selectHours(next: number) {
    if (next === hours) return
    setHours(next)
    setSeries({ status: "loading" })
  }

  if (summary.status === "loading") return <LoadingCard label="Loading price history…" />
  if (summary.status === "error") {
    return <ErrorCard message={summary.message} onRetry={retrySummary} />
  }
  if (summary.status === "unavailable") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">History isn&apos;t set up on this deployment</CardTitle>
          <CardDescription>
            The API needs DATABASE_URL pointing at the Postgres the dmv-tolls-scraper cron writes to.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { latestRun, corridors } = summary.summary
  const selected = CORRIDORS.find((c) => c.id === corridor) ?? CORRIDORS[0]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
          <CardTitle className="text-xl">Price history</CardTitle>
          <CardDescription>
            Recorded every 30 minutes from the operators&apos; calculators by a scraper cron.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          {latestRun ? (
            <>
              <span className="text-muted-foreground">Latest run {formatTime(latestRun.finishedAt)}</span>
              <Badge variant={RUN_BADGE[latestRun.status]}>{latestRun.status}</Badge>
            </>
          ) : (
            <span className="text-muted-foreground">No scrape has finished yet.</span>
          )}
        </CardContent>
      </Card>

      <section aria-label="Choose a corridor">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">1. Choose corridor</p>
        <div role="tablist" aria-label="History corridor" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CORRIDORS.map((c) => {
            const active = c.id === corridor
            const row = corridors.find((x) => x.id === c.id)
            return (
              <button
                key={c.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => selectCorridor(c.id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className={cn("mt-0.5 block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {latestLabel(row?.latest ?? null)}
                </span>
                <span className={cn("mt-0.5 block text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {row?.samples24h ?? 0} in 24h
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <label className="block space-y-2 text-sm">
        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">2. Window</span>
        <select
          className={cn(selectClass, "sm:w-auto")}
          aria-label="History window"
          value={hours}
          onChange={(e) => selectHours(Number(e.target.value))}
        >
          {WINDOWS.map((w) => (
            <option key={w.hours} value={w.hours}>
              {w.label}
            </option>
          ))}
        </select>
      </label>

      {series.status === "loading" ? (
        <LoadingCard label={`Loading ${selected.shortName} snapshots…`} />
      ) : series.status === "error" ? (
        <ErrorCard message={series.message} onRetry={retrySeries} />
      ) : series.samples.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">No snapshots in this window yet</CardTitle>
            <CardDescription>The scraper runs every 30 minutes; try a longer window or check back after the next run.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">3. Price over time</p>
              <CardTitle className="text-xl">{selected.name}</CardTitle>
              <CardDescription>
                Average posted price as a line; the band is the lowest and highest figure in that snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PriceChart samples={series.samples} hours={hours} />
              <ChartLegend samples={series.samples} />
            </CardContent>
          </Card>
          <SamplesTable samples={series.samples} />
        </>
      )}
    </div>
  )
}

function ChartLegend({ samples }: { samples: HistorySample[] }) {
  const reversible = samples.some((s) => "openDirection95" in s)
  const inside = samples.some((s) => "currentlyTolled" in s)
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-0.5 w-4 bg-primary" />
        Average
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-3 rounded-sm bg-primary/25" />
        Min–max
      </li>
      {reversible && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-full border border-primary" />
          Lanes reversing
        </li>
      )}
      {inside && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 bg-muted-foreground/20" />
          Free
        </li>
      )}
    </ul>
  )
}

function PriceChart({ samples, hours }: { samples: HistorySample[]; hours: number }) {
  const clipId = useId()
  const [frameRef, frameWidth] = useElementWidth<HTMLDivElement>()
  const sorted = [...samples].sort((a, b) => Date.parse(a.scrapedAt) - Date.parse(b.scrapedAt))
  const newest = Date.parse(sorted[sorted.length - 1]?.scrapedAt ?? "")
  const end = Number.isNaN(newest) ? 1 : newest
  const start = end - hours * 3600 * 1000
  const span = Math.max(end - start, 1)
  const priced = sorted.flatMap((s) => [s.min, s.max, s.avg].filter((n): n is number => n != null))
  const yMax = niceMax(Math.max(0, ...priced))

  // The viewBox tracks the rendered width so one SVG unit is one CSS pixel and
  // the 10px axis labels stay legible instead of scaling down with the card.
  const W = Math.max(240, Math.round(frameWidth) || 640)
  const H = 220
  const pl = 52
  const pr = 12
  const pt = 12
  const pb = 28
  const innerW = W - pl - pr
  const innerH = H - pt - pb
  const xAt = (t: number) => pl + ((t - start) / span) * innerW
  const yAt = (v: number) => pt + innerH - (v / yMax) * innerH

  const yTicks = [0, 1, 2, 3].map((i) => (yMax * i) / 3)
  const xTickCount = innerW < 420 ? 3 : 5
  const xTicks = Array.from({ length: xTickCount }, (_, i) => start + (span * i) / (xTickCount - 1))

  type Pt = { x: number; y: number }
  const avgSegs: Pt[][] = []
  const bandSegs: { x: number; min: number; max: number }[][] = []
  let avgRun: Pt[] = []
  let bandRun: { x: number; min: number; max: number }[] = []

  // Null min/avg/max means the scrape failed or nothing was posted — a continuous
  // line through those points would invent a price the operator never showed.
  for (const s of sorted) {
    const t = Date.parse(s.scrapedAt)
    if (Number.isNaN(t)) continue
    const x = xAt(t)
    if (s.avg != null) avgRun.push({ x, y: yAt(s.avg) })
    else if (avgRun.length) {
      avgSegs.push(avgRun)
      avgRun = []
    }
    if (s.min != null && s.max != null) bandRun.push({ x, min: s.min, max: s.max })
    else if (bandRun.length) {
      bandSegs.push(bandRun)
      bandRun = []
    }
  }
  if (avgRun.length) avgSegs.push(avgRun)
  if (bandRun.length) bandSegs.push(bandRun)

  const freeSpans: { x0: number; x1: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].currentlyTolled !== false) continue
    const t = Date.parse(sorted[i].scrapedAt)
    const prev = i > 0 ? Date.parse(sorted[i - 1].scrapedAt) : t - 30 * 60 * 1000
    const next = i < sorted.length - 1 ? Date.parse(sorted[i + 1].scrapedAt) : t + 30 * 60 * 1000
    const x0 = xAt((prev + t) / 2)
    const x1 = xAt((t + next) / 2)
    const last = freeSpans.at(-1)
    if (last && Math.abs(last.x1 - x0) < 0.6) last.x1 = x1
    else freeSpans.push({ x0, x1 })
  }

  const lineD = (pts: Pt[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")

  const bandD = (run: { x: number; min: number; max: number }[]) => {
    const top = run.map((p) => `${p.x.toFixed(2)} ${yAt(p.max).toFixed(2)}`)
    const bot = [...run].reverse().map((p) => `${p.x.toFixed(2)} ${yAt(p.min).toFixed(2)}`)
    return `M ${top[0]} L ${top.slice(1).join(" L ")} L ${bot.join(" L ")} Z`
  }

  const title = `Posted Express Lanes prices over the last ${hours} hours`

  return (
    <div ref={frameRef} className="min-w-0 w-full">
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block overflow-visible"
      >
        <title>{title}</title>
        <defs>
          <clipPath id={clipId}>
            <rect x={pl} y={pt} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={pl}
              x2={W - pr}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={pl - 8}
              y={yAt(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--muted-foreground)"
              fontSize="10"
            >
              {formatY(v)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={t}
            x={xAt(t)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            {formatAxisTime(new Date(t).toISOString(), hours)}
          </text>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {freeSpans.map((s, i) => (
            <rect
              key={i}
              x={s.x0}
              y={pt}
              width={Math.max(0, s.x1 - s.x0)}
              height={innerH}
              fill="var(--muted-foreground)"
              fillOpacity={0.12}
            />
          ))}
          {bandSegs.map((run, i) =>
            run.length === 1 ? (
              <line
                key={`b-${i}`}
                x1={run[0].x}
                x2={run[0].x}
                y1={yAt(run[0].max)}
                y2={yAt(run[0].min)}
                stroke="var(--primary)"
                strokeOpacity={0.35}
                strokeWidth="3"
              />
            ) : (
              <path key={`b-${i}`} d={bandD(run)} fill="var(--primary)" fillOpacity={0.22} />
            ),
          )}
          {avgSegs.map((pts, i) =>
            pts.length === 1 ? (
              <circle key={`a-${i}`} cx={pts[0].x} cy={pts[0].y} r="2.5" fill="var(--primary)" />
            ) : (
              <path
                key={`a-${i}`}
                d={lineD(pts)}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ),
          )}
          {sorted.map((s) => {
            if (s.openDirection95 !== null || s.avg == null) return null
            const t = Date.parse(s.scrapedAt)
            if (Number.isNaN(t)) return null
            return (
              <circle
                key={`r-${s.scrapedAt}`}
                cx={xAt(t)}
                cy={yAt(s.avg)}
                r="3.5"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function SamplesTable({ samples }: { samples: HistorySample[] }) {
  const rows = [...samples]
    .sort((a, b) => Date.parse(b.scrapedAt) - Date.parse(a.scrapedAt))
    .slice(0, 12)

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">4. Recent snapshots</p>
        <CardTitle className="text-xl">Last 12 samples</CardTitle>
        <CardDescription>Newest first. Times are Eastern.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">Min</th>
              <th className="pb-2 pr-3 font-medium">Avg</th>
              <th className="pb-2 font-medium sm:pr-3">Max</th>
              <th className="hidden pb-2 font-medium sm:table-cell">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const note = sampleNote(s)
              return (
                <tr key={s.scrapedAt} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <span className="whitespace-nowrap">{formatTime(s.scrapedAt)}</span>
                    {note && <span className="mt-0.5 block text-xs text-muted-foreground wrap-anywhere sm:hidden">{note}</span>}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{formatPrice(s.min)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatPrice(s.avg)}</td>
                  <td className="py-2 tabular-nums sm:pr-3">{formatPrice(s.max)}</td>
                  <td className="hidden py-2 text-muted-foreground wrap-anywhere sm:table-cell">{note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
