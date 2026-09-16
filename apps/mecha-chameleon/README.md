# Mecha Chameleon

A browser mini-game where you pilot a chrome mech against the **Mecha Chameleon** — an original mecha lizard boss in the Chrome Lizard Arena. Dodge telegraphed attacks, shoot, and melee your way to victory.

All art is procedurally drawn on canvas. No third-party or copyrighted assets are used.

## Quick start

```bash
bun install
bun run dev
```

Open the URL shown in the terminal (default: `http://localhost:4317`).

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD or Arrow keys | On-screen D-pad |
| Dash | Shift | DASH button |
| Shoot | J or Space | FIRE button |
| Melee | K or E | HIT button |
| Start / Restart | Enter or click | Tap screen |

Use the **Sound** toggle in the top-right to mute procedural audio.

## Boss phases

The Mecha Chameleon escalates through three phases as its HP drops:

1. **Phase I** — Tongue swipe and jump slam
2. **Phase II** — Adds camouflage fade (harder to see) and faster patterns
3. **Phase III** — Laser sweeps and shorter telegraphs

Every attack shows a clear telegraph (red zones, slam circles, pink laser warnings) before it lands.

## Scripts

- `bun run dev` — Start the Vite dev server
- `bun run build` — Production build to `dist/`
- `bun run start` — Serve `dist/` on `$PORT` (production)
- `bun run preview` — Preview the production build locally

## Deploy on Railway

This repo is configured for [Railway](https://railway.app/) via `railway.toml`:

| Phase | Command |
|-------|---------|
| Build | `bun install && bun run build` |
| Start | `bun run start` (Bun static server on `$PORT`) |

### Dashboard steps (Norman)

1. Open [railway.app/new](https://railway.app/new) and sign in.
2. Choose **Deploy from Git repo**.
3. Connect the GitHub repo `normausome/norm-monorepo`.
4. Select the repo and branch **`main`**.
5. Set **Root Directory** to `apps/mecha-chameleon`. This app lives in a monorepo, so Railway needs the app folder, not the repo root.
6. Railway reads `railway.toml` from that folder. Confirm:
   - **Build command:** `bun install && bun run build`
   - **Start command:** `bun run start`
7. Deploy. Railway sets `$PORT`; no extra env vars required.
8. Open **Settings → Networking → Generate Domain** to get the public URL.

### Local production test

```bash
bun run build
PORT=4317 bun run start
```

## Tech

- Vite + TypeScript + HTML Canvas 2D
- Bun package manager (`bunfig.toml` sets `minimumReleaseAge = 259200`)
