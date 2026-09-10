import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TripMap } from "@/components/TripMap"
import type { Corridor, CorridorId } from "@/data/corridors"
import type { CachedEstimateResponse, Direction, TripEntry } from "@/lib/api-types"
import { type CorridorSupportInfo, fetchEstimate, fetchPoints, formatTime, formatUsd } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ArrowRight, ExternalLink, Info, LoaderCircle, TriangleAlert } from "lucide-react"

/** Today's date in Eastern time as YYYY-MM-DD (the corridors' own clock). */
const easternToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date())

/** Quarter-hour slots inside the tolled window for a direction; only these times can carry a price. */
function peakSlots(direction: Direction): { value: string; label: string }[] {
  const [start, end] = direction === "wb" ? [15 * 60, 19 * 60] : [5 * 60 + 30, 9 * 60 + 30]
  const slots: { value: string; label: string }[] = []
  for (let m = start; m < end; m += 15) {
    const h = Math.floor(m / 60)
    const mm = String(m % 60).padStart(2, "0")
    slots.push({ value: `${String(h).padStart(2, "0")}:${mm}`, label: `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? "AM" : "PM"}` })
  }
  return slots
}

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
  const [notice, setNotice] = useState<string | null>(null)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [entryId, setEntryId] = useState("")
  const [exitId, setExitId] = useState("")
  const [when, setWhen] = useState<"now" | "past">("now")
  const [pastDate, setPastDate] = useState("")
  const [pastTime, setPastTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CachedEstimateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [today] = useState(easternToday)
  const slots = peakSlots(direction)
  const at = when === "past" && pastDate && pastTime ? `${pastDate}T${pastTime}` : ""

  function changeDirection(next: Direction) {
    setDirection(next)
    setEntries(null)
    setNotice(null)
    setPointsError(null)
    setEntryId("")
    setExitId("")
    setPastTime("")
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    fetchPoints(corridor.id, direction)
      .then((res) => {
        if (cancelled) return
        setEntries(res.entries)
        setNotice(res.notice ?? null)
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
      const params = { direction, entry: entryId, exit: exitId, ...(at ? { at } : {}) }
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

        {notice && (
          <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-accent/60 p-3 text-sm sm:col-span-2">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{notice}</span>
          </p>
        )}

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

        {entries && entries.some((e) => typeof e.lat === "number") && (
          <div className="sm:col-span-2">
            <TripMap
              entries={entries}
              entryId={entryId}
              exitId={exitId}
              onSelectEntry={(id) => {
                setEntryId(id)
                setExitId("")
                setResult(null)
              }}
              onSelectExit={(id) => {
                if (!entry) return
                setExitId(id)
                setResult(null)
              }}
            />
          </div>
        )}

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
                <>
                  <input
                    type="date"
                    aria-label="Date"
                    className={cn(selectClass, "sm:w-auto")}
                    value={pastDate}
                    max={today}
                    onChange={(e) => setPastDate(e.target.value)}
                    required
                  />
                  <select
                    aria-label="Time (Eastern)"
                    className={cn(selectClass, "sm:w-auto")}
                    value={pastTime}
                    onChange={(e) => setPastTime(e.target.value)}
                    required
                  >
                    <option value="">Time (Eastern)…</option>
                    {slots.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {when === "past" && (
              <p className="text-xs text-muted-foreground">
                Times are Eastern and limited to this direction’s tolled window — outside it the answer is always “No toll”. The VDOT
                calculator only prices times that have already happened.
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
  result: CachedEstimateResponse
  corridor: Corridor
  onSwitchCorridor: (id: CorridorId) => void
}) {
  const free = result.total === 0
  const tripText = `${result.entry.label} → ${result.exit.label}`
  // 495, 395 and 95 share an operator: a 495 leg is already in the result when it applies,
  // and leaving onto I-495's regular lanes isn't a toll. The prompt is for cross-operator hand-offs.
  const transurban = corridor.id === "495" || corridor.id === "395" || corridor.id === "95"
  const touches495 = !transurban && /i-495|495 express/i.test(tripText)
  const touches66 = transurban && /interstate 66|i-66/i.test(tripText)

  return (
    <div className="space-y-4 rounded-xl border bg-muted/40 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Unofficial estimate</Badge>
        <Badge variant="secondary">{result.kind === "current" ? "Current" : "Historical"}</Badge>
        <span className="text-xs text-muted-foreground">
          from {result.source.operator} · fetched {formatTime(result.source.fetchedAt)} · refreshes{" "}
          {formatTime(result.expiresAt)}
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
