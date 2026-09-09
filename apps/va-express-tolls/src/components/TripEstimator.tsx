import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Corridor, CorridorId } from "@/data/corridors"
import type { Direction, EstimateResponse, TripEntry } from "@/lib/api-types"
import { type CorridorSupportInfo, fetchEstimate, fetchPoints, formatTime, formatUsd } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ArrowRight, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react"

/** Value for a `datetime-local` input in the browser's local time. */
const localDateTimeValue = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

interface Props {
  corridor: Corridor
  support: CorridorSupportInfo | undefined
  onSwitchCorridor: (id: CorridorId) => void
}

export function TripEstimator({ corridor, support, onSwitchCorridor }: Props) {
  if (!support) return <EstimatorShell corridor={corridor} description="Checking which calculators are automated…" />

  if (!support.supported) {
    return (
      <EstimatorShell corridor={corridor} description="We don't fetch prices for this corridor yet.">
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">{support.reason}</p>
        <OfficialLink corridor={corridor} primary />
      </EstimatorShell>
    )
  }

  return <EstimatorForm corridor={corridor} support={support} onSwitchCorridor={onSwitchCorridor} />
}

function EstimatorShell({
  corridor,
  description,
  children,
}: {
  corridor: Corridor
  description: string
  children?: React.ReactNode
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2. Price your trip</p>
        <CardTitle className="text-xl">{corridor.name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

function OfficialLink({ corridor, primary = false }: { corridor: Corridor; primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "default" : "outline"} size={primary ? "lg" : "sm"} className={cn(primary && "w-full sm:w-auto")}>
      <a href={corridor.calculator.url} target="_blank" rel="noreferrer">
        Open the official {corridor.shortName} calculator
        <ExternalLink className={primary ? "size-4" : "size-3.5"} />
      </a>
    </Button>
  )
}

function EstimatorForm({ corridor, support, onSwitchCorridor }: Props & { support: CorridorSupportInfo }) {
  const [direction, setDirection] = useState<Direction>(support.directions[0].id)
  const [entries, setEntries] = useState<TripEntry[] | null>(null)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [entryId, setEntryId] = useState("")
  const [exitId, setExitId] = useState("")
  const [when, setWhen] = useState<"now" | "past">("now")
  const [at, setAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EstimateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [maxPast] = useState(() => localDateTimeValue(new Date()))

  function changeDirection(next: Direction) {
    setDirection(next)
    setEntries(null)
    setPointsError(null)
    setEntryId("")
    setExitId("")
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    fetchPoints(corridor.id, direction)
      .then((res) => {
        if (!cancelled) setEntries(res.entries)
      })
      .catch((err: Error) => {
        if (!cancelled) setPointsError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [corridor.id, direction])

  const entry = entries?.find((e) => e.id === entryId)
  const canSubmit = Boolean(entry && exitId && (when === "now" || at)) && !loading

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const params = { direction, entry: entryId, exit: exitId, ...(when === "past" && at ? { at: new Date(at).toISOString() } : {}) }
      setResult(await fetchEstimate(corridor.id, params))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch an estimate")
    } finally {
      setLoading(false)
    }
  }

  return (
    <EstimatorShell
      corridor={corridor}
      description={`Pick your entry and exit and we fetch the number the ${support.name} calculator shows right now. Unofficial estimate — the overhead sign is the price you pay.`}
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Direction</span>
          <select className={selectClass} value={direction} onChange={(e) => changeDirection(e.target.value as Direction)}>
            {support.directions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Enter at</span>
          <select
            className={selectClass}
            value={entryId}
            disabled={!entries}
            onChange={(e) => {
              setEntryId(e.target.value)
              setExitId("")
              setResult(null)
            }}
          >
            <option value="">{entries ? "Choose an entry…" : pointsError ? "Unavailable" : "Loading entries…"}</option>
            {entries?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Exit at</span>
          <select
            className={selectClass}
            value={exitId}
            disabled={!entry}
            onChange={(e) => {
              setExitId(e.target.value)
              setResult(null)
            }}
          >
            <option value="">{entry ? "Choose an exit…" : "Pick an entry first"}</option>
            {entry?.exits.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>

        {support.historical && (
          <div className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">When</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-md border p-0.5">
                {(["now", "past"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWhen(w)}
                    className={cn(
                      "rounded px-3 py-1.5 text-sm transition-colors",
                      when === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {w === "now" ? "Right now" : "A past weekday time"}
                  </button>
                ))}
              </div>
              {when === "past" && (
                <input
                  type="datetime-local"
                  className={cn(selectClass, "sm:w-auto")}
                  value={at}
                  max={maxPast}
                  onChange={(e) => setAt(e.target.value)}
                  required
                />
              )}
            </div>
            {when === "past" && (
              <p className="text-xs text-muted-foreground">
                The VDOT calculator only prices times that have already happened, in Eastern time. Off-peak times return “No toll”.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 w-full text-base sm:w-auto">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {loading ? "Asking the operator…" : "Get estimate"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
          {pointsError && (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <TriangleAlert className="size-3.5" /> {pointsError}
            </span>
          )}
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p>{error}</p>
            <p className="text-muted-foreground">We never guess a price. Use the official calculator instead:</p>
            <OfficialLink corridor={corridor} />
          </div>
        </div>
      )}

      {result && <EstimateResult result={result} corridor={corridor} onSwitchCorridor={onSwitchCorridor} />}

      {!result && !error && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
          <span>Prefer the operator’s own map picker?</span>
          <OfficialLink corridor={corridor} />
        </div>
      )}
    </EstimatorShell>
  )
}

function EstimateResult({
  result,
  corridor,
  onSwitchCorridor,
}: {
  result: EstimateResponse
  corridor: Corridor
  onSwitchCorridor: (id: CorridorId) => void
}) {
  const free = result.total === 0
  const tripText = `${result.entry.label} → ${result.exit.label}`
  const touches495 = corridor.id !== "495" && /i-495|495 express/i.test(tripText)
  const touches66 = corridor.id === "495" && /interstate 66|i-66/i.test(tripText)

  return (
    <div className="space-y-4 rounded-xl border bg-muted/40 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Unofficial estimate</Badge>
        <Badge variant="secondary">{result.kind === "current" ? "Current" : "Historical"}</Badge>
        <span className="text-xs text-muted-foreground">
          from {result.source.operator} · fetched {formatTime(result.source.fetchedAt)}
        </span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{tripText}</p>
        <p className={cn("text-5xl font-semibold tracking-tight", free && "text-3xl")}>
          {result.total === null ? "No price available" : free ? "No toll" : formatUsd(result.total)}
        </p>
      </div>

      {result.legs.length > 1 && (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {result.legs.map((leg) => (
            <li key={leg.road} className="flex items-center justify-between px-3 py-2">
              <span>{leg.road}</span>
              <span className="font-medium">{formatUsd(leg.price)}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-1 text-sm text-muted-foreground">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>

      {(touches495 || touches66) && (
        <div className="rounded-lg border border-primary/40 bg-card p-4 text-sm">
          <p className="mb-2 font-medium">
            {touches495 ? "Taking the 495 Express Lanes too? That’s a second toll." : "Continuing onto I-66? That’s a second toll."}
          </p>
          <div className="flex flex-wrap gap-2">
            {touches495 && (
              <Button size="sm" variant="outline" onClick={() => onSwitchCorridor("495")}>
                Price the 495 leg <ArrowRight className="size-3.5" />
              </Button>
            )}
            {touches66 && (
              <>
                <Button size="sm" variant="outline" onClick={() => onSwitchCorridor("66-inside")}>
                  Price I-66 Inside the Beltway <ArrowRight className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onSwitchCorridor("66-outside")}>
                  I-66 Outside the Beltway <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
        <span>Double-check on the operator’s site:</span>
        <OfficialLink corridor={corridor} />
      </div>
    </div>
  )
}
