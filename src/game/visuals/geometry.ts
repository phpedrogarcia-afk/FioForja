// FioForja — WEAPON DNA GEOMETRY
//
// Pure, deterministic genome -> geometry builder. No DOM, no Math.random, no
// Date/time. The same WeaponVisualGenome always produces bit-identical output.
//
// Coordinate system (unit space, one unit ~= one blade length):
//   * blade axis along +X from x = 0 (guard / ricasso) to x = bladeLength (tip).
//   * -Y is the spine side, +Y is the cutting edge side.
//   * grip and pommel live at negative X.
// Curvature is always drawn toward -Y so the +Y edge becomes the convex (sori)
// side, exactly as a curved single-edged weapon should read.
//
// This module owns SHAPE only. Materials, ornamentation and quality marks paint
// on top using the Path2D helpers and the BandGeometry / stroke data below.
//
// Contract notes for the paint layers:
//   * pathFromPoints / polylinePath emit one subpath and begin a fresh path.
//   * bladePath, bandPath, guardPath, gripPath and pommelPath each beginPath()
//     themselves so a caller can fill()/clip() immediately.
//   * BandGeometry.inner is the spine-side edge of the band, outer the edge-side
//     edge (smaller / larger lateral coordinate respectively).
//   * For "double" and "channels" fullers blade.fuller holds the edge-side
//     groove; fullerBands(genome) returns both symmetric grooves. The pair is
//     also mirrored automatically when the genome says double/channels.

import { clamp, clamp01, quantise, smoothstep } from "./math.ts";
import type {
  BandGeometry,
  BladeGeometry,
  BladeStation,
  GuardGeometry,
  GripGeometry,
  PommelGeometry,
  Pt,
  TipGeometry,
  WeaponBounds,
  WeaponGeometry,
} from "./types.ts";
import type {
  EdgeProfileId,
  SilhouetteGenome,
  SpineProfileId,
  TipProfileId,
  WeaponVisualGenome,
} from "./weaponGenome.ts";

// ---------------------------------------------------------------------------
// Constants and numeric helpers
// ---------------------------------------------------------------------------

/** Stations sampled along the blade. The public contract requires at least 65. */
export const BLADE_STATION_COUNT = 96;
/** Outline samples per station interval (>= 2 the brief asks for). */
const OUTLINE_SUBSTEPS = 2;
/** Lateral samples per tip side. */
const TIP_SAMPLES = 12;
/** Samples per band (fuller / bevel). */
const BAND_SAMPLES = 26;
/** Dedupe distance. */
const EPS = 1e-4;
/** Absolute floor for any half width in unit space. */
const MIN_HALF = 0.0015;
const TAU = Math.PI * 2;
const Q_DECIMALS = 4;

function num(value: number | undefined | null, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Quantise so identical genomes are bit-identical (never emits NaN). */
function q(n: number): number {
  return Number.isFinite(n) ? quantise(n, Q_DECIMALS) : 0;
}

function q5(n: number): number {
  return Number.isFinite(n) ? quantise(n, 5) : 0;
}

function P(x: number, y: number): Pt {
  return { x: q(x), y: q(y) };
}

function samePt(a: Pt, b: Pt): boolean {
  return Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;
}

/** Remove consecutive duplicates (epsilon 1e-4) and non-finite points. */
export function dedupePoints(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const last = out[out.length - 1];
    if (last && samePt(last, p)) continue;
    out.push({ x: p.x, y: p.y });
  }
  // A closed loop that repeats its first point at the end is redundant.
  if (out.length > 2 && samePt(out[0], out[out.length - 1])) out.pop();
  return out;
}

// ---------------------------------------------------------------------------
// Canvas 2D path helpers (hard contract used by the paint layers)
// ---------------------------------------------------------------------------

function emitSubPath(ctx: CanvasRenderingContext2D, pts: Pt[], close: boolean): void {
  const clean = dedupePoints(pts);
  if (clean.length === 0) return;
  ctx.moveTo(clean[0].x, clean[0].y);
  for (let i = 1; i < clean.length; i++) ctx.lineTo(clean[i].x, clean[i].y);
  if (close && clean.length > 2) ctx.closePath();
}

/** Begin a new path and trace the polyline (optionally closed). */
export function pathFromPoints(ctx: CanvasRenderingContext2D, pts: Pt[], close = false): void {
  ctx.beginPath();
  emitSubPath(ctx, pts, close);
}

/** Alias of pathFromPoints. */
export function polylinePath(ctx: CanvasRenderingContext2D, pts: Pt[], close = false): void {
  pathFromPoints(ctx, pts, close);
}

/** Closed blade silhouette. */
export function bladePath(ctx: CanvasRenderingContext2D, geo: WeaponGeometry): void {
  ctx.beginPath();
  emitSubPath(ctx, geo.blade.outline, true);
}

/** Inner forward + outer reversed: the closed ribbon of a band. */
export function bandPath(ctx: CanvasRenderingContext2D, band: BandGeometry, close = true): void {
  const inner = dedupePoints(band.inner);
  const outer = dedupePoints(band.outer).slice().reverse();
  const pts = dedupePoints(inner.concat(outer));
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close && pts.length > 2) ctx.closePath();
}

/** Whole guard: plate + limbs + langets as one path (ring voids cancel out). */
export function guardPath(ctx: CanvasRenderingContext2D, geo: WeaponGeometry): void {
  ctx.beginPath();
  emitSubPath(ctx, geo.guard.outline, true);
  for (let i = 0; i < geo.guard.quillons.length; i++) emitSubPath(ctx, geo.guard.quillons[i], true);
  for (let i = 0; i < geo.guard.langets.length; i++) emitSubPath(ctx, geo.guard.langets[i], true);
}

/** Grip silhouette. */
export function gripPath(ctx: CanvasRenderingContext2D, geo: WeaponGeometry): void {
  ctx.beginPath();
  emitSubPath(ctx, geo.grip.outline, true);
}

/** Pommel silhouette. */
export function pommelPath(ctx: CanvasRenderingContext2D, geo: WeaponGeometry): void {
  ctx.beginPath();
  emitSubPath(ctx, geo.pommel.outline, true);
}

// ---------------------------------------------------------------------------
// Small shape generators
// ---------------------------------------------------------------------------

function ellipseLoop(
  cx: number, cy: number, rx: number, ry: number, count: number, clockwise = false,
): Pt[] {
  const n = Math.max(6, Math.round(count));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = clockwise ? (TAU * i) / n : (-TAU * i) / n;
    out.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return dedupePoints(out);
}

function ellipseArc(
  cx: number, cy: number, rx: number, ry: number, count: number, start: number, end: number,
): Pt[] {
  const n = Math.max(3, Math.round(count));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = mix(start, end, i / (n - 1));
    out.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return dedupePoints(out);
}

function cubicPoints(p0: Pt, c1: Pt, c2: Pt, p3: Pt, count: number): Pt[] {
  const n = Math.max(4, Math.round(count));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    out.push(P(
      u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    ));
  }
  return dedupePoints(out);
}

/** Closed stroke helper: an open polyline whose first point is repeated. */
function closedStroke(pts: Pt[]): Pt[] {
  const clean = dedupePoints(pts);
  if (clean.length === 0) return clean;
  return clean.concat([clean[0]]);
}

// ---------------------------------------------------------------------------
// Centre line
// ---------------------------------------------------------------------------

interface CenterSample {
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
}

interface BladeLayout {
  L: number;
  tStart: number;
  tipRatio: number;
}

function bladeLayout(genome: WeaponVisualGenome): BladeLayout {
  const sil = genome.silhouette;
  const L = clamp(num(sil.bladeLengthUnits, 1), 0.5, 1.55);
  const tipRatio = clamp(num(sil.tipLengthRatio, 0.16), 0.06, 0.34);
  const tStart = clamp(1 - tipRatio, 0.62, 0.95);
  return { L, tStart, tipRatio };
}

/**
 * Curve shape after curveStart, raised to curveExponent and softened so the
 * onset never produces a visible tangent kink.
 */
function curveShape(sil: SilhouetteGenome, t: number): number {
  const start = clamp(num(sil.curveStart, 0), 0, 0.6);
  const exp = clamp(num(sil.curveExponent, 1), 0.5, 3);
  if (t <= start) return 0;
  const u = clamp01((t - start) / Math.max(1e-6, 1 - start));
  return Math.pow(u, exp) * smoothstep(0, 0.12, u);
}

/** Subtle deterministic wobble; anchored at t = 0 so the guard seam stays clean. */
function wobbleAt(sil: SilhouetteGenome, t: number): number {
  const amp = clamp(num(sil.wobbleAmp, 0), 0, 0.02);
  if (amp <= 0) return 0;
  const phase = clamp01(num(sil.wobblePhase, 0));
  return amp * Math.sin(phase * TAU + t * Math.PI * 3) * smoothstep(0, 0.06, t);
}

function centerAt(sil: SilhouetteGenome, L: number, t: number): CenterSample {
  const u = clamp01(t);
  const curvature = clamp(num(sil.curvature, 0), 0, 0.14);
  const cy = -curvature * curveShape(sil, u) + wobbleAt(sil, u);
  const cx = L * u;
  // Numerical tangent (central difference, one-sided at the ends).
  const h = 1 / 512;
  const t0 = Math.max(0, u - h);
  const t1 = Math.min(1, u + h);
  const y0 = -curvature * curveShape(sil, t0) + wobbleAt(sil, t0);
  const y1 = -curvature * curveShape(sil, t1) + wobbleAt(sil, t1);
  const dx = L * (t1 - t0);
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  return { cx, cy, tx, ty, nx: -ty, ny: tx };
}

function offsetPoint(c: CenterSample, lateral: number): Pt {
  return P(c.cx + c.nx * lateral, c.cy + c.ny * lateral);
}

// ---------------------------------------------------------------------------
// Width profile
// ---------------------------------------------------------------------------

interface WidthSample {
  hs: number;
  he: number;
  hw: number;
}

/** Smooth raised-cosine bump, 1 at the centre and 0 at center +- width. */
function bump(t: number, center: number, width: number): number {
  const d = Math.abs(t - center) / Math.max(1e-4, width);
  if (d >= 1) return 0;
  return 0.5 + 0.5 * Math.cos(Math.PI * d);
}

/** base -> mid -> tipHalfWidth (tipHalfWidth lives where the tip section starts). */
function baseWidthAt(sil: SilhouetteGenome, t: number): number {
  const base = clamp(num(sil.baseHalfWidth, 0.05), 0.015, 0.09);
  const mid = clamp(num(sil.midHalfWidth, base), base * 0.5, base * 1.5);
  const tipHW = clamp(num(sil.tipHalfWidth, base * 0.16), MIN_HALF, Math.min(base * 0.55, 0.03));
  const tipRatio = clamp(num(sil.tipLengthRatio, 0.16), 0.05, 0.34);
  const tipAnchor = clamp(1 - tipRatio, 0.62, 0.95);
  const taper = clamp01(num(sil.distalTaper, 0.4));
  const u = clamp01(t);
  if (u <= 0.48) {
    const local = u / 0.48;
    return mix(base, mid, Math.pow(local, 0.85 + taper * 0.5));
  }
  if (u <= tipAnchor) {
    const local = (u - 0.48) / Math.max(0.02, tipAnchor - 0.48);
    return mix(mid, tipHW, Math.pow(local, 1.15 - taper * 0.2));
  }
  const local = (u - tipAnchor) / Math.max(0.02, 1 - tipAnchor);
  return Math.max(MIN_HALF, tipHW * Math.pow(1 - clamp01(local), 0.8));
}

function edgeProfileFactor(profile: EdgeProfileId | string, t: number): number {
  switch (profile) {
    case "belly": return 1 + 0.1 * bump(t, 0.68, 0.32);
    case "recurve": return 1 - 0.09 * bump(t, 0.55, 0.24) + 0.05 * bump(t, 0.85, 0.15);
    case "waisted": return 1 - 0.09 * bump(t, 0.3, 0.24);
    case "leaf": return 1 - 0.1 * bump(t, 0.26, 0.14) + 0.16 * bump(t, 0.62, 0.18);
    // A cleaver flares toward the tip (the falchion belly); the tip builder
    // starts before the flare peaks, so it never breaks the silhouette.
    case "cleaver": return 1 + 0.18 * bump(t, 0.8, 0.22) + 0.02 * bump(t, 0.95, 0.1);
    case "arched": return 1 + 0.07 * bump(t, 0.6, 0.38);
    default: return 1;
  }
}

function spineProfileFactor(profile: SpineProfileId | string, t: number): number {
  switch (profile) {
    case "arch": return 1 + 0.05 * bump(t, 0.55, 0.32);
    case "sori": return 1 + 0.07 * bump(t, 0.5, 0.36);
    case "clipped": return 1 - 0.1 * smoothstep(0.78, 0.96, t);
    case "stepped": return 1 + 0.025 * Math.sin(t * Math.PI * 3.2);
    case "tapered": return 1 - 0.06 * smoothstep(0.15, 0.95, t);
    default: return 1;
  }
}

/**
 * Station width split: halfSpine / halfEdge follow the asymmetry bias (a
 * single-edged or curved family always keeps a thicker spine), the edge and
 * spine profiles modulate each side, and the ricasso reinforces the root with a
 * short blend back into the main body.
 */
function halfWidths(genome: WeaponVisualGenome, t: number): WidthSample {
  const sil = genome.silhouette;
  const base = clamp(num(sil.baseHalfWidth, 0.05), 0.015, 0.09);
  const hw = baseWidthAt(sil, t);
  const edgeP = (sil.edgeProfile ?? "straight") as EdgeProfileId;
  const spineP = (sil.spineProfile ?? "straight") as SpineProfileId;
  const tipP = (sil.tipProfile ?? "spear") as TipProfileId;
  const edgeF = edgeProfileFactor(edgeP, t);
  const spineF = spineProfileFactor(spineP, t);
  const singleEdge =
    tipP === "clip" || tipP === "chisel" ||
    edgeP === "arched" || edgeP === "belly" || edgeP === "cleaver";
  let asym = clamp(num(sil.asymmetry, 0), -0.35, 0.35) * 0.42;
  if (singleEdge) asym = Math.max(asym, 0.045);
  let hs = hw * (1 + asym) * spineF;
  let he = hw * (1 - asym) * edgeF;

  const ricRatio = clamp(num(sil.ricassoRatio, 0.08), 0.02, 0.22);
  const ricHW = clamp(num(sil.ricassoHalfWidth, base * 1.08), base * 0.9, base * 1.4);
  if (t < ricRatio) {
    const local = clamp01(t / Math.max(1e-4, ricRatio));
    const blend = smoothstep(0.52, 1, local);
    const factor = mix(ricHW / base, 1, blend);
    hs *= factor;
    he *= factor;
  }

  // Hard safety envelope: never grotesque. Leaf and cleaver are allowed their
  // intended swells; everything else stays within 1.35x the base half width.
  const swellCap = edgeP === "leaf" || edgeP === "cleaver" ? 1.5 : 1.35;
  const cap = base * swellCap;
  const total = Math.abs(hs) + Math.abs(he);
  if (total > cap * 2 && total > 1e-6) {
    const scale = (cap * 2) / total;
    hs *= scale;
    he *= scale;
  }
  hs = Math.max(MIN_HALF, hs);
  he = Math.max(MIN_HALF, he);
  return { hs: q(hs), he: q(he), hw: q((hs + he) * 0.5) };
}

// ---------------------------------------------------------------------------
// Fuller / bevel / ridge bands
// ---------------------------------------------------------------------------

interface FullerPlan {
  style: string;
  depth: number;
  t0: number;
  t1: number;
  count: number;
  edgeCentre(t: number): number;
  spineCentre(t: number): number;
  halfBand(t: number): number;
}

function planFuller(genome: WeaponVisualGenome, layout: BladeLayout): FullerPlan | null {
  const f = genome.structure.fuller;
  if (!f || !f.enabled) return null;
  const style = (f.style ?? "none") as string;
  // A ridge is a raised spine, not a groove: no band, blade.ridgeline instead.
  if (style === "none" || style === "ridge") return null;
  const t0 = clamp(num(f.start, 0.08), 0.015, 0.55);
  let t1 = clamp(num(f.end, 0.66), t0 + 0.1, 0.94);
  t1 = Math.min(t1, layout.tStart - 0.012);
  if (t1 - t0 < 0.08) return null;

  const localHalf = (t: number) => halfWidths(genome, t).hw;
  const envelope = (t: number) => {
    const u = clamp01((t - t0) / Math.max(1e-4, t1 - t0));
    return smoothstep(0, 0.16, u) * (1 - smoothstep(0.78, 1, u));
  };
  const halfWidthFrac = clamp(num(f.halfWidth, 0.24), 0.08, 0.46);
  const rawDepth = clamp01(num(f.depth, 0.4));
  const offset = clamp(num(f.offset, 0), -0.5, 0.5);

  if (style === "double" || style === "channels" || Boolean(f.double)) {
    const channels = style === "channels";
    const separation = channels ? 0.44 : 0.52;
    const widthScale = channels ? 0.68 : 0.92;
    return {
      style: channels ? "channels" : "double",
      depth: clamp01(rawDepth + (channels ? 0.12 : 0)),
      t0,
      t1,
      count: 2,
      edgeCentre: (t) => separation * localHalf(t) * envelope(t),
      spineCentre: (t) => -separation * localHalf(t) * envelope(t),
      halfBand: (t) => halfWidthFrac * widthScale * localHalf(t) * envelope(t),
    };
  }

  const boHi = style === "bo-hi";
  const offsetFrac = boHi
    ? -Math.max(0.22, Math.abs(offset))
    : Math.abs(offset) < 0.06 ? 0 : offset;
  return {
    style: boHi ? "bo-hi" : style,
    depth: clamp01(rawDepth),
    t0,
    t1,
    count: 1,
    edgeCentre: (t) => offsetFrac * localHalf(t) * envelope(t),
    spineCentre: (t) => offsetFrac * localHalf(t) * envelope(t),
    halfBand: (t) => halfWidthFrac * localHalf(t) * envelope(t),
  };
}

function sampleFullerBand(
  genome: WeaponVisualGenome, layout: BladeLayout, plan: FullerPlan, edgeSide: boolean,
): BandGeometry {
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  for (let i = 0; i <= BAND_SAMPLES; i++) {
    const t = mix(plan.t0, plan.t1, i / BAND_SAMPLES);
    const c = centerAt(genome.silhouette, layout.L, t);
    const centre = edgeSide ? plan.edgeCentre(t) : plan.spineCentre(t);
    const half = plan.halfBand(t);
    inner.push(offsetPoint(c, centre - half));
    outer.push(offsetPoint(c, centre + half));
  }
  return { inner: dedupePoints(inner), outer: dedupePoints(outer), depth: q(plan.depth) };
}

/**
 * Every fuller groove band, following the curved centre line and tapering
 * smoothly to zero at both ends. Export is additive: blade.fuller remains the
 * primary band for the simple consumer.
 */
export function fullerBands(genome: WeaponVisualGenome): BandGeometry[] {
  const layout = bladeLayout(genome);
  const plan = planFuller(genome, layout);
  if (!plan) return [];
  const bands = [sampleFullerBand(genome, layout, plan, true)];
  if (plan.count === 2) bands.push(sampleFullerBand(genome, layout, plan, false));
  return bands;
}

/** Bevel facets: each band runs from the fuller edge (or ridge) to the outline. */
function buildBevels(genome: WeaponVisualGenome, layout: BladeLayout, plan: FullerPlan | null): BandGeometry[] {
  const b = genome.structure.bevels;
  const count = clamp(Math.round(num(b.count, 1)), 1, 2);
  const widthFrac = clamp(num(b.width, 0.26), 0.1, 0.5);
  const depth = q(clamp01(num(b.prominence, 0.5) * 0.85));
  let t0: number;
  let t1: number;
  if (plan) {
    t0 = plan.t0;
    t1 = plan.t1;
  } else {
    t0 = 0.06;
    t1 = Math.max(t0 + 0.1, layout.tStart - 0.02);
  }
  const edgeInner: Pt[] = [];
  const edgeOuter: Pt[] = [];
  const spineInner: Pt[] = [];
  const spineOuter: Pt[] = [];
  for (let i = 0; i <= BAND_SAMPLES; i++) {
    const t = mix(t0, t1, i / BAND_SAMPLES);
    const c = centerAt(genome.silhouette, layout.L, t);
    const w = halfWidths(genome, t);
    const localHalf = Math.max(w.hw, MIN_HALF * 2);

    let edgeIn = w.he - 2 * localHalf * widthFrac;
    if (plan) edgeIn = plan.edgeCentre(t) + plan.halfBand(t);
    edgeIn = Math.min(edgeIn, w.he - 0.0012);
    edgeIn = Math.max(edgeIn, -w.hs * 0.2);
    edgeInner.push(offsetPoint(c, edgeIn));
    edgeOuter.push(offsetPoint(c, w.he * 0.995));

    let spineOut = -w.hs + 2 * localHalf * widthFrac;
    if (plan) spineOut = plan.spineCentre(t) - plan.halfBand(t);
    spineOut = Math.max(spineOut, -w.hs + 0.0012);
    spineOut = Math.min(spineOut, w.he * 0.2);
    spineInner.push(offsetPoint(c, -w.hs * 0.995));
    spineOuter.push(offsetPoint(c, spineOut));
  }
  const edgeBand: BandGeometry = {
    inner: dedupePoints(edgeInner),
    outer: dedupePoints(edgeOuter),
    depth,
  };
  const spineBand: BandGeometry = {
    inner: dedupePoints(spineInner),
    outer: dedupePoints(spineOuter),
    depth: q(Math.min(1, depth * 0.92)),
  };
  // Order matters for the bevel paint layer: index 0 is the spine-side facet,
  // the last band is the edge-side facet that catches the specular sweep.
  if (count >= 2) return [spineBand, edgeBand];
  return [edgeBand];
}

/** Raised spine/ridge line along the centre line. */
function buildRidgeline(genome: WeaponVisualGenome, layout: BladeLayout): Pt[] | null {
  const f = genome.structure.fuller;
  const start = clamp(num(f.start, 0.08), 0.03, 0.4);
  const end = clamp(num(f.end, 0.7), start + 0.15, Math.max(start + 0.2, layout.tStart - 0.02));
  const pts: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = mix(start, end, i / 18);
    const c = centerAt(genome.silhouette, layout.L, t);
    pts.push(P(c.cx, c.cy));
  }
  return dedupePoints(pts);
}

// ---------------------------------------------------------------------------
// Tip construction
// ---------------------------------------------------------------------------

/**
 * Lateral factor of the tip section. 1 at the body junction, 0 at the apex.
 * Profile-specific curves keep the tip compatible with its family.
 */
function tipFactor(profile: TipProfileId | string, side: "spine" | "edge", s: number): number {
  const u = clamp01(s);
  switch (profile) {
    case "needle": return Math.pow(1 - u, 1.05);
    case "spear": return Math.pow(1 - u, 1.45);
    case "leaf": return Math.pow(1 - u, 0.78);
    case "clip":
      if (side === "spine") {
        if (u < 0.45) return 1 - 0.12 * (u / 0.45);
        return 0.88 * (1 - (u - 0.45) / 0.55);
      }
      return Math.pow(1 - u, 1.25);
    case "chisel":
      if (side === "spine") {
        if (u < 0.6) return 1 - 0.1 * (u / 0.6);
        return 0.9 * (1 - (u - 0.6) / 0.4);
      }
      return Math.pow(1 - u, 1.15);
    case "diamond": return Math.pow(1 - u, 0.95);
    default: return Math.pow(1 - u, 1.2);
  }
}

function shoulderSample(profile: TipProfileId | string): number | null {
  if (profile === "clip") return 0.45;
  if (profile === "chisel") return 0.6;
  return null;
}

interface TipBuild {
  geometry: TipGeometry;
  spine: Pt[];
  edge: Pt[];
  apex: Pt;
}

function buildTip(genome: WeaponVisualGenome, layout: BladeLayout): TipBuild {
  const sil = genome.silhouette;
  const { L, tStart } = layout;
  const cStart = centerAt(sil, L, tStart);
  const wStart = halfWidths(genome, tStart);
  const hs0 = Math.max(MIN_HALF, wStart.hs);
  const he0 = Math.max(MIN_HALF, wStart.he);
  const apexSample = centerAt(sil, L, 1);
  const apex = P(L, apexSample.cy);
  const profile = (sil.tipProfile ?? "spear") as TipProfileId;
  const spine: Pt[] = [];
  const edge: Pt[] = [];
  for (let k = 1; k <= TIP_SAMPLES; k++) {
    const s = k / TIP_SAMPLES;
    const t = tStart + (1 - tStart) * s;
    const c = centerAt(sil, L, t);
    const fs = tipFactor(profile, "spine", s);
    const fe = tipFactor(profile, "edge", s);
    spine.push(k === TIP_SAMPLES ? apex : offsetPoint(c, -hs0 * fs));
    edge.push(k === TIP_SAMPLES ? apex : offsetPoint(c, he0 * fe));
  }
  let shoulder: Pt | null = null;
  const shoulderAt = shoulderSample(profile);
  if (shoulderAt !== null) {
    const t = tStart + (1 - tStart) * shoulderAt;
    const c = centerAt(sil, L, t);
    const fs = tipFactor(profile, "spine", shoulderAt);
    shoulder = offsetPoint(c, -hs0 * fs);
  }
  const geometry: TipGeometry = {
    base: P(cStart.cx, cStart.cy),
    apex,
    startT: q5(tStart),
    profile,
    shoulder,
  };
  return { geometry, spine, edge, apex };
}

// ---------------------------------------------------------------------------
// Blade
// ---------------------------------------------------------------------------

function buildBlade(genome: WeaponVisualGenome): BladeGeometry {
  const sil = genome.silhouette;
  const layout = bladeLayout(genome);
  const { L, tStart } = layout;
  const N = BLADE_STATION_COUNT;

  const stations: BladeStation[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const c = centerAt(sil, L, t);
    const w = halfWidths(genome, t);
    const baseHW = clamp(num(sil.baseHalfWidth, 0.05), 0.015, 0.09);
    const volume = clamp01(w.hw / Math.max(0.02, baseHW));
    stations.push({
      t: q5(t),
      cx: q(c.cx),
      cy: q(c.cy),
      halfSpine: w.hs,
      halfEdge: w.he,
      halfWidth: w.hw,
      tangent: { x: q(c.tx), y: q(c.ty) },
      normal: { x: q(c.nx), y: q(c.ny) },
      thickness: q(clamp01(0.28 + volume * 0.68)),
    });
  }

  const bodyCount = (N - 1) * OUTLINE_SUBSTEPS + 1;
  const bodySpine: Pt[] = [];
  const bodyEdge: Pt[] = [];
  for (let i = 0; i < bodyCount; i++) {
    const t = tStart * (i / (bodyCount - 1));
    const c = centerAt(sil, L, t);
    const w = halfWidths(genome, t);
    bodySpine.push(offsetPoint(c, -w.hs));
    bodyEdge.push(offsetPoint(c, w.he));
  }

  const tip = buildTip(genome, layout);
  const spine = dedupePoints(bodySpine.concat(tip.spine));
  const edge = dedupePoints(bodyEdge.concat(tip.edge));
  const outline = dedupePoints(spine.concat(edge.slice().reverse()));
  if (outline.length > 2 && samePt(outline[0], outline[outline.length - 1])) outline.pop();

  const plan = planFuller(genome, layout);
  let fuller: (BandGeometry & { style: string }) | null = null;
  if (plan) {
    const primary = sampleFullerBand(genome, layout, plan, true);
    fuller = { inner: primary.inner, outer: primary.outer, depth: primary.depth, style: plan.style };
  }
  const bevels = buildBevels(genome, layout, plan);
  const fullerStyle = (genome.structure.fuller.style ?? "none") as string;
  let ridgeline: Pt[] | null = null;
  if (!plan && (fullerStyle === "ridge" || genome.structure.ridge.enabled)) {
    ridgeline = buildRidgeline(genome, layout);
  }

  const ricassoRatio = clamp(num(sil.ricassoRatio, 0.08), 0.02, 0.22);
  const ricassoWidth = halfWidths(genome, 0).hw;
  return {
    stations,
    spine,
    edge,
    outline,
    tip: tip.geometry,
    fuller,
    bevels,
    ridgeline,
    ricasso: { t: q5(ricassoRatio), halfWidth: q(ricassoWidth) },
  };
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/** Chamfered central plate: the anchor block every guard archetype hangs on. */
function chamferBlock(T: number, B: number, front: number, back: number): Pt[] {
  const xf = T * front;
  const xb = -T * back;
  const chamfer = Math.min(T * 0.75, B * 0.55);
  return dedupePoints([
    P(xf, -B + chamfer),
    P(xf, B - chamfer),
    P(xf - chamfer, B),
    P(xb + chamfer, B),
    P(xb, B - chamfer),
    P(xb, -B + chamfer),
    P(xb + chamfer, -B),
    P(xf - chamfer, -B),
  ]);
}

function buildLangets(genome: WeaponVisualGenome, blade: BladeGeometry, T: number): Pt[][] {
  const guard = genome.mount.guard;
  if (!guard.langets) return [];
  const sil = genome.silhouette;
  const baseHW = clamp(blade.stations[0].halfWidth, 0.015, 0.1);
  const ricRatio = clamp(num(sil.ricassoRatio, 0.08), 0.02, 0.22);
  const L = clamp(num(sil.bladeLengthUnits, 1), 0.5, 1.55);
  const length = clamp(ricRatio * L * 0.8, 0.026, 0.08);
  const thickness = clamp(baseHW * 0.26, 0.006, 0.016);
  const x0 = T * 0.4;
  const x1 = x0 + length;
  const out: Pt[][] = [];
  for (const sgn of [-1, 1]) {
    const y = sgn * baseHW * 0.7;
    const h = thickness * 0.5;
    out.push(dedupePoints([
      P(x0, y - h),
      P(x0 + length * 0.18, y - h * 1.06),
      P(x1 - length * 0.16, y - h * 0.94),
      P(x1, y - h * 0.4),
      P(x1, y + h * 0.4),
      P(x1 - length * 0.16, y + h * 0.94),
      P(x0 + length * 0.18, y + h * 1.06),
      P(x0, y + h),
    ]));
  }
  return out;
}

function buildGuard(genome: WeaponVisualGenome, blade: BladeGeometry): GuardGeometry {
  const g = genome.mount.guard;
  const archetype = g.archetype;
  const baseHW = clamp(blade.stations[0].halfWidth, 0.015, 0.1);
  const requestedSpan = clamp(num(g.span, 0.17), 0.06, 0.3);
  // Aesthetic guard: span may not exceed 2.2x the blade base FULL width (the
  // genome already stays inside 0.09..0.26). This keeps every archetype readable
  // against the blade without letting an ornament swallow the silhouette.
  const balanceCap = 2.2 * (2 * baseHW);
  const span = clamp(requestedSpan, 0.07, Math.min(0.26, Math.max(0.1, balanceCap)));
  const T = clamp(num(g.thickness, 0.016), 0.008, 0.03);
  const B = clamp(T * 1.9, 0.012, 0.03);
  const qq = clamp01(num(g.quillonCurve, 0.4));
  const orn = clamp01(num(g.ornament, 0.2));

  let outline: Pt[] = [];
  const quillons: Pt[][] = [];
  const strokes: Pt[][] = [];
  let bossR = 0;

  if (archetype === "cross") {
    outline = chamferBlock(T, B * 1.08, 1.25, 1.35);
    for (const sgn of [-1, 1]) {
      const y0 = B * 0.55;
      const tipX = T * 0.55 + qq * span * 0.08;
      quillons.push(dedupePoints([
        P(-T * 0.7, sgn * y0),
        P(T * 0.55, sgn * y0),
        P(T * 0.75, sgn * span * 0.55),
        P(tipX, sgn * span * 0.9),
        P(tipX - T * 0.25, sgn * (span - T * 0.05)),
        P(tipX - T * 0.8, sgn * span * 0.86),
        P(-T * 0.6 - qq * span * 0.03, sgn * span * 0.5),
        P(-T * 0.9, sgn * (y0 + B * 0.15)),
      ]));
    }
    if (orn > 0.12) {
      strokes.push([P(-T * 0.25, -B * 0.5), P(-T * 0.25, B * 0.5)]);
      strokes.push([P(-T * 0.62, -B * 0.3), P(-T * 0.88, 0), P(-T * 0.62, B * 0.3)]);
    }
    if (orn > 0.22) bossR = clamp(0.007 + orn * 0.014, 0.007, 0.02);
  } else if (archetype === "curved") {
    outline = chamferBlock(T, B * 0.95, 1.1, 1.3);
    for (const sgn of [-1, 1]) {
      const front: Pt[] = [];
      const back: Pt[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const yy = sgn * mix(B * 0.45, span, Math.pow(u, 0.9));
        const xx = -T * 0.4 + qq * span * 0.5 * Math.sin(Math.PI * u) + T * 0.8 * u;
        const hw = mix(T * 1.05, T * 0.3, u);
        front.push(P(xx + hw, yy));
        back.push(P(xx - hw, yy));
      }
      quillons.push(dedupePoints(front.concat(back.slice().reverse())));
      if (orn > 0.3) {
        const groove: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const yy = sgn * mix(B * 0.5, span * 0.92, Math.pow(u, 0.9));
          const xx = -T * 0.4 + qq * span * 0.5 * Math.sin(Math.PI * u) + T * 0.8 * u;
          groove.push(P(xx, yy));
        }
        strokes.push(groove);
      }
    }
    if (orn > 0.28) bossR = clamp(0.006 + orn * 0.012, 0.006, 0.018);
  } else if (archetype === "wings") {
    outline = chamferBlock(T, B * 1.05, 1.2, 1.3);
    for (const sgn of [-1, 1]) {
      const rootY = B * 0.45;
      const step = (span - rootY) / 4.6;
      const wing: Pt[] = [
        P(-T * 0.5, sgn * rootY),
        P(T * 0.55, sgn * (rootY + step * 0.2)),
        P(T * 0.5, sgn * (rootY + step * 0.75)),
        P(T * 0.32, sgn * (rootY + step * 1.35)),
        P(T * 0.12, sgn * (rootY + step * 2)),
        P(-T * 0.02, sgn * (rootY + step * 2.65)),
        P(-T * 0.1, sgn * span),
      ];
      let y = span;
      for (let k = 0; k < 4; k++) {
        const featherY = y - step * 0.55;
        const notchY = y - step * 0.92;
        wing.push(P(-T * 0.3 - step * 1.25, sgn * featherY));
        wing.push(P(-T * 0.18, sgn * notchY));
        y = notchY;
      }
      wing.push(P(-T * 0.55, sgn * (rootY + step * 0.3)));
      quillons.push(dedupePoints(wing));
      if (orn > 0.2) {
        for (let k = 0; k < 3; k++) {
          const yTop = rootY + step * (1.1 + k * 0.85);
          strokes.push([
            P(T * 0.28, sgn * yTop),
            P(-T * 0.12, sgn * (yTop + step * 0.55)),
          ]);
        }
      }
    }
    if (orn > 0.3) bossR = clamp(0.008 + orn * 0.01, 0.008, 0.016);
  } else if (archetype === "ring") {
    const R = clamp(span * 0.78, 0.05, 0.105);
    const cxR = -R * 0.12;
    outline = ellipseLoop(cxR, 0, R * 0.92, R, 26, false);
    // Inner void: opposite winding so nonzero fill cancels it out.
    quillons.push(ellipseLoop(cxR, 0, R * 0.58, R * 0.66, 22, true));
    strokes.push([P(cxR - R * 0.5, -R * 0.5), P(cxR + R * 0.5, R * 0.5)]);
    strokes.push([P(cxR - R * 0.5, R * 0.5), P(cxR + R * 0.5, -R * 0.5)]);
  } else if (archetype === "tsuba") {
    const hx = T * 1.9;
    const hy = span;
    outline = dedupePoints([
      P(hx, -hy * 0.42),
      P(hx * 0.7, -hy * 0.86),
      P(hx * 0.25, -hy),
      P(-hx * 0.25, -hy),
      P(-hx * 0.7, -hy * 0.86),
      P(-hx, -hy * 0.42),
      P(-hx, hy * 0.42),
      P(-hx * 0.7, hy * 0.86),
      P(-hx * 0.25, hy),
      P(hx * 0.25, hy),
      P(hx * 0.7, hy * 0.86),
      P(hx, hy * 0.42),
    ]);
    // Cutouts stay as open strokes: the disc silhouette remains solid.
    strokes.push(closedStroke(dedupePoints([
      P(hx * 0.82, -hy * 0.34),
      P(hx * 0.56, -hy * 0.7),
      P(hx * 0.2, -hy * 0.82),
      P(-hx * 0.2, -hy * 0.82),
      P(-hx * 0.56, -hy * 0.7),
      P(-hx * 0.82, -hy * 0.34),
      P(-hx * 0.82, hy * 0.34),
      P(-hx * 0.56, hy * 0.7),
      P(-hx * 0.2, hy * 0.82),
      P(hx * 0.2, hy * 0.82),
      P(hx * 0.56, hy * 0.7),
      P(hx * 0.82, hy * 0.34),
    ])));
    strokes.push(closedStroke(ellipseLoop(-T * 0.15, span * 0.46, T * 0.9, span * 0.14, 14, false)));
    strokes.push(closedStroke(ellipseLoop(-T * 0.15, -span * 0.46, T * 0.9, span * 0.14, 14, false)));
  } else if (archetype === "leaf") {
    outline = chamferBlock(T, B * 0.9, 1, 1.15);
    for (const sgn of [-1, 1]) {
      const front: Pt[] = [];
      const back: Pt[] = [];
      const midrib: Pt[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const yy = sgn * mix(B * 0.4, span, smoothstep(0, 1, u));
        const xx = -T * 0.35 + span * 0.42 * Math.sin(Math.PI * u) - span * 0.16 * smoothstep(0.72, 1, u);
        const leafW = span * 0.15 * Math.sin(Math.PI * Math.pow(u, 0.78)) + T * 0.22 * (1 - u);
        front.push(P(xx + leafW, yy));
        back.push(P(xx - leafW, yy));
        midrib.push(P(xx, yy));
      }
      quillons.push(dedupePoints(front.concat(back.slice().reverse())));
      if (orn > 0.2) strokes.push(midrib);
    }
    if (orn > 0.25) bossR = clamp(0.007 + orn * 0.012, 0.007, 0.017);
  } else if (archetype === "imperial") {
    outline = chamferBlock(T, B * 1.15, 1.3, 1.45);
    for (const sgn of [-1, 1]) {
      const rootY = B * 0.5;
      const step = (span - rootY) / 3.9;
      const eagle: Pt[] = [
        P(-T * 0.5, sgn * rootY),
        P(T * 0.6, sgn * (rootY + step * 0.18)),
        P(T * 0.5, sgn * (rootY + step * 0.85)),
        P(T * 0.34, sgn * (rootY + step * 1.55)),
        P(T * 0.16, sgn * (rootY + step * 2.25)),
        P(-T * 0.02, sgn * span),
        P(-T * 0.28, sgn * (span - step * 0.2)),
      ];
      let y = span - step * 0.2;
      for (let k = 0; k < 3; k++) {
        eagle.push(P(-T * 0.34 - step * 1.05, sgn * (y - step * 0.42)));
        eagle.push(P(-T * 0.2, sgn * (y - step * 0.78)));
        y -= step * 0.78;
      }
      eagle.push(P(-T * 0.55, sgn * (rootY + step * 0.25)));
      quillons.push(dedupePoints(eagle));
    }
    // Crown crest behind the guard plate (heraldic, symmetric).
    quillons.push(dedupePoints([
      P(-T * 1.2, -B * 0.85),
      P(-T * 2.1, -B * 1.35),
      P(-T * 1.85, -B * 0.45),
      P(-T * 2.9, -B * 0.2),
      P(-T * 2.1, 0),
      P(-T * 2.9, B * 0.2),
      P(-T * 1.85, B * 0.45),
      P(-T * 2.1, B * 1.35),
      P(-T * 1.2, B * 0.85),
    ]));
    if (orn > 0.2) {
      strokes.push([P(-T * 0.35, -B * 0.5), P(T * 0.45, 0), P(-T * 0.35, B * 0.5)]);
      strokes.push([P(-T * 0.5, -B * 0.82), P(-T * 0.5, B * 0.82)]);
    }
    bossR = clamp(0.01 + orn * 0.008, 0.01, 0.019);
  } else {
    // runic: heavy geometric monolith with a vertical rune channel.
    const hx = T * 2.4;
    const hy = span * 0.9;
    outline = dedupePoints([
      P(hx, -hy * 0.55),
      P(hx * 0.72, -hy),
      P(-hx * 0.72, -hy),
      P(-hx, -hy * 0.55),
      P(-hx, hy * 0.55),
      P(-hx * 0.72, hy),
      P(hx * 0.72, hy),
      P(hx, hy * 0.55),
    ]);
    strokes.push([
      P(-T * 0.35, -hy * 0.72),
      P(T * 0.35, -hy * 0.4),
      P(-T * 0.35, 0),
      P(T * 0.35, hy * 0.4),
      P(-T * 0.35, hy * 0.72),
    ]);
    strokes.push([P(-hx * 0.55, -hy * 0.82), P(hx * 0.55, -hy * 0.82)]);
    strokes.push([P(-hx * 0.55, hy * 0.82), P(hx * 0.55, hy * 0.82)]);
  }

  const langets = buildLangets(genome, blade, T);

  // Report the extent actually drawn, never more.
  let extent = 0;
  const measure = (pts: Pt[]) => {
    for (let i = 0; i < pts.length; i++) extent = Math.max(extent, Math.abs(pts[i].y));
  };
  measure(outline);
  for (const limb of quillons) measure(limb);
  for (const stroke of strokes) measure(stroke);
  for (const langet of langets) measure(langet);
  extent = clamp(extent, 0.02, 0.26);

  const boss = bossR > 0
    ? { x: q(T * 0.05), y: 0, r: q(clamp(bossR, 0.005, Math.min(0.02, B * 0.8, extent * 0.25))) }
    : null;
  const plating = (g.plating ?? "steel") as GuardGeometry["plating"];

  return {
    outline: dedupePoints(outline),
    quillons: quillons.map(dedupePoints),
    strokes: strokes.map(dedupePoints),
    boss,
    langets: langets.map(dedupePoints),
    plating,
    span: q(extent),
  };
}

// ---------------------------------------------------------------------------
// Grip
// ---------------------------------------------------------------------------

function buildGrip(genome: WeaponVisualGenome): GripGeometry {
  const g = genome.mount.grip;
  const length = clamp(num(g.lengthUnits, 0.22), 0.12, 0.4);
  const half = clamp(num(g.halfWidth, 0.026), 0.012, 0.04);
  const taper = clamp01(num(g.taper, 0.08));
  const x0 = -0.006;
  const x1 = -(0.006 + length);
  const halfAt = (v: number): number => {
    const u = clamp01(v);
    const body = half * (1 - taper * 0.85 * u);
    const swell = half * 0.06 * Math.sin(Math.PI * u);
    return Math.max(0.006, body + swell);
  };

  const steps = 12;
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = i / steps;
    const x = mix(x0, x1, v);
    const h = halfAt(v);
    top.push(P(x, -h));
    bottom.push(P(x, h));
  }
  const hEnd = halfAt(1);
  const backCap = [
    P(x1 - hEnd * 0.3, -hEnd * 0.82),
    P(x1 - hEnd * 0.42, 0),
    P(x1 - hEnd * 0.3, hEnd * 0.82),
  ];
  const outline = dedupePoints(top.concat(backCap, bottom.slice().reverse()));

  const ribCount = clamp(Math.round(num(g.ribCount, 8)), 3, 20);
  const ribSlant = clamp(num(g.ribSlant, 0), -0.6, 0.6);
  const ribs: Pt[][] = [];
  for (let i = 0; i < ribCount; i++) {
    const v = (i + 0.5) / ribCount;
    const xv = mix(x0, x1, v);
    const hv = halfAt(v);
    const slant = ribSlant * (length / Math.max(4, ribCount)) * 2.4;
    const rib: Pt[] = [];
    for (let k = 0; k <= 4; k++) {
      const sv = k / 4;
      const yy = mix(-hv * 0.95, hv * 0.95, sv);
      const xx = xv + slant * (sv - 0.5) + hv * 0.12 * Math.sin(Math.PI * sv);
      rib.push(P(xx, yy));
    }
    ribs.push(rib);
  }

  const ferruleCount = clamp(Math.round(num(g.ferruleCount, 1)), 1, 2);
  const bandWidth = clamp(length * 0.06, 0.006, 0.016);
  const ferruleAt = (xStart: number): Pt[] => {
    const v = clamp01((xStart - x0) / (x1 - x0));
    const h = halfAt(v) + 0.0014;
    const xEnd = xStart - bandWidth;
    return dedupePoints([
      P(xStart, -h * 0.78),
      P(xStart - bandWidth * 0.22, -h),
      P(xEnd + bandWidth * 0.22, -h),
      P(xEnd, -h * 0.78),
      P(xEnd, h * 0.78),
      P(xEnd + bandWidth * 0.22, h),
      P(xStart - bandWidth * 0.22, h),
      P(xStart, h * 0.78),
    ]);
  };
  const ferrules: Pt[][] = [ferruleAt(x0 + 0.001)];
  if (ferruleCount >= 2) ferrules.push(ferruleAt(x1 + bandWidth * 1.6));

  return {
    outline,
    ribs,
    ferrules,
    length: q(length),
  };
}

// ---------------------------------------------------------------------------
// Pommel
// ---------------------------------------------------------------------------

function buildPommel(genome: WeaponVisualGenome, grip: GripGeometry): PommelGeometry {
  const p = genome.mount.pommel;
  const radius = clamp(num(p.radius, 0.038), 0.024, 0.062);
  const cx = -(grip.length + radius * 0.85);
  const at = (u: number, v: number): Pt => P(cx + u * radius, v * radius);
  const strokes: Pt[][] = [];
  let outline: Pt[] = [];

  if (p.archetype === "disc") {
    outline = ellipseLoop(cx, 0, radius * 0.85, radius, 22);
    strokes.push(closedStroke(ellipseLoop(cx, 0, radius * 0.56, radius * 0.66, 16)));
    strokes.push([at(-0.55, 0), at(0.55, 0)]);
  } else if (p.archetype === "sphere") {
    outline = ellipseLoop(cx, 0, radius * 0.98, radius, 22);
    strokes.push(ellipseArc(cx, -radius * 0.3, radius * 0.8, radius * 0.32, 12, Math.PI, TAU));
    strokes.push(ellipseArc(cx, radius * 0.3, radius * 0.8, radius * 0.32, 12, 0, Math.PI));
  } else if (p.archetype === "wolf") {
    outline = dedupePoints([
      at(0.15, -0.45),
      at(-0.2, -1),
      at(-0.5, -0.72),
      at(-0.48, -0.35),
      at(-1.05, -0.4),
      at(-1.5, -0.12),
      at(-1.45, 0),
      at(-1.5, 0.12),
      at(-1.05, 0.4),
      at(-0.48, 0.35),
      at(-0.5, 0.72),
      at(-0.2, 1),
      at(0.15, 0.45),
    ]);
    strokes.push([at(-0.68, -0.18), at(-0.95, -0.1), at(-1.06, 0)]);
    strokes.push([at(-0.9, 0.12), at(-0.62, 0.3), at(-0.3, 0.38)]);
  } else if (p.archetype === "cross") {
    outline = dedupePoints([
      at(0.7, 0),
      at(0.16, -0.26),
      at(0, -1.1),
      at(-0.16, -0.26),
      at(-0.7, 0),
      at(-0.16, 0.26),
      at(0, 1.1),
      at(0.16, 0.26),
    ]);
    strokes.push([at(-0.32, 0), at(0.32, 0)]);
    strokes.push([at(0, -0.5), at(0, 0.5)]);
  } else if (p.archetype === "crescent") {
    const outer = ellipseArc(cx + radius * 0.15, 0, radius * 0.95, radius, 14, -Math.PI / 2, Math.PI / 2);
    const inner = ellipseArc(cx + radius * 0.15, 0, radius * 0.6, radius * 0.6, 12, Math.PI / 2, -Math.PI / 2);
    outline = dedupePoints(outer.concat(inner));
    strokes.push(ellipseArc(cx - radius * 0.05, 0, radius * 0.78, radius * 0.8, 12, -Math.PI / 2, Math.PI / 2));
  } else if (p.archetype === "elven") {
    outline = cubicPoints(
      at(0.35, 0),
      at(0.2, -0.85),
      at(-0.75, -0.7),
      at(-1.25, 0),
      14,
    ).concat(cubicPoints(
      at(-1.25, 0),
      at(-0.75, 0.7),
      at(0.2, 0.85),
      at(0.35, 0),
      13,
    ));
    outline = dedupePoints(outline);
    strokes.push([at(0.1, -0.3), at(-0.5, -0.45)]);
    strokes.push([at(0.1, 0.3), at(-0.5, 0.45)]);
  } else if (p.archetype === "crown") {
    outline = dedupePoints([
      at(0.35, -0.55),
      at(-0.1, -0.65),
      at(-0.6, -1),
      at(-0.45, -0.35),
      at(-1.25, -0.12),
      at(-1.35, 0),
      at(-1.25, 0.12),
      at(-0.45, 0.35),
      at(-0.6, 1),
      at(-0.1, 0.65),
      at(0.35, 0.55),
    ]);
    strokes.push([at(0.02, -0.52), at(0.02, 0.52)]);
    strokes.push([at(-0.9, 0), at(-0.4, 0)]);
  } else {
    // knot: interlaced ring
    outline = ellipseLoop(cx, 0, radius, radius * 0.96, 22);
    strokes.push(ellipseArc(cx, 0, radius * 0.62, radius * 0.62, 18, 0, TAU));
    strokes.push([
      at(-0.62, -0.62), at(0, -0.62), at(0.62, 0), at(0.62, 0.62), at(0, 0.62), at(-0.62, 0), at(-0.62, -0.62),
    ]);
  }

  let gem: { x: number; y: number; r: number } | null = null;
  if (p.gem) {
    const gemScale = p.archetype === "elven" ? 0.36 : 0.3;
    gem = { x: q(cx + radius * 0.08), y: 0, r: q(Math.max(0.006, radius * gemScale)) };
  }

  return { outline, gem, strokes };
}

// ---------------------------------------------------------------------------
// Bounds and sampling
// ---------------------------------------------------------------------------

function computeBounds(geo: {
  blade: BladeGeometry;
  guard: GuardGeometry;
  grip: GripGeometry;
  pommel: PommelGeometry;
}): WeaponBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const visit = (p: Pt): void => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  };
  const visitAll = (pts: Pt[] | null | undefined): void => {
    if (!pts) return;
    for (let i = 0; i < pts.length; i++) visit(pts[i]);
  };
  const visitCircle = (c: { x: number; y: number; r: number } | null): void => {
    if (!c) return;
    visit({ x: c.x - c.r, y: c.y - c.r });
    visit({ x: c.x + c.r, y: c.y + c.r });
  };

  visitAll(geo.blade.outline);
  visitAll(geo.blade.spine);
  visitAll(geo.blade.edge);
  visit(geo.blade.tip.base);
  visit(geo.blade.tip.apex);
  if (geo.blade.tip.shoulder) visit(geo.blade.tip.shoulder);
  if (geo.blade.fuller) {
    visitAll(geo.blade.fuller.inner);
    visitAll(geo.blade.fuller.outer);
  }
  for (const band of geo.blade.bevels) {
    visitAll(band.inner);
    visitAll(band.outer);
  }
  visitAll(geo.blade.ridgeline);
  for (const st of geo.blade.stations) {
    visit({ x: st.cx, y: st.cy });
    visit({ x: st.cx - st.halfSpine, y: st.cy });
    visit({ x: st.cx + st.halfEdge, y: st.cy });
  }

  visitAll(geo.guard.outline);
  for (const limb of geo.guard.quillons) visitAll(limb);
  for (const stroke of geo.guard.strokes) visitAll(stroke);
  for (const langet of geo.guard.langets) visitAll(langet);
  visitCircle(geo.guard.boss);

  visitAll(geo.grip.outline);
  for (const rib of geo.grip.ribs) visitAll(rib);
  for (const ferrule of geo.grip.ferrules) visitAll(ferrule);

  visitAll(geo.pommel.outline);
  for (const stroke of geo.pommel.strokes) visitAll(stroke);
  visitCircle(geo.pommel.gem);

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: -0.05, maxX: 1, maxY: 0.05, width: 1, height: 0.1 };
  }
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  return {
    minX: q(minX),
    minY: q(minY),
    maxX: q(maxX),
    maxY: q(maxY),
    width: q(width),
    height: q(height),
  };
}

function sampleStation(stations: BladeStation[], t: number): BladeStation {
  const n = stations.length;
  const clamped = clamp(num(t, 0), 0, 1);
  const pos = clamped * (n - 1);
  const i0 = Math.min(n - 1, Math.floor(pos));
  const i1 = Math.min(n - 1, i0 + 1);
  const f = pos - i0;
  const a = stations[i0];
  const b = stations[i1];
  const qm = (x: number, y: number): number => q(mix(x, y, f));
  let tx = mix(a.tangent.x, b.tangent.x, f);
  let ty = mix(a.tangent.y, b.tangent.y, f);
  const len = Math.hypot(tx, ty) || 1;
  tx /= len;
  ty /= len;
  return {
    t: q5(clamped),
    cx: qm(a.cx, b.cx),
    cy: qm(a.cy, b.cy),
    halfSpine: qm(a.halfSpine, b.halfSpine),
    halfEdge: qm(a.halfEdge, b.halfEdge),
    halfWidth: qm(a.halfWidth, b.halfWidth),
    tangent: { x: q(tx), y: q(ty) },
    normal: { x: q(-ty), y: q(tx) },
    thickness: qm(a.thickness, b.thickness),
  };
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

/**
 * Build the complete deterministic weapon geometry.
 *
 * Pure: no DOM, no randomness, no clock. Every coordinate is quantised to four
 * decimals, so identical genomes always produce bit-identical geometry.
 */
export function buildWeaponGeometry(genome: WeaponVisualGenome): WeaponGeometry {
  const blade = buildBlade(genome);
  const guard = buildGuard(genome, blade);
  const grip = buildGrip(genome);
  const pommel = buildPommel(genome, grip);
  const bounds = computeBounds({ blade, guard, grip, pommel });
  const L = clamp(num(genome.silhouette.bladeLengthUnits, 1), 0.5, 1.55);
  const stations = blade.stations;
  return {
    blade,
    guard,
    grip,
    pommel,
    bounds,
    bladeLength: q(L),
    stationAt: (t: number) => sampleStation(stations, t),
  };
}
