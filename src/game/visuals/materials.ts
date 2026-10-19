// FioForja — WEAPON DNA / SURFACE LANGUAGE
//
// Owns the *material* reading of a weapon: alloy palette, blade cross-section
// shading, bevel facets, the fuller groove, the steel patterns, oxidation, the
// one controlled specular sweep and the hilt metals (guard / grip / pommel).
//
// Contracts obeyed here:
//   * Canvas 2D only, no WebGL, no dependencies, no new files.
//   * Every random-looking detail comes from makeGenomeRng(subSeeds.X): no
//     Math.random(), no Date, nothing that depends on frame count.
//   * Every export saves and restores the context, re-clips to the physical
//     contour it touches and restores any alpha / composite / shadow it uses.
//   * The caller may (and in weaponRenderer does) clip before calling; the
//     local clip is defensive and harmless. Runes never leave the blade.
//   * Bounded work: at most a few dozen short polylines per weapon.
//
// Aesthetic bible applied: the section must read as forged volume (spine ridge,
// bevel planes, edge band), never a flat rectangle; patterns follow the blade
// axis and stay inside the silhouette; no neon, no rarity colour on steel, no
// uniform per-pixel noise; gold is a detail material, never the whole blade.

import { clamp, clamp01, lerp, makeGenomeRng, smoothstep } from "./math.ts";
import type { BandGeometry, BladeStation, Pt, WeaponGeometry } from "./types.ts";
import type { PlatingId, WeaponVisualGenome } from "./weaponGenome.ts";
import {
  bandPath,
  bladePath,
  fullerBands,
  guardPath,
  gripPath,
  pathFromPoints,
  pommelPath,
} from "./geometry.ts";

// ---------------------------------------------------------------------------
// Colour vocabulary
// ---------------------------------------------------------------------------

export interface AlloyPaint {
  base: string;
  highlight: string;
  shadow: string;
  edge: string;
  deep: string;
  warm: string;
}

function cssHsl(h: number, s: number, l: number, a = 1): string {
  const hh = ((Number.isFinite(h) ? h : 0) % 360 + 360) % 360;
  const ss = clamp(Number.isFinite(s) ? s : 0, 0, 100);
  const ll = clamp(Number.isFinite(l) ? l : 40, 1, 97);
  if (a >= 0.999) {
    return "hsl(" + hh.toFixed(1) + ", " + ss.toFixed(1) + "%, " + ll.toFixed(1) + "%)";
  }
  return (
    "hsla(" + hh.toFixed(1) + ", " + ss.toFixed(1) + "%, " + ll.toFixed(1) +
    "%, " + clamp01(a).toFixed(3) + ")"
  );
}

/** The single source of blade colour. Follows the genome palette. */
export function alloyPaint(genome: WeaponVisualGenome): AlloyPaint {
  const pal = genome.surface.palette;
  const polish = clamp01(genome.surface.polish);
  const hue = Number.isFinite(pal.hue) ? pal.hue : 210;
  const sat = clamp(Number.isFinite(pal.sat) ? pal.sat : 8, 0, 36);
  const light = clamp(Number.isFinite(pal.light) ? pal.light : 52, 10, 74);
  const warmShift = clamp01(pal.warm);
  return {
    base: cssHsl(hue, sat, light),
    highlight: cssHsl(hue + 2, sat * 0.75 + 1, clamp(pal.edgeLight + 4 + polish * 8, 28, 94)),
    shadow: cssHsl(hue - 3, sat + 1.5, clamp(pal.shadowLight + 2, 6, 62)),
    edge: cssHsl(hue + 4, sat * 0.85 + 2.5, clamp(pal.edgeLight + 6 + polish * 6, 24, 93)),
    deep: cssHsl(hue - 5, sat + 2, clamp(pal.shadowLight - 7, 3, 52)),
    warm: cssHsl(
      lerp(hue, 34, 0.55 + warmShift * 0.2),
      clamp(sat * 0.6 + 9 + warmShift * 5, 6, 34),
      clamp(light + 12 + polish * 7, 22, 78),
    ),
  };
}

export interface PlatingPaint {
  base: string;
  light: string;
  dark: string;
  rim: string;
  deep: string;
  spec: string;
}

interface PlatingRecipe {
  hue: number;
  sat: number;
  light: number;
  spread: number;
  cool: boolean;
}

const PLATING_RECIPES: Record<PlatingId, PlatingRecipe> = {
  steel: { hue: 210, sat: 9, light: 58, spread: 16, cool: true },
  iron: { hue: 30, sat: 9, light: 44, spread: 13, cool: false },
  bronze: { hue: 31, sat: 37, light: 42, spread: 15, cool: false },
  gold: { hue: 43, sat: 50, light: 51, spread: 17, cool: false },
  silver: { hue: 205, sat: 8, light: 67, spread: 14, cool: true },
  "dark-iron": { hue: 222, sat: 8, light: 27, spread: 12, cool: true },
  ivory: { hue: 38, sat: 22, light: 74, spread: 12, cool: false },
};

/** Guard / pommel / inlay palette. Ivory is bone, never plastic white. */
export function platingPaint(plating: PlatingId): PlatingPaint {
  const rec = PLATING_RECIPES[plating] ?? PLATING_RECIPES.steel;
  const hue = rec.hue;
  const sat = rec.sat;
  const light = rec.light;
  const spread = rec.spread;
  const cool = rec.cool;
  return {
    base: cssHsl(hue, sat, light),
    light: cssHsl(hue + (cool ? 3 : 2), sat * 0.8 + 2, clamp(light + spread * 0.62, 20, 90)),
    dark: cssHsl(hue - 4, sat + 3, clamp(light - spread * 0.55, 4, 62)),
    rim: cssHsl(hue + 4, sat * 0.7 + 3, clamp(light + spread * 0.9, 24, 95)),
    deep: cssHsl(hue - 6, sat + 4, clamp(light - spread * 0.95, 2, 48)),
    spec: cssHsl(hue + 3, sat * 0.55 + 2, clamp(light + spread * 1.1, 30, 96)),
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers shared by the three surface modules
// ---------------------------------------------------------------------------

export interface OutlineBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

/** Bounding box of a point list; safe for empty/degenerate paths. */
export function outlineBox(points: readonly Pt[]): OutlineBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    minX = -0.05; minY = -0.05; maxX = 0.05; maxY = 0.05;
  }
  if (maxX - minX < 1e-6) { minX -= 0.01; maxX += 0.01; }
  if (maxY - minY < 1e-6) { minY -= 0.01; maxY += 0.01; }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) * 0.5,
    cy: (minY + maxY) * 0.5,
  };
}

/** Whole-guard extent: plate + quillons + langets. Gradients and ornaments
 *  use it so decoration never assumes the central plate is the whole guard. */
export function guardExtentBox(guard: WeaponGeometry["guard"]): OutlineBox {
  const pts: Pt[] = [];
  for (const p of guard.outline) pts.push(p);
  for (const q of guard.quillons) for (const p of q) pts.push(p);
  for (const l of guard.langets) for (const p of l) pts.push(p);
  return outlineBox(pts);
}

/**
 * Which sign of the station normal points toward the cutting edge (+Y).
 * The contract says -Y is the spine and +Y the edge, so this is normally +1;
 * tolerating the flipped convention keeps the module robust to geometry
 * implementations that use a left/right normal.
 */
export function bladeEdgeSide(geo: WeaponGeometry): number {
  const n = geo.stationAt(0.5).normal;
  if (Math.abs(n.y) > 1e-6) return n.y > 0 ? 1 : -1;
  if (Math.abs(n.x) > 1e-6) return n.x > 0 ? 1 : -1;
  return 1;
}

/**
 * Point at lateral fraction (-1 spine .. 0 centre .. +1 edge) of a station,
 * using the correct half width on each side of the axis.
 */
export function bladeLateralPoint(st: BladeStation, lateral: number, side: number): Pt {
  const u = clamp(lateral, -1, 1);
  const half = u >= 0 ? st.halfEdge : st.halfSpine;
  const signed = u * (Number.isFinite(side) && side !== 0 ? side : 1);
  return {
    x: st.cx + st.normal.x * half * signed,
    y: st.cy + st.normal.y * half * signed,
  };
}

interface BladeExtent {
  minY: number;
  maxY: number;
  maxHalf: number;
}

function bladeExtent(geo: WeaponGeometry): BladeExtent {
  let minY = Infinity;
  let maxY = -Infinity;
  let maxHalf = 0.02;
  for (const st of geo.blade.stations) {
    if (!Number.isFinite(st.cy) || !Number.isFinite(st.halfSpine) || !Number.isFinite(st.halfEdge)) continue;
    const bottom = st.cy - st.halfSpine;
    const top = st.cy + st.halfEdge;
    if (bottom < minY) minY = bottom;
    if (top > maxY) maxY = top;
    const half = Math.max(st.halfSpine, st.halfEdge);
    if (half > maxHalf) maxHalf = half;
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = -0.05; maxY = 0.05;
  }
  return { minY, maxY, maxHalf: clamp(maxHalf, 0.004, 0.2) };
}

/**
 * Trace a polyline along the blade at a lateral fraction that may vary with t.
 * The path is left open in the context; the caller decides fill/stroke.
 */
export function traceLateral(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  uAt: (t: number) => number,
  steps = 32,
  t0 = 0.015,
  t1 = 0.985,
): void {
  const n = Math.max(4, Math.min(64, Math.round(steps)));
  const side = bladeEdgeSide(geo);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const st = geo.stationAt(t);
    const p = bladeLateralPoint(st, uAt(t), side);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

/**
 * Trace a closed band between two lateral fractions (uLow < uHigh), following
 * the station curvature. This is how facets, grooves and honed bands are built
 * without rectangular clipping.
 */
export function traceBand(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  uLow: number,
  uHigh: number,
  t0 = 0.015,
  t1 = 0.985,
  steps = 28,
): void {
  const n = Math.max(4, Math.min(48, Math.round(steps)));
  const side = bladeEdgeSide(geo);
  const a = clamp(Math.min(uLow, uHigh), -1, 1);
  const b = clamp(Math.max(uLow, uHigh), -1, 1);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const p = bladeLateralPoint(geo.stationAt(t), a, side);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = n; i >= 0; i--) {
    const t = lerp(t0, t1, i / n);
    const p = bladeLateralPoint(geo.stationAt(t), b, side);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function tracePointLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
}

function strokeWidth(geo: WeaponGeometry, factor: number, min = 0.0006, max = 0.008): number {
  return clamp(geo.bladeLength * factor, min, max);
}

// ---------------------------------------------------------------------------
// 1. Blade base: body fill + cross-section volume
// ---------------------------------------------------------------------------

export function paintBladeBase(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const surface = genome.surface;
    const structure = genome.structure;
    const pal = surface.palette;
    const polish = clamp01(surface.polish);
    const hue = Number.isFinite(pal.hue) ? pal.hue : 210;
    const sat = clamp(Number.isFinite(pal.sat) ? pal.sat : 8, 0, 30);
    const extent = bladeExtent(geo);
    const ySpine = extent.minY - extent.maxHalf * 0.1;
    const yEdge = extent.maxY + extent.maxHalf * 0.1;

    // Cross-section palette uses the genome light range, not a flat tone:
    // shadowLight at the spine, mid tone at the fuller, edgeLight at the bevel.
    const spineDark = cssHsl(hue - 4, sat + 2.5, clamp(pal.shadowLight, 4, 60));
    const spineMid = cssHsl(hue - 2, sat + 1, clamp(pal.shadowLight + 7, 8, 64));
    const bodyMid = cssHsl(hue, sat, clamp(pal.light, 10, 68));
    const bodyLift = cssHsl(hue + 1, sat * 0.9 + 1, clamp(pal.light + 6, 14, 72));
    const edgeBand = cssHsl(hue + 3, sat * 0.8 + 2, clamp(pal.edgeLight, 22, 88));
    const edgeHot = cssHsl(hue + 4, sat * 0.7 + 2, clamp(pal.edgeLight + 2, 24, 90));
    const rimLight = cssHsl(hue + 2, sat * 0.7 + 1, clamp(pal.edgeLight + 7, 26, 93));

    bladePath(ctx, geo);
    ctx.clip();

    // A wide fixed gradient would break where the blade curves into the tip, so
    // the base is a mid-tone wash and the real section is built from
    // station-following bands that continue through the tip with no seam.
    const body = ctx.createLinearGradient(0, ySpine, 0, yEdge);
    body.addColorStop(0, spineMid);
    body.addColorStop(0.4, bodyMid);
    body.addColorStop(1, bodyLift);
    ctx.fillStyle = body;
    bladePath(ctx, geo);
    ctx.fill();

    const sectionBand = (low: number, high: number, color: string, alpha: number): void => {
      if (alpha <= 0.004) return;
      ctx.globalAlpha = clamp01(alpha);
      ctx.fillStyle = color;
      traceBand(ctx, geo, low, high, 0.008, 0.995, 30);
      ctx.fill();
    };
    // Spine zone: dark, layered twice for a soft falloff instead of a step.
    sectionBand(-1, -0.3, spineDark, 0.22);
    sectionBand(-1, -0.58, spineDark, 0.13);
    sectionBand(-0.58, -0.2, spineMid, 0.1);
    // Body stays mid-tone; only the narrow band approaching the edge lifts.
    sectionBand(0.7, 0.9, edgeBand, 0.2);
    sectionBand(0.84, 0.98, edgeHot, 0.2);
    sectionBand(0.94, 0.995, edgeHot, 0.12);

    const facetAlpha = 0.04 + clamp01(structure.bevels.prominence) * 0.07;
    ctx.globalAlpha = facetAlpha;
    ctx.fillStyle = paint.deep;
    traceBand(ctx, geo, -1, -0.66, 0.012, 0.982, 26);
    ctx.fill();
    ctx.globalAlpha = facetAlpha * 0.55;
    ctx.fillStyle = paint.highlight;
    traceBand(ctx, geo, 0.52, 0.82, 0.012, 0.982, 26);
    ctx.fill();
    ctx.globalAlpha = 0.06 + polish * 0.05;
    ctx.fillStyle = edgeHot;
    traceBand(ctx, geo, 0.9, 0.995, 0.012, 0.982, 22);
    ctx.fill();

    // Root reinforcement: thicker base sits in shade.
    const root = clamp01(structure.rootReinforcement);
    if (root > 0.05) {
      const rootGrad = ctx.createLinearGradient(0, 0, geo.bladeLength * 0.16, 0);
      rootGrad.addColorStop(0, paint.deep);
      rootGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.1 + root * 0.12;
      ctx.fillStyle = rootGrad;
      ctx.fillRect(-0.02, extent.minY - 0.02, geo.bladeLength * 0.2, extent.maxY - extent.minY + 0.04);
    }

    // Ridge / spine crease with its shadow partner.
    const section = structure.section;
    const ridgeLateral =
      section === "diamond" || section === "hexagonal" ? 0
        : section === "lenticular" ? -0.08
          : section === "fullered" ? -0.34
            : 0;
    const ridgeStrength =
      clamp01(structure.spineHeight) * (section === "flat" ? 0.5 : 1) *
      (0.32 + clamp01(structure.ridge.prominence) * 0.58);
    const lw = strokeWidth(geo, 0.0018, 0.0007, 0.0035);
    if (ridgeStrength > 0.08) {
      ctx.globalAlpha = 0.09 + ridgeStrength * 0.2;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      traceLateral(ctx, geo, () => ridgeLateral, 30, 0.02, 0.97);
      ctx.stroke();
      ctx.globalAlpha = 0.07 + ridgeStrength * 0.11;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = lw * 1.6;
      traceLateral(ctx, geo, () => ridgeLateral + 0.04, 30, 0.02, 0.97);
      ctx.stroke();
    }

    // Narrow spine rim light (a line, not a wash).
    ctx.globalAlpha = 0.12 + polish * 0.1;
    ctx.strokeStyle = rimLight;
    ctx.lineWidth = lw * 0.9;
    traceLateral(ctx, geo, () => -0.985, 30, 0.02, 0.97);
    ctx.stroke();

    // Temper line: only where physically justified, never a glow.
    if (genome.identity.family === "oriental" || surface.alloy === "blacksteel" || surface.alloy === "meteor") {
      const grain = surface.grainPhase;
      ctx.globalAlpha = genome.identity.family === "oriental" ? 0.16 + polish * 0.12 : 0.09 + polish * 0.08;
      ctx.strokeStyle = paint.warm;
      ctx.lineWidth = lw * 1.6;
      traceLateral(
        ctx,
        geo,
        (t) => 0.62 + Math.sin(t * Math.PI * 13 + grain) * 0.04 + Math.sin(t * Math.PI * 31 + grain * 0.7) * 0.012,
        34,
        0.05,
        0.9,
      );
      ctx.stroke();
    }

    // Ricasso block: a different, less refined zone at the root.
    const ricasso = geo.blade.ricasso;
    if (ricasso && ricasso.t > 0.015) {
      const rt = clamp(ricasso.t, 0.01, 0.3);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = paint.shadow;
      traceBand(ctx, geo, -1, 1, 0.002, rt, 12);
      ctx.fill();
      const st = geo.stationAt(rt);
      const side = bladeEdgeSide(geo);
      const a = bladeLateralPoint(st, -1, side);
      const b = bladeLateralPoint(st, 1, side);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = pal.edgeLight > 40 ? paint.highlight : paint.shadow;
      ctx.beginPath();
      ctx.moveTo(a.x + lw, a.y + lw);
      ctx.lineTo(b.x + lw, b.y + lw);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

// 2. Bevel facets
// ---------------------------------------------------------------------------

export function paintBevels(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const structure = genome.structure;
    if (!structure.bevels.enabled) return;
    const bands = geo.blade.bevels;
    const prominence = clamp01(structure.bevels.prominence);
    const lw = strokeWidth(geo, 0.0016, 0.0005, 0.003);

    bladePath(ctx, geo);
    ctx.clip();

    if (bands.length > 0) {
      const count = Math.min(bands.length, 3);
      for (let i = 0; i < count; i++) {
        const band = bands[i];
        if (!band || band.inner.length < 2 || band.outer.length < 2) continue;
        // buildBevels emits the edge-side facet first, the spine-side one second.
        const edgeward = count > 1 ? (i === 0 ? 1 : 0) : 1;
        bandPath(ctx, band, true);
        ctx.globalAlpha = (0.03 + prominence * 0.05) * (0.4 + edgeward * 0.6);
        ctx.fillStyle = edgeward > 0.5 ? paint.highlight : paint.shadow;
        ctx.fill();

        // Edge facet: dark crease on the ridge side, catch light on the outline.
        // Spine facet: rim light on the silhouette, dark crease toward the ridge.
        const darkEdge = i === 0 ? band.inner : band.outer;
        const lightEdge = i === 0 ? band.outer : band.inner;
        ctx.globalAlpha = 0.12 + prominence * 0.16;
        ctx.strokeStyle = paint.deep;
        ctx.lineWidth = lw;
        tracePointLine(ctx, darkEdge);
        ctx.stroke();

        ctx.globalAlpha = 0.1 + prominence * 0.18;
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = lw * 1.35;
        tracePointLine(ctx, lightEdge);
        ctx.stroke();
      }
    } else {
      // Fallback for geometry that omits explicit bevel bands: derive planes.
      const half = clamp(structure.bevels.width, 0.12, 0.45);
      ctx.globalAlpha = 0.07 + prominence * 0.1;
      ctx.fillStyle = paint.highlight;
      traceBand(ctx, geo, 0.18, 0.18 + half, 0.02, 0.97, 24);
      ctx.fill();
      ctx.globalAlpha = 0.1 + prominence * 0.12;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = lw;
      traceLateral(ctx, geo, () => 0.18, 26, 0.02, 0.97);
      ctx.stroke();
    }

    // Ridgeline: a precise catch light along the crest of the section.
    const ridge = geo.blade.ridgeline;
    if (structure.ridge.enabled) {
      const prominenceRidge = clamp01(structure.ridge.prominence);
      ctx.globalAlpha = 0.16 + prominenceRidge * 0.26;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = clamp(lw * 1.2, 0.0006, 0.004);
      if (ridge && ridge.length > 1) {
        tracePointLine(ctx, ridge);
      } else {
        traceLateral(ctx, geo, () => (structure.section === "diamond" ? 0 : -0.04), 28, 0.02, 0.96);
      }
      ctx.stroke();
    }

    // Edge-side bevel crease catches a thin warm reflection.
    ctx.globalAlpha = 0.1 + clamp01(genome.surface.polish) * 0.1;
    ctx.strokeStyle = paint.warm;
    ctx.lineWidth = lw * 0.8;
    traceLateral(ctx, geo, () => 0.78, 26, 0.04, 0.95);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 3. Fuller / channels / ridge groove
// ---------------------------------------------------------------------------

export function paintFuller(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const fuller = genome.structure.fuller;
  if (!fuller.enabled) return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const depth = clamp01(fuller.depth);
    const lw = strokeWidth(geo, 0.0018, 0.0006, 0.0035);
    bladePath(ctx, geo);
    ctx.clip();

    const t0 = clamp(fuller.start, 0.015, 0.4);
    const t1 = clamp(fuller.end, t0 + 0.06, 0.96);
    const style = fuller.style;

    const paintGroove = (uCenter: number, uHalf: number, band: BandGeometry | null): void => {
      const uA = clamp(uCenter - uHalf, -0.95, 0.95);
      const uB = clamp(uCenter + uHalf, -0.95, 0.95);
      if (Math.abs(uB - uA) < 0.02) return;
      const hasBand = Boolean(band && band.inner.length > 2 && band.outer.length > 2);
      if (hasBand && band) {
        bandPath(ctx, band, true);
      } else {
        traceBand(ctx, geo, uA, uB, t0, t1, 24);
      }
      ctx.globalAlpha = 0.34 + depth * 0.28;
      ctx.fillStyle = paint.deep;
      ctx.fill();

      if (style === "ridge") {
        // Raised crest: bright centre, dark shoulders.
        ctx.globalAlpha = 0.16 + depth * 0.12;
        ctx.fillStyle = paint.highlight;
        traceBand(ctx, geo, uCenter - uHalf * 0.22, uCenter + uHalf * 0.22, t0, t1, 20);
        ctx.fill();
        ctx.globalAlpha = 0.2 + depth * 0.1;
        ctx.strokeStyle = paint.shadow;
        ctx.lineWidth = lw;
        traceLateral(ctx, geo, () => uA, 22, t0, t1);
        ctx.stroke();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = lw;
        traceLateral(ctx, geo, () => (uA + uB) * 0.5, 22, t0, t1);
        ctx.stroke();
        return;
      }

      // Recessed groove: spine-side wall in shadow, edge-side wall catches
      // light, the floor sits deeper than both.
      if (hasBand && band) {
        ctx.globalAlpha = 0.34 + depth * 0.2;
        ctx.strokeStyle = paint.deep;
        ctx.lineWidth = lw * 1.6;
        tracePointLine(ctx, band.inner);
        ctx.stroke();

        ctx.globalAlpha = 0.18 + depth * 0.2;
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = lw * 1.4;
        tracePointLine(ctx, band.outer);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.34 + depth * 0.2;
        ctx.strokeStyle = paint.deep;
        ctx.lineWidth = lw * 1.6;
        traceLateral(ctx, geo, () => uA, 22, t0, t1);
        ctx.stroke();
        ctx.globalAlpha = 0.18 + depth * 0.2;
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = lw * 1.4;
        traceLateral(ctx, geo, () => uB, 22, t0, t1);
        ctx.stroke();
      }

      // Groove floor: a faint cool sheen so the recess is not a black hole.
      ctx.globalAlpha = 0.08 + depth * 0.1;
      ctx.strokeStyle = paint.shadow;
      ctx.lineWidth = Math.max(lw * 2.2, 0.0012);
      traceLateral(ctx, geo, () => (uA + uB) * 0.5, 22, t0, t1);
      ctx.stroke();

      // Rounded end caps with a tiny catch light. With a real band the caps sit
      // on the groove ends (which may be offset from the axis); otherwise they
      // follow the derived lateral centre.
      const caps: { x: number; y: number; half: number }[] = [];
      if (hasBand && band) {
        const i0 = band.inner[0];
        const o0 = band.outer[0];
        const i1 = band.inner[band.inner.length - 1];
        const o1 = band.outer[band.outer.length - 1];
        const d0 = Math.hypot(o0.x - i0.x, o0.y - i0.y) * 0.5;
        const d1 = Math.hypot(o1.x - i1.x, o1.y - i1.y) * 0.5;
        caps.push({ x: (i0.x + o0.x) * 0.5, y: (i0.y + o0.y) * 0.5, half: Math.max(0.001, d0) });
        caps.push({ x: (i1.x + o1.x) * 0.5, y: (i1.y + o1.y) * 0.5, half: Math.max(0.001, d1) });
      } else {
        const capHalf = Math.max(0.0015, (uB - uA) * 0.5 * geo.stationAt(t0).halfWidth);
        for (const tt of [t0, t1]) {
          const st = geo.stationAt(tt);
          const c = bladeLateralPoint(st, (uA + uB) * 0.5, bladeEdgeSide(geo));
          caps.push({ x: c.x, y: c.y, half: capHalf });
        }
      }
      for (const cap of caps) {
        ctx.globalAlpha = 0.26 + depth * 0.2;
        ctx.fillStyle = paint.deep;
        ctx.beginPath();
        ctx.ellipse(cap.x, cap.y, cap.half * 1.15, cap.half * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = paint.highlight;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, cap.half * 0.8, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    };

    const uHalf = clamp(fuller.halfWidth, 0.08, 0.42);
    const uCenter = clamp(fuller.offset, -0.7, 0.7);
    const primaryBand = geo.blade.fuller;

    if (style === "ridge") {
      // A raised spine, not a groove. Use the geometry ridgeline when present.
      const ridge = geo.blade.ridgeline;
      ctx.globalAlpha = 0.12 + depth * 0.14;
      ctx.fillStyle = paint.highlight;
      traceBand(ctx, geo, -0.16, 0.16, t0, t1, 24);
      ctx.fill();
      ctx.globalAlpha = 0.28 + depth * 0.2;
      ctx.strokeStyle = paint.highlight;
      ctx.lineWidth = lw * 1.3;
      ctx.lineCap = "round";
      if (ridge && ridge.length > 1) tracePointLine(ctx, ridge);
      else traceLateral(ctx, geo, () => 0, 24, t0, t1);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = paint.deep;
      ctx.lineWidth = lw * 1.6;
      traceLateral(ctx, geo, () => -0.2, 24, t0, t1);
      ctx.stroke();
      traceLateral(ctx, geo, () => 0.2, 24, t0, t1);
      ctx.stroke();
    } else {
      // double / channels: geometry exposes both symmetric grooves; use them so
      // the paint follows the real band instead of re-deriving a look-alike.
      const grooveBands =
        fuller.double || style === "channels"
          ? fullerBands(genome)
          : primaryBand ? [primaryBand] : [];
      if (grooveBands.length > 0) {
        for (const gb of grooveBands) paintGroove(0, uHalf, gb);
      } else {
        paintGroove(uCenter, uHalf, null);
      }
    }
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 4. Steel patterns
// ---------------------------------------------------------------------------

function patternLine(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  uAt: (t: number) => number,
  t0: number,
  t1: number,
  color: string,
  alpha: number,
  width: number,
  steps = 32,
): void {
  if (alpha <= 0.004) return;
  ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.0004, width);
  traceLateral(ctx, geo, uAt, steps, t0, t1);
  ctx.stroke();
}

export function paintSteelPattern(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const pattern = genome.surface.pattern;
  if (pattern === "none") return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const surface = genome.surface;
    const density = clamp(surface.patternDensity, 4, 22);
    const phase = surface.patternPhase;
    const damascusPattern = pattern === "damascus-waves" || pattern === "damascus-ripple";
    const contrast = clamp(surface.patternContrast, 0.15, damascusPattern ? 0.42 : 0.6);
    const baseAlpha = 0.05 + contrast * 0.14;
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    const lw = strokeWidth(geo, 0.0034, 0.0012, 0.006);
    const fineLw = strokeWidth(geo, 0.0016, 0.0005, 0.003);
    const lightInk = paint.highlight;
    const darkInk = paint.deep;
    const midInk = paint.shadow;
    const side = bladeEdgeSide(geo);

    bladePath(ctx, geo);
    ctx.clip();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (pattern) {
      case "damascus-waves": {
        // Evenly spaced laminations held clear of the spine/edge bands; small
        // amplitudes so neighbouring lines never merge into a dark blotch.
        const layers = clamp(Math.round(density * 0.85), 6, 14);
        for (let i = 0; i < layers; i++) {
          const baseU = lerp(-0.7, 0.7, (i + 0.5) / layers);
          const amp = 0.018 + 0.02 * Math.abs(Math.sin(i * 1.7 + phase));
          const freq = 1.5 + (i % 3) * 0.4;
          const phaseI = phase + i * 0.91;
          const uAt = (t: number): number => {
            const converge = 1 - smoothstep(0.2, 1, t) * 0.28;
            const wave =
              Math.sin(t * Math.PI * freq * 2 + phaseI) * amp +
              Math.sin(t * Math.PI * freq * 3.1 + phaseI * 0.6) * amp * 0.28;
            return baseU * converge + wave;
          };
          patternLine(ctx, geo, uAt, 0.05, 0.94, darkInk, baseAlpha * 0.6, lw, 34);
          patternLine(
            ctx, geo,
            (t) => uAt(t) + 0.012 + Math.sin(t * 9 + phaseI) * 0.003,
            0.06, 0.93, lightInk, baseAlpha * 0.22, fineLw, 30,
          );
        }
        // Short echoes inside the clean margins, low contrast.
        for (let i = 0; i < 4; i++) {
          const t0 = 0.1 + rng.next() * 0.55;
          const t1 = clamp(t0 + 0.08 + rng.next() * 0.12, t0 + 0.03, 0.93);
          const u0 = rng.range(-0.55, 0.55);
          patternLine(
            ctx, geo,
            (t) => u0 + Math.sin(t * 14 + phase + i) * 0.018,
            t0, t1, darkInk, baseAlpha * 0.32, fineLw, 16,
          );
        }
        break;
      }
      case "damascus-ripple": {
        const lines = clamp(Math.round(density * 1.5), 10, 22);
        for (let i = 0; i < lines; i++) {
          const u0 = lerp(-0.72, 0.72, i / Math.max(1, lines - 1));
          const t0 = 0.04 + rng.next() * 0.16;
          const t1 = clamp(0.9 - rng.next() * 0.22, t0 + 0.15, 0.94);
          const phaseI = phase + i * 0.37;
          patternLine(
            ctx, geo,
            (t) => u0 + Math.sin((t - t0) * Math.PI * 3.2 + phaseI) * 0.03 * (1 - t * 0.4),
            t0, t1, i % 2 === 0 ? darkInk : midInk, baseAlpha * 0.45, fineLw, 26,
          );
        }
        // Ripple eyes: small elongated loops that read as folded steel.
        const eyes = 2;
        for (let i = 0; i < eyes; i++) {
          const t = 0.2 + i * 0.22 + rng.range(-0.04, 0.04);
          const st = geo.stationAt(t);
          const c = bladeLateralPoint(st, rng.range(-0.2, 0.2), side);
          const rx = geo.bladeLength * (0.035 + rng.next() * 0.02);
          const ry = Math.max(0.002, st.halfWidth * (0.16 + rng.next() * 0.1));
          const angle = Math.atan2(st.tangent.y, st.tangent.x);
          ctx.globalAlpha = baseAlpha * 0.65;
          ctx.strokeStyle = i % 2 === 0 ? darkInk : midInk;
          ctx.lineWidth = fineLw;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, rx, ry, angle, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "meteor-stars": {
        const stars = clamp(Math.round(14 + density * 0.8), 12, 30);
        for (let i = 0; i < stars; i++) {
          const t = 0.05 + rng.next() * 0.88;
          const st = geo.stationAt(t);
          const c = bladeLateralPoint(st, rng.range(-0.9, 0.9), side);
          const r = Math.max(0.00055, geo.bladeLength * (0.0007 + rng.next() * 0.0016));
          ctx.globalAlpha = baseAlpha * (0.6 + rng.next() * 0.5);
          ctx.fillStyle = i % 4 === 0 ? paint.warm : lightInk;
          ctx.beginPath();
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          ctx.fill();
          if (rng.chance(0.22)) {
            ctx.globalAlpha = baseAlpha * 0.35;
            ctx.strokeStyle = lightInk;
            ctx.lineWidth = fineLw * 0.7;
            ctx.beginPath();
            ctx.moveTo(c.x - r * 2.4, c.y);
            ctx.lineTo(c.x + r * 2.4, c.y);
            ctx.moveTo(c.x, c.y - r * 2.4);
            ctx.lineTo(c.x, c.y + r * 2.4);
            ctx.stroke();
          }
        }
        // Faint mineral veins threading the stars together.
        const veins = 3;
        for (let v = 0; v < veins; v++) {
          const u0 = rng.range(-0.7, 0.7);
          const drift = rng.range(-0.35, 0.35);
          patternLine(
            ctx, geo,
            (t) => u0 + Math.sin(t * 7 + phase + v * 2.1) * 0.11 + drift * t,
            0.08, 0.92, darkInk, baseAlpha * 0.4, fineLw, 30,
          );
        }
        break;
      }
      case "meteor-veins": {
        const veins = clamp(Math.round(3 + density * 0.15), 3, 6);
        for (let v = 0; v < veins; v++) {
          const u0 = rng.range(-0.6, 0.6);
          const wobble = 0.07 + rng.next() * 0.07;
          const freq = 8 + rng.next() * 6;
          const uAt = (t: number): number =>
            u0 + Math.sin(t * freq + phase + v * 1.3) * wobble + Math.sin(t * (freq * 2.7) + v) * wobble * 0.3;
          patternLine(ctx, geo, uAt, 0.06, 0.94, darkInk, baseAlpha * 0.9, lw * 1.2, 34);
          patternLine(
            ctx, geo,
            (t) => uAt(t) + 0.012,
            0.08, 0.9, lightInk, baseAlpha * 0.58, fineLw, 30,
          );
        }
        break;
      }
      case "blacksteel-bands": {
        const bands = clamp(Math.round(density * 0.55), 3, 9);
        for (let i = 0; i < bands; i++) {
          const u0 = lerp(-0.82, 0.82, (i + 0.5) / bands) + rng.range(-0.02, 0.02);
          const bandHalf = 0.045 + rng.next() * 0.055;
          ctx.globalAlpha = baseAlpha * 0.5;
          ctx.fillStyle = i % 2 === 0 ? darkInk : midInk;
          traceBand(ctx, geo, u0 - bandHalf, u0 + bandHalf, 0.03, 0.965, 20);
          ctx.fill();
          patternLine(
            ctx, geo,
            (t) => u0 + Math.sin(t * 5 + phase + i) * 0.012,
            0.04, 0.95, lightInk, baseAlpha * 0.22, fineLw, 22,
          );
        }
        break;
      }
      case "ancient-veining": {
        const veins = clamp(Math.round(4 + density * 0.2), 4, 7);
        for (let v = 0; v < veins; v++) {
          let u = rng.range(-0.75, 0.75);
          const points: Pt[] = [];
          const segments = 7 + Math.round(rng.next() * 5);
          const tStart = 0.04 + rng.next() * 0.2;
          const tEnd = 0.88 - rng.next() * 0.18;
          for (let s = 0; s <= segments; s++) {
            const t = lerp(tStart, tEnd, s / segments);
            u = clamp(u + rng.range(-0.09, 0.09), -0.95, 0.95);
            points.push(bladeLateralPoint(geo.stationAt(t), u, side));
          }
          if (points.length < 2) continue;
          ctx.globalAlpha = baseAlpha * 0.75;
          ctx.strokeStyle = paint.warm;
          ctx.lineWidth = lw * 1.15;
          tracePointLine(ctx, points);
          ctx.stroke();
          ctx.globalAlpha = baseAlpha * 0.4;
          ctx.strokeStyle = darkInk;
          ctx.lineWidth = fineLw;
          tracePointLine(ctx, points);
          ctx.stroke();
        }
        break;
      }
      case "elven-sheen": {
        // Very fine chatter: a cold sheen on pale silver, never a glow wash.
        const lines = clamp(Math.round(density * 0.8), 8, 14);
        for (let i = 0; i < lines; i++) {
          const u0 = lerp(-0.9, 0.9, (i + 0.5) / lines) + rng.range(-0.012, 0.012);
          const drift = rng.range(-0.008, 0.008);
          const fade = rng.range(0.03, 0.12);
          patternLine(
            ctx, geo,
            (t) => u0 + drift * t + Math.sin(t * 12 + phase + i * 0.6) * 0.005,
            fade, 0.97 - fade * 0.5,
            i % 3 === 0 ? lightInk : midInk,
            baseAlpha * 0.2, fineLw * 0.6, 30,
          );
        }
        break;
      }
      case "royal-grain": {
        const lines = clamp(Math.round(density * 1.05), 12, 20);
        for (let i = 0; i < lines; i++) {
          const u0 = lerp(-0.96, 0.96, (i + 0.5) / lines);
          patternLine(
            ctx, geo,
            (t) => u0 + Math.sin(t * 22 + phase + i * 1.7) * 0.0025,
            0.03, 0.975,
            i % 2 === 0 ? darkInk : lightInk,
            baseAlpha * 0.28, fineLw * 0.7, 34,
          );
        }
        // Fine cross-grain dashes at low alpha: satin, not noise.
        for (let i = 0; i < 10; i++) {
          const t = 0.08 + i * 0.085 + rng.range(-0.02, 0.02);
          const st = geo.stationAt(t);
          if (st.halfWidth < 0.006) continue;
          const c = bladeLateralPoint(st, rng.range(-0.7, 0.7), side);
          const angle = Math.atan2(st.tangent.y, st.tangent.x) + Math.PI * 0.5;
          ctx.globalAlpha = baseAlpha * 0.22;
          ctx.strokeStyle = darkInk;
          ctx.lineWidth = fineLw * 0.8;
          ctx.beginPath();
          ctx.moveTo(c.x - Math.cos(angle) * st.halfWidth * 0.25, c.y - Math.sin(angle) * st.halfWidth * 0.25);
          ctx.lineTo(c.x + Math.cos(angle) * st.halfWidth * 0.25, c.y + Math.sin(angle) * st.halfWidth * 0.25);
          ctx.stroke();
        }
        break;
      }
      default:
        break;
    }
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 5. Oxidation / patina / forge scale
// ---------------------------------------------------------------------------

export function paintOxidation(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const oxidation = clamp01(genome.surface.oxidation);
  if (oxidation < 0.05) return;
  ctx.save();
  try {
    const paint = alloyPaint(genome);
    const defects = genome.quality.defects;
    const rng = makeGenomeRng(genome.individuality.subSeeds.surface);
    bladePath(ctx, geo);
    ctx.clip();

    // Root-weighted patina: oxidation accumulates where the hand and the air
    // reach the guard, not uniformly over the blade.
    const blotches = clamp(Math.round(3 + oxidation * 16), 3, 22);
    for (let i = 0; i < blotches; i++) {
      const t = Math.pow(rng.next(), 1.85) * 0.8 + 0.02;
      const st = geo.stationAt(t);
      if (st.halfWidth < 0.004) continue;
      const u = rng.range(-0.92, 0.92);
      const c = bladeLateralPoint(st, u, bladeEdgeSide(geo));
      const r = Math.max(0.0015, st.halfWidth * (0.22 + rng.next() * 0.55));
      const warm = i % 4 !== 0;
      ctx.globalAlpha = 0.05 + oxidation * (warm ? 0.1 : 0.14);
      ctx.fillStyle = warm ? paint.warm : paint.deep;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r * (0.9 + rng.next() * 0.4), r * (0.5 + rng.next() * 0.4), rng.range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
      // A darker core so the stain has a centre of gravity.
      ctx.globalAlpha = 0.04 + oxidation * 0.09;
      ctx.fillStyle = paint.deep;
      ctx.beginPath();
      ctx.ellipse(c.x + r * 0.18, c.y + r * 0.14, r * 0.5, r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Damaged pieces oxidise on the edges and around scale stains.
    const damaged = genome.quality.cracks > 0 || defects.scaleStains > 0 || genome.quality.warp > 0.08;
    if (damaged) {
      const edgeStains = clamp(Math.round(defects.scaleStains * 0.9 + genome.quality.cracks * 0.6), 2, 9);
      for (let i = 0; i < edgeStains; i++) {
        const t = Math.pow(rng.next(), 1.4) * 0.7 + 0.05;
        const st = geo.stationAt(t);
        if (st.halfWidth < 0.004) continue;
        const which = rng.chance(0.5) ? 1 : -1;
        const c = bladeLateralPoint(st, which * rng.range(0.78, 0.99), bladeEdgeSide(geo));
        const r = Math.max(0.0012, st.halfWidth * (0.12 + rng.next() * 0.28));
        ctx.globalAlpha = 0.07 + oxidation * 0.1;
        ctx.fillStyle = i % 3 === 0 ? paint.warm : paint.deep;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r * 1.4, r * 0.7, rng.range(-0.5, 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A quiet oxidation gradient at the root, under the guard shadow.
    const rootGrad = ctx.createLinearGradient(0, 0, geo.bladeLength * 0.2, 0);
    rootGrad.addColorStop(0, paint.warm);
    rootGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.05 + oxidation * 0.1;
    ctx.fillStyle = rootGrad;
    ctx.fillRect(-0.01, -geo.bladeLength * 0.3, geo.bladeLength * 0.22, geo.bladeLength * 0.6);
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 6. One controlled specular sweep
// ---------------------------------------------------------------------------

export function paintBladeHighlight(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
  lightOffset: number,
): void {
  ctx.save();
  try {
    const surface = genome.surface;
    const polish = clamp01(surface.polish);
    const luster = clamp01(surface.luster);
    if (polish < 0.18) return;
    const mid = geo.stationAt(0.5);
    const halfMid = Math.max(0.004, mid.halfWidth);
    // The specular is a narrow longitudinal reflection: at most 18% of the
    // local half width, with a soft falloff built from nested strokes.
    const specWidth = clamp(halfMid * 0.18, 0.0007, 0.0045);
    const uSpec = clamp(0.22 + clamp01(lightOffset) * 0.46, 0.16, 0.82);
    const total = clamp((0.05 + polish * 0.45) * (0.85 + luster * 0.15), 0.06, 0.5);
    const tint = surface.palette.highlightTint;
    bladePath(ctx, geo);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const layers = [
      { w: specWidth, a: total * 0.28 },
      { w: specWidth * 0.58, a: total * 0.34 },
      { w: specWidth * 0.26, a: total * 0.38 },
    ];
    for (const layer of layers) {
      ctx.globalAlpha = clamp01(layer.a);
      ctx.strokeStyle = tint;
      ctx.lineWidth = Math.max(0.0003, layer.w);
      traceLateral(ctx, geo, () => uSpec, 34, 0.03, 0.97);
      ctx.stroke();
    }
    // Mirror finish only: one extra hairline glint, same width budget.
    if (polish > 0.86) {
      ctx.globalAlpha = clamp01(total * 0.16);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = Math.max(0.0002, specWidth * 0.16);
      traceLateral(ctx, geo, () => clamp(uSpot(uSpec), 0.05, 0.9), 30, 0.08, 0.92);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

function uSpot(u: number): number {
  return u - 0.06;
}

// 7. Guard metal
// ---------------------------------------------------------------------------

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  color: string,
  alpha: number,
  width: number,
  dx = 0,
  dy = 0,
): void {
  if (pts.length < 2) return;
  ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.0003, width);
  ctx.beginPath();
  ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + dx, pts[i].y + dy);
  ctx.stroke();
}

export function paintGuardMetal(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const guard = geo.guard;
    const plating = guard.plating;
    const pp = platingPaint(plating);
    const box = guardExtentBox(guard);
    const rng = makeGenomeRng(genome.individuality.subSeeds.guard);
    const polish = clamp01(genome.quality.polish);
    const span = Math.max(box.width, box.height, 0.05);
    const lw = clamp(span * 0.03, 0.0007, 0.0035);

    guardPath(ctx, geo);
    ctx.clip();

    // Metal body: a diagonal key light plus a darker underside.
    const body = ctx.createLinearGradient(box.minX, box.minY, box.maxX, box.maxY);
    body.addColorStop(0, pp.light);
    body.addColorStop(0.16, pp.base);
    body.addColorStop(0.42, pp.base);
    body.addColorStop(0.66, pp.dark);
    body.addColorStop(0.88, pp.deep);
    body.addColorStop(1, pp.deep);
    ctx.fillStyle = body;
    guardPath(ctx, geo);
    ctx.fill();

    // Vertical shading: lit top edge, shaded underside (no flat paper look).
    const vert = ctx.createLinearGradient(0, box.minY, 0, box.maxY);
    vert.addColorStop(0, "rgba(255,255,255,0)");
    vert.addColorStop(0.55, "rgba(0,0,0,0.04)");
    vert.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vert;
    guardPath(ctx, geo);
    ctx.fill();

    // Contact shadow where the blade leaves the guard: occlusion before detail.
    const contact = ctx.createLinearGradient(-span * 0.07, 0, span * 0.07, 0);
    contact.addColorStop(0, "rgba(0,0,0,0)");
    contact.addColorStop(0.5, "rgba(0,0,0,0.42)");
    contact.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = contact;
    ctx.fillRect(-span * 0.07, box.minY - lw, span * 0.14, box.height + lw * 2);

    // Bright rim only on the light side, dark inner rim on the underside.
    ctx.save();
    ctx.translate(-lw * 1.5, -lw * 1.5);
    ctx.globalAlpha = 0.3 + polish * 0.2;
    ctx.strokeStyle = pp.rim;
    ctx.lineWidth = lw * 1.5;
    guardPath(ctx, geo);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(lw * 1.1, lw * 1.3);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = pp.deep;
    ctx.lineWidth = lw * 1.4;
    guardPath(ctx, geo);
    ctx.stroke();
    ctx.restore();

    // Central plate: a machined boss of light, so gold reads as an accent.
    const plateX = guard.boss ? guard.boss.x : box.cx;
    const plateY = guard.boss ? guard.boss.y : box.cy;
    const plateR = Math.max(span * 0.22, lw * 6);
    const plate = ctx.createRadialGradient(
      plateX - plateR * 0.3, plateY - plateR * 0.35, plateR * 0.05,
      plateX, plateY, plateR,
    );
    plate.addColorStop(0, pp.light);
    plate.addColorStop(0.55, pp.base);
    plate.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.arc(plateX, plateY, plateR, 0, Math.PI * 2);
    ctx.fill();

    if (plating === "ivory") {
      // Bone: warm, uneven, veined. Never a plastic white.
      for (let i = 0; i < 5; i++) {
        const y = lerp(box.minY, box.maxY, rng.next());
        ctx.globalAlpha = 0.07 + rng.next() * 0.05;
        ctx.strokeStyle = pp.dark;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(box.minX - box.width * 0.1, y);
        for (let s = 0; s <= 6; s++) {
          ctx.lineTo(box.minX + box.width * (s / 6), y + Math.sin(s * 1.7 + i) * box.height * 0.03);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = pp.deep;
      ctx.beginPath();
      ctx.ellipse(box.cx + box.width * 0.16, box.cy + box.height * 0.12, box.width * 0.2, box.height * 0.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Forged metal micro-structure: directional hammer planes, subtle.
      for (let i = 0; i < 5; i++) {
        const y = lerp(box.minY + box.height * 0.16, box.maxY - box.height * 0.16, rng.next());
        ctx.globalAlpha = 0.05 + rng.next() * 0.05;
        ctx.strokeStyle = i % 2 === 0 ? pp.deep : pp.light;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(box.minX, y);
        ctx.lineTo(box.maxX, y + box.height * rng.range(-0.05, 0.05));
        ctx.stroke();
      }
    }

    // Engraved strokes: dark incision with a single-side light lip.
    for (const stroke of guard.strokes) {
      strokePolyline(ctx, stroke, pp.deep, 0.55, lw * 1.15);
      strokePolyline(ctx, stroke, pp.light, 0.22, lw * 0.7, -lw * 0.55, -lw * 0.55);
    }

    // Langets: reinforced tabs with a chamfered light.
    for (const langet of guard.langets) {
      if (langet.length < 3) continue;
      pathFromPoints(ctx, langet, true);
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = pp.dark;
      ctx.fill();
      pathFromPoints(ctx, langet, true);
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = pp.light;
      ctx.lineWidth = lw * 0.75;
      ctx.stroke();
    }

    // Boss: a machined disc with a bright light-side rim and a dark seat.
    const boss = guard.boss;
    if (boss && boss.r > 0) {
      const r = Math.max(0.002, boss.r);
      const bg = ctx.createRadialGradient(
        boss.x - r * 0.35, boss.y - r * 0.4, r * 0.08,
        boss.x, boss.y, r * 1.15,
      );
      bg.addColorStop(0, pp.spec);
      bg.addColorStop(0.42, pp.light);
      bg.addColorStop(0.82, pp.dark);
      bg.addColorStop(1, pp.deep);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = pp.deep;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = pp.rim;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r * 0.74, Math.PI * 1.02, Math.PI * 1.85);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

// 8. Grip materials
// ---------------------------------------------------------------------------

interface GripFrame {
  box: OutlineBox;
  x0: number;
  x1: number;
  yTop: number;
  yBottom: number;
  h: number;
  width: number;
  lw: number;
  rng: ReturnType<typeof makeGenomeRng>;
}

function gripFrame(geo: WeaponGeometry, genome: WeaponVisualGenome): GripFrame {
  const box = outlineBox(geo.grip.outline);
  return {
    box,
    x0: box.minX,
    x1: box.maxX,
    yTop: box.minY,
    yBottom: box.maxY,
    h: Math.max(0.004, box.height),
    width: Math.max(0.004, box.width),
    lw: clamp(Math.max(box.width, box.height) * 0.02, 0.0005, 0.0028),
    rng: makeGenomeRng(genome.individuality.subSeeds.grip),
  };
}

function gripCylinder(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  frame: GripFrame,
  base: string,
  light: string,
  dark: string,
  deep: string,
): void {
  const g = ctx.createLinearGradient(0, frame.yTop, 0, frame.yBottom);
  g.addColorStop(0, dark);
  g.addColorStop(0.14, light);
  g.addColorStop(0.38, base);
  g.addColorStop(0.72, base);
  g.addColorStop(0.9, dark);
  g.addColorStop(1, deep);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  gripPath(ctx, geo);
  ctx.fill();
}

function drawFerrules(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const pp = platingPaint(genome.identity.guard === "imperial" ? "gold" : "bronze");
  const grip = geo.grip;
  if (grip.ferrules.length > 0) {
    for (const band of grip.ferrules) {
      if (band.length < 2) continue;
      const bbox = outlineBox(band);
      pathFromPoints(ctx, band, true);
      const g = ctx.createLinearGradient(bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
      g.addColorStop(0, pp.light);
      g.addColorStop(0.5, pp.base);
      g.addColorStop(1, pp.dark);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = pp.deep;
      ctx.lineWidth = clamp(bbox.height * 0.05, 0.0004, 0.0018);
      ctx.stroke();
    }
    return;
  }
  // Fallback: two ferrules at the ends of the grip box.
  const frame = gripFrame(geo, genome);
  const bandW = Math.max(0.006, frame.width) * 0.08;
  for (const x of [frame.x0 + bandW, frame.x1 - bandW]) {
    const g = ctx.createLinearGradient(0, frame.yTop, 0, frame.yBottom);
    g.addColorStop(0, pp.light);
    g.addColorStop(0.4, pp.base);
    g.addColorStop(1, pp.dark);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.fillRect(x - bandW * 0.5, frame.yTop - 0.001, bandW, frame.h + 0.002);
  }
}

export function paintGripMaterial(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const grip = geo.grip;
    const frame = gripFrame(geo, genome);
    const rng = frame.rng;
    const wrap = genome.mount.grip.wrapId;
    const baseColor = gripColorFor(wrap, genome);
    const paint = alloyPaint(genome);
    const lw = frame.lw;
    const polish = clamp01(genome.quality.polish);

    gripPath(ctx, geo);
    ctx.clip();

    gripCylinder(
      ctx, geo, frame,
      baseColor.base, baseColor.light, baseColor.dark, baseColor.deep,
    );

    const ribs = grip.ribs;
    const detail = clamp01(genome.quality.symmetry * 0.6 + polish * 0.4);

    if (wrap === "leather" || wrap === "dragon_leather") {
      // Stitched seam, worn patches, cross ribs.
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = baseColor.dark;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(frame.x0 - 0.002, frame.box.cy + frame.h * 0.24);
      ctx.lineTo(frame.x1 + 0.002, frame.box.cy + frame.h * 0.22);
      ctx.stroke();

      const stitches = clamp(Math.round(6 + detail * 10), 6, 16);
      for (let i = 0; i < stitches; i++) {
        const sx = lerp(frame.x0 + frame.h * 0.4, frame.x1 - frame.h * 0.4, (i + 0.5) / stitches);
        const jitter = (1 - detail) * rng.range(-0.006, 0.006);
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = baseColor.deep;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(sx + jitter, frame.box.cy + frame.h * 0.1);
        ctx.lineTo(sx + jitter + 0.002, frame.box.cy + frame.h * 0.34);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = baseColor.light;
        ctx.beginPath();
        ctx.moveTo(sx + jitter - lw, frame.box.cy + frame.h * 0.1);
        ctx.lineTo(sx + jitter + 0.002 - lw, frame.box.cy + frame.h * 0.34);
        ctx.stroke();
      }

      // Cross ribs: geometry-provided when available, otherwise derived.
      if (ribs.length > 0) {
        for (const rib of ribs) {
          strokePolyline(ctx, rib, baseColor.deep, 0.3, lw * 1.2);
          strokePolyline(ctx, rib, baseColor.light, 0.14, lw * 0.7, -lw * 0.6, -lw * 0.6);
        }
      } else {
        const ribCount = clamp(genome.mount.grip.ribCount, 5, 16);
        for (let i = 0; i < ribCount; i++) {
          const rx = lerp(frame.x0 + frame.h * 0.3, frame.x1 - frame.h * 0.3, i / Math.max(1, ribCount - 1));
          const slant = genome.mount.grip.ribSlant * 0.3;
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = baseColor.deep;
          ctx.lineWidth = lw * 0.9;
          ctx.beginPath();
          ctx.moveTo(rx + slant * frame.h, frame.yTop);
          ctx.quadraticCurveTo(rx, frame.box.cy, rx - slant * frame.h, frame.yBottom);
          ctx.stroke();
        }
      }

      // Worn patches at the palm.
      const patches = 2 + Math.round(rng.next() * 2);
      for (let i = 0; i < patches; i++) {
        const px = lerp(frame.x0, frame.x1, rng.range(0.2, 0.85));
        const py = frame.box.cy + rng.range(-0.2, 0.2) * frame.h;
        const r = frame.h * (0.16 + rng.next() * 0.16);
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = i % 2 === 0 ? baseColor.light : paint.warm;
        ctx.beginPath();
        ctx.ellipse(px, py, r * 1.5, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (wrap === "dragon_leather") {
        // Subtle scales, not a reptile wallpaper.
        const rows = 3;
        const scale = Math.max(0.006, frame.width / 12);
        for (let row = 0; row < rows; row++) {
          const y = lerp(frame.yTop + frame.h * 0.2, frame.yBottom - frame.h * 0.15, row / Math.max(1, rows - 1));
          for (let c = 0; c < 8; c++) {
            const x = lerp(frame.x0 + scale, frame.x1 - scale, c / 7) + (row % 2) * scale * 0.5;
            ctx.globalAlpha = 0.14;
            ctx.strokeStyle = baseColor.deep;
            ctx.lineWidth = lw * 0.6;
            ctx.beginPath();
            ctx.arc(x, y, scale * 0.42, Math.PI * 1.05, Math.PI * 1.95);
            ctx.stroke();
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = baseColor.light;
            ctx.beginPath();
            ctx.arc(x, y - scale * 0.12, scale * 0.34, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
          }
        }
      }
    } else if (wrap === "braided") {
      const cords = clamp(8 + Math.round(detail * 6), 8, 14);
      for (let i = 0; i < cords; i++) {
        const x = lerp(frame.x0 + frame.h * 0.2, frame.x1 - frame.h * 0.2, i / Math.max(1, cords - 1));
        const slant = frame.h * (0.18 + genome.mount.grip.ribSlant * 0.1);
        ctx.globalAlpha = 0.24;
        ctx.strokeStyle = baseColor.deep;
        ctx.lineWidth = lw * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop);
        ctx.lineTo(x - slant, frame.box.cy);
        ctx.lineTo(x, frame.yBottom);
        ctx.stroke();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = baseColor.light;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(x - lw, frame.yTop);
        ctx.lineTo(x - slant - lw, frame.box.cy);
        ctx.lineTo(x - lw, frame.yBottom);
        ctx.stroke();
      }
    } else if (wrap === "linen") {
      // Cloth bands with a visible weave.
      const bands = 7;
      for (let i = 0; i < bands; i++) {
        const x = lerp(frame.x0 - frame.width * 0.05, frame.x1 + frame.width * 0.05, i / bands);
        const bw = frame.width / bands + 0.001;
        ctx.globalAlpha = i % 2 === 0 ? 0.08 : 0.04;
        ctx.fillStyle = i % 2 === 0 ? baseColor.deep : baseColor.light;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop - 0.002);
        ctx.lineTo(x + bw * 1.4, frame.yTop - 0.002);
        ctx.lineTo(x + bw * 1.4 - frame.h * 0.12, frame.yBottom + 0.002);
        ctx.lineTo(x - frame.h * 0.12, frame.yBottom + 0.002);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 8; i++) {
        const x = lerp(frame.x0, frame.x1, (i + 0.5) / 8);
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = i % 2 === 0 ? baseColor.deep : baseColor.light;
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop + frame.h * 0.08);
        ctx.lineTo(x - frame.h * 0.06, frame.yBottom - frame.h * 0.08);
        ctx.stroke();
      }
    } else if (wrap === "darkwood") {
      const grains = clamp(6 + Math.round(detail * 5), 6, 11);
      for (let i = 0; i < grains; i++) {
        const u = lerp(0.12, 0.88, i / Math.max(1, grains - 1));
        const y = lerp(frame.yTop, frame.yBottom, u);
        const amp = frame.h * (0.02 + rng.next() * 0.025);
        ctx.globalAlpha = 0.12 + rng.next() * 0.1;
        ctx.strokeStyle = i % 3 === 0 ? baseColor.light : baseColor.deep;
        ctx.lineWidth = lw * (0.55 + rng.next() * 0.5);
        ctx.beginPath();
        ctx.moveTo(frame.x0, y);
        for (let s = 1; s <= 6; s++) {
          ctx.lineTo(
            lerp(frame.x0, frame.x1, s / 6),
            y + Math.sin(s * 1.3 + i * 2.1) * amp,
          );
        }
        ctx.stroke();
      }
      // One small knot.
      const kx = lerp(frame.x0, frame.x1, 0.62);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = baseColor.deep;
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.ellipse(kx, frame.box.cy, frame.h * 0.09, frame.h * 0.05, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      drawFerrules(ctx, geo, genome);
    } else if (wrap === "bone") {
      // Aged ivory segments separated by dark horn rings.
      const segments = 4;
      for (let s = 1; s < segments; s++) {
        const x = lerp(frame.x0, frame.x1, s / segments);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#2c221c";
        ctx.fillRect(x - frame.width * 0.012, frame.yTop - 0.002, frame.width * 0.024, frame.h + 0.004);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#b7a98f";
        ctx.fillRect(x - frame.width * 0.004, frame.yTop, frame.width * 0.004, frame.h);
      }
      for (let i = 0; i < 6; i++) {
        const x = lerp(frame.x0, frame.x1, rng.range(0.08, 0.92));
        const y = lerp(frame.yTop, frame.yBottom, rng.range(0.15, 0.85));
        const r = frame.h * (0.08 + rng.next() * 0.12);
        ctx.globalAlpha = 0.07 + rng.next() * 0.06;
        ctx.fillStyle = "#8a745a";
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.4, r * 0.8, rng.range(-0.6, 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 4; i++) {
        const x = lerp(frame.x0 + frame.width * 0.08, frame.x1 - frame.width * 0.08, i / 3);
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = baseColor.deep;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop + frame.h * 0.1);
        ctx.quadraticCurveTo(x + frame.width * 0.04, frame.box.cy, x, frame.yBottom - frame.h * 0.1);
        ctx.stroke();
      }
    } else if (wrap === "goldwire") {
      // Fine spiral wire: bright wire with its dark shadow.
      const coils = clamp(Math.round(frame.width / 0.009), 10, 30);
      for (let i = 0; i < coils; i++) {
        const x = lerp(frame.x0 - frame.width * 0.02, frame.x1 + frame.width * 0.02, i / coils);
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#6b4f16";
        ctx.lineWidth = lw * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop);
        ctx.lineTo(x - frame.h * 0.18, frame.yBottom);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#e8c86a";
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(x + lw * 0.8, frame.yTop);
        ctx.lineTo(x - frame.h * 0.18 + lw * 0.8, frame.yBottom);
        ctx.stroke();
      }
      drawFerrules(ctx, geo, genome);
    } else if (wrap === "tsukamaki") {
      // Samegawa underlay with a crossed ito lattice.
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#d9cfba";
      ctx.fillRect(frame.x0 - 0.002, frame.yTop - 0.002, frame.width + 0.004, frame.h + 0.004);
      // Pebbled ray skin.
      for (let i = 0; i < 20; i++) {
        const x = lerp(frame.x0, frame.x1, rng.next());
        const y = lerp(frame.yTop + frame.h * 0.1, frame.yBottom - frame.h * 0.1, rng.next());
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#9c8c72";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.0007, frame.h * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
      // Two families of wide cords crossing; the ivory shows through diamonds.
      const cordColor = genome.mount.grip.color;
      const spacing = Math.max(0.016, frame.width / 8);
      const cordW = Math.max(0.008, frame.h * 0.34);
      for (let k = -7; k <= 7; k++) {
        const x = frame.box.cx + k * spacing;
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = cordColor;
        ctx.lineWidth = cordW;
        ctx.beginPath();
        ctx.moveTo(x - frame.h * 0.75, frame.yTop - 0.002);
        ctx.lineTo(x + frame.h * 0.75, frame.yBottom + 0.002);
        ctx.stroke();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = "#241a17";
        ctx.lineWidth = cordW * 0.22;
        ctx.beginPath();
        ctx.moveTo(x - frame.h * 0.75 + cordW * 0.3, frame.yTop);
        ctx.lineTo(x + frame.h * 0.75 + cordW * 0.3, frame.yBottom);
        ctx.stroke();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = cordColor;
        ctx.lineWidth = cordW;
        ctx.beginPath();
        ctx.moveTo(x + frame.h * 0.75, frame.yTop - 0.002);
        ctx.lineTo(x - frame.h * 0.75, frame.yBottom + 0.002);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#241a17";
        ctx.lineWidth = cordW * 0.22;
        ctx.beginPath();
        ctx.moveTo(x + frame.h * 0.75, frame.yTop);
        ctx.lineTo(x - frame.h * 0.75, frame.yBottom);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "#f0e8d6";
      ctx.lineWidth = lw * 0.6;
      for (let k = -6; k <= 6; k += 2) {
        const x = frame.box.cx + k * spacing;
        ctx.beginPath();
        ctx.moveTo(x, frame.yTop + frame.h * 0.15);
        ctx.lineTo(x, frame.yBottom - frame.h * 0.15);
        ctx.stroke();
      }
    } else if (wrap === "elven_wood") {
      const grains = clamp(5 + Math.round(detail * 5), 5, 10);
      for (let i = 0; i < grains; i++) {
        const u = lerp(0.1, 0.9, i / Math.max(1, grains - 1));
        const y = lerp(frame.yTop, frame.yBottom, u);
        const amp = frame.h * (0.04 + rng.next() * 0.03);
        ctx.globalAlpha = 0.1 + rng.next() * 0.07;
        ctx.strokeStyle = i % 2 === 0 ? baseColor.deep : baseColor.light;
        ctx.lineWidth = lw * (0.5 + rng.next() * 0.5);
        ctx.beginPath();
        ctx.moveTo(frame.x0, y);
        ctx.bezierCurveTo(
          lerp(frame.x0, frame.x1, 0.3), y + amp,
          lerp(frame.x0, frame.x1, 0.65), y - amp,
          frame.x1, y + amp * 0.4,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = baseColor.light;
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.ellipse(lerp(frame.x0, frame.x1, 0.4), frame.box.cy, frame.h * 0.2, frame.h * 0.08, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Metal ferrules close the grip at both ends for the wraps that do not
    // handle them in their own branch.
    if (
      wrap === "leather" || wrap === "braided" || wrap === "linen" ||
      wrap === "elven_wood" || wrap === "dragon_leather"
    ) {
      drawFerrules(ctx, geo, genome);
    }

    // Universal rim / core light so every grip reads as a cylinder.
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = baseColor.light;
    ctx.lineWidth = lw * 1.1;
    gripPath(ctx, geo);
    ctx.stroke();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = baseColor.deep;
    ctx.lineWidth = lw * 2.2;
    gripPath(ctx, geo);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

interface GripColorSet {
  base: string;
  light: string;
  dark: string;
  deep: string;
}

function gripColorFor(
  wrap: WeaponVisualGenome["mount"]["grip"]["wrapId"],
  genome: WeaponVisualGenome,
): GripColorSet {
  const override = genome.mount.grip.color;
  const byWrap: Record<string, GripColorSet> = {
    leather: { base: override, light: "#a06a4a", dark: "#3e2317", deep: "#24140d" },
    braided: { base: override, light: "#7d4a2c", dark: "#2f1a10", deep: "#1b0f08" },
    linen: { base: override, light: "#e2d3b6", dark: "#9c8a6c", deep: "#6b5b45" },
    darkwood: { base: override, light: "#6a4230", dark: "#160c08", deep: "#0d0705" },
    bone: { base: "#c9bda4", light: "#e2d7c2", dark: "#7b6d58", deep: "#4f4536" },
    goldwire: { base: "#b8912f", light: "#f0d27a", dark: "#6b4f16", deep: "#3f2d0c" },
    tsukamaki: { base: "#d9cfba", light: "#efe8d8", dark: "#7d6f58", deep: "#4c4134" },
    elven_wood: { base: override, light: "#f0e2c6", dark: "#9a805c", deep: "#6c583c" },
    dragon_leather: { base: override, light: "#2f6a52", dark: "#0d2a1f", deep: "#071710" },
  };
  return byWrap[wrap] ?? byWrap.leather;
}

// ---------------------------------------------------------------------------
// 9. Pommel metal
// ---------------------------------------------------------------------------

export function paintPommelMetal(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  ctx.save();
  try {
    const pommel = geo.pommel;
    if (pommel.outline.length < 3) return;
    const plating = genome.mount.pommel.plating;
    const pp = platingPaint(plating);
    const box = outlineBox(pommel.outline);
    const rng = makeGenomeRng(genome.individuality.subSeeds.pommel);
    const r = Math.max(box.width, box.height) * 0.5;
    const lw = clamp(r * 0.08, 0.0006, 0.003);
    const polish = clamp01(genome.quality.polish);

    pommelPath(ctx, geo);
    ctx.clip();

    // Volume: off-centre radial highlight (sphere-like), not a flat disc.
    const radial = ctx.createRadialGradient(
      box.cx - r * 0.34, box.cy - r * 0.4, r * 0.08,
      box.cx, box.cy, r * 1.35,
    );
    radial.addColorStop(0, pp.spec);
    radial.addColorStop(0.26, pp.light);
    radial.addColorStop(0.58, pp.base);
    radial.addColorStop(0.82, pp.dark);
    radial.addColorStop(1, pp.deep);
    ctx.fillStyle = radial;
    pommelPath(ctx, geo);
    ctx.fill();

    // Underside occlusion.
    const shade = ctx.createLinearGradient(0, box.minY, 0, box.maxY);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.55, "rgba(0,0,0,0.05)");
    shade.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = shade;
    pommelPath(ctx, geo);
    ctx.fill();

    // Contact shadow where the pommel meets the grip (+X side).
    const contact = ctx.createLinearGradient(box.maxX - r * 0.35, 0, box.maxX, 0);
    contact.addColorStop(0, "rgba(0,0,0,0)");
    contact.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = contact;
    ctx.fillRect(box.maxX - r * 0.35, box.minY - lw, r * 0.4, box.height + lw * 2);

    // Light-side rim and dark-side rim: the metal reads with a direction.
    ctx.save();
    ctx.translate(-lw * 1.2, -lw * 1.2);
    ctx.globalAlpha = 0.34 + polish * 0.16;
    ctx.strokeStyle = pp.rim;
    ctx.lineWidth = lw;
    pommelPath(ctx, geo);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(lw * 1.0, lw * 1.2);
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = pp.deep;
    ctx.lineWidth = lw * 1.1;
    pommelPath(ctx, geo);
    ctx.stroke();
    ctx.restore();

    if (plating === "ivory") {
      for (let i = 0; i < 4; i++) {
        const y = lerp(box.minY, box.maxY, rng.next());
        ctx.globalAlpha = 0.07;
        ctx.strokeStyle = pp.dark;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.moveTo(box.minX, y);
        ctx.lineTo(box.maxX, y + box.height * rng.range(-0.05, 0.05));
        ctx.stroke();
      }
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = pp.deep;
      ctx.beginPath();
      ctx.ellipse(box.cx + box.width * 0.16, box.cy + box.height * 0.1, box.width * 0.2, box.height * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Turned-metal bands: shallow concentric facets, darker underside.
      const bands = plating === "gold" ? 2 : 1;
      for (let i = 1; i <= bands; i++) {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = pp.light;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.ellipse(box.cx, box.cy, box.width * (0.42 - i * 0.12), box.height * (0.42 - i * 0.12), 0, Math.PI * 0.1, Math.PI * 1.1);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = pp.deep;
        ctx.beginPath();
        ctx.ellipse(box.cx, box.cy, box.width * (0.42 - i * 0.12), box.height * (0.42 - i * 0.12), 0, Math.PI * 1.12, Math.PI * 2.05);
        ctx.stroke();
      }
    }

    // Engraved strokes, same incised light rule as the guard.
    for (const stroke of pommel.strokes) {
      strokePolyline(ctx, stroke, pp.deep, 0.5, lw * 0.9);
      strokePolyline(ctx, stroke, pp.light, 0.2, lw * 0.55, -lw * 0.4, -lw * 0.4);
    }
  } finally {
    ctx.restore();
  }
}
