#!/usr/bin/env bash
set -euo pipefail

slug="${1:-}"
url="${2:-}"
if [ -z "$slug" ]; then
  echo "usage: record-local.sh <app-slug> [url]" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/../.." && pwd)"
app="$root/apps/$slug"
if [ ! -f "$app/vite.config.ts" ]; then
  echo "$slug has no vite.config.ts" >&2
  exit 1
fi

cd "$root/.github/demo"
bun install --frozen-lockfile
bunx playwright install chromium

if [ -z "$url" ]; then
  url="http://127.0.0.1:4173"
  (
    cd "$app"
    bun install --frozen-lockfile
    bun run build
    bun run preview -- --host 127.0.0.1 --port 4173 --strictPort
  ) &
  preview_pid=$!
  trap 'kill "$preview_pid" 2>/dev/null || true' EXIT
  ready=0
  for _ in $(seq 1 90); do
    if curl -sf "$url" >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" != 1 ]; then
    echo "$slug did not serve a preview" >&2
    exit 1
  fi
fi

mkdir -p "$root/.demo-capture/$slug"
node "$root/.github/demo/capture.mjs" "$url" "$root/.demo-capture/$slug"
echo "$root/.demo-capture/$slug"
