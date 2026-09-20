import { useCallback, useMemo, useReducer, useSyncExternalStore } from "react"
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
import { QUESTION_COUNT } from "@/data/questions"
import {
  initialQuizPhase,
  isAnswerCorrect,
  quizReducer,
  scoreTakeaway,
  tallyScore,
} from "@/quiz/engine"
import { parseSeedFromHash } from "@/quiz/seed"
import type { QuizAction } from "@/quiz/types"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react"
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
          <Badge variant="outline">Sowell Check</Badge>
          {seed ? (
            <Badge variant="muted" title="Order shuffled from URL seed">
              seed: {seed}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sowell Check
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Fourteen multiple-choice questions on Thomas Sowell’s economics and
          social themes. Add{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            #seed=your-run
          </code>{" "}
          to shuffle order for a shareable run.
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        {phase.type === "title" && (
          <Card className="mx-auto w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle>Ready when you are</CardTitle>
              <CardDescription>
                One question at a time. After each answer you get a short
                explanation and source line. Fourteen Morgan-verified questions.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center border-t pt-6">
              <Button
                size="lg"
                type="button"
                onClick={() => send({ type: "START", seed })}
              >
                Start quiz
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
          />
        )}

        {phase.type === "end" && (
          <EndScreen
            score={tallyScore(phase.order, phase.answers)}
            total={phase.order.length}
            takeaway={scoreTakeaway(
              tallyScore(phase.order, phase.answers),
              phase.order.length,
            )}
            onPlayAgain={() => send({ type: "PLAY_AGAIN", seed })}
          />
        )}
      </main>

      <footer className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        Client-only demo. Not affiliated with Thomas Sowell or the Hoover
        Institution.
      </footer>
    </div>
  )
}

function QuizStep({
  phase,
  progressLabel,
  onAnswer,
  onNext,
}: {
  phase:
    | {
        type: "question"
        index: number
        order: import("@/data/questions").Question[]
        answers: (string | null)[]
      }
    | {
        type: "feedback"
        index: number
        order: import("@/data/questions").Question[]
        answers: (string | null)[]
        selectedId: string
      }
  progressLabel: string
  onAnswer: (choiceId: string) => void
  onNext: () => void
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
          <Badge variant="secondary">
            {question.kind === "trivia" ? "Trivia" : "Scenario"}
          </Badge>
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
            <p className="text-muted-foreground">{question.explain}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Source: {question.source}
            </p>
          </div>
        )}
      </CardContent>
      {isFeedback && (
        <CardFooter className="justify-end border-t pt-6">
          <Button type="button" onClick={onNext}>
            {phase.index + 1 >= phase.order.length ? "See score" : "Next"}
            <ArrowRight className="size-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function EndScreen({
  score,
  total,
  takeaway,
  onPlayAgain,
}: {
  score: number
  total: number
  takeaway: string
  onPlayAgain: () => void
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
        <p className="mt-2 text-sm text-muted-foreground">
          out of {QUESTION_COUNT} questions
        </p>
      </CardContent>
      <CardFooter className="justify-center border-t pt-6">
        <Button type="button" variant="outline" onClick={onPlayAgain}>
          <RotateCcw className="size-4" />
          Play again
        </Button>
      </CardFooter>
    </Card>
  )
}
