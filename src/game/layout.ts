import { PROFILES } from "./catalog";
import type { SwordDesign } from "./types";
export function forgeLayout(w: number, h: number, design: SwordDesign) {
  const portrait = h > w;
  const safeTop = portrait ? 150 : 100;
  const safeBottom = h - (portrait ? 156 : 112);
  const area = Math.max(100, safeBottom - safeTop);
  const spriteSize = Math.min(w * 0.94, area * 1.08);
  const sprite = { x: (w - spriteSize) / 2, y: safeTop + area * 0.23, size: spriteSize };
  const blade = { x: sprite.x + spriteSize * 0.37, y: sprite.y + spriteSize * 0.31 };
  const tip = { x: sprite.x + spriteSize * 0.86, y: sprite.y + spriteSize * 0.13 };
  const angle = Math.atan2(tip.y - blade.y, tip.x - blade.x);
  const actualLength = Math.hypot(tip.x - blade.x, tip.y - blade.y);
  const length = actualLength / (PROFILES[design.profile].length * (0.55 + design.length * 0.45));
  const scale = Math.max(0.42, Math.min(1.5, w / 620, area / 300));
  return { blade, tip, angle, length, scale, safeTop, safeBottom, area, portrait, sprite };
}
export interface WorkpiecePose {
  x: number;
  y: number;
  angle: number;
  length: number;
}
export function workpiecePose(
  w: number,
  h: number,
  design: SwordDesign,
  phase: string,
  reheating = false,
  dip = 0,
): WorkpiecePose {
  const l = forgeLayout(w, h, design);
  if (phase === "quench")
    return {
      x: w * 0.52,
      y: l.safeTop + l.area * (0.12 + Math.max(0, Math.min(1, dip)) * 0.15),
      angle: Math.PI / 2,
      length: (l.area * 0.55) / (PROFILES[design.profile].length * (0.55 + design.length * 0.45)),
    };
  if (phase === "heat" || reheating)
    return {
      x: l.blade.x - l.sprite.size * 0.06,
      y: l.blade.y - l.sprite.size * 0.03,
      angle: l.angle * 0.8,
      length: l.length * 0.94,
    };
  return { x: l.blade.x, y: l.blade.y, angle: l.angle, length: l.length };
}
