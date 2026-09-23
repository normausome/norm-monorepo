import { POSE_SHAPE, type Pose } from "./hider";
import { dist, type Vec2 } from "./utils";

export const PATROL_SPEED = 120;
export const CHASE_SPEED = 170;
export const TAG_RADIUS = 30;

/** A fixed loop so a round is reproducible. It crosses the centre and both side lanes. */
export const WAYPOINTS: readonly Vec2[] = [
  { x: 860, y: 80 },
  { x: 480, y: 150 },
  { x: 120, y: 120 },
  { x: 120, y: 430 },
  { x: 480, y: 430 },
  { x: 860, y: 460 },
];

const SPAWN: Vec2 = { x: 1010, y: 60 };

type SeekerMode = { kind: "patrol"; waypoint: number } | { kind: "chase" };

export interface Seeker {
  pos: Vec2;
  mode: SeekerMode;
  detectRadius: number;
}

/** Poor camouflage and a tall pose make a big circle. A well painted crouch shrinks it to about the tag radius. */
export function detectRadiusFor(camouflage: number, pose: Pose): number {
  const mismatch = 1 - camouflage;
  return 40 + 240 * Math.pow(mismatch, 1.5) * POSE_SHAPE[pose].exposure;
}

export function spawnSeeker(detectRadius: number): Seeker {
  return { pos: { ...SPAWN }, mode: { kind: "patrol", waypoint: 0 }, detectRadius };
}

/** Advance one frame. Returns true when the seeker tags the hider. */
export function updateSeeker(s: Seeker, hider: Vec2, dt: number): boolean {
  if (s.mode.kind === "patrol" && dist(s.pos, hider) <= s.detectRadius) {
    s.mode = { kind: "chase" };
  }
  switch (s.mode.kind) {
    case "patrol": {
      const target = WAYPOINTS[s.mode.waypoint];
      if (stepToward(s.pos, target, PATROL_SPEED * dt)) {
        s.mode = { kind: "patrol", waypoint: (s.mode.waypoint + 1) % WAYPOINTS.length };
      }
      return false;
    }
    case "chase":
      stepToward(s.pos, hider, CHASE_SPEED * dt);
      return dist(s.pos, hider) <= TAG_RADIUS;
  }
}

function stepToward(pos: Vec2, target: Vec2, maxStep: number): boolean {
  const d = dist(pos, target);
  if (d <= maxStep) {
    pos.x = target.x;
    pos.y = target.y;
    return true;
  }
  pos.x += ((target.x - pos.x) / d) * maxStep;
  pos.y += ((target.y - pos.y) / d) * maxStep;
  return false;
}
