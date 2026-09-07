# Tech demos monorepo

Sticky playground for weekday X-bookmark tech demos. One app per pick under `apps/<slug>/`.

## Rules for cloud agents

- Only add/update files under `apps/<slug>/` for the assigned demo (plus `tracking/seen-bookmarks.json` when recording proposals).
- Never create a new GitHub repository.
- Prefer Bun. Each app must be self-contained: `bun install && bun run dev` from its folder.
- Before any `bun install` / `bun add` in a new app, ensure `bunfig.toml` has `[install] minimumReleaseAge = 259200`.
- Plan with `skills/project-planning/` (or the app's `PLAN.md`).
- Open one PR per demo. Attach **both** at least one screenshot **and** at least one video of the running app.

## Layout

- `AGENTS.md` — this file
- `skills/project-planning/` — vendored planning skill
- `apps/<slug>/` — one demo app per pick
- `tracking/seen-bookmarks.json` — proposed/seen bookmark ids (do not re-propose)

## Cloudflare previews

One Pages project for the monorepo (path per `apps/<slug>/`), not one project per app. Needs repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
