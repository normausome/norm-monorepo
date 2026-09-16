import { clamp, circleRectOverlap, type Vec2 } from "./utils";
import type { Audio } from "./Audio";

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

export interface MeleeSwing {
  x: number;
  y: number;
  angle: number;
  life: number;
  active: boolean;
  hitBoss: boolean;
}

const ARENA = { w: 800, h: 600 };
const PLAYER_R = 14;
const SPEED = 220;
const DASH_SPEED = 520;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 0.9;
const SHOOT_COOLDOWN = 0.22;
const MELEE_COOLDOWN = 0.45;
const MELEE_RANGE = 42;
const MELEE_ARC = Math.PI * 0.7;
const MAX_HP = 100;
const INVULN_TIME = 0.8;

export class Player {
  x = ARENA.w / 2;
  y = ARENA.h - 80;
  hp = MAX_HP;
  maxHp = MAX_HP;
  facing = 0;
  dashTimer = 0;
  dashCooldown = 0;
  shootCooldown = 0;
  meleeCooldown = 0;
  invuln = 0;
  bullets: Bullet[] = [];
  meleeSwings: MeleeSwing[] = [];
  alive = true;

  update(dt: number, move: Vec2, shoot: boolean, melee: boolean, dash: boolean, audio: Audio): void {
    if (!this.alive) return;

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashDir = move.x !== 0 || move.y !== 0 ? move : { x: Math.cos(this.facing), y: Math.sin(this.facing) };
      this.x += dashDir.x * DASH_SPEED * dt;
      this.y += dashDir.y * DASH_SPEED * dt;
    } else if (move.x !== 0 || move.y !== 0) {
      this.x += move.x * SPEED * dt;
      this.y += move.y * SPEED * dt;
      this.facing = Math.atan2(move.y, move.x);
    }

    this.x = clamp(this.x, PLAYER_R + 20, ARENA.w - PLAYER_R - 20);
    this.y = clamp(this.y, ARENA.h * 0.35, ARENA.h - PLAYER_R - 10);

    if (dash && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      this.invuln = Math.max(this.invuln, DASH_DURATION);
      audio.dash();
    }

    if (shoot && this.shootCooldown <= 0) {
      this.shootCooldown = SHOOT_COOLDOWN;
      const bx = this.x + Math.cos(this.facing) * (PLAYER_R + 4);
      const by = this.y + Math.sin(this.facing) * (PLAYER_R + 4);
      this.bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(this.facing) * 480,
        vy: Math.sin(this.facing) * 480,
        life: 1.2,
        active: true,
      });
      audio.shoot();
    }

    if (melee && this.meleeCooldown <= 0) {
      this.meleeCooldown = MELEE_COOLDOWN;
      this.meleeSwings.push({
        x: this.x,
        y: this.y,
        angle: this.facing,
        life: 0.18,
        active: true,
        hitBoss: false,
      });
      audio.melee();
    }

    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > ARENA.w || b.y < 0 || b.y > ARENA.h) {
        b.active = false;
      }
    }
    this.bullets = this.bullets.filter((b) => b.active);

    for (const m of this.meleeSwings) {
      m.life -= dt;
      if (m.life <= 0) m.active = false;
    }
    this.meleeSwings = this.meleeSwings.filter((m) => m.active);
  }

  takeDamage(amount: number, audio: Audio): void {
    if (this.invuln > 0 || !this.alive) return;
    this.hp -= amount;
    this.invuln = INVULN_TIME;
    audio.hitPlayer();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  hitCircle(cx: number, cy: number, cr: number): boolean {
    if (this.invuln > 0) return false;
    return Math.hypot(this.x - cx, this.y - cy) < PLAYER_R + cr;
  }

  hitRect(rx: number, ry: number, rw: number, rh: number): boolean {
    if (this.invuln > 0) return false;
    return circleRectOverlap(this.x, this.y, PLAYER_R, rx, ry, rw, rh);
  }

  consumeMeleeHit(tx: number, ty: number, tr: number): boolean {
    for (const m of this.meleeSwings) {
      if (m.hitBoss) continue;
      const mx = m.x + Math.cos(m.angle) * MELEE_RANGE * 0.6;
      const my = m.y + Math.sin(m.angle) * MELEE_RANGE * 0.6;
      const dx = tx - mx;
      const dy = ty - my;
      const dist = Math.hypot(dx, dy);
      if (dist < MELEE_RANGE + tr) {
        const angleTo = Math.atan2(dy, dx);
        let diff = angleTo - m.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < MELEE_ARC / 2) {
          m.hitBoss = true;
          return true;
        }
      }
    }
    return false;
  }

  reset(): void {
    this.x = ARENA.w / 2;
    this.y = ARENA.h - 80;
    this.hp = MAX_HP;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.shootCooldown = 0;
    this.meleeCooldown = 0;
    this.invuln = 0;
    this.bullets = [];
    this.meleeSwings = [];
    this.alive = true;
    this.facing = -Math.PI / 2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const flash = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    // Chrome pilot mech — original design
    ctx.globalAlpha = flash ? 0.4 : 1;

    // Body
    ctx.fillStyle = "#5ec8e8";
    ctx.beginPath();
    ctx.roundRect(-12, -10, 24, 20, 4);
    ctx.fill();
    ctx.strokeStyle = "#2a8aaa";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = "#1a3040";
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7ef0ff";
    ctx.beginPath();
    ctx.arc(5, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arm cannon
    ctx.fillStyle = "#3a9ab8";
    ctx.fillRect(8, -4, 14, 8);

    ctx.restore();

    // Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = "#ffee55";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,238,85,0.3)";
      ctx.beginPath();
      ctx.arc(b.x - b.vx * 0.015, b.y - b.vy * 0.015, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Melee arc
    for (const m of this.meleeSwings) {
      const alpha = m.life / 0.18;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.strokeStyle = `rgba(100, 255, 200, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, MELEE_RANGE, -MELEE_ARC / 2, MELEE_ARC / 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export { ARENA, PLAYER_R };
