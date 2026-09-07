# pstack Playbook Demo — Plan

## Goal

Build an interactive single-user explainer for [pstack](https://github.com/cursor/plugins/tree/main/pstack) (Lauren Tan / @poteto). Teach how `/poteto-mode` routes a plain-language goal to a playbook and why verification is first-class in pstack's engineering workflow.

Reference: [pstack Complete Guide Pt. 1](https://x.com/poteto/status/2094457600259842065)

## Single-user MVP

One page, one flow:

1. User types or picks a sample goal (e.g. "fix scroll drift bug, repro first").
2. Static keyword router matches the goal to a playbook from pstack's catalog.
3. UI shows the routed playbook name, purpose, ordered steps, and linked skills.
4. Verification callout highlights the prove-it-works principle and playbook-specific checks.

No backend, no auth, no real plugin install.

## Out of scope

- Installing or invoking the real pstack plugin
- Multi-agent orchestration or subagent spawning
- Model selection / `/setup-pstack`
- Full 22-playbook catalog (subset for demo clarity)
- Authentication, persistence, or multi-user state

## Stack

- **Runtime / package manager:** Bun
- **Build:** Vite + React + TypeScript
- **UI:** shadcn/ui (minimalist) — button, card, input, select, badge only
- **Routing logic:** Static playbook catalog + keyword scoring in client TS

## Architecture

```
src/
  data/playbooks.ts     — static catalog (id, name, keywords, steps, verification)
  lib/router.ts         — keyword match + confidence score
  components/           — GoalInput, PlaybookCard, VerificationCallout
  App.tsx               — one-screen layout
```

## Deferred

- Live `/poteto-mode` integration via Cursor plugin API
- All 22 playbooks with full step text from upstream
- Animated routing timeline (todo list opening, skill invocations)
- Dark/light theme toggle
- Shareable permalink for a routed goal
- `/figure-it-out` fallback playbook designer UI

## Success criteria

- `bun install && bun run dev` works from `apps/pstack-playbook-demo/`
- Goal → playbook routing is visible and explain verification
- PR includes ≥1 screenshot and ≥1 short video of the running app
