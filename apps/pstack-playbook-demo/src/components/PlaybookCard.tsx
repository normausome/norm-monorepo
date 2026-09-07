import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Playbook } from "@/data/playbooks"
import type { RouteResult } from "@/lib/router"
import { ShieldCheck } from "lucide-react"

type PlaybookCardProps = {
  result: RouteResult
}

export function PlaybookCard({ result }: PlaybookCardProps) {
  const { playbook, score, matchedKeywords, confidence } = result

  return (
    <Card className="text-left">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Routed playbook</Badge>
          <Badge
            variant={
              confidence === "high"
                ? "default"
                : confidence === "medium"
                  ? "outline"
                  : "secondary"
            }
          >
            {confidence} confidence
          </Badge>
          {score > 0 && (
            <Badge variant="outline">score {score}</Badge>
          )}
        </div>
        <CardTitle className="text-2xl">{playbook.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{playbook.summary}</p>
        {matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {matchedKeywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Playbook steps
          </h3>
          <ol className="space-y-2 text-sm">
            {playbook.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Skills invoked
          </h3>
          <div className="flex flex-wrap gap-2">
            {playbook.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

type VerificationCalloutProps = {
  playbook: Playbook
}

export function VerificationCallout({ playbook }: VerificationCalloutProps) {
  return (
    <Card className="border-primary/30 bg-primary/5 text-left">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <CardTitle className="text-lg">Verification is first-class</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          pstack treats verification as a core principle — not an afterthought.
          The{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {playbook.verification.principle}
          </code>{" "}
          principle applies here.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {playbook.verification.checks.map((check) => (
            <li key={check} className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
