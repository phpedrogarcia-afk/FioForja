// Pure data contract shared by the Weapon Visual DNA modules.
// No DOM references, no geometry math: this file is imported by geometry,
// materials, ornamentation, qualityMarks and the renderer so that every module
// agrees on the shape of the data flowing between them.
//
// Coordinate system (unit space):
//   * The blade axis runs along +X from x = 0 (guard / ricasso) to x = bladeLength.
//   * -Y is the spine side, +Y is the cutting edge side.
//   * The grip and pommel live at negative X (behind the guard).
//   * One unit ~= one blade length, so every size is a fraction of the weapon.

export interface Pt {
  x: number;
  y: number;
}

export type CurveSegment =
  | { kind: "line"; to: Pt }
  | { kind: "quad"; c: Pt; to: Pt }
  | { kind: "cubic"; c1: Pt; c2: Pt; to: Pt };

/** Cross-section sample along the blade. */
export interface BladeStation {
  /** 0 at the guard, 1 at the very tip. */
  t: number;
  /** Centre-line position in unit space. */
  cx: number;
  cy: number;
  /** Half width toward the spine (-Y) and toward the edge (+Y). */
  halfSpine: number;
  halfEdge: number;
  /** halfSpine + halfEdge. */
  halfWidth: number;
  /** Unit tangent and normal of the centre line. */
  tangent: Pt;
  normal: Pt;
  /** 0..1 relative material thickness, used to shade volume. */
  thickness: number;
}

/** A long band running along the blade (fuller, bevel facet, ridge highlight). */
export interface BandGeometry {
  /** Spine-side edge of the band, from base to tip. */
  inner: Pt[];
  /** Edge-side edge of the band, from base to tip. */
  outer: Pt[];
  /** 0..1: how deep the band reads in the metal. */
  depth: number;
}

export interface TipGeometry {
  /** Start of the tip geometry on the blade axis. */
  base: Pt;
  /** The sharpest point of the weapon. */
  apex: Pt;
  /** Where along the blade (0..1) the tip section begins. */
  startT: number;
  profile: string;
  /** Secondary geometry: false edge / clipped spine / kissaki slope. */
  shoulder: Pt | null;
}

export interface GuardGeometry {
  /** Closed silhouette of the guard. */
  outline: Pt[];
  /** Decorative limbs (quillons, wings, leaves). Each is a closed path. */
  quillons: Pt[][];
  /** Open decorative strokes (grooves, wire, etching). */
  strokes: Pt[][];
  boss: { x: number; y: number; r: number } | null;
  langets: Pt[][];
  plating: "steel" | "iron" | "bronze" | "gold" | "silver" | "dark-iron" | "ivory";
  /** Guard extent across the blade, in unit space (half span each way). */
  span: number;
}

export interface GripGeometry {
  outline: Pt[];
  /** Ribs / binding strokes (open polylines). */
  ribs: Pt[][];
  /** Metal ferrules as closed bands. */
  ferrules: Pt[][];
  /** Grip length in unit space. */
  length: number;
}

export interface PommelGeometry {
  outline: Pt[];
  gem: { x: number; y: number; r: number } | null;
  strokes: Pt[][];
}

export interface WeaponBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BladeGeometry {
  /** At least 33 samples with ascending t from 0 to 1. */
  stations: BladeStation[];
  /** -Y side outline (base -> tip). */
  spine: Pt[];
  /** +Y side outline (base -> tip). */
  edge: Pt[];
  /** Closed silhouette, spine forward then edge back. */
  outline: Pt[];
  tip: TipGeometry;
  fuller: (BandGeometry & { style: string }) | null;
  bevels: BandGeometry[];
  ridgeline: Pt[] | null;
  ricasso: { t: number; halfWidth: number } | null;
}

export interface WeaponGeometry {
  blade: BladeGeometry;
  guard: GuardGeometry;
  grip: GripGeometry;
  pommel: PommelGeometry;
  bounds: WeaponBounds;
  bladeLength: number;
  /** Linear interpolation over the blade stations (t clamped to 0..1). */
  stationAt(t: number): BladeStation;
}

export interface WeaponViewport {
  /** Screen position of the guard / blade root. */
  x: number;
  y: number;
  /** Blade length in CSS pixels. */
  lengthPx: number;
  /** Rotation in radians. Defaults to a slight diagonal (-Math.PI / 2.15). */
  angle?: number;
}

export type WeaponLayer =
  | "shadow"
  | "structure"
  | "base"
  | "bevels"
  | "fuller"
  | "pattern"
  | "defects"
  | "inscriptions"
  | "guard"
  | "grip"
  | "pommel"
  | "reflections";

export interface DrawWeaponOptions {
  /** Restrict to a subset of the layer pipeline (debug / performance work). */
  layers?: WeaponLayer[] | "all";
  /** 0..1 forge heat: the layer pipeline switches to incandescent rendering. */
  heat?: number;
  /** 0..1 rune charge, controls the controlled emission inside the grooves. */
  runicCharge?: number;
  /** 0..1 horizontal light sweep position for the specular pass. */
  lightOffset?: number;
  /** Deterministic outline pass (card/gallery readability). */
  silhouette?: boolean;
  showShadow?: boolean;
}
