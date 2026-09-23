import type { Timers } from "./config";
import { hiderFootprint, moveHider, POSE_SHAPE, POSES, spawnHider, type Hider, type Pose } from "./hider";
import { PaintBuffer } from "./paint";
import { World } from "./scene";
import { detectRadiusFor, spawnSeeker, updateSeeker, type Seeker } from "./seeker";
import { buildStage, type Stage } from "./stage";
import { rgbCss, type Rgb, type Vec2 } from "./utils";

export type Phase =
  | { kind: "lobby" }
  | { kind: "prep"; remaining: number }
  | { kind: "hunt"; remaining: number; seeker: Seeker; camouflage: number }
  | { kind: "win"; seeker: Seeker; camouflage: number }
  | { kind: "lose"; seeker: Seeker; survived: number };

interface Brush {
  size: number;
  color: Rgb;
}

const MOVE_KEYS: Record<string, Vec2> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const POSE_KEYS: Record<string, Pose> = { Digit1: "stand", Digit2: "crouch", Digit3: "wallflat" };

/** Radians per second while a key is held. yaw, pitch. */
const ORBIT_KEYS: Record<string, [number, number]> = {
  KeyQ: [1.8, 0],
  KeyE: [-1.8, 0],
  KeyR: [0, 1.2],
  KeyF: [0, -1.2],
};
const ORBIT_DRAG_RADIANS_PER_PX = 0.006;

export class Game {
  phase: Phase = { kind: "lobby" };
  readonly stage: Stage = buildStage();
  readonly hider: Hider = spawnHider(new PaintBuffer());
  brush: Brush = { size: 14, color: [31, 138, 128] };
  camouflage = 0;

  readonly world: World;

  private readonly keys = new Set<string>();
  private painting = false;
  private orbiting: Vec2 | null = null;
  private last = 0;
  private readonly ui: Ui;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    private readonly timers: Timers,
  ) {
    this.world = new World(canvas, this.stage, this.hider.paint);
    this.ui = buildUi(overlay, {
      primary: () => this.advance(),
      lobby: () => this.toLobby(),
      pose: (p) => this.setPose(p),
      brushSize: (n) => (this.brush.size = n),
    });
    this.bindInput();
  }

  start(): void {
    this.toLobby();
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Enter or the primary button. What it means depends on the phase. */
  advance(): void {
    switch (this.phase.kind) {
      case "lobby":
      case "win":
      case "lose":
        this.toPrep();
        return;
      case "prep":
        this.toHunt();
        return;
      case "hunt":
        return;
    }
  }

  toLobby(): void {
    this.phase = { kind: "lobby" };
  }

  toPrep(): void {
    Object.assign(this.hider, spawnHider(this.hider.paint));
    this.phase = { kind: "prep", remaining: this.timers.prep };
  }

  toHunt(): void {
    const camouflage = this.hider.paint.camouflage(this.stage, hiderFootprint(this.hider));
    const seeker = spawnSeeker(detectRadiusFor(camouflage, this.hider.pose));
    this.phase = { kind: "hunt", remaining: this.timers.hunt, seeker, camouflage };
  }

  setPose(pose: Pose): void {
    if (this.phase.kind !== "prep") return;
    this.hider.pose = pose;
  }

  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.update(dt);
    for (const code of this.keys) {
      const o = ORBIT_KEYS[code];
      if (o) this.world.rotate(o[0] * dt, o[1] * dt);
    }
    this.draw();
    this.ui.sync(this.phase, this.hider, this.brush, this.camouflage);
    requestAnimationFrame((t) => this.frame(t));
  }

  private update(dt: number): void {
    const phase = this.phase;
    switch (phase.kind) {
      case "lobby":
      case "win":
      case "lose":
        return;
      case "prep": {
        const dir = { x: 0, y: 0 };
        for (const code of this.keys) {
          const v = MOVE_KEYS[code];
          if (v) {
            dir.x += v.x;
            dir.y += v.y;
          }
        }
        moveHider(this.hider, dir, dt);
        this.camouflage = this.hider.paint.camouflage(this.stage, hiderFootprint(this.hider));
        phase.remaining -= dt;
        if (phase.remaining <= 0) this.toHunt();
        return;
      }
      case "hunt": {
        phase.remaining -= dt;
        if (updateSeeker(phase.seeker, this.hider.pos, dt)) {
          this.phase = { kind: "lose", seeker: phase.seeker, survived: this.timers.hunt - phase.remaining };
        } else if (phase.remaining <= 0) {
          this.phase = { kind: "win", seeker: phase.seeker, camouflage: phase.camouflage };
        }
        return;
      }
    }
  }

  private draw(): void {
    const phase = this.phase;
    this.world.syncHider(this.hider, phase.kind !== "hunt");
    this.world.syncSeeker("seeker" in phase ? phase.seeker : null);
    this.world.render();
  }

  private bindInput(): void {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code in MOVE_KEYS || e.code === "Space") e.preventDefault();
      if (e.code === "Enter") this.advance();
      else if (e.code === "Escape") this.toLobby();
      else if (e.code in POSE_KEYS) this.setPose(POSE_KEYS[e.code]);
      else if (e.code === "BracketLeft") this.brush.size = Math.max(4, this.brush.size - 4);
      else if (e.code === "BracketRight") this.brush.size = Math.min(40, this.brush.size + 4);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2) {
        this.orbiting = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button !== 0 || this.phase.kind !== "prep") return;
      const pick = this.world.pick(this.toNdc(e), false);
      switch (pick.kind) {
        case "body":
          this.painting = true;
          this.paintAt(pick.u, pick.v);
          return;
        case "surface":
          this.brush.color = pick.rgb;
          return;
        case "none":
          return;
      }
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (this.orbiting) {
        this.world.rotate(-(e.clientX - this.orbiting.x) * ORBIT_DRAG_RADIANS_PER_PX, (e.clientY - this.orbiting.y) * ORBIT_DRAG_RADIANS_PER_PX);
        this.orbiting = { x: e.clientX, y: e.clientY };
        return;
      }
      if (!this.painting || this.phase.kind !== "prep") return;
      const pick = this.world.pick(this.toNdc(e), true);
      if (pick.kind === "body") this.paintAt(pick.u, pick.v);
    });
    const stop = () => {
      this.painting = false;
      this.orbiting = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  private toNdc(e: PointerEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
  }

  /** The capsule's u wraps around the body, so a dab near the seam is repeated one texture width to each side. */
  private paintAt(u: number, v: number): void {
    const radius = this.brush.size * 0.6;
    for (const du of [-1, 0, 1]) this.hider.paint.dab(u + du, v, radius, this.brush.color);
    this.world.markSkinPainted();
  }
}

interface UiHandlers {
  primary: () => void;
  lobby: () => void;
  pose: (p: Pose) => void;
  brushSize: (n: number) => void;
}

interface Ui {
  sync(phase: Phase, hider: Hider, brush: Brush, camouflage: number): void;
}

const SCREEN_TITLE: Record<"lobby" | "win" | "lose", string> = {
  lobby: "Mecha Chameleon",
  win: "You survived",
  lose: "Tagged",
};

function buildUi(overlay: HTMLElement, on: UiHandlers): Ui {
  overlay.innerHTML = `
    <div id="hud"><span id="hud-phase"></span><span id="hud-timer"></span><span id="hud-camo"></span></div>
    <div id="toolbar">
      <span id="swatch" title="Brush colour. Click the floor to pick one."></span>
      <label>Brush <input id="brush" type="range" min="4" max="40" step="1"></label>
      <span id="poses"></span>
      <button id="ready">Ready</button>
    </div>
    <div id="screen">
      <h1 id="screen-title"></h1>
      <p id="screen-body"></p>
      <button id="primary"></button>
      <button id="to-lobby">Lobby</button>
    </div>`;
  const $ = <T extends HTMLElement>(id: string) => overlay.querySelector<T>(`#${id}`)!;

  const poses = $("poses");
  const poseButtons = POSES.map((pose) => {
    const b = document.createElement("button");
    b.textContent = `${POSE_SHAPE[pose].key} ${POSE_SHAPE[pose].label}`;
    b.dataset.pose = pose;
    b.addEventListener("click", () => on.pose(pose));
    poses.appendChild(b);
    return b;
  });
  const brush = $<HTMLInputElement>("brush");
  brush.addEventListener("input", () => on.brushSize(Number(brush.value)));
  $("ready").addEventListener("click", on.primary);
  $("primary").addEventListener("click", on.primary);
  $("to-lobby").addEventListener("click", on.lobby);

  const hudPhase = $("hud-phase");
  const hudTimer = $("hud-timer");
  const hudCamo = $("hud-camo");
  const swatch = $("swatch");
  const toolbar = $("toolbar");
  const screen = $("screen");
  const title = $("screen-title");
  const body = $("screen-body");
  const primary = $("primary");
  const toLobby = $("to-lobby");

  return {
    sync(phase, hider, brushState, camouflage) {
      overlay.dataset.phase = phase.kind;
      toolbar.hidden = phase.kind !== "prep";
      screen.hidden = phase.kind === "prep" || phase.kind === "hunt";
      hudPhase.textContent = phase.kind === "prep" ? "PREP" : phase.kind === "hunt" ? "HUNT" : "";
      hudTimer.textContent = "remaining" in phase ? formatSeconds(phase.remaining) : "";
      hudCamo.textContent = phase.kind === "prep" ? `Camo ${percent(camouflage)}` : "";
      swatch.style.background = rgbCss(brushState.color);
      brush.value = String(brushState.size);
      for (const b of poseButtons) b.classList.toggle("active", b.dataset.pose === hider.pose);

      if (phase.kind === "prep" || phase.kind === "hunt") return;
      title.textContent = SCREEN_TITLE[phase.kind];
      toLobby.hidden = phase.kind === "lobby";
      switch (phase.kind) {
        case "lobby":
          body.textContent = "You are the hider. Paint your white body to match the floor, pick a pose, and hold still. When the seeker arrives you cannot move.";
          primary.textContent = "Start";
          return;
        case "win":
          body.textContent = `The seeker never saw you. Camouflage ${percent(phase.camouflage)}.`;
          primary.textContent = "Play again";
          return;
        case "lose":
          body.textContent = `The seeker found you after ${phase.survived.toFixed(1)} s.`;
          primary.textContent = "Play again";
          return;
      }
    },
  };
}

function formatSeconds(s: number): string {
  const whole = Math.max(0, Math.ceil(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function percent(n: number): string {
  return `${Math.round(n * 100)}%`;
}
