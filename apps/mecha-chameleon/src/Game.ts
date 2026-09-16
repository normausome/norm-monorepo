import { Input } from "./Input";
import { Audio } from "./Audio";
import { Player, ARENA } from "./Player";
import { Boss } from "./Boss";
export type GameScreen = "start" | "playing" | "win" | "lose";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  audio: Audio;
  player: Player;
  boss: Boss;
  screen: GameScreen = "start";
  lastTime = 0;
  shake = 0;
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  muteBtn: HTMLButtonElement;

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new Input(overlay);
    this.audio = new Audio();
    this.player = new Player();
    this.boss = new Boss();

    canvas.width = ARENA.w;
    canvas.height = ARENA.h;

    this.muteBtn = document.createElement("button");
    this.muteBtn.className = "mute-btn";
    this.muteBtn.textContent = "🔊 Sound";
    this.muteBtn.addEventListener("click", () => {
      const muted = this.audio.toggleMute();
      this.muteBtn.textContent = muted ? "🔇 Muted" : "🔊 Sound";
    });
    overlay.appendChild(this.muteBtn);

    this.resize();
    window.addEventListener("resize", () => this.resize());

    canvas.addEventListener("click", () => this.handleClick());
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleClick();
      this.audio.resume();
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        if (this.screen === "start") this.startGame();
        else if (this.screen === "win" || this.screen === "lose") this.restart();
      }
      this.audio.resume();
    });
  }

  resize(): void {
    const scale = Math.min(window.innerWidth / ARENA.w, window.innerHeight / ARENA.h, 1.5);
    this.canvas.style.width = `${ARENA.w * scale}px`;
    this.canvas.style.height = `${ARENA.h * scale}px`;
  }

  handleClick(): void {
    this.audio.resume();
    if (this.screen === "start") this.startGame();
    else if (this.screen === "win" || this.screen === "lose") this.restart();
  }

  startGame(): void {
    this.screen = "playing";
    this.player.reset();
    this.boss.reset();
    this.particles = [];
    this.shake = 0;
  }

  restart(): void {
    this.startGame();
  }

  spawnParticles(x: number, y: number, color: string, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        color,
      });
    }
  }

  update(dt: number): void {
    if (this.screen !== "playing") return;

    dt = Math.min(dt, 0.05);
    this.shake = Math.max(0, this.shake - dt * 4);

    const move = this.input.moveVector();
    const shoot = this.input.wantsShoot();
    const melee = this.input.wantsMelee();
    const dash = this.input.wantsDash();

    this.player.update(dt, move, shoot, melee, dash, this.audio);
    this.boss.update(dt, this.player, this.audio);

    const bulletHits = this.boss.checkBulletHits(this.player.bullets);
    if (bulletHits > 0) {
      this.boss.takeDamage(bulletHits * 8, this.audio);
      this.spawnParticles(this.boss.x, this.boss.y, "#ffcc44", bulletHits * 3);
    }

    if (this.player.consumeMeleeHit(this.boss.x, this.boss.y, 50)) {
      if (this.boss.alive) {
        this.boss.takeDamage(15, this.audio);
        this.spawnParticles(this.boss.x, this.boss.y, "#66ffaa", 6);
      }
    }

    this.boss.checkPlayerCollision(this.player, this.audio);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (!this.player.alive) {
      this.screen = "lose";
      this.audio.lose();
    } else if (!this.boss.alive) {
      this.screen = "win";
      this.audio.win();
      this.spawnParticles(this.boss.x, this.boss.y, "#44ff88", 20);
    }

    if (this.boss.state === "slam_impact" && this.boss.stateTimer > 0.28) {
      this.shake = 0.3;
    }
  }

  drawArena(): void {
    const ctx = this.ctx;
    const w = ARENA.w;
    const h = ARENA.h;

    // Floor
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#1a2838");
    grd.addColorStop(0.5, "#243448");
    grd.addColorStop(1, "#2a4055");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Arena circle
    ctx.strokeStyle = "rgba(100, 180, 220, 0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.55, 320, 200, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.3);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = h * 0.3; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Boss platform
    ctx.fillStyle = "#3a5060";
    ctx.fillRect(w / 2 - 100, 100, 200, 20);
    ctx.fillStyle = "#5a8090";
    ctx.fillRect(w / 2 - 90, 95, 180, 8);
  }

  drawHUD(): void {
    const ctx = this.ctx;
    const pad = 16;

    // Player HP
    this.drawBar(pad, pad, 180, 14, this.player.hp / this.player.maxHp, "#5ec8e8", "#1a4050", "PILOT");

    // Boss HP
    const bw = 320;
    const bx = (ARENA.w - bw) / 2;
    this.drawBar(bx, pad, bw, 18, this.boss.hp / this.boss.maxHp, "#4cb86a", "#1a3020", "MECHA CHAMELEON");

    // Phase indicator
    const phaseNames = ["", "PHASE I", "PHASE II", "PHASE III"];
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(phaseNames[this.boss.phase], ARENA.w / 2, pad + 36);

    // Controls hint
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("WASD move · SHIFT dash · J/SPACE shoot · K/E melee", pad, ARENA.h - 10);
  }

  drawBar(x: number, y: number, w: number, h: number, ratio: number, fill: string, bg: string, label: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w * Math.max(0, ratio), h, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 9px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 6, y + h - 3);
  }

  drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  drawStartScreen(): void {
    const ctx = this.ctx;
    this.drawArena();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);

    ctx.textAlign = "center";

    ctx.fillStyle = "#7ef0a0";
    ctx.font = "bold 42px system-ui";
    ctx.fillText("MECHA CHAMELEON", ARENA.w / 2, 180);

    ctx.fillStyle = "#5ec8e8";
    ctx.font = "18px system-ui";
    ctx.fillText("Chrome Lizard Arena", ARENA.w / 2, 220);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px system-ui";
    ctx.fillText("Dodge telegraphed attacks. Defeat the mecha boss!", ARENA.w / 2, 280);
    ctx.fillText("WASD / Arrows — Move", ARENA.w / 2, 330);
    ctx.fillText("SHIFT — Dash   |   J / SPACE — Shoot   |   K / E — Melee", ARENA.w / 2, 355);

    const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
    ctx.fillStyle = `rgba(126, 240, 160, ${pulse})`;
    ctx.font = "bold 20px system-ui";
    ctx.fillText("▶  CLICK or PRESS ENTER TO PLAY", ARENA.w / 2, 430);

    // Preview boss silhouette
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.translate(ARENA.w / 2, 500);
    ctx.fillStyle = "#4cb86a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEndScreen(won: boolean): void {
    const ctx = this.ctx;
    this.drawArena();
    this.boss.draw(ctx);
    this.player.draw(ctx);

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);

    ctx.textAlign = "center";
    ctx.fillStyle = won ? "#7ef0a0" : "#ff6666";
    ctx.font = "bold 40px system-ui";
    ctx.fillText(won ? "VICTORY!" : "DEFEATED", ARENA.w / 2, 240);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "16px system-ui";
    ctx.fillText(
      won ? "The Chrome Lizard falls. Arena cleared!" : "Your mech was destroyed. Try again!",
      ARENA.w / 2,
      290
    );

    const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = "bold 18px system-ui";
    ctx.fillText("▶  CLICK or PRESS ENTER TO RESTART", ARENA.w / 2, 360);
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.save();

    if (this.shake > 0) {
      const sx = (Math.random() - 0.5) * this.shake * 20;
      const sy = (Math.random() - 0.5) * this.shake * 20;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, ARENA.w, ARENA.h);

    if (this.screen === "start") {
      this.drawStartScreen();
    } else if (this.screen === "win") {
      this.drawEndScreen(true);
    } else if (this.screen === "lose") {
      this.drawEndScreen(false);
    } else {
      this.drawArena();
      this.boss.draw(ctx);
      this.player.draw(ctx);
      this.drawParticles();
      this.drawHUD();
    }

    ctx.restore();
  }

  loop = (time: number): void => {
    const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  };

  start(): void {
    requestAnimationFrame(this.loop);
  }
}
