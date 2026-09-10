import { useEffect, useId, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RouteMap } from "@/components/RouteMap"
import type { Direction, Place, RouteLeg, RouteTollsResponse } from "@/lib/api-types"
import { fetchGeocode, fetchRouteTolls, formatTime, formatUsd } from "@/lib/api"
import { reversibleStatus } from "@/lib/schedule"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUpDown, ExternalLink, Info, LoaderCircle, MapPin, SlidersHorizontal, TriangleAlert } from "lucide-react"

const inputClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

const DIRECTION_WORD: Record<Direction, string> = { nb: "Northbound", sb: "Southbound", eb: "Eastbound", wb: "Westbound" }
const SCHEDULE_URL = "https://www.expresslanes.com/learn-the-lanes/"

/** "38.79, -77.18" typed straight in skips the geocoder. */
function parseLatLng(text: string): Place | null {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { label: `${lat}, ${lng}`, lat, lng }
}

export interface LegAdjustment {
  corridor: RouteLeg["corridor"]
  direction: Direction
  entry: string
  exit: string
}

interface Props {
  onAdjustLeg: (leg: LegAdjustment) => void
}

export function AdvancedEstimator({ onAdjustLeg }: Props) {
  const [from, setFrom] = useState<PlaceField>({ text: "", place: null })
  const [to, setTo] = useState<PlaceField>({ text: "", place: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RouteTollsResponse | null>(null)

  const canSubmit = Boolean(from.text.trim() && to.text.trim()) && !loading

  async function resolve(field: PlaceField, name: string): Promise<Place> {
    if (field.place) return field.place
    const direct = parseLatLng(field.text)
    if (direct) return direct
    const { results } = await fetchGeocode(field.text)
    if (results.length === 0) throw new Error(`Couldn't find "${field.text}" for ${name}. Try a fuller address or pick a suggestion.`)
    return results[0]
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [a, b] = await Promise.all([resolve(from, "From"), resolve(to, "To")])
      setFrom({ text: a.label, place: a })
      setTo({ text: b.label, place: b })
      setResult(await fetchRouteTolls(a, b))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not price this route")
    } finally {
      setLoading(false)
    }
  }

  function swap() {
    setFrom(to)
    setTo(from)
    setResult(null)
    setError(null)
  }

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Advanced · price a whole route</p>
        <CardTitle className="flex items-center gap-2 text-xl">
          <SlidersHorizontal className="size-5 text-primary" />
          Address to address
        </CardTitle>
        <CardDescription>
          Type where you&apos;re leaving from and where you&apos;re going. We route the drive, work out which Express Lanes it runs
          beside, and price each one on its operator&apos;s own calculator, right now, in one go. Unofficial — the overhead sign is
          the price you pay.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]" onSubmit={submit}>
          <PlaceInput label="From" value={from} onChange={(v) => { setFrom(v); setResult(null) }} />
          <div className="flex items-end justify-center">
            <Button type="button" variant="outline" size="icon" aria-label="Swap from and to" onClick={swap} className="sm:mb-0">
              <ArrowUpDown className="size-4" />
            </Button>
          </div>
          <PlaceInput label="To" value={to} onChange={(v) => { setTo(v); setResult(null) }} />
          <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 w-full text-base sm:w-auto">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {loading ? "Routing and asking the operators…" : "Estimate tolls"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">
              Addresses, place names or <code>lat, lng</code>. Prices are for leaving right now.
            </span>
          </div>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p>{error}</p>
              <p className="text-muted-foreground">We never guess a price. Switch to Simple mode to pick the trip by hand, or use the operators&apos; calculators.</p>
            </div>
          </div>
        )}

        {result && <RouteResult result={result} onAdjustLeg={onAdjustLeg} />}
      </CardContent>
    </Card>
  )
}

interface PlaceField {
  text: string
  /** Set once the text has been resolved to coordinates (picked suggestion, or a typed lat,lng). */
  place: Place | null
}

function PlaceInput({ label, value, onChange }: { label: string; value: PlaceField; onChange: (v: PlaceField) => void }) {
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const listId = useId()
  const abort = useRef<AbortController | null>(null)

  const q = value.text.trim()
  const searchable = !value.place && q.length >= 3 && !parseLatLng(q)
  const visible = open && searchable && suggestions.length > 0

  useEffect(() => {
    abort.current?.abort()
    if (!searchable) return
    const controller = new AbortController()
    abort.current = controller
    const timer = window.setTimeout(() => {
      fetchGeocode(q, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) {
            setSuggestions(res.results)
            setOpen(true)
          }
        })
        .catch(() => undefined)
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [q, searchable])

  return (
    <label className="relative space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="relative block">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={cn(inputClass, "pl-9")}
          value={value.text}
          placeholder={label === "From" ? "e.g. Fredericksburg, VA" : "e.g. Tysons Corner Center"}
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          onChange={(e) => onChange({ text: e.target.value, place: null })}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          required
        />
      </span>
      {visible && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestions.map((s) => (
            <li key={`${s.lat},${s.lng}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ text: s.label, place: s })
                  setOpen(false)
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}

function RouteResult({ result, onAdjustLeg }: { result: RouteTollsResponse } & Props) {
  const priced = result.legs.filter((l) => l.estimate && l.estimate.total !== null)
  const partial = result.total === null && priced.length > 0 ? priced.reduce((s, l) => s + (l.estimate?.total ?? 0), 0) : null
  const km = result.route.distanceMeters / 1000
  const miles = km * 0.621371
  const minutes = Math.round(result.route.durationSeconds / 60)

  return (
    <div className="space-y-4 rounded-xl border bg-muted/40 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Unofficial estimate</Badge>
        <Badge variant="secondary">Right now</Badge>
        <span className="text-xs text-muted-foreground">
          {miles.toFixed(1)} mi · about {minutes} min · route by {result.route.provider}
        </span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          {result.from.label} → {result.to.label}
        </p>
        <p className={cn("text-5xl font-semibold tracking-tight", (result.total === 0 || result.legs.length === 0) && "text-3xl")}>
          {result.legs.length === 0
            ? "No Express Lanes toll"
            : result.total === null
              ? partial !== null
                ? `${formatUsd(partial)} + unpriced`
                : "No price available"
              : result.total === 0
                ? "No toll right now"
                : formatUsd(result.total)}
        </p>
        {result.legs.length > 1 && (
          <p className="text-xs text-muted-foreground">
            {result.legs.length} Express Lanes legs{result.total !== null ? ", added up" : ""}
          </p>
        )}
      </div>

      <RouteMap result={result} />

      {result.legs.length > 0 && (
        <ol className="space-y-3">
          {result.legs.map((leg, i) => (
            <LegCard key={`${leg.corridor}-${leg.entry.id}-${leg.exit.id}`} index={i + 1} leg={leg} onAdjustLeg={onAdjustLeg} />
          ))}
        </ol>
      )}

      {result.unmatched.map((u) => (
        <div key={u.corridor} className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-card p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p className="font-medium">{u.corridorName}: not priced</p>
            <p className="text-muted-foreground">{u.reason}</p>
            <Button asChild variant="outline" size="sm">
              <a href={u.calculatorUrl} target="_blank" rel="noreferrer">
                Open the official calculator <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      ))}

      <ul className="space-y-1 text-sm text-muted-foreground">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  )
}

function LegCard({ index, leg, onAdjustLeg }: { index: number; leg: RouteLeg } & Props) {
  const est = leg.estimate
  const reversible = leg.corridor === "95" || leg.corridor === "395"
  const schedule = reversible ? reversibleStatus() : null
  const priceText = est === null ? "Not priced" : est.total === null ? "No price" : est.total === 0 ? "No toll" : formatUsd(est.total)

  return (
    <li className="space-y-3 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            <span className="text-muted-foreground">{index}.</span> {leg.corridorName} · {DIRECTION_WORD[leg.direction]}
          </p>
          <p className="text-muted-foreground">
            {leg.entry.label} → {leg.exit.label}
          </p>
        </div>
        <p className={cn("text-2xl font-semibold tracking-tight", (est === null || est.total === null) && "text-base text-muted-foreground")}>{priceText}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {leg.match === "near-ends" ? (
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
            Ramp matched near where you join or leave — check the interchange
          </Badge>
        ) : (
          <Badge variant="outline">Entry and exit on your route</Badge>
        )}
        {est && (
          <span className="text-muted-foreground">
            from {est.source.operator} · fetched {formatTime(est.source.fetchedAt)}
          </span>
        )}
      </div>

      {est && est.legs.length > 1 && (
        <ul className="divide-y rounded-lg border text-sm">
          {est.legs.map((l) => (
            <li key={l.road} className="flex items-center justify-between px-3 py-1.5">
              <span>{l.road}</span>
              <span className="font-medium">{formatUsd(l.price)}</span>
            </li>
          ))}
        </ul>
      )}

      {leg.notice && (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-accent/60 p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{leg.notice}</span>
        </p>
      )}
      {schedule && (
        <p className="text-xs text-muted-foreground">
          Published schedule:{" "}
          {schedule.open
            ? `lanes run ${DIRECTION_WORD[schedule.open].toLowerCase()} until ${schedule.until} Eastern.`
            : `probably closed for reversal; ${DIRECTION_WORD[schedule.next].toLowerCase()} usually opens ${schedule.opensAt} Eastern.`}{" "}
          Approximate — holidays, events and incidents differ.{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={SCHEDULE_URL} target="_blank" rel="noreferrer">
            Schedule
          </a>
        </p>
      )}

      {leg.error && (
        <p className="flex items-start gap-2 text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{leg.error}</span>
        </p>
      )}
      {est && est.notes.length > 0 && <p className="text-xs text-muted-foreground">{est.notes[0]}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjustLeg({ corridor: leg.corridor, direction: leg.direction, entry: leg.entry.id, exit: leg.exit.id })}
        >
          Adjust in Simple mode <ArrowRight className="size-3.5" />
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={leg.calculatorUrl} target="_blank" rel="noreferrer">
            Official calculator <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </li>
  )
}
