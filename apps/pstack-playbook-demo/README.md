# pstack Playbook Demo

Interactive single-page explainer for [pstack](https://github.com/cursor/plugins/tree/main/pstack) — how `/poteto-mode` routes a plain-language goal to a playbook and why verification is first-class.

Inspired by [@poteto's Complete Guide Pt. 1](https://x.com/poteto/status/2094457600259842065).

## Quick start

```bash
cd apps/pstack-playbook-demo
bun install
bun run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## What it does

1. Enter or pick a sample engineering goal.
2. A static keyword router matches the goal to a pstack playbook.
3. The UI shows playbook steps, invoked skills, and verification checks.

This is a **demo only** — no real plugin install, no multi-agent orchestration.

## Stack

- Bun + Vite + React + TypeScript
- shadcn/ui (button, card, input, select, badge)

## Project layout

```
src/
  data/playbooks.ts   — static playbook catalog
  lib/router.ts       — keyword routing
  components/         — UI
  App.tsx             — one-screen flow
```

See [PLAN.md](./PLAN.md) for scope and deferred items.
