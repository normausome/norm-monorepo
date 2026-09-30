import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CORRIDORS, type CorridorId } from "@/data/corridors"
import { fetchHistoryOverview, formatTime, formatUsd } from "@/lib/api"
import type { HistoryOverviewCorridor, HistoryOverviewResponse, HistoryOverviewSample } from "@/lib/api-types"
import { LoaderCircle } from "lucide-react"

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

function latestPricedSample(samples: HistoryOverviewSample[]): HistoryOverviewSample | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i]
    if (s.avg != null && s.tripCount > 0) return s
  }
  return null
}

const CORRIDOR_COLORS: Record<CorridorId, string> = {
  "495": "var(--chart-1, oklch(0.55 0.18 250))",
  "395": "var(--chart-2, oklch(0.55 0.16 200))",
  "95": "var(--chart-3, oklch(0.55 0.14 160))",
  "66-inside": "var(--chart-4, oklch(0.55 0.12 80))",
  "66-outside": "var(--chart-5, oklch(0.55 0.1 40))",
}

type OverviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HistoryOverviewResponse }

export function HistoryOverview({ hours, corridor }: { hours: number; corridor: CorridorId }) {
  const [state, setState] = useState<OverviewState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    fetchHistoryOverview(hours)
      .then((data) => {
        if (!cancelled) setState(data.available ? { status: "ready", data } : { status: "error", message: "History database is not configured." })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [hours])

  if (state.status === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading corridor spread…
        </CardContent>
      </Card>
    )
  }

  if (state.status === "error") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-xl">Couldn&apos;t load corridor spread</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { corridors } = state.data
  const hasAny = corridors.some((c) => c.samples.some((s) => s.avg != null))
  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">No trip spreads in this window yet</CardTitle>
          <CardDescription>
            Each scrape stores every entry-to-exit price in <code className="text-xs">summary.trips</code>. Older snapshots without trip rows are skipped.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const selected = corridors.find((c) => c.id === corridor) ?? corridors[0]
  const selectedMeta = CORRIDORS.find((c) => c.id === selected.id)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Corridor spread</p>
          <CardTitle className="text-xl">Min · avg · max across trips</CardTitle>
          <CardDescription>
            For each scrape, min, average, and max of every priced trip on that corridor (open tolls and $0 free trips). Not a single OD pair.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LatestCompareChart corridors={corridors} hours={hours} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">All corridors</p>
          <CardTitle className="text-xl">Average trip price over time</CardTitle>
          <CardDescription>One line per corridor — average of all priced trips at each scrape.</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiAvgChart corridors={corridors} hours={hours} />
        </CardContent>
      </Card>

      {selected && selectedMeta && (
        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{selectedMeta.shortName}</p>
            <CardTitle className="text-xl">Min / avg / max band</CardTitle>
            <CardDescription>
              Shaded band is min–max across trips on {selectedMeta.name}. Line is the average at each scrape.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SpreadBandChart samples={selected.samples} hours={hours} title={`${selectedMeta.shortName} trip spread`} />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-3 w-4 rounded-sm bg-primary/15" />
                Min–max range
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-0.5 w-4 bg-primary" />
                Average
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LatestCompareChart({ corridors, hours }: { corridors: HistoryOverviewCorridor[]; hours: number }) {
  const rows = CORRIDORS.map((meta) => {
    const row = corridors.find((c) => c.id === meta.id)
    const latest = latestPricedSample(row?.samples ?? [])
    return { meta, latest }
  }).filter((r) => r.latest != null) as { meta: (typeof CORRIDORS)[number]; latest: HistoryOverviewSample }[]

  if (rows.length === 0) return null

  const yMax = niceMax(Math.max(...rows.flatMap((r) => [r.latest.min ?? 0, r.latest.max ?? 0])))

  const W = 640
  const rowH = 36
  const H = 48 + rows.length * rowH
  const pl = 108
  const pr = 16
  const pt = 8
  const barArea = W - pl - pr

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Latest scrape with trip prices in the last {hours} hours. Values are USD.
      </p>
      <svg role="img" aria-label="Latest min average and max toll by corridor" viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
        {[0, yMax / 2, yMax].map((v) => (
          <g key={v}>
            <line x1={pl} x2={W - pr} y1={pt + (1 - v / yMax) * (rows.length * rowH)} y2={pt + (1 - v / yMax) * (rows.length * rowH)} stroke="var(--border)" />
            <text x={pl - 6} y={pt + (1 - v / yMax) * (rows.length * rowH)} textAnchor="end" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
              {formatY(v)}
            </text>
          </g>
        ))}
        {rows.map(({ meta, latest }, i) => {
          const y = pt + i * rowH + rowH / 2
          const x0 = pl
          const scale = (v: number) => x0 + (v / yMax) * barArea
          const min = latest.min ?? 0
          const avg = latest.avg ?? 0
          const max = latest.max ?? 0
          return (
            <g key={meta.id}>
              <text x={pl - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">
                {meta.shortName}
              </text>
              <line x1={scale(min)} x2={scale(max)} y1={y} y2={y} stroke={CORRIDOR_COLORS[meta.id]} strokeWidth="8" strokeLinecap="round" opacity={0.35} />
              <circle cx={scale(avg)} cy={y} r="4.5" fill={CORRIDOR_COLORS[meta.id]} stroke="var(--background)" strokeWidth="1.5" />
              <text x={W - pr} y={y} textAnchor="end" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
                {formatUsd(min)} · {formatUsd(avg)} · {formatUsd(max)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        Tick marks: {rows[0] ? formatTime(rows[0].latest.scrapedAt) : "—"} (newest priced snapshot per corridor).
      </p>
    </div>
  )
}

function MultiAvgChart({ corridors, hours }: { corridors: HistoryOverviewCorridor[]; hours: number }) {
  const [frameRef, frameWidth] = useElementWidth<HTMLDivElement>()
  const series = CORRIDORS.map((meta) => {
    const row = corridors.find((c) => c.id === meta.id)
    const points = (row?.samples ?? []).flatMap((s) => (s.avg != null ? [{ t: Date.parse(s.scrapedAt), v: s.avg }] : []))
    return { meta, points: points.filter((p) => !Number.isNaN(p.t)).sort((a, b) => a.t - b.t) }
  }).filter((s) => s.points.length > 0)

  const allV = series.flatMap((s) => s.points.map((p) => p.v))
  const end = Math.max(...series.flatMap((s) => s.points.map((p) => p.t)))
  const start = end - hours * 3600 * 1000
  const span = Math.max(end - start, 1)
  const yMax = niceMax(Math.max(0, ...allV))

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

  const lineD = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")

  return (
    <div ref={frameRef} className="space-y-3">
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {series.map(({ meta }) => (
          <li key={meta.id} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: CORRIDOR_COLORS[meta.id] }} />
            {meta.shortName}
          </li>
        ))}
      </ul>
      <svg role="img" aria-label="Average trip price over time by corridor" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block">
        {[0, 1, 2, 3].map((i) => {
          const v = (yMax * i) / 3
          return (
            <g key={i}>
              <line x1={pl} x2={W - pr} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" />
              <text x={pl - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
                {formatY(v)}
              </text>
            </g>
          )
        })}
        {series.map(({ meta, points }) => {
          const pts = points.filter((p) => p.t >= start).map((p) => ({ x: xAt(p.t), y: yAt(p.v) }))
          if (pts.length === 0) return null
          return (
            <path
              key={meta.id}
              d={lineD(pts)}
              fill="none"
              stroke={CORRIDOR_COLORS[meta.id]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
    </div>
  )
}

function SpreadBandChart({
  samples,
  hours,
  title,
}: {
  samples: HistoryOverviewSample[]
  hours: number
  title: string
}) {
  const clipId = useId()
  const [frameRef, frameWidth] = useElementWidth<HTMLDivElement>()
  const sorted = [...samples].filter((s) => s.avg != null && s.min != null && s.max != null).sort((a, b) => Date.parse(a.scrapedAt) - Date.parse(b.scrapedAt))
  const end = Date.parse(sorted[sorted.length - 1]?.scrapedAt ?? "")
  if (Number.isNaN(end)) {
    return <p className="text-sm text-muted-foreground">No priced snapshots in this window.</p>
  }
  const start = end - hours * 3600 * 1000
  const span = Math.max(end - start, 1)
  const yMax = niceMax(Math.max(0, ...sorted.flatMap((s) => [s.max ?? 0])))

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

  const bandPoints: string[] = []
  const avgPoints: { x: number; y: number }[] = []
  for (const s of sorted) {
    const t = Date.parse(s.scrapedAt)
    if (Number.isNaN(t) || t < start) continue
    const x = xAt(t)
    bandPoints.push(`${x.toFixed(2)},${yAt(s.max!).toFixed(2)}`)
    avgPoints.push({ x, y: yAt(s.avg!) })
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i]
    const t = Date.parse(s.scrapedAt)
    if (Number.isNaN(t) || t < start) continue
    bandPoints.push(`${xAt(t).toFixed(2)},${yAt(s.min!).toFixed(2)}`)
  }
  const bandD = bandPoints.length >= 3 ? `M ${bandPoints.join(" L ")} Z` : ""
  const lineD = avgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")

  return (
    <div ref={frameRef} className="min-w-0 w-full">
      <svg role="img" aria-label={title} viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <rect x={pl} y={pt} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const v = (yMax * i) / 3
          return (
            <g key={i}>
              <line x1={pl} x2={W - pr} y1={yAt(v)} y2={yAt(v)} stroke="var(--border)" />
              <text x={pl - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
                {formatY(v)}
              </text>
            </g>
          )
        })}
        <g clipPath={`url(#${clipId})`}>
          {bandD && <path d={bandD} fill="var(--primary)" fillOpacity={0.15} />}
          {lineD && <path d={lineD} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        </g>
      </svg>
    </div>
  )
}
