import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Question } from "@/data/questions"
import { cn } from "@/lib/utils"
import { isAnswerCorrect } from "@/quiz/engine"
import { ListTree } from "lucide-react"

export function truncatePrompt(text: string, max = 96): string {
  const trimmed = text.replace(/\s+/g, " ").trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

type SectionGroup<T extends { section: string }> = {
  section: string
  items: T[]
}

export function groupBySectionOrder<T extends { section: string }>(
  items: readonly T[],
  sectionOrder: readonly string[],
): SectionGroup<T>[] {
  const buckets = new Map<string, T[]>()
  for (const id of sectionOrder) buckets.set(id, [])
  for (const item of items) {
    const list = buckets.get(item.section)
    if (list) list.push(item)
  }
  return sectionOrder
    .map((section) => ({ section, items: buckets.get(section) ?? [] }))
    .filter((group) => group.items.length > 0)
}

export function QuestionSetOverview({
  questions,
  sectionOrder,
  sectionLabel,
  groupSections,
}: {
  questions: readonly Question[]
  sectionOrder: readonly string[]
  sectionLabel: (section: string) => string
  groupSections: boolean
}) {
  const groups = groupSections
    ? groupBySectionOrder(questions, sectionOrder)
    : [{ section: "", items: [...questions] }]

  return (
    <details
      className="mt-6 rounded-lg border bg-muted/30 text-left"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ListTree className="size-4 shrink-0 text-primary" aria-hidden />
        All questions in this set
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {questions.length}
        </Badge>
      </summary>
      <div className="max-h-64 overflow-y-auto border-t px-3 py-2 sm:max-h-80">
        {groups.map((group) => (
          <div key={group.section || "flat"} className="mb-3 last:mb-0">
            {groupSections ? (
              <p className="sticky top-0 z-10 bg-muted/95 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                {sectionLabel(group.section)}
                <span className="ml-1 font-normal normal-case tabular-nums">
                  ({group.items.length})
                </span>
              </p>
            ) : null}
            <ol className="space-y-1.5">
              {group.items.map((question, idx) => (
                <li
                  key={question.id}
                  className="rounded-md border border-transparent bg-background/80 px-2 py-1.5 text-xs leading-snug"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {question.id}
                    </span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {question.kind === "trivia" ? "Trivia" : "Scenario"}
                    </Badge>
                    {groupSections ? null : (
                      <span className="text-[10px] text-muted-foreground">
                        #{idx + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-foreground/90">
                    {truncatePrompt(question.prompt, 120)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  )
}

export function RunQuestionNav({
  order,
  index,
  answers,
  sectionLabel,
  showSectionLabels,
  onJump,
}: {
  order: readonly Question[]
  index: number
  answers: readonly (string | null)[]
  sectionLabel: (section: string) => string
  showSectionLabels: boolean
  onJump: (targetIndex: number) => void
}) {
  return (
    <div className="mb-4 rounded-lg border bg-card/80 p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Questions in this run
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1} / {order.length}
        </span>
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="navigation"
        aria-label="Jump to a question in this run"
      >
        {order.map((question, i) => {
          const answered = answers[i]
          const isCurrent = i === index
          const canJump = i <= index
          const correct =
            answered !== null && isAnswerCorrect(question, answered)
          let variant: "default" | "outline" | "secondary" = "outline"
          if (isCurrent) variant = "default"
          else if (answered) variant = correct ? "secondary" : "outline"

          return (
            <Button
              key={`${question.id}-${i}`}
              type="button"
              size="sm"
              variant={variant}
              disabled={!canJump}
              title={
                canJump
                  ? `${question.id}: ${truncatePrompt(question.prompt, 72)}`
                  : "Answer up to here first"
              }
              className={cn(
                "h-8 min-w-8 px-2 tabular-nums",
                answered && !correct && !isCurrent && "border-destructive/50",
              )}
              onClick={() => onJump(i)}
            >
              {i + 1}
            </Button>
          )
        })}
      </div>
      <details className="mt-3 border-t pt-3">
        <summary className="cursor-pointer text-xs font-medium text-primary">
          Show full list
        </summary>
        <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs sm:max-h-56">
          {order.map((question, i) => {
            const isCurrent = i === index
            const answered = answers[i]
            return (
              <li key={`${question.id}-row-${i}`}>
                <button
                  type="button"
                  disabled={i > index}
                  onClick={() => onJump(i)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-background hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums">{i + 1}.</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {question.id}
                    </span>
                    {showSectionLabels ? (
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {sectionLabel(question.section)}
                      </Badge>
                    ) : null}
                    {answered ? (
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          isAnswerCorrect(question, answered)
                            ? "text-primary"
                            : "text-destructive",
                        )}
                      >
                        {isAnswerCorrect(question, answered)
                          ? "Correct"
                          : "Missed"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 leading-snug text-foreground/90">
                    {truncatePrompt(question.prompt, 140)}
                  </p>
                </button>
              </li>
            )
          })}
        </ol>
      </details>
    </div>
  )
}
