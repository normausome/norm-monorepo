import { STAGE_H, STAGE_W } from "./config";
import { PaintBuffer } from "./paint";
import { clamp, type Rect, type Vec2 } from "./utils";

export type Pose = "stand" | "crouch" | "wallflat";

export const POSES: readonly Pose[] = ["stand", "crouch", "wallflat"];

/** Body size per pose in stage px (width, height, depth), and how much of it the seeker can see relative to standing. */
export const POSE_SHAPE: Record<Pose, { w: number; h: number; d: number; exposure: number; label: string; key: string }> = {
  stand: { w: 36, h: 84, d: 36, exposure: 1, label: "Stand", key: "1" },
  crouch: { w: 52, h: 44, d: 52, exposure: 0.8, label: "Crouch", key: "2" },
  wallflat: { w: 16, h: 96, d: 44, exposure: 0.65, label: "Wall flat", key: "3" },
};

export const HIDER_SPEED = 180;
export const HIDER_SPAWN: Vec2 = { x: 200, y: 270 };

export interface Hider {
  pos: Vec2;
  pose: Pose;
  paint: PaintBuffer;
}

export function spawnHider(paint: PaintBuffer): Hider {
  paint.reset();
  return { pos: { ...HIDER_SPAWN }, pose: "stand", paint };
}

/** Floor footprint in stage px. The camouflage score compares the skin with the floor under it. */
export function hiderFootprint(h: Hider): Rect {
  const { w, d } = POSE_SHAPE[h.pose];
  return { x: h.pos.x - w / 2, y: h.pos.y - d / 2, w, h: d };
}

export function moveHider(h: Hider, dir: Vec2, dt: number): void {
  const len = Math.hypot(dir.x, dir.y);
  if (len === 0) return;
  const { w, d } = POSE_SHAPE[h.pose];
  h.pos.x = clamp(h.pos.x + (dir.x / len) * HIDER_SPEED * dt, w / 2, STAGE_W - w / 2);
  h.pos.y = clamp(h.pos.y + (dir.y / len) * HIDER_SPEED * dt, d / 2, STAGE_H - d / 2);
}
