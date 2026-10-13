import type { ForgeRank } from "./types";
const bounded = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
export function performanceScore(timing: number, thermal: number, quench: number) {
  return Math.round(bounded(timing) * 0.6 + bounded(thermal) * 0.2 + bounded(quench) * 0.2);
}
export function rankFor(score: number, broken = false): ForgeRank {
  if (broken || score < 50 || !Number.isFinite(score)) return "F";
  if (score >= 95) return "S";
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}
export function timingAccuracy(force: number, center: number, width: number) {
  const distance = Math.abs(force - center);
  if (distance <= width * 0.2) return 100;
  if (distance <= width * 0.5) return 100 - ((distance - width * 0.2) / (width * 0.3)) * 20;
  return Math.max(0, 80 - ((distance - width * 0.5) / Math.max(0.01, width)) * 160);
}
