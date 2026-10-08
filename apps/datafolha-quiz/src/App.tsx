import { useEffect, useMemo, useReducer, useState } from "react"
import { COMPARE, COPY } from "@/copy"
import { ITEMS, type Lang } from "@/quiz/items"
import { scoreQuiz, type QuizScore } from "@/quiz/score"
import {
  allAnswered,
  displaySwap,
  initialQuizState,
  quizReducer,
  shuffleItems,
  statementsInOrder,
  type Run,
} from "@/quiz/session"

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]))

function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function freshOrder(): { order: string[]; swap: Record<string, boolean> } {
  return {
    order: shuffleItems(ITEMS, Math.random).map((item) => item.id),
    swap: displaySwap(ITEMS, Math.random),
  }
}

export function App() {
  const [lang, setLang] = useState<Lang>("en")
  const [state, dispatch] = useReducer(quizReducer, initialQuizState)
  const t = COPY[lang]

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en"
    document.title = t.title
  }, [lang, t.title])

  const run = state.screen === "intro" ? null : state
  const score = useMemo(() => {
    if (!run || !allAnswered(run)) return null
    const picks: Record<string, string> = {}
    for (const id of run.order) {
      const pick = run.picks[id]
      if (pick) picks[id] = pick
    }
    return scoreQuiz(ITEMS, picks)
  }, [run])

  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.kicker}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.title}
          </h1>
        </div>
        <div role="group" aria-label={t.language} className="flex shrink-0 gap-1">
          <LangButton
            pressed={lang === "en"}
            onClick={() => setLang("en")}
            label="EN"
          />
          <LangButton
            pressed={lang === "pt"}
            onClick={() => setLang("pt")}
            label="PT"
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {state.screen === "intro" ? (
          <Intro
            lede={t.lede}
            scale={t.scale}
            start={t.start}
            onStart={() => dispatch({ type: "START", ...freshOrder() })}
          />
        ) : null}
        {state.screen === "question" ? (
          <Question
            lang={lang}
            run={state}
            onPick={(itemId, statementId) =>
              dispatch({ type: "PICK", itemId, statementId })
            }
            onJump={(index) => dispatch({ type: "JUMP", index })}
            onBack={() => dispatch({ type: "BACK" })}
            onNext={() => dispatch({ type: "NEXT" })}
            onResults={() => dispatch({ type: "RESULTS" })}
          />
        ) : null}
        {state.screen === "results" && score ? (
          <Results
            lang={lang}
            score={score}
            onRetake={() => dispatch({ type: "RETAKE", ...freshOrder() })}
            onEdit={() => dispatch({ type: "EDIT" })}
          />
        ) : null}
      </main>

      <Footer lang={lang} />
    </div>
  )
}

function LangButton({
  pressed,
  onClick,
  label,
}: {
  pressed: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-md border px-3 text-sm font-medium ${
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card"
      }`}
    >
      {label}
    </button>
  )
}

function Intro({
  lede,
  scale,
  start,
  onStart,
}: {
  lede: string
  scale: string
  start: string
  onStart: () => void
}) {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <p className="text-base leading-relaxed">{lede}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{scale}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-2 min-h-12 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground"
      >
        {start}
      </button>
    </section>
  )
}

function Question({
  lang,
  run,
  onPick,
  onJump,
  onBack,
  onNext,
  onResults,
}: {
  lang: Lang
  run: Run
  onPick: (itemId: string, statementId: string) => void
  onJump: (index: number) => void
  onBack: () => void
  onNext: () => void
  onResults: () => void
}) {
  const t = COPY[lang]
  const itemId = run.order[run.index]
  const item = itemId ? BY_ID.get(itemId) : undefined
  if (!item) return null
  const choices = statementsInOrder(item, run.swap[item.id] ?? false)
  const picked = run.picks[item.id]
  const complete = allAnswered(run)
  const last = run.index === run.order.length - 1

  return (
    <section className="flex flex-1 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t.progress(run.index + 1, run.order.length)}
      </p>
      <ol className="grid grid-cols-8 gap-1.5" aria-label={t.progress(run.index + 1, run.order.length)}>
        {run.order.map((id, index) => {
          const answered = run.picks[id] !== undefined
          const current = index === run.index
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                aria-label={t.jump(index + 1)}
                onClick={() => onJump(index)}
                className={`min-h-11 w-full rounded-md border text-xs ${
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered
                      ? "border-primary bg-muted"
                      : "border-border bg-card"
                }`}
              >
                {index + 1}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="text-sm font-medium text-muted-foreground">{item.topic[lang]}</p>
      <h2 id="agree-prompt" className="text-lg font-semibold leading-snug">
        {t.agree}
      </h2>
      <div role="group" aria-labelledby="agree-prompt" className="flex flex-col gap-3">
        {choices.map((choice) => {
          const selected = picked === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(item.id, choice.id)}
              className={`min-h-16 rounded-lg border px-4 py-3 text-left text-base leading-snug ${
                selected ? "border-primary bg-muted" : "border-border bg-card"
              }`}
            >
              <span className="block">{choice[lang]}</span>
              {selected ? (
                <span className="mt-2 block text-xs font-medium text-primary">
                  {t.selected}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={run.index === 0}
          className="min-h-12 flex-1 rounded-lg border border-border bg-card px-4 text-base disabled:opacity-40"
        >
          {t.back}
        </button>
        {last ? (
          <button
            type="button"
            onClick={onResults}
            disabled={!complete}
            className="min-h-12 flex-1 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
          >
            {t.seeResults}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={picked === undefined}
            className="min-h-12 flex-1 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
          >
            {t.next}
          </button>
        )}
      </div>
      {!last && complete ? (
        <button
          type="button"
          onClick={onResults}
          className="min-h-12 rounded-lg border border-primary px-4 text-base font-medium"
        >
          {t.seeResults}
        </button>
      ) : null}
      {last && !complete ? (
        <p className="text-sm text-muted-foreground">{t.answerAll}</p>
      ) : null}
    </section>
  )
}

function Results({
  lang,
  score,
  onRetake,
  onEdit,
}: {
  lang: Lang
  score: QuizScore
  onRetake: () => void
  onEdit: () => void
}) {
  const t = COPY[lang]
  const rows = [
    {
      name: t.behavior,
      score: score.behavior,
      low: t.progressive,
      high: t.conservative,
    },
    {
      name: t.economy,
      score: score.economy,
      low: t.state,
      high: t.market,
    },
    {
      name: t.overall,
      score: score.overall,
      low: t.left,
      high: t.right,
    },
  ]

  return (
    <section className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{t.scale}</p>
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.name}>
            <ScoreBar
              name={row.name}
              score={row.score}
              low={row.low}
              high={row.high}
            />
          </li>
        ))}
      </ul>
      <Plot lang={lang} economy={score.economy} behavior={score.behavior} />
      <p className="text-sm leading-relaxed text-muted-foreground">{t.context}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-12 flex-1 rounded-lg border border-border bg-card px-4 text-base"
        >
          {t.change}
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="min-h-12 flex-1 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground"
        >
          {t.retake}
        </button>
      </div>
    </section>
  )
}

function ScoreBar({
  name,
  score,
  low,
  high,
}: {
  name: string
  score: number
  low: string
  high: string
}) {
  const width = Math.max(0, Math.min(100, score))
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="font-medium">{name}</p>
        <p className="text-lg font-semibold tabular-nums">{formatScore(score)}</p>
      </div>
      <div
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(score)}
        aria-valuetext={formatScore(score)}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>
          0 {low}
        </span>
        <span>
          100 {high}
        </span>
      </div>
    </div>
  )
}

function Plot({
  lang,
  economy,
  behavior,
}: {
  lang: Lang
  economy: number
  behavior: number
}) {
  const t = COPY[lang]
  const label = t.plotLabel(Number(formatScore(economy)), Number(formatScore(behavior)))
  const left = 24
  const top = 22
  const plot = 200
  const dotX = left + (economy / 100) * plot
  const dotY = top + plot - (behavior / 100) * plot

  return (
    <figure>
      <svg
        viewBox="0 0 248 268"
        role="img"
        aria-label={label}
        className="mx-auto w-full max-w-sm"
      >
        <text x={left + plot / 2} y="14" textAnchor="middle" fontSize="12" fill="currentColor">
          {t.conservative}
        </text>
        <rect x={left} y={top} width={plot} height={plot} fill="var(--card)" stroke="var(--border)" />
        <line
          x1={left + plot / 2}
          y1={top}
          x2={left + plot / 2}
          y2={top + plot}
          stroke="var(--border)"
        />
        <line
          x1={left}
          y1={top + plot / 2}
          x2={left + plot}
          y2={top + plot / 2}
          stroke="var(--border)"
        />
        <circle cx={dotX} cy={dotY} r="7" fill="var(--primary)" />
        <text x={left + plot / 2} y="238" textAnchor="middle" fontSize="12" fill="currentColor">
          {t.progressive}
        </text>
        <text x={left} y="258" fontSize="12" fill="currentColor">
          {t.state}
        </text>
        <text x={left + plot} y="258" textAnchor="end" fontSize="12" fill="currentColor">
          {t.market}
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        {t.plotCaption}
      </figcaption>
    </figure>
  )
}

function Footer({ lang }: { lang: Lang }) {
  const t = COPY[lang]
  return (
    <footer className="mt-8 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
      <p>
        {t.footerBefore}
        <CompareLink href={COMPARE.globe}>{t.globe}</CompareLink>
        {t.footerBetween}
        <CompareLink href={COMPARE.meio}>{t.meio}</CompareLink>{" "}
        (
        <CompareLink href={COMPARE.meio}>canalmeio.com.br/painel-ideologico</CompareLink>
        )
        {t.footerBetween}
        <CompareLink href={COMPARE.compass}>{t.compass}</CompareLink>{" "}
        (
        <CompareLink href={COMPARE.compass}>politicalcompass.org/test</CompareLink>
        )
        {t.footerAnd}
        <CompareLink href={COMPARE.values}>{t.values}</CompareLink>{" "}
        (
        <CompareLink href={COMPARE.values}>testepolitico.com.br</CompareLink>
        )
        {t.footerAfter}
      </p>
    </footer>
  )
}

function CompareLink({
  href,
  children,
}: {
  href: string
  children: string
}) {
  return (
    <a href={href} className="underline decoration-border underline-offset-2">
      {children}
    </a>
  )
}
