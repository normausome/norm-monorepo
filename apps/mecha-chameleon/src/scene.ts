import * as THREE from "three";
import { STAGE_H, STAGE_W } from "./config";
import { POSE_SHAPE, type Hider } from "./hider";
import type { PaintBuffer } from "./paint";
import type { Seeker } from "./seeker";
import { PADS, padHeightAt, sampleStage, type Stage } from "./stage";
import { clamp, type Rgb, type Vec2 } from "./utils";

/** Game logic stays in stage px. The room is those px divided by this. */
export const PX_PER_UNIT = 40;
const ROOM_W = STAGE_W / PX_PER_UNIT;
const ROOM_D = STAGE_H / PX_PER_UNIT;
const WALL_RGB: Rgb = [58, 69, 86];
/** Capsule dimensions at scale 1 equal the stand pose, 36 px wide and 84 px tall. */
const BODY_RADIUS = POSE_SHAPE.stand.w / 2 / PX_PER_UNIT;
const BODY_HEIGHT = POSE_SHAPE.stand.h / PX_PER_UNIT;

export type Pick = { kind: "body"; u: number; v: number } | { kind: "surface"; rgb: Rgb } | { kind: "none" };

export interface Orbit {
  yaw: number;
  pitch: number;
  distance: number;
}

function toWorld(p: Vec2): { x: number; z: number } {
  return { x: (p.x - STAGE_W / 2) / PX_PER_UNIT, z: (p.y - STAGE_H / 2) / PX_PER_UNIT };
}

/** The 3D room. Owns the renderer and every mesh. Game hands it the hider and seeker each frame. */
export class World {
  readonly orbit: Orbit = { yaw: 0, pitch: 0.95, distance: 9 };
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, STAGE_W / STAGE_H, 0.1, 100);
  private readonly raycaster = new THREE.Raycaster();
  private readonly body: THREE.Mesh;
  private readonly skin: THREE.CanvasTexture;
  private readonly prepMarker: THREE.Mesh;
  private readonly seeker: THREE.Mesh;
  private readonly detectRing: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly floor: THREE.Mesh;
  private readonly surfaces: THREE.Mesh[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly stage: Stage,
    paint: PaintBuffer,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(STAGE_W, STAGE_H, false);
    this.scene.background = new THREE.Color("#0a0e14");

    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3f4a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 10, 4);
    this.scene.add(sun);

    const floorTex = new THREE.CanvasTexture(stage.canvas);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.magFilter = THREE.NearestFilter;
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshLambertMaterial({ map: floorTex }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);

    for (const pad of PADS) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(pad.w / PX_PER_UNIT, pad.height, pad.h / PX_PER_UNIT),
        new THREE.MeshLambertMaterial({ color: pad.color }),
      );
      const c = toWorld({ x: pad.x + pad.w / 2, y: pad.y + pad.h / 2 });
      mesh.position.set(c.x, pad.height / 2, c.z);
      mesh.userData.rgb = pad.rgb;
      this.surfaces.push(mesh);
      this.scene.add(mesh);
    }

    // Three tall walls and a low front curb, so the orbit camera always sees in.
    const wallMat = new THREE.MeshLambertMaterial({ color: `rgb(${WALL_RGB.join(",")})` });
    const walls: [number, number, number, number, number][] = [
      [ROOM_W + 0.6, 3, 0.3, 0, -ROOM_D / 2 - 0.15],
      [0.3, 3, ROOM_D, -ROOM_W / 2 - 0.15, 0],
      [0.3, 3, ROOM_D, ROOM_W / 2 + 0.15, 0],
      [ROOM_W + 0.6, 0.5, 0.3, 0, ROOM_D / 2 + 0.15],
    ];
    for (const [w, h, d, x, z] of walls) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, h / 2, z);
      mesh.userData.rgb = WALL_RGB;
      this.surfaces.push(mesh);
      this.scene.add(mesh);
    }

    this.skin = new THREE.CanvasTexture(paint.canvas);
    this.skin.colorSpace = THREE.SRGBColorSpace;
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY_RADIUS, BODY_HEIGHT - 2 * BODY_RADIUS, 8, 24),
      new THREE.MeshLambertMaterial({ map: this.skin }),
    );
    this.scene.add(this.body);

    this.prepMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    this.prepMarker.rotation.x = -Math.PI / 2;
    this.scene.add(this.prepMarker);

    this.seeker = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshLambertMaterial({ color: "#14060f" }));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffd45a" }));
    eye.position.set(0, 0.1, 0.45);
    this.seeker.add(eye);
    this.scene.add(this.seeker);

    this.detectRing = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({ color: "#ffd45a", transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.detectRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.detectRing);
  }

  hasContext(): boolean {
    return this.renderer.getContext() !== null;
  }

  markSkinPainted(): void {
    this.skin.needsUpdate = true;
  }

  syncHider(h: Hider, showMarker: boolean): void {
    const { w, h: height, d } = POSE_SHAPE[h.pose];
    const p = toWorld(h.pos);
    const floorY = padHeightAt(h.pos);
    this.body.scale.set(w / POSE_SHAPE.stand.w, height / POSE_SHAPE.stand.h, d / POSE_SHAPE.stand.w);
    this.body.position.set(p.x, floorY + height / PX_PER_UNIT / 2, p.z);
    this.prepMarker.visible = showMarker;
    this.prepMarker.position.set(p.x, floorY + 0.02, p.z);
    this.aimCamera(p.x, floorY + 1, p.z);
  }

  syncSeeker(s: Seeker | null): void {
    this.seeker.visible = this.detectRing.visible = s !== null;
    if (!s) return;
    const p = toWorld(s.pos);
    this.seeker.position.set(p.x, 0.5, p.z);
    this.seeker.lookAt(this.body.position.x, 0.5, this.body.position.z);
    this.detectRing.position.set(p.x, 0.03, p.z);
    const r = s.detectRadius / PX_PER_UNIT;
    this.detectRing.scale.set(r, r, 1);
    this.detectRing.material.color.set(s.mode.kind === "chase" ? "#ff4060" : "#ffd45a");
  }

  rotate(dYaw: number, dPitch: number): void {
    this.orbit.yaw += dYaw;
    this.orbit.pitch = clamp(this.orbit.pitch + dPitch, 0.25, 1.45);
  }

  /** `ndc` is the pointer in normalised device coordinates, -1..1 on both axes. */
  pick(ndc: Vec2, bodyOnly: boolean): Pick {
    this.raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
    const targets = bodyOnly ? [this.body] : [this.body, this.floor, ...this.surfaces];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit || !hit.uv) return { kind: "none" };
    if (hit.object === this.body) return { kind: "body", u: hit.uv.x, v: 1 - hit.uv.y };
    if (hit.object === this.floor) {
      const rgb = sampleStage(this.stage, hit.uv.x * STAGE_W, (1 - hit.uv.y) * STAGE_H);
      return rgb ? { kind: "surface", rgb } : { kind: "none" };
    }
    return { kind: "surface", rgb: hit.object.userData.rgb as Rgb };
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private aimCamera(x: number, y: number, z: number): void {
    const { yaw, pitch, distance } = this.orbit;
    this.camera.position.set(
      x + distance * Math.cos(pitch) * Math.sin(yaw),
      y + distance * Math.sin(pitch),
      z + distance * Math.cos(pitch) * Math.cos(yaw),
    );
    this.camera.lookAt(x, y, z);
  }
}
