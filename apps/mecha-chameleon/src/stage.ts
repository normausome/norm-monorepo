import { STAGE_H, STAGE_W } from "./config";
import { inRect, type Rect, type Rgb, type Vec2 } from "./utils";

/** The floor renders once. `pixels` is what the eyedropper and the camouflage score read. It is also the floor texture. */
export interface Stage {
  canvas: HTMLCanvasElement;
  pixels: ImageData;
}

/** Raised solid blocks. Drawn into the floor texture and built as boxes in the 3D room. `height` is in world units. */
export interface Pad extends Rect {
  color: string;
  rgb: Rgb;
  height: number;
}

export const PADS: readonly Pad[] = [
  { x: 430, y: 200, w: 100, h: 140, color: "#1d3557", rgb: [29, 53, 87], height: 0.3 },
  { x: 400, y: 390, w: 90, h: 60, color: "#c1121f", rgb: [193, 18, 31], height: 0.3 },
];

export function padHeightAt(p: Vec2): number {
  return PADS.find((pad) => inRect(p, pad))?.height ?? 0;
}

export function buildStage(): Stage {
  const canvas = document.createElement("canvas");
  canvas.width = STAGE_W;
  canvas.height = STAGE_H;
  const ctx = canvas.getContext("2d")!;
  drawTessellateYard(ctx);
  return { canvas, pixels: ctx.getImageData(0, 0, STAGE_W, STAGE_H) };
}

export function sampleStage(stage: Stage, x: number, y: number): Rgb | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= STAGE_W || py >= STAGE_H) return null;
  const i = (py * STAGE_W + px) * 4;
  const d = stage.pixels.data;
  return [d[i], d[i + 1], d[i + 2]];
}

/** Original abstract map. Four patterned regions and two solid pads on a slate floor. */
function drawTessellateYard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#2b3340";
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= STAGE_W; x += 40) line(ctx, x, 0, x, STAGE_H);
  for (let y = 0; y <= STAGE_H; y += 40) line(ctx, 0, y, STAGE_W, y);

  region(ctx, 40, 40, 360, 180, "#1f8a80", (c) => {
    c.strokeStyle = "#35b3a7";
    c.lineWidth = 10;
    for (let x = -180; x < 360; x += 36) line(c, x, 180, x + 180, 0);
  });

  region(ctx, 560, 40, 360, 160, "#a8532c", (c) => {
    c.fillStyle = "#d97a4a";
    for (let y = 0; y < 160; y += 32) {
      for (let x = (y / 32) % 2 === 0 ? 0 : 32; x < 360; x += 64) c.fillRect(x, y, 32, 32);
    }
  });

  region(ctx, 40, 320, 340, 180, "#5a2f6e", (c) => {
    c.fillStyle = "#b06cc9";
    for (let y = 18; y < 180; y += 36) {
      for (let x = 18; x < 340; x += 36) {
        c.beginPath();
        c.arc(x, y, 9, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  region(ctx, 600, 300, 320, 200, "#4ea58c", (c) => {
    c.fillStyle = "#7fd1b9";
    for (let y = 0; y < 200; y += 40) {
      for (let x = 0; x < 320; x += 40) c.fillRect(x + 3, y + 3, 34, 34);
    }
  });

  for (const pad of PADS) {
    ctx.fillStyle = pad.color;
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
  }
}

function region(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  pattern: (c: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  pattern(ctx);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
