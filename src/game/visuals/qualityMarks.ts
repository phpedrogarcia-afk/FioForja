// FioForja — WEAPON DNA / QUALITY MARKS
//
// The physical evidence of the forge: honed (or wavering) edge, hammer dents,
// scale stains, pits, scratches, stress cracks, the maker mark and the optional
// structural damage cues. Everything here is driven ONLY by simulation data
// (quality.defects, quality.warp, quality.cracks, structuralState) and made
// reproducible through makeGenomeRng(subSeeds.surface / mark).
//
// These marks are what makes quality visible at a distance and at inspection
// distance (aesthetic law 3: quality must leave a mark). They are always clipped
// to the blade, never absurd in count, and never animated per frame.

import { clamp, clamp01, lerp, makeGenomeRng } from "./math.ts";
import type { Pt, WeaponGeometry } from "./types.ts";
import type { WeaponVisualGenome } from "./weaponGenome.ts";
import {
  alloyPaint,
  bladeEdgeSide,
  bladeLateralPoint,
  platingPaint,
} from "./materials.ts";
import { bladePath } from "./geometry.ts";

function edgeSideWaver(
  t: number,
  waver: number,
  phase: number,
): number {
  return (
    Math.sin(t * 21 + phase) * 0.6 +
    Math.sin(t * 47 + phase * 1.7) * 0.25 +
    Math.sin(t * 9 + phase * 0.4) * 0.15
  ) * waver;
}

// ---------------------------------------------------------------------------
// 1. Honed edge / wavering edge / chips
// ---------------------------------------------------------------------------

export function paintEdgeCondition(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const weld = genome.quality.edgeWaver;
    const waver = clamp01(weld / 0.0075);
    const chips = clamp(Math.round(genome.quality.defects.edgeChips), 0, 9);
    const quality = clamp01(genome.quality.score / 100);
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    const phase = genome.surface.grainPhase;
    const side = bladeEdgeSide(geo);
    const L = geo.bladeLength;
    const steps = clamp(geo.blade.stations.length, 26, 58);
    const sharpness = clamp01(1 - waver * 0.85);

    bladePath(ctx, geo);
    ctx.clip();

    // Build a honed band that follows the contour, with a quality-controlled
    // waver: a crisp razor line at high quality, irregular at low quality.
    const innerU = (t: number): number =>
      clamp(0.8 + sharpness * 0.1 + edgeSideWaver(t, waver, phase) * 0.12, 0.62, 0.94);
    const outerU = (t: number): number =>
      clamp(0.995 + edgeSideWaver(t, waver, phase * 1.13) * 0.04, 0.92, 1);
    const innerPts: Pt[] = [];
    const outerPts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = lerp(0.012, 0.995, i / steps);
      const st = geo.stationAt(t);
      innerPts.push(bladeLateralPoint(st, innerU(t), side));
      outerPts.push(bladeLateralPoint(st, outerU(t), side));
    }

    ctx.beginPath();
    ctx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < innerPts.length; i++) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    for (let i = outerPts.length - 1; i >= 0; i--) ctx.lineTo(outerPts[i].x, outerPts[i].y);
    ctx.closePath();
    ctx.globalAlpha = 0.18 + sharpness * 0.18;
    ctx.fillStyle = paint.edge;
    ctx.fill();

    // Inner separation shadow seats the honed band in the bevel.
    ctx.globalAlpha = 0.16 + (1 - sharpness) * 0.18;
    ctx.strokeStyle = paint.deep;
    ctx.lineWidth = clamp(L * (0.0014 + (1 - sharpness) * 0.0016), 0.0006, 0.004);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < innerPts.length; i++) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.stroke();

    // Bright core line. High quality: one unbroken, thin, precise line.
    // Low quality: broken, thicker, slightly wandering segments.
    const coreW = clamp(L * (0.0016 + (1 - sharpness) * 0.0014), 0.0007, 0.0042);
    const coreAlpha = 0.28 + sharpness * 0.4;
    const step = sharpness > 0.75 ? 1 : 2;
    let i = 0;
    while (i < steps) {
      const skip = sharpness < 0.7 && rng.chance(0.14 + (1 - sharpness) * 0.28);
      const runLen = step + (sharpness < 0.55 ? Math.round(rng.next() * 2) : 0);
      if (!skip) {
        ctx.globalAlpha = clamp01(coreAlpha * (0.75 + rng.next() * 0.35));
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = coreW;
        ctx.beginPath();
        const end = Math.min(steps, i + runLen);
        for (let k = i; k <= end; k++) {
          const t = lerp(0.012, 0.995, k / steps);
          const st = geo.stationAt(t);
          const u = clamp(0.93 + edgeSideWaver(t, waver, phase) * 0.04, 0.86, 0.985);
          const p = bladeLateralPoint(st, u, side);
          if (k === i) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      i += Math.max(1, runLen);
    }

    // Chips: notches cut inward from the edge. Count is simulation data.
    for (let c = 0; c < chips; c++) {
      const t = clamp(0.06 + rng.next() * 0.88, 0.04, 0.955);
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const size = Math.max(0.0012, st.halfWidth * (0.18 + rng.next() * 0.34) * (0.7 + waver * 0.5));
      const edgePoint = bladeLateralPoint(st, 0.995, side);
      const inward = bladeLateralPoint(st, clamp(innerU(t) - 0.1, 0.3, 0.85), side);
      const tangent = st.tangent;
      ctx.globalAlpha = 0.6 + (1 - quality) * 0.2;
      ctx.fillStyle = paint.deep;
      ctx.beginPath();
      ctx.moveTo(edgePoint.x - tangent.x * size, edgePoint.y - tangent.y * size);
      ctx.lineTo(inward.x, inward.y);
      ctx.lineTo(edgePoint.x + tangent.x * size, edgePoint.y + tangent.y * size);
      ctx.closePath();
      ctx.fill();
      // Fresh-metal lip on the leading flank of the chip.
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(size * 0.22, 0.0004, 0.0016);
      ctx.beginPath();
      ctx.moveTo(edgePoint.x - tangent.x * size, edgePoint.y - tangent.y * size);
      ctx.lineTo(inward.x, inward.y);
      ctx.stroke();
    }

    // Burrs: tiny stress lipped specks on a badly wavered edge.
    if (waver > 0.35 && genome.quality.score < 65) {
      const burrs = clamp(Math.round(waver * 5), 1, 5);
      for (let b = 0; b < burrs; b++) {
        const t = 0.1 + rng.next() * 0.8;
        const st = geo.stationAt(t);
        const p = bladeLateralPoint(st, 0.985, side);
        const r = Math.max(0.0008, st.halfWidth * 0.09);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = paint.highlight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 2. Forge defects: hammer dents, scale, pits, scratches
// ---------------------------------------------------------------------------

export function paintForgeDefects(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const defects = genome.quality.defects;
  const hammerCount = Math.min(14, Math.max(0, Math.round(Math.max(defects.hammerMarks, genome.surface.hammerMarks))));
  const pits = Math.min(12, Math.max(0, Math.round(defects.surfacePits)));
  const stains = Math.min(8, Math.max(0, Math.round(defects.scaleStains)));
  const scratches = Math.min(6, Math.max(0, Math.round(defects.scratches)));
  if (hammerCount + pits + stains + scratches === 0) return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    const side = bladeEdgeSide(geo);
    const L = geo.bladeLength;
    const polish = clamp01(genome.quality.polish);
    const crudeness = clamp01(1 - polish);
    bladePath(ctx, geo);
    ctx.clip();

    // Hammer dents: shallow elliptical divots with a lit lower rim (light from
    // upper-left) and a dark upper rim. Deeper at low quality.
    for (let i = 0; i < hammerCount; i++) {
      const t = clamp(0.03 + Math.pow(rng.next(), 0.95) * 0.82, 0.02, 0.955);
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const u = rng.range(-0.8, 0.8);
      const c = bladeLateralPoint(st, u, side);
      const r = Math.max(0.0012, st.halfWidth * (0.16 + rng.next() * 0.28) * (0.7 + crudeness * 0.8));
      const angle = Math.atan2(st.tangent.y, st.tangent.x) + rng.range(-0.5, 0.5);
      ctx.globalAlpha = 0.12 + crudeness * 0.16;
      ctx.fillStyle = paint.deep;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * 1.35, r * 0.9, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = clamp(r * 0.16, 0.0004, 0.0016);
      ctx.stroke();
      // Lit rim on the light side of the dent.
      ctx.globalAlpha = 0.1 + polish * 0.06;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(r * 0.12, 0.0003, 0.0012);
      ctx.beginPath();
      ctx.ellipse(c.x - r * 0.12, c.y - r * 0.16, r * 1.1, r * 0.7, angle, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      if (crudeness > 0.6) {
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = paint.warm;
        ctx.beginPath();
        ctx.ellipse(c.x + r * 0.1, c.y + r * 0.1, r * 1.9, r * 1.25, angle, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Scale stains: burnt/oxidised blotches, mostly near the root.
    for (let i = 0; i < stains; i++) {
      const t = clamp(0.02 + Math.pow(rng.next(), 2.1) * 0.36, 0.015, 0.55);
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const c = bladeLateralPoint(st, rng.range(-0.85, 0.85), side);
      const r = Math.max(0.0015, st.halfWidth * (0.3 + rng.next() * 0.6));
      ctx.globalAlpha = 0.07 + crudeness * 0.09;
      ctx.fillStyle = i % 2 === 0 ? paint.warm : paint.deep;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * (1.1 + rng.next() * 0.5), r * (0.45 + rng.next() * 0.4), rng.range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }

    // Surface pits: small dark pores concentrated by the channel.
    for (let i = 0; i < pits; i++) {
      const t = clamp(0.04 + rng.next() * 0.86, 0.03, 0.965);
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const c = bladeLateralPoint(st, rng.range(-0.75, 0.75), side);
      const r = Math.max(0.0005, st.halfWidth * (0.025 + rng.next() * 0.05));
      ctx.globalAlpha = 0.22 + crudeness * 0.18;
      ctx.fillStyle = paint.deep;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(r * 0.4, 0.0003, 0.001);
      ctx.beginPath();
      ctx.arc(c.x - r * 0.2, c.y - r * 0.2, r * 1.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    // Scratches: short abrading lines along the blade axis, light edge with a
    // dark shadow line under it.
    for (let i = 0; i < scratches; i++) {
      const t = clamp(0.08 + rng.next() * 0.78, 0.04, 0.94);
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const c = bladeLateralPoint(st, rng.range(-0.8, 0.8), side);
      const len = L * (0.025 + rng.next() * 0.055);
      const angle = Math.atan2(st.tangent.y, st.tangent.x) + rng.range(-0.22, 0.22);
      const dx = Math.cos(angle) * len * 0.5;
      const dy = Math.sin(angle) * len * 0.5;
      ctx.globalAlpha = 0.12 + crudeness * 0.12;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = clamp(L * 0.0012, 0.0004, 0.002);
      ctx.beginPath();
      ctx.moveTo(c.x - dx, c.y - dy + L * 0.001);
      ctx.lineTo(c.x + dx, c.y + dy + L * 0.001);
      ctx.stroke();
      ctx.globalAlpha = 0.18 + polish * 0.12;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(L * 0.0007, 0.0003, 0.0012);
      ctx.beginPath();
      ctx.moveTo(c.x - dx, c.y - dy);
      ctx.lineTo(c.x + dx, c.y + dy);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 3. Stress cracks
// ---------------------------------------------------------------------------

export function paintCracks(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const cracks = clamp(Math.round(genome.quality.cracks), 0, 9);
  if (cracks === 0) return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    const side = bladeEdgeSide(geo);
    const L = geo.bladeLength;
    const quality = clamp01(genome.quality.score / 100);
    const severity = clamp01(1 - quality);
    bladePath(ctx, geo);
    ctx.clip();
    ctx.lineCap = "round";

    for (let c = 0; c < cracks; c++) {
      // Root weighted: fatigue starts where the blade meets the guard.
      let t = clamp(0.02 + Math.pow(rng.next(), 1.7) * 0.38, 0.015, 0.62);
      let u = rng.range(-0.7, 0.65);
      const segments = 4 + Math.round(rng.next() * 4);
      const points: Pt[] = [];
      for (let s = 0; s <= segments; s++) {
        const st = geo.stationAt(clamp(t, 0.01, 0.97));
        points.push(bladeLateralPoint(st, u, side));
        t += 0.012 + rng.next() * 0.045;
        u = clamp(u + rng.range(-0.2, 0.34), -0.92, 0.92);
      }
      if (points.length < 2) continue;
      // Wide, faint stress halo.
      ctx.globalAlpha = 0.08 + severity * 0.12;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = clamp(L * (0.004 + severity * 0.003), 0.001, 0.007);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      // The fissure itself: darker and deeper at low quality.
      ctx.globalAlpha = 0.45 + severity * 0.35;
      ctx.strokeStyle = "rgba(10,7,5,0.95)";
      ctx.lineWidth = clamp(L * (0.0011 + severity * 0.0013), 0.0005, 0.0032);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      // One catch-light sliver on one wall of the crack.
      ctx.globalAlpha = 0.1 + quality * 0.1;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(L * 0.0006, 0.0003, 0.0012);
      ctx.beginPath();
      ctx.moveTo(points[0].x + L * 0.0008, points[0].y - L * 0.0008);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + L * 0.0008, points[i].y - L * 0.0008);
      ctx.stroke();

      // A short secondary branch inward from mid-crack.
      if (cracks > 1 && rng.chance(0.7)) {
        const midIdx = Math.max(1, Math.floor(points.length * 0.55));
        const origin = points[midIdx];
        const bt = geo.stationAt(clamp(t - 0.02, 0.02, 0.9));
        const dir = bladeLateralPoint(bt, clamp(u + rng.range(-0.3, 0.3), -0.9, 0.9), side);
        ctx.globalAlpha = 0.35 + severity * 0.25;
        ctx.strokeStyle = "rgba(10,7,5,0.95)";
        ctx.lineWidth = clamp(L * 0.0008, 0.0004, 0.0018);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo((origin.x + dir.x) * 0.5 + rng.range(-0.002, 0.002), (origin.y + dir.y) * 0.5);
        ctx.lineTo(dir.x, dir.y);
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 4. Maker mark
// ---------------------------------------------------------------------------

function carveCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dark: string,
  light: string,
  width: number,
): void {
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = dark;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x + width * 0.6, y + width * 0.6, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = light;
  ctx.lineWidth = width * 0.55;
  ctx.beginPath();
  ctx.arc(x - width * 0.4, y - width * 0.4, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function paintMakerMark(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const mark = genome.individuality.makerMark;
  if (!mark) return;
  const style = mark.style;
  const t = clamp(mark.x, 0.04, 0.16);
  const st = geo.stationAt(t);
  if (st.halfWidth < 0.004) return;
  const side = bladeEdgeSide(geo);
  const c = bladeLateralPoint(st, clamp(mark.y * 0.55, -0.7, 0.7), side);
  const size = clamp(Math.min(mark.size, st.halfWidth * 1.0), 0.006, 0.02);
  const angle = Math.atan2(st.tangent.y, st.tangent.x) + clamp(mark.rotation, -0.6, 0.6);
  const paint = alloyPaint(genome);
  const dark = paint.deep;
  const light = paint.highlight;
  const w = clamp(size * 0.09, 0.0004, 0.002);

  ctx.save();
  try {
    bladePath(ctx, geo);
    ctx.clip();
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (style === "punch") {
      // Square punch: a struck block with a central pip and two tool bites.
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = dark;
      ctx.lineWidth = w;
      ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = light;
      ctx.lineWidth = w * 0.5;
      ctx.strokeRect(-size * 0.5 - w * 0.5, -size * 0.5 - w * 0.5, size, size);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.36, -size * 0.1);
      ctx.lineTo(-size * 0.12, -size * 0.1);
      ctx.moveTo(size * 0.12, size * 0.1);
      ctx.lineTo(size * 0.36, size * 0.1);
      ctx.stroke();
    } else if (style === "gouge") {
      // V-gouge: two cuts meeting, with the removed wedge reading darker.
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.42);
      ctx.lineTo(size * 0.08, 0);
      ctx.lineTo(-size * 0.5, size * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = light;
      ctx.lineWidth = w * 0.55;
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.42);
      ctx.lineTo(size * 0.08, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = dark;
      ctx.lineWidth = w * 0.7;
      ctx.beginPath();
      ctx.moveTo(size * 0.08, 0);
      ctx.lineTo(size * 0.45, size * 0.3);
      ctx.stroke();
    } else if (style === "rosette") {
      // Six-petal rosette around a punched centre.
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = dark;
        ctx.lineWidth = w * 0.8;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3, size * 0.28, size * 0.13, a, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = light;
        ctx.lineWidth = w * 0.4;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * size * 0.3 - w * 0.4, Math.sin(a) * size * 0.3 - w * 0.4, size * 0.26, size * 0.12, a, 0, Math.PI * 2);
        ctx.stroke();
      }
      carveCircle(ctx, 0, 0, size * 0.16, dark, light, w);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Stamp: a bordered smith stamp with a tiny hammer glyph.
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = dark;
      ctx.lineWidth = w;
      ctx.strokeRect(-size * 0.55, -size * 0.42, size * 1.1, size * 0.84);
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = light;
      ctx.lineWidth = w * 0.5;
      ctx.strokeRect(-size * 0.55 - w * 0.5, -size * 0.42 - w * 0.5, size * 1.1, size * 0.84);
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = dark;
      ctx.lineWidth = w * 0.85;
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.18);
      ctx.lineTo(-size * 0.2, size * 0.2);
      ctx.moveTo(-size * 0.2, -size * 0.18);
      ctx.lineTo(size * 0.16, -size * 0.18);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.08, -size * 0.18);
      ctx.lineTo(-size * 0.08, -size * 0.02);
      ctx.stroke();
    }

    // A very quiet struck halo so the mark sits in the steel.
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = dark;
    ctx.lineWidth = w * 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 5. Structural damage cues
// ---------------------------------------------------------------------------

function damageSeverity(state: string, integrity: number): number {
  const s = state.toLowerCase();
  let base = 0.3;
  if (s.indexOf("fract") >= 0 || s.indexOf("break") >= 0 || s.indexOf("quebr") >= 0) base = 0.95;
  else if (s.indexOf("crack") >= 0 || s.indexOf("fiss") >= 0 || s.indexOf("trinc") >= 0) base = 0.72;
  else if (s.indexOf("worn") >= 0 || s.indexOf("damag") >= 0 || s.indexOf("desgast") >= 0 || s.indexOf("danif") >= 0) base = 0.5;
  else if (s.indexOf("stable") >= 0) base = 0;
  return clamp01(Math.max(base, (1 - clamp01(integrity)) * 0.55));
}

export function paintStructuralDamage(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const severity = damageSeverity(genome.quality.structuralState, genome.provenance.integrity);
  if (severity < 0.08) return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const pp = platingPaint(genome.mount.guard.plating);
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    const side = bladeEdgeSide(geo);
    const L = geo.bladeLength;
    bladePath(ctx, geo);
    ctx.clip();

    // Stressed zone just ahead of the ricasso: darkened, heat-tinted metal.
    const t0 = clamp(0.03 + rng.next() * 0.05, 0.02, 0.12);
    const st0 = geo.stationAt(t0);
    const c0 = bladeLateralPoint(st0, 0, side);
    const zoneR = Math.max(0.006, st0.halfWidth * 1.8);
    const zone = ctx.createRadialGradient(c0.x, c0.y, zoneR * 0.1, c0.x, c0.y, zoneR * 1.6);
    zone.addColorStop(0, "rgba(12,8,6,0.4)");
    zone.addColorStop(0.6, paint.warm);
    zone.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.12 + severity * 0.2;
    ctx.fillStyle = zone;
    ctx.beginPath();
    ctx.ellipse(c0.x, c0.y, zoneR * 1.7, zoneR * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radiating hairline fissures from the stressed zone.
    const fissures = 2 + Math.round(severity * 3);
    for (let f = 0; f < fissures; f++) {
      let t = t0 + rng.range(0, 0.04);
      let u = rng.range(-0.35, 0.35);
      const points: Pt[] = [];
      const segments = 3 + Math.round(rng.next() * 3);
      for (let s = 0; s <= segments; s++) {
        points.push(bladeLateralPoint(geo.stationAt(clamp(t, 0.02, 0.9)), u, side));
        t += 0.02 + rng.next() * 0.04;
        u = clamp(u + rng.range(-0.18, 0.28), -0.85, 0.85);
      }
      if (points.length < 2) continue;
      ctx.globalAlpha = 0.4 + severity * 0.3;
      ctx.strokeStyle = "rgba(9,6,4,0.95)";
      ctx.lineWidth = clamp(L * (0.001 + severity * 0.0012), 0.0004, 0.003);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }

    // Edge spall on severe damage: a chipped bite with fresh metal.
    if (severity > 0.6) {
      const t = clamp(0.14 + rng.next() * 0.3, 0.1, 0.6);
      const st = geo.stationAt(t);
      const edge = bladeLateralPoint(st, 0.985, side);
      const inward = bladeLateralPoint(st, 0.6, side);
      const tangent = st.tangent;
      const size = Math.max(0.003, st.halfWidth * (0.5 + severity * 0.6));
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = paint.deep;
      ctx.beginPath();
      ctx.moveTo(edge.x - tangent.x * size, edge.y - tangent.y * size);
      ctx.lineTo(inward.x, inward.y);
      ctx.lineTo(edge.x + tangent.x * size * 1.3, edge.y + tangent.y * size * 1.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = pp.rim;
      ctx.lineWidth = clamp(size * 0.14, 0.0004, 0.0016);
      ctx.beginPath();
      ctx.moveTo(edge.x - tangent.x * size, edge.y - tangent.y * size);
      ctx.lineTo(inward.x, inward.y);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}
