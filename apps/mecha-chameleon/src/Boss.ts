import { clamp, lerp } from "./utils";
import type { Audio } from "./Audio";
import type { Player } from "./Player";
import { ARENA } from "./Player";

type BossState =
  | "idle"
  | "telegraph_tongue"
  | "tongue"
  | "telegraph_slam"
  | "slam_jump"
  | "slam_impact"
  | "telegraph_laser"
  | "laser"
  | "camouflage"
  | "hurt"
  | "dead";

interface Telegraph {
  type: "tongue" | "slam" | "laser";
  timer: number;
  x: number;
  y: number;
  w: number;
  h: number;
  side: 1 | -1;
}

const BOSS_W = 120;
const BOSS_H = 90;
const MAX_HP = 500;

export class Boss {
  x = ARENA.w / 2;
  y = 140;
  baseY = 140;
  hp = MAX_HP;
  maxHp = MAX_HP;
  state: BossState = "idle";
  stateTimer = 0;
  phase = 1;
  telegraph: Telegraph | null = null;
  tongueRect = { x: 0, y: 0, w: 0, h: 0, active: false };
  laserY = 0;
  laserActive = false;
  slamShadow = { x: 0, y: 0, r: 0, active: false };
  camouflage = 0;
  hurtFlash = 0;
  alive = true;
  idleCooldown = 1.2;
  jumpY = 0;

  get phaseThreshold(): number {
    const ratio = this.hp / this.maxHp;
    if (ratio > 0.66) return 1;
    if (ratio > 0.33) return 2;
    return 3;
  }

  update(dt: number, player: Player, audio: Audio): void {
    if (!this.alive) return;

    this.phase = this.phaseThreshold;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.stateTimer -= dt;

    if (this.state === "camouflage") {
      this.camouflage = lerp(this.camouflage, 0.75, dt * 2);
      if (this.stateTimer <= 0) {
        this.camouflage = 0;
        this.enterIdle(0.6);
      }
    }

    if (this.state === "hurt") {
      if (this.stateTimer <= 0) this.enterIdle(0.4);
      return;
    }

    if (this.state === "idle") {
      this.idleCooldown -= dt;
      // Face player slowly
      const dx = player.x - this.x;
      this.x = lerp(this.x, clamp(ARENA.w / 2 + dx * 0.15, 180, ARENA.w - 180), dt * 1.5);

      if (this.idleCooldown <= 0) {
        this.pickAttack(player);
      }
      return;
    }

    if (this.state === "telegraph_tongue") {
      if (this.telegraph) this.telegraph.timer -= dt;
      if (this.stateTimer <= 0) this.fireTongue(player);
      return;
    }

    if (this.state === "tongue") {
      if (this.stateTimer <= 0) {
        this.tongueRect.active = false;
        this.enterIdle(this.phase >= 3 ? 0.5 : 0.8);
      }
      return;
    }

    if (this.state === "telegraph_slam") {
      if (this.telegraph) this.telegraph.timer -= dt;
      this.slamShadow.active = true;
      this.slamShadow.x = lerp(this.slamShadow.x, player.x, dt * 3);
      if (this.stateTimer <= 0) {
        this.state = "slam_jump";
        this.stateTimer = 0.55;
        this.jumpY = 0;
      }
      return;
    }

    if (this.state === "slam_jump") {
      this.jumpY = lerp(this.jumpY, -120, 1 - this.stateTimer / 0.55);
      this.y = this.baseY + this.jumpY;
      if (this.stateTimer <= 0) {
        this.state = "slam_impact";
        this.stateTimer = 0.35;
        this.y = this.baseY;
        this.slamShadow.active = false;
        audio.bossSlam();
      }
      return;
    }

    if (this.state === "slam_impact") {
      if (this.stateTimer <= 0) this.enterIdle(0.7);
      return;
    }

    if (this.state === "telegraph_laser") {
      if (this.telegraph) this.telegraph.timer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "laser";
        this.stateTimer = 0.9;
        this.laserActive = true;
        this.laserY = this.y + 40;
      }
      return;
    }

    if (this.state === "laser") {
      this.laserY += (this.phase >= 3 ? 280 : 220) * dt;
      if (this.stateTimer <= 0 || this.laserY > ARENA.h - 40) {
        this.laserActive = false;
        this.enterIdle(0.6);
      }
      return;
    }
  }

  pickAttack(player: Player): void {
    const roll = Math.random();
    const p = this.phase;

    if (p === 1) {
      if (roll < 0.55) this.startTongue(player);
      else if (roll < 0.85) this.startSlam(player);
      else this.startCamouflage();
    } else if (p === 2) {
      if (roll < 0.35) this.startTongue(player);
      else if (roll < 0.65) this.startSlam(player);
      else if (roll < 0.85) this.startCamouflage();
      else this.startLaser();
    } else {
      if (roll < 0.3) this.startTongue(player);
      else if (roll < 0.55) this.startSlam(player);
      else if (roll < 0.75) this.startLaser();
      else this.startCamouflage();
    }
  }

  enterIdle(delay: number): void {
    this.state = "idle";
    this.idleCooldown = delay;
    this.telegraph = null;
    this.tongueRect.active = false;
    this.laserActive = false;
    this.slamShadow.active = false;
  }

  startTongue(player: Player): void {
    this.state = "telegraph_tongue";
    const telegraphTime = this.phase >= 3 ? 0.55 : 0.75;
    this.stateTimer = telegraphTime;
    const side: 1 | -1 = player.x < this.x ? -1 : 1;
    const y = this.y + 20;
    this.telegraph = {
      type: "tongue",
      timer: telegraphTime,
      x: side > 0 ? this.x + 30 : this.x - 330,
      y: y - 15,
      w: 300,
      h: 30,
      side,
    };
  }

  fireTongue(_player: Player): void {
    this.state = "tongue";
    this.stateTimer = 0.35;
    const side = this.telegraph?.side ?? 1;
    this.tongueRect = {
      x: side > 0 ? this.x + 40 : this.x - 340,
      y: this.y + 5,
      w: 340,
      h: 40,
      active: true,
    };
    this.telegraph = null;
  }

  startSlam(player: Player): void {
    this.state = "telegraph_slam";
    const telegraphTime = this.phase >= 3 ? 0.7 : 0.95;
    this.stateTimer = telegraphTime;
    this.slamShadow = {
      x: player.x,
      y: player.y,
      r: this.phase >= 3 ? 75 : 60,
      active: true,
    };
    this.telegraph = {
      type: "slam",
      timer: telegraphTime,
      x: this.slamShadow.x - this.slamShadow.r,
      y: this.slamShadow.y - this.slamShadow.r,
      w: this.slamShadow.r * 2,
      h: this.slamShadow.r * 2,
      side: 1,
    };
  }

  startLaser(): void {
    this.state = "telegraph_laser";
    this.stateTimer = 0.85;
    this.telegraph = {
      type: "laser",
      timer: 0.85,
      x: 40,
      y: this.y + 30,
      w: ARENA.w - 80,
      h: 12,
      side: 1,
    };
  }

  startCamouflage(): void {
    this.state = "camouflage";
    this.stateTimer = this.phase >= 3 ? 2.2 : 1.8;
    this.camouflage = 0;
  }

  takeDamage(amount: number, audio: Audio): void {
    if (!this.alive || this.state === "dead") return;
    this.hp -= amount;
    this.hurtFlash = 0.15;
    audio.hitBoss();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.state = "dead";
    } else if (this.state !== "hurt" && this.state !== "slam_jump") {
      this.state = "hurt";
      this.stateTimer = 0.2;
    }
  }

  checkPlayerCollision(player: Player, audio: Audio): void {
    if (!player.alive) return;

    if (this.tongueRect.active) {
      if (player.hitRect(this.tongueRect.x, this.tongueRect.y, this.tongueRect.w, this.tongueRect.h)) {
        player.takeDamage(18, audio);
      }
    }

    if (this.state === "slam_impact" && this.stateTimer > 0.15) {
      const r = this.phase >= 3 ? 75 : 60;
      if (player.hitCircle(this.slamShadow.x, this.slamShadow.y, r)) {
        player.takeDamage(25, audio);
      }
    }

    if (this.laserActive) {
      if (player.hitRect(40, this.laserY - 8, ARENA.w - 80, 16)) {
        player.takeDamage(12, audio);
      }
    }

    // Body collision during non-camouflage
    if (this.camouflage < 0.4 && this.state !== "slam_jump") {
      const bx = this.x - BOSS_W / 2;
      const by = this.y - BOSS_H / 2;
      if (player.hitRect(bx, by, BOSS_W, BOSS_H)) {
        player.takeDamage(8, audio);
      }
    }
  }

  checkBulletHits(bullets: { x: number; y: number; active: boolean }[]): number {
    let hits = 0;
    const bx = this.x - BOSS_W / 2;
    const by = this.y - BOSS_H / 2;
    for (const b of bullets) {
      if (!b.active) continue;
      if (b.x >= bx && b.x <= bx + BOSS_W && b.y >= by && b.y <= by + BOSS_H) {
        b.active = false;
        hits++;
      }
    }
    return hits;
  }

  reset(): void {
    this.x = ARENA.w / 2;
    this.y = 140;
    this.baseY = 140;
    this.hp = MAX_HP;
    this.state = "idle";
    this.stateTimer = 0;
    this.phase = 1;
    this.telegraph = null;
    this.tongueRect = { x: 0, y: 0, w: 0, h: 0, active: false };
    this.laserY = 0;
    this.laserActive = false;
    this.slamShadow = { x: 0, y: 0, r: 0, active: false };
    this.camouflage = 0;
    this.hurtFlash = 0;
    this.alive = true;
    this.idleCooldown = 1.5;
    this.jumpY = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Telegraph zones
    if (this.telegraph) {
      const t = this.telegraph;
      const pulse = 0.4 + Math.sin(Date.now() * 0.012) * 0.2;
      if (t.type === "tongue") {
        ctx.fillStyle = `rgba(255, 60, 60, ${pulse * 0.5})`;
        ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.strokeStyle = `rgba(255, 100, 100, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(t.x, t.y, t.w, t.h);
      } else if (t.type === "slam") {
        ctx.beginPath();
        ctx.arc(this.slamShadow.x, this.slamShadow.y, this.slamShadow.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 80, 40, ${pulse * 0.45})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 120, 60, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (t.type === "laser") {
        ctx.fillStyle = `rgba(255, 50, 200, ${pulse * 0.4})`;
        ctx.fillRect(t.x, t.y, t.w, t.h);
      }
    }

    // Slam shadow while jumping
    if (this.state === "slam_jump") {
      ctx.beginPath();
      ctx.arc(this.slamShadow.x, this.slamShadow.y, this.slamShadow.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 80, 40, 0.35)";
      ctx.fill();
    }

    // Slam shockwave
    if (this.state === "slam_impact") {
      const progress = 1 - this.stateTimer / 0.35;
      const r = (this.phase >= 3 ? 75 : 60) * (1 + progress * 0.5);
      ctx.beginPath();
      ctx.arc(this.slamShadow.x, this.slamShadow.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 80, ${1 - progress})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Active tongue
    if (this.tongueRect.active) {
      ctx.fillStyle = "#cc4466";
      ctx.beginPath();
      ctx.roundRect(this.tongueRect.x, this.tongueRect.y, this.tongueRect.w, this.tongueRect.h, 8);
      ctx.fill();
      ctx.fillStyle = "#ff6688";
      ctx.beginPath();
      ctx.ellipse(
        this.tongueRect.x + (this.telegraph?.side ?? 1) > 0 ? this.tongueRect.w - 10 : 10,
        this.tongueRect.y + this.tongueRect.h / 2,
        12,
        18,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Laser beam
    if (this.laserActive) {
      ctx.fillStyle = "rgba(255, 50, 220, 0.85)";
      ctx.fillRect(40, this.laserY - 6, ARENA.w - 80, 12);
      ctx.fillStyle = "rgba(255, 200, 255, 0.9)";
      ctx.fillRect(40, this.laserY - 2, ARENA.w - 80, 4);
    }

    if (!this.alive) return;

    // Mecha Chameleon body
    const alpha = 1 - this.camouflage * 0.85;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);

    if (this.hurtFlash > 0) {
      ctx.filter = "brightness(2)";
    }

    // Tail
    ctx.strokeStyle = "#3a9a5a";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-50, 10);
    ctx.quadraticCurveTo(-90, 30, -70, 50);
    ctx.stroke();

    // Main body
    ctx.fillStyle = "#4cb86a";
    ctx.beginPath();
    ctx.ellipse(0, 0, BOSS_W / 2, BOSS_H / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a7a4a";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Mech plating
    ctx.fillStyle = "#6a8a9a";
    ctx.fillRect(-35, -25, 70, 18);
    ctx.fillStyle = "#8ab0c0";
    ctx.fillRect(-20, -20, 40, 8);

    // Head
    ctx.fillStyle = "#5cc87a";
    ctx.beginPath();
    ctx.ellipse(45, -15, 28, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye (glows during telegraph)
    const eyeGlow = this.telegraph ? 1 : 0.5;
    ctx.fillStyle = `rgba(255, ${Math.floor(80 + eyeGlow * 120)}, 60, 1)`;
    ctx.beginPath();
    ctx.arc(58, -18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(60, -19, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legs (mech)
    ctx.fillStyle = "#3a6a50";
    ctx.fillRect(-30, 30, 18, 22);
    ctx.fillRect(10, 30, 18, 22);

    ctx.restore();

    // Camouflage shimmer outline when faded
    if (this.camouflage > 0.3) {
      ctx.save();
      ctx.globalAlpha = this.camouflage * 0.6;
      ctx.strokeStyle = "#7feca0";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, BOSS_W / 2 + 4, BOSS_H / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
