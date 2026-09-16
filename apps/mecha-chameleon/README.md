# Mecha Chameleon

A browser hide-and-seek game. You are a white mannequin on a patterned floor. Paint your body to match the floor, pick a pose, and hold still while one seeker sweeps the stage.

## Originality

The game takes only its loop from the hide-and-seek genre. Prepare, paint, freeze, get hunted. Every other part is original. The stage, the art, the names, and the code were made for this repo. No third-party assets, logos, level layouts, or names are used.

## Quick start

```bash
bun install
bun run dev
```

Open the URL Vite prints (default `http://localhost:4317`).

## How a round plays

1. Lobby. Press **Start** or Enter.
2. Prep, 45 seconds. Move, paint, and pose. Press **Ready** or Enter to skip the rest of the timer.
3. Hunt, 90 seconds. You cannot move or paint. The seeker patrols and tags you if you enter its detection circle.
4. Win if the hunt timer reaches zero. Lose if the seeker tags you. **Play again** starts a new prep with a clean white body. **Lobby** or Escape returns to the lobby.

The detection circle is drawn around the seeker. Its size comes from your camouflage score and your pose. A white body standing on the slate floor gives a radius of about 200 px. A fully matched body gives a radius of 40 px, which is close to the 30 px tag distance.

## Controls

| Action | Input |
|--------|-------|
| Move (prep only) | WASD or arrow keys |
| Pick a colour | Click the floor. The swatch in the toolbar shows the pick. |
| Paint | Click or drag on your body |
| Brush size | Slider, or `[` and `]` |
| Pose | `1` Stand, `2` Crouch, `3` Wall flat, or the toolbar buttons |
| Ready, Start, Play again | Enter or the on-screen button |
| Back to lobby | Escape |

The HUD shows the phase, the timer, and a live camouflage percentage during prep.

## Timers

`PREP_SECONDS` (45) and `HUNT_SECONDS` (90) are in `src/config.ts`. For a short demo, override both from the URL. `?prep=8&hunt=12` runs a full round in under 30 seconds. Values are seconds and cap at 600.

## Scripts

- `bun run dev` starts the Vite dev server on port 4317.
- `bun run build` type-checks with `tsc` and writes `dist/`.
- `bun run start` serves `dist/` with `server.ts` on `$PORT` (default 3000).
- `bun run preview` previews the production build with Vite.

## Deploy on Railway

`railway.toml` sets the build command to `bun install && bun run build` and the start command to `bun run start`. `server.ts` binds `0.0.0.0` on the `PORT` Railway injects. No other environment variables are read.

1. Create a project from the GitHub repo `normausome/norm-monorepo`, branch `main`.
2. Set **Root Directory** to `apps/mecha-chameleon`. The app is one folder in a monorepo, so Railway needs the folder, not the repo root.
3. Deploy, then open **Settings**, **Networking**, **Generate Domain**.

Local production check:

```bash
bun run build
PORT=4317 bun run start
```

## Code map

- `src/game.ts` owns the `Phase` union, the frame loop, input, drawing, and the HTML overlay.
- `src/hider.ts` holds `POSE_SHAPE`, the body rect per pose, and movement.
- `src/paint.ts` is `PaintBuffer`, the 48x96 body texture, the brush, and the camouflage score.
- `src/seeker.ts` is the AI. Fixed waypoints, a detection radius, a patrol or chase mode, and the tag check.
- `src/stage.ts` draws the stage once and exposes pixel sampling.
- `src/config.ts` holds the stage size, the timers, and `readTimers`.
