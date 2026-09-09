import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TripEstimator } from "@/components/TripEstimator"
import {
  CORRIDORS,
  DEFAULT_CORRIDOR,
  SHARED_NOTES,
  isCorridorId,
  type CorridorId,
} from "@/data/corridors"
import { type CorridorSupportInfo, fetchCorridors } from "@/lib/api"
import { insideBeltwayStatus } from "@/lib/schedule"
import { cn } from "@/lib/utils"
import { CircleAlert, Clock, MapPinned } from "lucide-react"

function corridorFromHash(): CorridorId {
  const hash = window.location.hash.replace(/^#/, "")
  return isCorridorId(hash) ? hash : DEFAULT_CORRIDOR
}

export function App() {
  const [selectedId, setSelectedId] = useState<CorridorId>(corridorFromHash)
  const [support, setSupport] = useState<CorridorSupportInfo[] | null>(null)
  const [supportError, setSupportError] = useState<string | null>(null)
  const corridor = CORRIDORS.find((c) => c.id === selectedId) ?? CORRIDORS[0]

  useEffect(() => {
    const onHashChange = () => setSelectedId(corridorFromHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    fetchCorridors()
      .then(setSupport)
      .catch((err: Error) => setSupportError(err.message))
  }, [])

  function select(id: CorridorId) {
    setSelectedId(id)
    history.replaceState(null, "", `#${id}`)
  }

  return (
    <div className="mx-auto min-h-svh max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-2">
          <MapPinned className="size-5 text-primary" />
          <Badge variant="outline">Northern Virginia</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Express Lanes toll estimate
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Five corridors, three operators, three separate calculator sites.
          Pick your corridor and trip here and we fetch the number the official
          calculator shows — no made-up prices, and the overhead sign always
          wins.
        </p>
      </header>

      <section aria-label="Choose a corridor" className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          1. Choose corridor
        </p>
        <div
          role="tablist"
          aria-label="Corridor"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CORRIDORS.map((c) => {
            const active = c.id === corridor.id
            const s = support?.find((x) => x.id === c.id)
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => select(c.id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {c.name}
                  {s && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        active ? "bg-primary-foreground/15" : s.supported ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.supported ? "live" : "link only"}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-snug",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {c.pickerHint}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="space-y-6">
        {supportError ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-xl">Estimates are offline</CardTitle>
              <CardDescription>
                The API isn&apos;t reachable ({supportError}). You can still use the
                official calculator:{" "}
                <a className="text-primary underline-offset-4 hover:underline" href={corridor.calculator.url} target="_blank" rel="noreferrer">
                  {corridor.calculator.host}
                </a>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <TripEstimator
            key={corridor.id}
            corridor={corridor}
            support={support?.find((x) => x.id === corridor.id)}
            onSwitchCorridor={select}
          />
        )}

        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              3. Know the rules
            </p>
            <CardTitle className="text-xl">{corridor.name}</CardTitle>
            <CardDescription>{corridor.extent}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-primary" />
                When you pay
              </div>
              <p className="text-sm">{corridor.whenTolled}</p>
              {corridor.id === "66-inside" && <InsideBeltwayNow />}
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold">How the price is set</p>
              <p className="text-sm text-muted-foreground">{corridor.pricing}</p>
            </div>

            <ul className="space-y-2 text-sm">
              {corridor.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <details className="group text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                Using the official {corridor.calculator.host} calculator instead? What to expect
              </summary>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                {corridor.calculator.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </details>
          </CardContent>
        </Card>

        <section aria-labelledby="notes-heading" className="space-y-3">
          <h2
            id="notes-heading"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            <CircleAlert className="size-4" />
            Before you go
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SHARED_NOTES.map((note) => (
              <div key={note.title} className="rounded-lg border bg-card p-4">
                <p className="mb-1 text-sm font-semibold">{note.title}</p>
                <p className="text-sm text-muted-foreground">{note.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-10 border-t pt-6 text-xs text-muted-foreground">
        Unofficial guide. Prices are fetched from the operators&apos; own public
        calculators and shown as-is; rules summarized from VDOT, Transurban and
        66 Express public pages. Not affiliated with any toll operator or
        E-ZPass.
      </footer>
    </div>
  )
}

function InsideBeltwayNow() {
  const [status, setStatus] = useState(() => insideBeltwayStatus())

  useEffect(() => {
    const id = window.setInterval(() => setStatus(insideBeltwayStatus()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <Badge variant={status.tolling ? "default" : "secondary"}>
        {status.tolling
          ? `Tolling now · ${status.direction} until ${status.until}`
          : "Free right now"}
      </Badge>
      <span className="text-muted-foreground">
        {status.tolling ? "Based on the weekday schedule, Eastern time." : `Next: ${status.next} (Eastern).`}{" "}
        Federal holidays are always free.
      </span>
    </p>
  )
}
