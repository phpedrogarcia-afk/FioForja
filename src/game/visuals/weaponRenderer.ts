// FioForja — WEAPON DNA RENDERER
//
// Orchestrates the layered composition of a weapon from its visual genome.
// The renderer owns: geometry caching, the viewport transform, layer order,
// occlusion, the incandescent forge state and the final silhouette pass.
// It owns NO art language of its own: materials, ornamentation and quality
// marks are separate modules, geometry is separate, the genome is separate.
//
// Layer order (aesthetic bible: geometry before glow, occlusion before effects):
//   shadow -> structure -> base -> bevels -> fuller -> pattern -> defects
//   -> inscriptions -> guard -> grip -> pommel -> reflections
//
// Determinism: the same genome always yields the same geometry. Geometry is
// built once and cached by a numeric fingerprint of the visual-relevant genome
// sections, so repeated frames never rebuild paths.

import { clamp, clamp01, lerp } from "./math.ts";
import type {
  BladeStation,
  DrawWeaponOptions,
  Pt,
  WeaponGeometry,
  WeaponLayer,
  WeaponViewport,
} from "./types.ts";
import { deriveWeaponVisualGenome, weaponVisualSeed } from "./weaponGenome.ts";
import type { WeaponVisualGenome, WeaponVisualSource } from "./weaponGenome.ts";
import {
  bandPath,
  bladePath,
  buildWeaponGeometry,
  guardPath,
  gripPath,
  pommelPath,
} from "./geometry.ts";
import {
  alloyPaint,
  paintBevels,
  paintBladeBase,
  paintBladeHighlight,
  paintFuller,
  paintGripMaterial,
  paintGuardMetal,
  paintOxidation,
  paintPommelMetal,
  paintSteelPattern,
} from "./materials.ts";
import {
  paintGripInlays,
  paintGuardOrnament,
  paintInscription,
  paintPommelOrnament,
} from "./ornamentation.ts";
import {
  paintCracks,
  paintEdgeCondition,
  paintForgeDefects,
  paintMakerMark,
} from "./qualityMarks.ts";

// ---------------------------------------------------------------------------
// Geometry cache
// ---------------------------------------------------------------------------

interface CachedWeapon {
  genome: WeaponVisualGenome;
  geometry: WeaponGeometry;
  used: number;
}

const GEOMETRY_CACHE_LIMIT = 240;
const geometryCache = new Map<number, CachedWeapon>();
let cacheClock = 0;

/** FNV-1a accumulator over the genome fields that actually move geometry. */
function fingerprintGeometry(genome: WeaponVisualGenome): number {
  let h = 0x811c9dc5;
  const mix = (n: number) => {
    const q = Math.round(n * 10000) | 0;
    h ^= q & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (q >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (q >>> 16) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (q >>> 24) & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  const s = genome.silhouette;
  mix(s.bladeLengthUnits);
  mix(s.baseHalfWidth);
  mix(s.midHalfWidth);
  mix(s.tipHalfWidth);
  mix(s.distalTaper);
  mix(s.curvature);
  mix(s.curveExponent);
  mix(s.curveStart);
  mix(s.asymmetry);
  mix(s.tipLengthRatio);
  mix(s.ricassoRatio);
  mix(s.ricassoHalfWidth);
  mix(s.wobbleAmp);
  mix(s.wobblePhase);
  h = Math.imul(h ^ (s.edgeProfile.length + 31 * s.spineProfile.length), 0x01000193);
  h = Math.imul(h ^ (s.tipProfile.length + 17 * s.ricassoRatio), 0x01000193);
  const st = genome.structure;
  mix(st.spineHeight);
  mix(st.ridge.prominence);
  mix(st.fuller.start);
  mix(st.fuller.end);
  mix(st.fuller.halfWidth);
  mix(st.fuller.offset);
  mix(st.fuller.depth);
  mix(st.fuller.enabled ? 1 : 0);
  mix(st.fuller.double ? 1 : 0);
  mix(st.bevels.count);
  mix(st.bevels.width);
  mix(st.bevels.prominence);
  mix(st.rootReinforcement);
  h = Math.imul(h ^ st.fuller.style.length, 0x01000193);
  const m = genome.mount;
  mix(m.guard.span);
  mix(m.guard.thickness);
  mix(m.guard.quillonCurve);
  mix(m.guard.ornament);
  mix(m.guard.langets ? 1 : 0);
  mix(m.grip.lengthUnits);
  mix(m.grip.halfWidth);
  mix(m.grip.taper);
  mix(m.grip.ribCount);
  mix(m.grip.ribSlant);
  mix(m.grip.ferruleCount);
  mix(m.pommel.radius);
  mix(m.pommel.gem ? 1 : 0);
  h = Math.imul(h ^ m.guard.archetype.length, 0x01000193);
  h = Math.imul(h ^ m.pommel.archetype.length, 0x01000193);
  h = Math.imul(h ^ m.grip.wrapId.length, 0x01000193);
  mix(genome.individuality.subSeeds.blade % 100000);
  return h >>> 0;
}

export interface PreparedWeapon {
  genome: WeaponVisualGenome;
  geometry: WeaponGeometry;
  fingerprint: number;
}

export function prepareWeapon(source: WeaponVisualSource): PreparedWeapon {
  const genome = deriveWeaponVisualGenome(source);
  return prepareFromGenome(genome);
}

export function prepareFromGenome(genome: WeaponVisualGenome): PreparedWeapon {
  const fingerprint = fingerprintGeometry(genome);
  const cached = geometryCache.get(fingerprint);
  if (cached) {
    cached.used = ++cacheClock;
    return { genome, geometry: cached.geometry, fingerprint };
  }
  const geometry = buildWeaponGeometry(genome);
  geometryCache.set(fingerprint, { genome, geometry, used: ++cacheClock });
  if (geometryCache.size > GEOMETRY_CACHE_LIMIT) {
    let oldestKey = -1;
    let oldestUse = Infinity;
    for (const [key, value] of geometryCache) {
      if (value.used < oldestUse) {
        oldestUse = value.used;
        oldestKey = key;
      }
    }
    if (oldestKey >= 0) geometryCache.delete(oldestKey);
  }
  return { genome, geometry, fingerprint };
}

export function clearWeaponGeometryCache(): void {
  geometryCache.clear();
  cacheClock = 0;
}

export function weaponGeometryCacheSize(): number {
  return geometryCache.size;
}

/** Unit-space bounds of the whole weapon (blade + hilt), for layout maths. */
export function weaponVisualBounds(genome: WeaponVisualGenome): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  hiltLength: number;
} {
  const prepared = prepareFromGenome(genome);
  const geo = prepared.geometry;
  return {
    minX: geo.bounds.minX,
    maxX: geo.bounds.maxX,
    minY: geo.bounds.minY,
    maxY: geo.bounds.maxY,
    hiltLength: Math.max(0, -minXOf(geo.pommel.outline)),
  };
}

/** Convenience for callers that only need the derived genome. */
export function weaponGenomeFor(source: WeaponVisualSource): WeaponVisualGenome {
  return deriveWeaponVisualGenome(source);
}

/** Deterministic identity used by the lab, tooltips and tests. */
export function weaponVisualSignature(source: WeaponVisualSource): string {
  return deriveWeaponVisualGenome(source).individuality.signature;
}

export function weaponSeedFor(source: WeaponVisualSource): number {
  return weaponVisualSeed(source);
}

// ---------------------------------------------------------------------------
// Heat state (forge preview). Reused semantics from the legacy renderer.
// ---------------------------------------------------------------------------

interface HeatState {
  active: boolean;
  glow: string;
  core: string;
  edge: string;
  metalMod: number;
}

function heatState(heat: number): HeatState {
  const h = clamp01(heat);
  if (h < 0.2) return { active: false, glow: "rgba(0,0,0,0)", core: "rgba(160,40,20,0.1)", edge: "rgba(30,20,15,0.9)", metalMod: 1 };
  if (h < 0.45) {
    const t = (h - 0.2) / 0.25;
    return { active: true, glow: "rgba(180,40,15," + (0.15 + t * 0.25).toFixed(3) + ")", core: "rgba(220,70,25," + (0.4 + t * 0.4).toFixed(3) + ")", edge: "rgba(80,25,15,0.9)", metalMod: 1 - t * 0.2 };
  }
  if (h < 0.75) {
    const t = (h - 0.45) / 0.3;
    return { active: true, glow: "rgba(255,120,30," + (0.35 + t * 0.35).toFixed(3) + ")", core: "rgba(255,185,60," + (0.75 + t * 0.25).toFixed(3) + ")", edge: "rgba(180,50,20,0.95)", metalMod: 0.8 - t * 0.4 };
  }
  const t = (h - 0.75) / 0.25;
  return { active: true, glow: "rgba(255,220,140," + (0.6 + t * 0.35).toFixed(3) + ")", core: "rgba(255,250,210,0.95)", edge: "rgba(255,140,40,0.95)", metalMod: 0.4 - t * 0.35 };
}

// ---------------------------------------------------------------------------
// Public draw entry points
// ---------------------------------------------------------------------------

export function drawWeaponFromSword(
  ctx: CanvasRenderingContext2D,
  source: WeaponVisualSource,
  viewport: WeaponViewport,
  options: DrawWeaponOptions = {},
): void {
  drawWeaponGenome(ctx, deriveWeaponVisualGenome(source), viewport, options);
}

export function drawWeaponGenome(
  ctx: CanvasRenderingContext2D,
  genome: WeaponVisualGenome,
  viewport: WeaponViewport,
  options: DrawWeaponOptions = {},
): void {
  const { geometry } = prepareFromGenome(genome);
  const angle = viewport.angle ?? -Math.PI / 2.15;
  const scale = viewport.lengthPx / Math.max(geometry.bladeLength, 1e-4);
  const layers = normalizeLayers(options.layers);

  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const heat = heatState(options.heat ?? 0);
  const lightOffset = clamp01(options.lightOffset ?? 0.52);
  const runicCharge = clamp01(options.runicCharge ?? 0);

  if (shouldDraw(layers, "shadow") && options.showShadow !== false) {
    drawGroundShadow(ctx, geometry);
  }

  drawBladeLayers(ctx, genome, geometry, layers, heat, lightOffset, runicCharge);
  drawHiltLayers(ctx, genome, geometry, layers);
  drawFinalPass(ctx, genome, geometry, layers, heat, lightOffset);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Layer helpers
// ---------------------------------------------------------------------------

const ALL_LAYERS: WeaponLayer[] = [
  "shadow", "structure", "base", "bevels", "fuller", "pattern", "defects",
  "inscriptions", "guard", "grip", "pommel", "reflections",
];

function normalizeLayers(layers: DrawWeaponOptions["layers"]): WeaponLayer[] {
  if (!layers || layers === "all") return ALL_LAYERS;
  return layers;
}

function shouldDraw(layers: WeaponLayer[], layer: WeaponLayer): boolean {
  return layers.indexOf(layer) !== -1;
}

function minXOf(points: readonly Pt[]): number {
  let min = Infinity;
  for (const p of points) if (p.x < min) min = p.x;
  return Number.isFinite(min) ? min : 0;
}

function maxYOf(points: readonly Pt[]): number {
  let max = -Infinity;
  for (const p of points) if (p.y > max) max = p.y;
  return Number.isFinite(max) ? max : 0;
}

function minYOf(points: readonly Pt[]): number {
  let min = Infinity;
  for (const p of points) if (p.y < min) min = p.y;
  return Number.isFinite(min) ? min : 0;
}

/** Half height of a closed outline around y = 0 (used for hilt thickness). */
function outlineHalfHeight(points: readonly Pt[]): number {
  return Math.max(0, (maxYOf(points) - minYOf(points)) * 0.5);
}

/**
 * Ground shadow: a displaced, translucent copy of the real silhouette. This is
 * the cheapest way to read depth in Canvas 2D (shadowBlur is not affected by the
 * CTM, so a scaled shape would need a device-space blur we cannot budget).
 */
function drawGroundShadow(ctx: CanvasRenderingContext2D, geo: WeaponGeometry): void {
  ctx.save();
  ctx.translate(geo.bladeLength * 0.014, geo.bladeLength * 0.022);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  bladePath(ctx, geo);
  ctx.fill();
  guardPath(ctx, geo);
  ctx.fill();
  gripPath(ctx, geo);
  ctx.fill();
  pommelPath(ctx, geo);
  ctx.fill();
  ctx.restore();
}

function drawBladeLayers(
  ctx: CanvasRenderingContext2D,
  genome: WeaponVisualGenome,
  geo: WeaponGeometry,
  layers: WeaponLayer[],
  heat: HeatState,
  lightOffset: number,
  runicCharge: number,
): void {
  // 1. Structural underlay: the dark body behind every material pass. Reads as
  //    the "back" of the section and guarantees silhouette legibility.
  if (shouldDraw(layers, "structure")) {
    ctx.save();
    bladePath(ctx, geo);
    const paint = alloyPaint(genome);
    ctx.fillStyle = paint.deep;
    ctx.fill();
    ctx.strokeStyle = "rgba(8,7,6,0.85)";
    ctx.lineWidth = geo.bladeLength * 0.0045;
    ctx.stroke();
    ctx.restore();
  }

  if (shouldDraw(layers, "base") || heat.active) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    if (heat.active) {
      // Incandescent body: the metal hides under the heat, exactly like the
      // legacy forge view, but the geometry still carries the shape.
      paintHeatBody(ctx, geo, heat);
    } else {
      paintBladeBase(ctx, geo, genome);
    }
    ctx.restore();
  }

  if (!heat.active && shouldDraw(layers, "bevels")) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintBevels(ctx, geo, genome);
    ctx.restore();
  }

  if (!heat.active && shouldDraw(layers, "fuller") && geo.blade.fuller) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintFuller(ctx, geo, genome);
    ctx.restore();
  }

  if (shouldDraw(layers, "pattern")) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintSteelPattern(ctx, geo, genome);
    if (!heat.active) paintOxidation(ctx, geo, genome);
    ctx.restore();
  }

  if (!heat.active && shouldDraw(layers, "defects")) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintForgeDefects(ctx, geo, genome);
    paintCracks(ctx, geo, genome);
    paintEdgeCondition(ctx, geo, genome);
    paintMakerMark(ctx, geo, genome);
    ctx.restore();
  }

  if (shouldDraw(layers, "inscriptions")) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintInscription(ctx, geo, genome, { runicCharge, heat: heat.active ? 1 : 0 });
    ctx.restore();
  }
}

function drawHiltLayers(
  ctx: CanvasRenderingContext2D,
  genome: WeaponVisualGenome,
  geo: WeaponGeometry,
  layers: WeaponLayer[],
): void {
  // The guard sits in front of the blade root: a soft contact shadow sells the
  // depth ordering.
  if (shouldDraw(layers, "guard")) {
    ctx.save();
    ctx.translate(geo.bladeLength * 0.006, geo.bladeLength * 0.008);
    guardPath(ctx, geo);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    guardPath(ctx, geo);
    ctx.clip();
    paintGuardMetal(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    guardPath(ctx, geo);
    ctx.clip();
    paintGuardOrnament(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    guardPath(ctx, geo);
    ctx.strokeStyle = "rgba(10,8,6,0.7)";
    ctx.lineWidth = geo.bladeLength * 0.0034;
    ctx.stroke();
    ctx.restore();
  }

  if (shouldDraw(layers, "grip")) {
    ctx.save();
    gripPath(ctx, geo);
    ctx.clip();
    paintGripMaterial(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    gripPath(ctx, geo);
    ctx.clip();
    paintGripInlays(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    gripPath(ctx, geo);
    ctx.strokeStyle = "rgba(10,8,6,0.65)";
    ctx.lineWidth = geo.bladeLength * 0.003;
    ctx.stroke();
    ctx.restore();
  }

  if (shouldDraw(layers, "pommel")) {
    ctx.save();
    pommelPath(ctx, geo);
    ctx.clip();
    paintPommelMetal(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    pommelPath(ctx, geo);
    ctx.clip();
    paintPommelOrnament(ctx, geo, genome);
    ctx.restore();

    ctx.save();
    pommelPath(ctx, geo);
    ctx.strokeStyle = "rgba(10,8,6,0.7)";
    ctx.lineWidth = geo.bladeLength * 0.003;
    ctx.stroke();
    ctx.restore();
  }
}

function drawFinalPass(
  ctx: CanvasRenderingContext2D,
  genome: WeaponVisualGenome,
  geo: WeaponGeometry,
  layers: WeaponLayer[],
  heat: HeatState,
  lightOffset: number,
): void {
  if (!heat.active && shouldDraw(layers, "reflections")) {
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    paintBladeHighlight(ctx, geo, genome, lightOffset);
    ctx.restore();
  }

  if (heat.active) {
    // Controlled heat bloom, clipped to the silhouette so the weapon never
    // becomes a glow blob.
    ctx.save();
    bladePath(ctx, geo);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = heat.glow;
    ctx.fillRect(-geo.bladeLength * 0.1, -geo.bladeLength * 0.2, geo.bladeLength * 1.2, geo.bladeLength * 0.4);
    ctx.restore();
  }
}

function paintHeatBody(ctx: CanvasRenderingContext2D, geo: WeaponGeometry, heat: HeatState): void {
  const b = geo.bounds;
  const g = ctx.createLinearGradient(0, -b.height * 0.5, 0, b.height * 0.5);
  g.addColorStop(0, heat.edge);
  g.addColorStop(0.35, heat.core);
  g.addColorStop(0.65, heat.core);
  g.addColorStop(1, heat.edge);
  ctx.fillStyle = g;
  ctx.fillRect(b.minX - 0.1, b.minY - 0.1, b.width + 0.2, b.height + 0.2);
}

// ---------------------------------------------------------------------------
// Measurement API used by screens and the visual lab
// ---------------------------------------------------------------------------

/**
 * Recommended viewport for a weapon drawn inside a box, keeping the whole
 * weapon (hilt included) visible. Anchors the guard so that the weapon reads
 * diagonally like the legacy renderer.
 */
export function fitWeaponViewport(
  genome: WeaponVisualGenome,
  boxWidth: number,
  boxHeight: number,
  angle = -Math.PI / 2.15,
): WeaponViewport {
  const prepared = prepareFromGenome(genome);
  const bounds = prepared.geometry.bounds;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const projectedW = spanX * cos + spanY * sin;
  const projectedH = spanX * sin + spanY * cos;
  const scale = Math.min(boxWidth / Math.max(projectedW, 1e-4), boxHeight / Math.max(projectedH, 1e-4)) * 0.92;
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cy = (bounds.minY + bounds.maxY) * 0.5;
  // Rotate the centre offset back into screen space.
  const ox = cx * Math.cos(angle) - cy * Math.sin(angle);
  const oy = cx * Math.sin(angle) + cy * Math.cos(angle);
  return { x: boxWidth * 0.5 - ox * scale, y: boxHeight * 0.5 - oy * scale, lengthPx: prepared.geometry.bladeLength * scale, angle };
}

/** Unit-space point at a given station and lateral fraction (-1 spine .. +1 edge). */
export function bladePointAt(geo: WeaponGeometry, t: number, lateral: number): Pt {
  const st: BladeStation = geo.stationAt(t);
  const half = lateral < 0 ? st.halfSpine : st.halfEdge;
  return { x: st.cx + st.normal.x * half * lateral, y: st.cy + st.normal.y * half * lateral };
}

export { bandPath, lerp };
