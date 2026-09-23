import { useCallback, useMemo, useReducer, useState, useSyncExternalStore } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  QUESTION_COUNT,
  SECTION_IDS,
  questionsIn,
  sectionLabel,
} from "@/data/questions"
import type { SectionChoice } from "@/data/questions"
import {
  initialQuizPhase,
  isAnswerCorrect,
  quizReducer,
  scoreTakeaway,
  tallyScore,
} from "@/quiz/engine"
import { parseSeedFromHash } from "@/quiz/seed"
import type { QuizAction, QuizPhase } from "@/quiz/types"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { renderExplainWithLinks } from "@/lib/explain-links"
import { cn } from "@/lib/utils"

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

function getHashSnapshot() {
  return window.location.hash
}

function useUrlSeed(): string | null {
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, () => "")
  return useMemo(() => parseSeedFromHash(hash), [hash])
}

export function App() {
  const seed = useUrlSeed()
  const [phase, dispatch] = useReducer(quizReducer, initialQuizPhase)
  const [section, setSection] = useState<SectionChoice>("all")

  const send = useCallback(
    (action: QuizAction) => {
      dispatch(action)
    },
    [],
  )

  const progressLabel = useMemo(() => {
    if (phase.type === "question" || phase.type === "feedback") {
      return `Question ${phase.index + 1} of ${phase.order.length}`
    }
    return null
  }, [phase])

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <BookOpen className="size-5 text-primary" aria-hidden />
          <Badge variant="outline">Williams Check</Badge>
          {seed ? (
            <Badge variant="muted" title="Order shuffled from URL seed">
              seed: {seed}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Williams Check
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Multiple-choice questions on Walter E. Williams, split into sections
          from his life and his arguments. Play one section or all of them.
          Add{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            #seed=your-run
          </code>{" "}
          to shuffle the chosen set.
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        {phase.type === "title" && (
          <Card className="mx-auto w-full">
            <CardHeader className="text-center">
              <CardTitle>Pick a section</CardTitle>
              <CardDescription>
                One question at a time. After each answer you get a short
                explanation and a source line. The score is for the set you
                start.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-wrap justify-center gap-2"
                role="group"
                aria-label="Quiz section"
              >
                <SectionChip
                  pressed={section === "all"}
                  label={`All · ${QUESTION_COUNT}`}
                  onClick={() => setSection("all")}
                />
                {SECTION_IDS.map((id) => (
                  <SectionChip
                    key={id}
                    pressed={section === id}
                    label={`${sectionLabel(id)} · ${questionsIn(id).length}`}
                    onClick={() => setSection(id)}
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-center border-t pt-6">
              <Button
                size="lg"
                type="button"
                disabled={questionsIn(section).length === 0}
                onClick={() => send({ type: "START", seed, section })}
              >
                Start {sectionLabel(section)}
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {(phase.type === "question" || phase.type === "feedback") && (
          <QuizStep
            phase={phase}
            progressLabel={progressLabel ?? ""}
            onAnswer={(choiceId) => send({ type: "ANSWER", choiceId })}
            onNext={() => send({ type: "NEXT" })}
            onSections={() => send({ type: "TO_TITLE" })}
          />
        )}

        {phase.type === "end" && (
          <EndScreen
            score={tallyScore(phase.order, phase.answers)}
            total={phase.order.length}
            sectionName={sectionLabel(phase.section)}
            takeaway={scoreTakeaway(
              tallyScore(phase.order, phase.answers),
              phase.order.length,
              phase.section,
            )}
            onPlayAgain={() =>
              send({ type: "PLAY_AGAIN", seed, section: phase.section })
            }
            onSections={() => send({ type: "TO_TITLE" })}
          />
        )}
      </main>

      <footer className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        Client-only demo. Not affiliated with Walter E. Williams or George
        Mason University.
      </footer>
    </div>
  )
}

function SectionChip({
  pressed,
  label,
  onClick,
}: {
  pressed: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function QuizStep({
  phase,
  progressLabel,
  onAnswer,
  onNext,
  onSections,
}: {
  phase: Extract<QuizPhase, { type: "question" | "feedback" }>
  progressLabel: string
  onAnswer: (choiceId: string) => void
  onNext: () => void
  onSections: () => void
}) {
  const question = phase.order[phase.index]!
  const isFeedback = phase.type === "feedback"
  const selectedId = isFeedback ? phase.selectedId : null
  const correct = selectedId
    ? isAnswerCorrect(question, selectedId)
    : false

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{sectionLabel(phase.section)}</Badge>
            <Badge variant="secondary">
              {question.kind === "trivia" ? "Trivia" : "Scenario"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{progressLabel}</span>
        </div>
        <CardTitle className="text-left text-lg leading-snug sm:text-xl">
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.choices.map((choice) => {
          const isSelected = selectedId === choice.id
          const isCorrectChoice = choice.id === question.correctId
          let stateClass =
            "border-input bg-background hover:border-primary/40 hover:bg-accent/40"
          if (isFeedback) {
            if (isCorrectChoice) {
              stateClass = "border-primary bg-primary/10"
            } else if (isSelected && !isCorrectChoice) {
              stateClass = "border-destructive/60 bg-destructive/10"
            } else {
              stateClass = "border-input opacity-70"
            }
          }

          return (
            <button
              key={choice.id}
              type="button"
              disabled={isFeedback}
              onClick={() => onAnswer(choice.id)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default",
                stateClass,
              )}
            >
              <span className="font-medium uppercase text-muted-foreground">
                {choice.id}.
              </span>{" "}
              {choice.text}
            </button>
          )
        })}

        {isFeedback && (
          <div
            className={cn(
              "mt-4 rounded-lg border px-4 py-3 text-sm",
              correct
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <div className="mb-2 flex items-center gap-2 font-medium">
              {correct ? (
                <>
                  <CheckCircle2 className="size-4 text-primary" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-destructive" />
                  Not quite
                </>
              )}
            </div>
            <p className="text-muted-foreground">
              {renderExplainWithLinks(question.explain)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Source: {question.source}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t pt-6">
        <Button type="button" variant="ghost" onClick={onSections}>
          Sections
        </Button>
        {isFeedback ? (
          <Button type="button" onClick={onNext}>
            {phase.index + 1 >= phase.order.length ? "See score" : "Next"}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <span />
        )}
      </CardFooter>
    </Card>
  )
}

function EndScreen({
  score,
  total,
  sectionName,
  takeaway,
  onPlayAgain,
  onSections,
}: {
  score: number
  total: number
  sectionName: string
  takeaway: string
  onPlayAgain: () => void
  onSections: () => void
}) {
  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle>Run complete</CardTitle>
        <CardDescription>{takeaway}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold tabular-nums tracking-tight">
          {score}/{total}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{sectionName}</p>
      </CardContent>
      <CardFooter className="justify-center gap-2 border-t pt-6">
        <Button type="button" variant="outline" onClick={onSections}>
          Sections
        </Button>
        <Button type="button" onClick={onPlayAgain}>
          <RotateCcw className="size-4" />
          Replay
        </Button>
      </CardFooter>
    </Card>
  )
}
