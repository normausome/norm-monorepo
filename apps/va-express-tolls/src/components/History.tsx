import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CORRIDORS, type CorridorId } from "@/data/corridors"
import { fetchHistory, fetchHistorySummary, formatTime, formatUsd } from "@/lib/api"
import type { Direction, HistorySample, HistorySummaryResponse, HistoryTrip } from "@/lib/api-types"
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

const DIR_LABEL: Record<Direction, string> = {
  nb: "Northbound",
  sb: "Southbound",
  eb: "Eastbound",
  wb: "Westbound",
}

type PickedTrip = { direction: Direction; entry: string; exit: string }

type SummaryState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: HistorySummaryResponse }

type SeriesState = {
  status: "loading" | "error" | "ready"
  message?: string
  trips: HistoryTrip[]
  trip: HistoryTrip | null
  samples: HistorySample[]
}

const ET_WEEKDAY_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
})

const ET_SAMPLE_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
})

function formatAxisTime(iso: string, hours: number) {
  return hours <= 24 ? formatTime(iso) : ET_WEEKDAY_HOUR.format(new Date(iso))
}

function formatPrice(n: number | null) {
  return n == null ? "—" : formatUsd(n)
}

function tripValue(t: { direction: string; entryId: string; exitId: string }) {
  return `${t.direction}:${t.entryId}:${t.exitId}`
}

function tripLabel(t: HistoryTrip) {
  const name = `${t.entryLabel} to ${t.exitLabel}`
  return t.spanning ? `${name} (full span)` : name
}

function sampleNote(s: HistorySample) {
  if (s.error) return s.error
  if (s.status === "free") return "free"
  if (s.openDirection95 === null) return "lanes reversing"
  if (s.status === "closed") return "closed"
  if (s.status === "missing") return "no price"
  if (s.openDirection95 === "nb") return "open nb"
  if (s.openDirection95 === "sb") return "open sb"
  return ""
}

function latestLabel(sample: HistorySample | null) {
  if (!sample) return "no data"
  if (sample.price != null) return formatUsd(sample.price)
  if (sample.error) return "scrape failed"
  if (sample.status === "closed") return "closed"
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

const emptySeries = (): SeriesState => ({ status: "loading", trips: [], trip: null, samples: [] })

export default function History() {
  const [summary, setSummary] = useState<SummaryState>({ status: "loading" })
  const [corridor, setCorridor] = useState<CorridorId>("495")
  const [hours, setHours] = useState(24)
  const [picked, setPicked] = useState<PickedTrip | null>(null)
  const [series, setSeries] = useState<SeriesState>(emptySeries)
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
    fetchHistory(corridor, hours, picked ?? undefined)
      .then((data) => {
        if (!cancelled) setSeries({ status: "ready", trips: data.trips, trip: data.trip, samples: data.samples })
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setSeries((prev) => ({
            status: "error",
            message: err.message,
            trips: prev.trips,
            trip: prev.trip,
            samples: [],
          }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [corridor, hours, picked, summary.status, seriesTick])

  function retrySummary() {
    setSummary({ status: "loading" })
    setSummaryTick((n) => n + 1)
  }

  function retrySeries() {
    keepLoading()
    setSeriesTick((n) => n + 1)
  }

  function currentPick(): PickedTrip | null {
    if (picked) return picked
    if (!series.trip) return null
    return { direction: series.trip.direction, entry: series.trip.entryId, exit: series.trip.exitId }
  }

  function selectCorridor(id: CorridorId) {
    if (id === corridor) return
    setCorridor(id)
    setPicked(null)
    setSeries(emptySeries())
  }

  function keepLoading() {
    setSeries((prev) => ({ status: "loading", trips: prev.trips, trip: prev.trip, samples: [] }))
  }

  function selectHours(next: number) {
    if (next === hours) return
    setHours(next)
    keepLoading()
  }

  function selectDirection(direction: Direction) {
    const pool = series.trips.filter((trip) => trip.direction === direction)
    const next = pool.find((trip) => trip.spanning) ?? pool[0]
    if (!next) return
    const current = currentPick()
    if (current?.direction === next.direction && current.entry === next.entryId && current.exit === next.exitId) return
    setPicked({ direction: next.direction, entry: next.entryId, exit: next.exitId })
    keepLoading()
  }

  function selectTrip(value: string) {
    const next = series.trips.find((trip) => tripValue(trip) === value)
    if (!next) return
    const current = currentPick()
    if (current?.direction === next.direction && current.entry === next.entryId && current.exit === next.exitId) return
    setPicked({ direction: next.direction, entry: next.entryId, exit: next.exitId })
    keepLoading()
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
  const shown = series.trip
  const direction = picked?.direction ?? shown?.direction ?? ""
  const directions = [...new Set(series.trips.map((trip) => trip.direction))]
  const visibleTrips = series.trips.filter((trip) => trip.direction === direction)
  const tripSelectValue = picked
    ? tripValue({ direction: picked.direction, entryId: picked.entry, exitId: picked.exit })
    : shown
      ? tripValue(shown)
      : ""

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
          <CardTitle className="text-xl">Price history</CardTitle>
          <CardDescription>
            Recorded every 30 minutes. Each point is one entry-to-exit trip, not an average of the corridor.
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
                <span className={cn("mt-0.5 line-clamp-2 block text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {row?.headline ? `${row.headline.entryLabel} to ${row.headline.exitLabel}` : "No trip yet"}
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

      {series.trips.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">3. Direction</span>
            <select
              className={selectClass}
              aria-label="Trip direction"
              value={direction}
              onChange={(e) => selectDirection(e.target.value as Direction)}
            >
              {directions.map((d) => (
                <option key={d} value={d}>
                  {DIR_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">4. Trip</span>
            <select className={selectClass} aria-label="Entry and exit" value={tripSelectValue} onChange={(e) => selectTrip(e.target.value)}>
              {visibleTrips.map((trip) => (
                <option key={tripValue(trip)} value={tripValue(trip)}>
                  {tripLabel(trip)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {series.status === "loading" ? (
        <LoadingCard label={`Loading ${selected.shortName} trips…`} />
      ) : series.status === "error" ? (
        <ErrorCard message={series.message ?? "Couldn't load history"} onRetry={retrySeries} />
      ) : !series.trip ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">No trip prices yet</CardTitle>
            <CardDescription>
              Snapshots from before this change only have a corridor average. The next scraper run records each entry-to-exit price.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : series.samples.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">No snapshots in this window yet</CardTitle>
            <CardDescription>The scraper runs every 30 minutes. Try a longer window or check back after the next run.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">5. Price over time</p>
              <CardTitle className="text-xl">{tripLabel(series.trip)}</CardTitle>
              <CardDescription>
                {selected.name}. {DIR_LABEL[series.trip.direction]}. Posted price for this entry and exit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PriceChart samples={series.samples} hours={hours} title={`${tripLabel(series.trip)} over the last ${hours} hours`} />
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
  const free = samples.some((s) => s.status === "free")
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-0.5 w-4 bg-primary" />
        Trip price
      </li>
      {free && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 bg-muted-foreground/20" />
          Free
        </li>
      )}
    </ul>
  )
}

type PlotPoint = { sample: HistorySample; t: number; x: number }

function nearestPlotIndex(points: PlotPoint[], x: number) {
  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].x < x) lo = mid + 1
    else hi = mid
  }
  if (lo <= 0) return 0
  if (lo >= points.length) return points.length - 1
  const prev = lo - 1
  return x - points[prev].x <= points[lo].x - x ? prev : lo
}

function hoverBoxHeight(sample: HistorySample) {
  const note = sampleNote(sample)
  const rows = 2 + (note ? Math.max(1, Math.ceil(note.length / 32)) : 0)
  return rows * 16 + 14
}

function PriceChart({ samples, hours, title }: { samples: HistorySample[]; hours: number; title: string }) {
  const clipId = useId()
  const [frameRef, frameWidth] = useElementWidth<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const sorted = [...samples].sort((a, b) => Date.parse(a.scrapedAt) - Date.parse(b.scrapedAt))
  const newest = Date.parse(sorted[sorted.length - 1]?.scrapedAt ?? "")
  const end = Number.isNaN(newest) ? 1 : newest
  const start = end - hours * 3600 * 1000
  const span = Math.max(end - start, 1)
  const priced = sorted.flatMap((s) => (s.price == null ? [] : [s.price]))
  const yMax = niceMax(Math.max(0, ...priced))

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

  const points: PlotPoint[] = []
  for (const sample of sorted) {
    const t = Date.parse(sample.scrapedAt)
    if (Number.isNaN(t) || t < start) continue
    points.push({ sample, t, x: xAt(t) })
  }
  const point = hoverIndex != null ? points[hoverIndex] : undefined

  const yTicks = [0, 1, 2, 3].map((i) => (yMax * i) / 3)
  const xTickCount = innerW < 420 ? 3 : 5
  const xTicks = Array.from({ length: xTickCount }, (_, i) => start + (span * i) / (xTickCount - 1))

  type Pt = { x: number; y: number }
  const priceSegs: Pt[][] = []
  let priceRun: Pt[] = []
  for (const s of sorted) {
    const t = Date.parse(s.scrapedAt)
    if (Number.isNaN(t)) continue
    if (s.price != null) priceRun.push({ x: xAt(t), y: yAt(s.price) })
    else if (priceRun.length) {
      priceSegs.push(priceRun)
      priceRun = []
    }
  }
  if (priceRun.length) priceSegs.push(priceRun)

  const freeSpans: { x0: number; x1: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].status !== "free") continue
    const t = Date.parse(sorted[i].scrapedAt)
    const prev = i > 0 ? Date.parse(sorted[i - 1].scrapedAt) : t - 30 * 60 * 1000
    const next = i < sorted.length - 1 ? Date.parse(sorted[i + 1].scrapedAt) : t + 30 * 60 * 1000
    const x0 = xAt((prev + t) / 2)
    const x1 = xAt((t + next) / 2)
    const last = freeSpans.at(-1)
    if (last && Math.abs(last.x1 - x0) < 0.6) last.x1 = x1
    else freeSpans.push({ x0, x1 })
  }

  const lineD = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")

  function readPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * W
    const y = ((event.clientY - rect.top) / rect.height) * H
    const next =
      points.length > 0 && x >= pl && x <= W - pr && y >= pt && y <= pt + innerH ? nearestPlotIndex(points, x) : null
    setHoverIndex((current) => (current === next ? current : next))
  }

  const scale = frameWidth > 0 ? frameWidth / W : 1
  const tooltipW = 180
  const edge = frameWidth > 0 ? frameWidth : W
  const guidePx = point ? point.x * scale : 0
  const tooltipLeft = Math.max(4, guidePx + 10 + tooltipW > edge ? guidePx - 10 - tooltipW : guidePx + 10)
  const anchorY = point ? (point.sample.price != null ? yAt(point.sample.price) : pt + innerH / 2) : 0
  const pad = 4
  const tipH = point ? hoverBoxHeight(point.sample) : 0
  const tooltipTop = Math.min(Math.max(anchorY, pad), Math.max(pad, H - tipH - pad))
  const note = point ? sampleNote(point.sample) : ""

  return (
    <div ref={frameRef} className="relative min-w-0 w-full">
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block cursor-crosshair overflow-visible"
        onPointerMove={readPointer}
        onPointerDown={readPointer}
        onPointerLeave={() => setHoverIndex((current) => (current === null ? current : null))}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={pl} y={pt} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pl} x2={W - pr} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={pl - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
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
            <rect key={i} x={s.x0} y={pt} width={Math.max(0, s.x1 - s.x0)} height={innerH} fill="var(--muted-foreground)" fillOpacity={0.12} />
          ))}
          {priceSegs.map((pts, i) =>
            pts.length === 1 ? (
              <circle key={`p-${i}`} cx={pts[0].x} cy={pts[0].y} r="2.5" fill="var(--primary)" />
            ) : (
              <path key={`p-${i}`} d={lineD(pts)} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ),
          )}
        </g>
        {point && (
          <g pointerEvents="none">
            <line x1={point.x} x2={point.x} y1={pt} y2={pt + innerH} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 3" />
            {point.sample.price != null && (
              <circle cx={point.x} cy={yAt(point.sample.price)} r="4" fill="var(--primary)" stroke="var(--background)" strokeWidth="1.5" />
            )}
          </g>
        )}
      </svg>
      {point && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-48 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <p>{ET_SAMPLE_TIME.format(new Date(point.t))}</p>
          <p className="tabular-nums">{formatPrice(point.sample.price)}</p>
          {note ? <p className="text-muted-foreground">{note}</p> : null}
        </div>
      )}
    </div>
  )
}

function SamplesTable({ samples }: { samples: HistorySample[] }) {
  const rows = [...samples].sort((a, b) => Date.parse(b.scrapedAt) - Date.parse(a.scrapedAt)).slice(0, 12)

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">6. Recent snapshots</p>
        <CardTitle className="text-xl">Last 12 samples</CardTitle>
        <CardDescription>Newest first. Times are Eastern. Price is this trip only.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">Price</th>
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
                  <td className="py-2 pr-3 tabular-nums">{formatPrice(s.price)}</td>
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
