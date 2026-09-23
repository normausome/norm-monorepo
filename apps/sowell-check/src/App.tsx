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
  SECTION_ORDER,
  SECTION_SOURCE_LINK_TEXT,
  SECTION_SOURCE_URL,
  choiceLabel,
  questionsFor,
  sectionLabel,
} from "@/data/questions"
import type { Question, SectionChoice } from "@/data/questions"
import {
  initialQuizPhase,
  isAnswerCorrect,
  quizReducer,
  scoreTakeaway,
  sectionOfRun,
  tallyBySection,
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
  const [section, setSection] = useState<SectionChoice>("all")
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
          A Thomas Sowell quiz in sections. Pick one, or play All. Add{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            #seed=your-run
          </code>{" "}
          to shuffle that set.
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        {phase.type === "title" && (
          <TitleScreen
            section={section}
            onSection={setSection}
            onStart={() => send({ type: "START", seed, section })}
          />
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
            phase={phase}
            onPlayAgain={() =>
              send({
                type: "PLAY_AGAIN",
                seed,
                section: sectionOfRun(phase.order),
              })
            }
            onChooseSection={() => send({ type: "BACK_TO_TITLE" })}
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

function TitleScreen({
  section,
  onSection,
  onStart,
}: {
  section: SectionChoice
  onSection: (section: SectionChoice) => void
  onStart: () => void
}) {
  const count = questionsFor(section).length
  const sourceUrl = section === "all" ? undefined : SECTION_SOURCE_URL[section]
  const sourceLinkText =
    section === "all" ? undefined : SECTION_SOURCE_LINK_TEXT[section]
  const options: SectionChoice[] = ["all", ...SECTION_ORDER]
  const blurb =
    section === "all"
      ? `${count} questions across ${SECTION_ORDER.length} sections. One at a time, then a short explanation and a source line.`
      : `${count} questions on ${choiceLabel(section)}. One at a time, then a short explanation and a source line.`

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle>Pick a section</CardTitle>
        <CardDescription>{blurb}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Quiz section"
          className="flex flex-wrap justify-center gap-2"
        >
          {options.map((option) => {
            const selected = option === section
            const optionCount = questionsFor(option).length
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                role="radio"
                aria-checked={selected}
                className="h-auto min-h-8 max-w-full whitespace-normal py-1"
                onClick={() => onSection(option)}
              >
                {choiceLabel(option)}
                <span className={selected ? "opacity-80" : "text-muted-foreground"}>
                  {optionCount}
                </span>
              </Button>
            )
          })}
        </div>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded border p-3 text-center break-all text-primary"
          >
            {sourceLinkText}
            <span className="mt-1 block">{sourceUrl}</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center border-t pt-6">
        <Button size="lg" type="button" onClick={onStart} disabled={count === 0}>
          Start quiz
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
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
        order: Question[]
        answers: (string | null)[]
      }
    | {
        type: "feedback"
        index: number
        order: Question[]
        answers: (string | null)[]
        selectedId: string
      }
  progressLabel: string
  onAnswer: (choiceId: string) => void
  onNext: () => void
}) {
  const question = phase.order[phase.index]!
  const sourceUrl = SECTION_SOURCE_URL[question.section]
  const isFeedback = phase.type === "feedback"
  const selectedId = isFeedback ? phase.selectedId : null
  const correct = selectedId
    ? isAnswerCorrect(question, selectedId)
    : false

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{sectionLabel(question.section)}</Badge>
            <Badge variant="outline">
              {question.kind === "trivia" ? "Trivia" : "Scenario"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{progressLabel}</span>
        </div>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-full text-xs break-all text-primary underline underline-offset-4"
          >
            {sourceUrl}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
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
  phase,
  onPlayAgain,
  onChooseSection,
}: {
  phase: Extract<QuizPhase, { type: "end" }>
  onPlayAgain: () => void
  onChooseSection: () => void
}) {
  const score = tallyScore(phase.order, phase.answers)
  const total = phase.order.length
  const rows = tallyBySection(phase.order, phase.answers)
  const runSection = sectionOfRun(phase.order)
  const runLabel =
    runSection === "all" ? "All sections" : choiceLabel(runSection)

  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle>Run complete</CardTitle>
        <CardDescription>
          {scoreTakeaway(score, total)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold tabular-nums tracking-tight">
          {score}/{total}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{runLabel}</p>
        {rows.length > 1 ? (
          <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
            {rows.map((row) => (
              <li
                key={row.section}
                className="flex items-center justify-between gap-4 border-b border-border/70 pb-2"
              >
                <span>{sectionLabel(row.section)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.correct}/{row.total}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center gap-2 border-t pt-6">
        <Button type="button" variant="outline" onClick={onChooseSection}>
          Choose section
        </Button>
        <Button type="button" onClick={onPlayAgain}>
          <RotateCcw className="size-4" />
          Play again
        </Button>
      </CardFooter>
    </Card>
  )
}
