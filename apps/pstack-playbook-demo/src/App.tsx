import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlaybookCard, VerificationCallout } from "@/components/PlaybookCard"
import { PLAYBOOKS, SAMPLE_GOALS } from "@/data/playbooks"
import { routeGoal } from "@/lib/router"
import { ArrowRight, Sparkles } from "lucide-react"

export function App() {
  const [goal, setGoal] = useState(SAMPLE_GOALS[0].goal)
  const [submittedGoal, setSubmittedGoal] = useState(SAMPLE_GOALS[0].goal)
  const [manualPlaybookId, setManualPlaybookId] = useState<string>("auto")

  const routeResult = useMemo(() => {
    if (manualPlaybookId !== "auto") {
      const playbook = PLAYBOOKS.find((p) => p.id === manualPlaybookId)
      if (playbook) {
        return {
          playbook,
          score: 0,
          matchedKeywords: [] as string[],
          confidence: "high" as const,
        }
      }
    }
    return routeGoal(submittedGoal)
  }, [submittedGoal, manualPlaybookId])

  function handleRoute() {
    setSubmittedGoal(goal.trim())
    setManualPlaybookId("auto")
  }

  function applySample(sampleGoal: string) {
    setGoal(sampleGoal)
    setSubmittedGoal(sampleGoal)
    setManualPlaybookId("auto")
  }

  return (
    <div className="mx-auto min-h-svh max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10 space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <Badge variant="outline">pstack demo</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How poteto-mode routes your goal
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Type a plain-language engineering goal. This demo shows how{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            /poteto-mode
          </code>{" "}
          matches it to a playbook and why verification is built into every
          step — inspired by{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://github.com/cursor/plugins/tree/main/pstack"
            rel="noreferrer"
            target="_blank"
          >
            pstack
          </a>
          .
        </p>
      </header>

      <section className="mb-8 space-y-4">
        <label className="block space-y-2 text-left" htmlFor="goal">
          <span className="text-sm font-medium">Your goal</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="goal"
              placeholder="Describe what you want the agent to do…"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleRoute()
              }}
            />
            <Button className="shrink-0" onClick={handleRoute} type="button">
              Route playbook
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </label>

        <div className="space-y-2 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Try a sample
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_GOALS.map((sample) => (
              <Button
                key={sample.label}
                size="sm"
                variant="outline"
                onClick={() => applySample(sample.goal)}
                type="button"
              >
                {sample.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center">
          <span className="text-sm text-muted-foreground">
            Or pick a playbook manually:
          </span>
          <Select
            value={manualPlaybookId}
            onValueChange={(value) => {
              setManualPlaybookId(value)
              if (value !== "auto") {
                const playbook = PLAYBOOKS.find((p) => p.id === value)
                if (playbook) setSubmittedGoal(goal)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Auto-route from goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-route from goal</SelectItem>
              {PLAYBOOKS.map((playbook) => (
                <SelectItem key={playbook.id} value={playbook.id}>
                  {playbook.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="space-y-6">
        <PlaybookCard result={routeResult} />
        <VerificationCallout playbook={routeResult.playbook} />
      </div>

      <footer className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        Demo only — no real plugin install. Based on pstack playbooks by{" "}
        <a
          className="text-primary hover:underline"
          href="https://x.com/poteto"
          rel="noreferrer"
          target="_blank"
        >
          @poteto
        </a>
        .
      </footer>
    </div>
  )
}
