import { sampleStage, type Stage } from "./stage";
import type { Rect, Rgb } from "./utils";

export const TEX_W = 48;
export const TEX_H = 96;

const MAX_RGB_DIST = Math.sqrt(3 * 255 * 255);

/** The hider's skin. One offscreen texture that starts white and is stretched over whatever pose rect is active. */
export class PaintBuffer {
  readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas.width = TEX_W;
    this.canvas.height = TEX_H;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    this.reset();
  }

  reset(): void {
    this.ctx.fillStyle = "#f4f4f4";
    this.ctx.fillRect(0, 0, TEX_W, TEX_H);
  }

  /** Dab a circle in texture space. `u`, `v` are 0..1 across the body rect. */
  dab(u: number, v: number, radiusPx: number, color: Rgb): void {
    this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    this.ctx.beginPath();
    this.ctx.arc(u * TEX_W, v * TEX_H, radiusPx, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** 0 is nothing in common with the floor under `rect`. 1 is a perfect match. */
  camouflage(stage: Stage, rect: Rect): number {
    const tex = this.ctx.getImageData(0, 0, TEX_W, TEX_H).data;
    const step = 4;
    let total = 0;
    let count = 0;
    for (let v = step / 2; v < TEX_H; v += step) {
      for (let u = step / 2; u < TEX_W; u += step) {
        const floor = sampleStage(stage, rect.x + (u / TEX_W) * rect.w, rect.y + (v / TEX_H) * rect.h);
        if (!floor) continue;
        const i = (v * TEX_W + u) * 4;
        total += Math.hypot(tex[i] - floor[0], tex[i + 1] - floor[1], tex[i + 2] - floor[2]) / MAX_RGB_DIST;
        count++;
      }
    }
    return count === 0 ? 0 : 1 - total / count;
  }
}
