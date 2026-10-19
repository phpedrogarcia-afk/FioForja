// FioForja - Weapon DNA geometry: property/invariant tests.
//
// Run with:
//   node --experimental-strip-types --test src/game/visuals/geometry.test.ts
//
// Not snapshots: every invariant is checked over fixtures plus a deterministic
// 520-genome pseudo-random sweep (families x profiles x steels x mounts x
// qualities x forge outcomes x physical profiles x installed components).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLADE_STATION_COUNT, buildWeaponGeometry } from "./geometry.ts";
import { deriveWeaponVisualGenome } from "./weaponGenome.ts";
import { makeRng } from "./math.ts";
import { FAMILIES, PROFILES, STEELS, WRAPS, GUARDS, POMMELS, CANONICAL_PRESETS } from "../catalog.ts";
import type {
  InventoryComponent,
  PhysicalBladeProfile,
  RarityGrade,
  SwordDesign,
} from "../types.ts";
import type { WeaponVisualGenome, WeaponVisualSource } from "./weaponGenome.ts";
import type { Pt, WeaponGeometry } from "./types.ts";

const HERO_IDS = ["guarda_medieval", "cimitarra_damasco", "lua_silenciosa", "folha_aereth", "queda_asterion"];
const FAMILY_KEYS = Object.keys(FAMILIES) as Array<keyof typeof FAMILIES>;
const PROFILE_KEYS = Object.keys(PROFILES) as Array<keyof typeof PROFILES>;
const STEEL_KEYS = Object.keys(STEELS) as Array<keyof typeof STEELS>;
const WRAP_KEYS = Object.keys(WRAPS) as Array<keyof typeof WRAPS>;
const GUARD_KEYS = Object.keys(GUARDS) as Array<keyof typeof GUARDS>;
const POMMEL_KEYS = Object.keys(POMMELS) as Array<keyof typeof POMMELS>;
const RARITIES: RarityGrade[] = ["Comum", "Incomum", "Rara", "Épica", "Lendária", "Relíquia"];

const EPS = 1e-9;
const TAU = Math.PI * 2;

function presetDesign(id: string): SwordDesign {
  const preset = CANONICAL_PRESETS.find((entry) => entry.id === id);
  assert.ok(preset, "canonical preset " + id + " must exist");
  return { ...preset.design };
}

function isFinitePoint(point: Pt): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function samePoint(a: Pt, b: Pt): boolean {
  return Math.abs(a.x - b.x) <= 1e-9 && Math.abs(a.y - b.y) <= 1e-9;
}

function crossValue(origin: Pt, a: Pt, b: Pt): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function segmentsProperlyCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  if (samePoint(a, c) || samePoint(a, d) || samePoint(b, c) || samePoint(b, d)) return false;
  const d1 = crossValue(c, d, a);
  const d2 = crossValue(c, d, b);
  const d3 = crossValue(a, b, c);
  const d4 = crossValue(a, b, d);
  const threshold = 1e-9;
  const straddle1 = (d1 > threshold && d2 < -threshold) || (d1 < -threshold && d2 > threshold);
  const straddle2 = (d3 > threshold && d4 < -threshold) || (d3 < -threshold && d4 > threshold);
  return straddle1 && straddle2;
}

function assertNoConsecutiveDuplicates(points: Pt[], label: string): void {
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    assert.ok(
      Math.abs(current.x - next.x) > 1e-9 || Math.abs(current.y - next.y) > 1e-9,
      label + ": duplicate consecutive point at index " + i,
    );
  }
}

/** Closed-polygon simplicity check: no proper crossing between non-adjacent edges. */
function assertSimplePolygon(points: Pt[], label: string): void {
  const n = points.length;
  assert.ok(n >= 3, label + ": polygon needs >= 3 points, got " + n);
  assertNoConsecutiveDuplicates(points, label);
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1) continue;
      if (i === 0 && j === n - 1) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsProperlyCross(a1, a2, b1, b2)) {
        assert.fail(label + ": self-intersection between edges " + i + " and " + j);
      }
    }
  }
}

function polygonArea(points: Pt[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) * 0.5;
}

function assertFiniteness(geo: WeaponGeometry, label: string): void {
  const checkPoints = (points: ReadonlyArray<Pt> | null | undefined, name: string) => {
    if (!points) return;
    for (let i = 0; i < points.length; i++) {
      assert.ok(Number.isFinite(points[i].x) && Number.isFinite(points[i].y), label + ": " + name + "[" + i + "] is not finite");
    }
  };
  checkPoints(geo.blade.spine, "blade.spine");
  checkPoints(geo.blade.edge, "blade.edge");
  checkPoints(geo.blade.outline, "blade.outline");
  checkPoints(geo.blade.ridgeline, "blade.ridgeline");
  if (geo.blade.tip.shoulder) {
    assert.ok(isFinitePoint(geo.blade.tip.shoulder), label + ": tip.shoulder not finite");
  }
  assert.ok(isFinitePoint(geo.blade.tip.base), label + ": tip.base not finite");
  assert.ok(isFinitePoint(geo.blade.tip.apex), label + ": tip.apex not finite");
  if (geo.blade.fuller) {
    checkPoints(geo.blade.fuller.inner, "fuller.inner");
    checkPoints(geo.blade.fuller.outer, "fuller.outer");
    assert.ok(Number.isFinite(geo.blade.fuller.depth), label + ": fuller.depth not finite");
  }
  for (let b = 0; b < geo.blade.bevels.length; b++) {
    checkPoints(geo.blade.bevels[b].inner, "bevels[" + b + "].inner");
    checkPoints(geo.blade.bevels[b].outer, "bevels[" + b + "].outer");
  }
  for (let s = 0; s < geo.blade.stations.length; s++) {
    const station = geo.blade.stations[s];
    assert.ok(Number.isFinite(station.t), label + ": station.t not finite");
    assert.ok(Number.isFinite(station.cx) && Number.isFinite(station.cy), label + ": station centre not finite");
    assert.ok(Number.isFinite(station.halfSpine) && Number.isFinite(station.halfEdge) && Number.isFinite(station.halfWidth), label + ": station widths not finite");
    assert.ok(Number.isFinite(station.tangent.x) && Number.isFinite(station.tangent.y), label + ": station tangent not finite");
    assert.ok(Number.isFinite(station.normal.x) && Number.isFinite(station.normal.y), label + ": station normal not finite");
    assert.ok(Number.isFinite(station.thickness), label + ": station thickness not finite");
  }
  checkPoints(geo.guard.outline, "guard.outline");
  for (let q = 0; q < geo.guard.quillons.length; q++) checkPoints(geo.guard.quillons[q], "guard.quillons[" + q + "]");
  for (let s = 0; s < geo.guard.strokes.length; s++) checkPoints(geo.guard.strokes[s], "guard.strokes[" + s + "]");
  for (let l = 0; l < geo.guard.langets.length; l++) checkPoints(geo.guard.langets[l], "guard.langets[" + l + "]");
  if (geo.guard.boss) {
    assert.ok(Number.isFinite(geo.guard.boss.x) && Number.isFinite(geo.guard.boss.y) && Number.isFinite(geo.guard.boss.r), label + ": guard.boss not finite");
  }
  checkPoints(geo.grip.outline, "grip.outline");
  for (let r = 0; r < geo.grip.ribs.length; r++) checkPoints(geo.grip.ribs[r], "grip.ribs[" + r + "]");
  for (let f = 0; f < geo.grip.ferrules.length; f++) checkPoints(geo.grip.ferrules[f], "grip.ferrules[" + f + "]");
  checkPoints(geo.pommel.outline, "pommel.outline");
  for (let s = 0; s < geo.pommel.strokes.length; s++) checkPoints(geo.pommel.strokes[s], "pommel.strokes[" + s + "]");
  if (geo.pommel.gem) {
    assert.ok(Number.isFinite(geo.pommel.gem.x) && Number.isFinite(geo.pommel.gem.y) && Number.isFinite(geo.pommel.gem.r), label + ": pommel.gem not finite");
  }
  for (const key of ["minX", "minY", "maxX", "maxY", "width", "height"] as const) {
    assert.ok(Number.isFinite(geo.bounds[key]), label + ": bounds." + key + " not finite");
  }
  assert.ok(Number.isFinite(geo.bladeLength), label + ": bladeLength not finite");
}

/** Every invariant the renderer relies on. Throws on the first violation. */
function assertGeometryInvariants(genome: WeaponVisualGenome, geo: WeaponGeometry, label: string): void {
  assertFiniteness(geo, label);

  // --- blade length -------------------------------------------------------
  const expectedLength = Math.min(1.55, Math.max(0.5, genome.silhouette.bladeLengthUnits));
  assert.ok(
    Math.abs(geo.bladeLength - expectedLength) <= 2e-4,
    label + ": bladeLength " + geo.bladeLength + " != genome " + expectedLength,
  );

  // --- stations -----------------------------------------------------------
  const stations = geo.blade.stations;
  assert.equal(stations.length, BLADE_STATION_COUNT, label + ": unexpected station count");
  assert.ok(stations.length >= 65, label + ": brief requires >= 65 stations");
  assert.equal(stations[0].t, 0, label + ": first station must start at t=0");
  assert.equal(stations[stations.length - 1].t, 1, label + ": last station must reach t=1");
  let previousT = -Infinity;
  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    assert.ok(station.t > previousT, label + ": station t must be strictly increasing at " + i);
    previousT = station.t;
    assert.ok(station.t >= 0 && station.t <= 1, label + ": station t out of [0,1] at " + i);
    assert.ok(station.halfSpine > 0, label + ": non-positive halfSpine at station " + i);
    assert.ok(station.halfEdge > 0, label + ": non-positive halfEdge at station " + i);
    assert.ok(station.halfWidth > 0, label + ": non-positive halfWidth at station " + i);
    // halfWidth is the mean of the two side half widths (see geometry.halfWidths).
    assert.ok(
      Math.abs(station.halfWidth - (station.halfSpine + station.halfEdge) * 0.5) <= 3e-4,
      label + ": halfWidth is not the mean of halfSpine/halfEdge at station " + i,
    );
    assert.ok(station.thickness >= 0 && station.thickness <= 1, label + ": thickness out of [0,1] at station " + i);
    const tangentLength = Math.hypot(station.tangent.x, station.tangent.y);
    const normalLength = Math.hypot(station.normal.x, station.normal.y);
    assert.ok(Math.abs(tangentLength - 1) <= 5e-3, label + ": tangent not unit length at station " + i);
    assert.ok(Math.abs(normalLength - 1) <= 5e-3, label + ": normal not unit length at station " + i);
  }

  // --- blade outlines -----------------------------------------------------
  assert.ok(geo.blade.spine.length > 50, label + ": spine has too few samples");
  assert.ok(geo.blade.edge.length > 50, label + ": edge has too few samples");
  assert.ok(
    Math.abs(geo.blade.spine.length - geo.blade.edge.length) <= 6,
    label + ": spine/edge sample counts diverge",
  );
  assertNoConsecutiveDuplicates(geo.blade.spine, label + " spine");
  assertNoConsecutiveDuplicates(geo.blade.edge, label + " edge");
  assert.ok(geo.blade.outline.length >= 64, label + ": outline has too few points");
  assertSimplePolygon(geo.blade.outline, label + " outline");
  assert.ok(polygonArea(geo.blade.outline) > 1e-6, label + ": outline encloses no area");
  assert.ok(samePoint(geo.blade.outline[0], geo.blade.spine[0]), label + ": outline must start at the spine base");
  assert.ok(
    samePoint(geo.blade.outline[geo.blade.outline.length - 1], geo.blade.edge[0]),
    label + ": outline must end at the edge base",
  );

  // --- tip ----------------------------------------------------------------
  const apex = geo.blade.tip.apex;
  assert.ok(Math.abs(apex.x - geo.bladeLength) <= 2e-4, label + ": tip apex must sit at bladeLength");
  // The last body station is the tip base (t = startT): the apex must be forward of it.
  const tipBase = geo.blade.tip.base;
  assert.ok(tipBase.x < apex.x - 1e-5, label + ": tip apex must be strictly forward of the last body station");
  assert.ok(geo.blade.tip.startT > 0 && geo.blade.tip.startT < 0.99, label + ": tip startT out of (0, 0.99)");
  const stationBeforeTip = geo.stationAt(geo.blade.tip.startT * 0.999);
  assert.ok(apex.x > stationBeforeTip.cx + 1e-5, label + ": tip apex must be forward of the body centre line");

  // --- bands --------------------------------------------------------------
  if (geo.blade.fuller) {
    assert.equal(geo.blade.fuller.inner.length, geo.blade.fuller.outer.length, label + ": fuller band edges have different lengths");
    assert.ok(geo.blade.fuller.depth >= 0 && geo.blade.fuller.depth <= 1, label + ": fuller depth out of [0,1]");
  }
  assert.ok(geo.blade.bevels.length <= 2, label + ": more than two bevel bands");
  for (const band of geo.blade.bevels) {
    assert.equal(band.inner.length, band.outer.length, label + ": bevel band edges have different lengths");
    assert.ok(band.depth >= 0 && band.depth <= 1, label + ": bevel depth out of [0,1]");
  }
  if (geo.blade.ridgeline) assert.ok(geo.blade.ridgeline.length >= 8, label + ": ridgeline has too few points");

  // --- hilt bounds relative to the blade ---------------------------------
  const baseFullWidth = 2 * stations[0].halfWidth;
  assert.ok(geo.guard.span >= 0.02 && geo.guard.span <= 0.26 + 1e-6, label + ": guard span out of [0.02, 0.26]");
  assert.ok(
    geo.guard.span <= Math.max(0.1, 2.2 * baseFullWidth) + 0.01,
    label + ": guard span " + geo.guard.span + " exceeds 2.2x blade full base width (" + baseFullWidth + ")",
  );
  assert.ok(geo.guard.outline.length >= 3, label + ": guard outline missing");
  assertSimplePolygon(geo.guard.outline, label + " guard outline");
  for (const point of geo.guard.outline) {
    assert.ok(Math.abs(point.y) <= 0.3, label + ": guard outline extends absurdly in Y");
  }

  assert.ok(geo.grip.length >= 0.12 && geo.grip.length <= 0.4, label + ": grip length out of [0.12, 0.4]");
  assertSimplePolygon(geo.grip.outline, label + " grip outline");
  for (const point of geo.grip.outline) {
    assert.ok(point.x <= 0.02 && point.x >= -0.5, label + ": grip outline X out of range");
    assert.ok(Math.abs(point.y) <= 0.055, label + ": grip outline Y out of range");
  }

  assertSimplePolygon(geo.pommel.outline, label + " pommel outline");
  for (const point of geo.pommel.outline) {
    assert.ok(point.x <= 0.05, label + ": pommel outline crosses the blade root");
    assert.ok(point.x >= -(geo.grip.length + 0.16), label + ": pommel outline too far behind the grip");
    assert.ok(Math.abs(point.y) <= 0.09, label + ": pommel outline Y out of range");
  }

  // --- global bounds ------------------------------------------------------
  assert.ok(geo.bounds.maxX >= geo.bladeLength - 2e-4, label + ": bounds must contain the tip");
  assert.ok(geo.bounds.minX <= -(geo.grip.length + 0.02), label + ": bounds must contain the pommel");
  assert.ok(geo.bounds.minX >= -1.2, label + ": weapon extends absurdly far behind the guard");
  assert.ok(geo.bounds.width > 0 && geo.bounds.width <= 2.2, label + ": bounds width absurd");
  assert.ok(geo.bounds.height > 0 && geo.bounds.height <= 1.1, label + ": bounds height absurd");
  assert.ok(geo.bounds.minY <= 0 && geo.bounds.maxY >= 0, label + ": bounds must straddle the blade axis");

  // --- stationAt interpolation -------------------------------------------
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const station = geo.stationAt(t);
    assert.ok(Number.isFinite(station.cx) && Number.isFinite(station.cy), label + ": stationAt(" + t + ") not finite");
  }
  assert.equal(geo.stationAt(0).t, 0, label + ": stationAt(0) must clamp to t=0");
  assert.equal(geo.stationAt(1).t, 1, label + ": stationAt(1) must clamp to t=1");
  // Monotonic centre line in X for an uncurved/every blade: cx is L*t.
  let previousCx = -Infinity;
  for (const t of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
    const cx = geo.stationAt(t).cx;
    assert.ok(cx >= previousCx - 1e-6, label + ": stationAt cx must be monotonic");
    previousCx = cx;
  }
}

function makeComponent(category: InventoryComponent["category"], key: string, rarity: RarityGrade): InventoryComponent {
  return {
    id: "comp_" + category + "_" + key,
    name: key,
    category,
    componentKey: key,
    rarity,
    icon: "",
    description: "",
    acquiredAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Fixtures and determinism
// ---------------------------------------------------------------------------

describe("geometry determinism", () => {
  it("the same genome always produces byte-identical geometry", () => {
    for (const id of HERO_IDS) {
      const source: WeaponVisualSource = { id: "geo_" + id, design: presetDesign(id), quality: 84, warp: 0.1, cracks: 1, createdAt: 1 };
      const genome = deriveWeaponVisualGenome(source);
      const first = buildWeaponGeometry(genome);
      const second = buildWeaponGeometry(genome);
      // JSON drops the stationAt closure, so this compares every coordinate.
      assert.equal(JSON.stringify(first), JSON.stringify(second));
      assert.notEqual(first.blade.outline.length, 0);
    }
  });

  it("different genomes produce different silhouettes", () => {
    const shapes = new Set<string>();
    for (const quality of [20, 50, 80, 96]) {
      for (const id of HERO_IDS) {
        const genome = deriveWeaponVisualGenome({ id: "geo_" + id, design: presetDesign(id), quality, createdAt: 1 });
        const geo = buildWeaponGeometry(genome);
        shapes.add(JSON.stringify({ outline: geo.blade.outline, guard: geo.guard.outline }));
      }
    }
    assert.ok(shapes.size >= HERO_IDS.length * 2, "genome changes must reshape the drawn geometry");
  });
});

// ---------------------------------------------------------------------------
// Fixture sweep (all hero weapons, all qualities)
// ---------------------------------------------------------------------------

describe("hero weapon geometry", () => {
  it("every canonical hero at every quality tier satisfies all invariants", () => {
    let checked = 0;
    for (const id of HERO_IDS) {
      for (const quality of [5, 25, 45, 65, 75, 85, 92, 98, 100]) {
        const design = presetDesign(id);
        const genome = deriveWeaponVisualGenome({
          id: "hero_" + id + "_" + quality,
          design,
          quality,
          warp: quality < 60 ? 0.35 : 0,
          cracks: quality < 40 ? 2 : 0,
          quenchScore: quality,
          physicalProfile: quality % 3 === 0 ? {
            baseWidth: 0.85, midWidth: 0.7, tipWidth: 0.3, distalTaper: 0.6,
            fullerDepth: 0.4, bevelSharpness: 0.7, hammerMarksCount: 9,
          } : undefined,
          createdAt: 1,
        });
        const geo = buildWeaponGeometry(genome);
        assertGeometryInvariants(genome, geo, id + " q" + quality);
        checked += 1;
      }
    }
    assert.equal(checked, HERO_IDS.length * 9);
  });
});

// ---------------------------------------------------------------------------
// Property sweep: 520 deterministic genomes
// ---------------------------------------------------------------------------

describe("property sweep: 520 generated genomes", () => {
  it("every generated genome passes all geometry invariants", () => {
    const rng = makeRng(0xc0ffee);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];
    const types: ProfileIdLike[] = PROFILE_KEYS;
    void types;
    let checked = 0;
    let generated = 0;
    while (generated < 520) {
      generated += 1;
      const family = pick(FAMILY_KEYS);
      const design: SwordDesign = {
        name: "sweep " + generated,
        family,
        profile: pick(PROFILE_KEYS),
        steel: pick(STEEL_KEYS),
        wrap: pick(WRAP_KEYS),
        guard: pick(GUARD_KEYS),
        pommel: pick(POMMEL_KEYS),
        inscription: generated % 4 === 0 ? "TESTE" : "",
        runes: rng() < 0.3,
        length: 0.5 + rng(),
      };
      const quality = Math.floor(rng() * 101);
      const physicalProfile: PhysicalBladeProfile | undefined = rng() < 0.5 ? {
        baseWidth: rng(),
        midWidth: rng(),
        tipWidth: rng(),
        distalTaper: rng(),
        fullerDepth: rng(),
        bevelSharpness: rng(),
        hammerMarksCount: Math.floor(rng() * 30),
      } : undefined;
      const installedComponents: Record<string, InventoryComponent> | undefined = rng() < 0.3 ? {
        guard: makeComponent("guard", pick(GUARD_KEYS), pick(RARITIES)),
      } : undefined;
      const source: WeaponVisualSource = {
        id: "sweep_" + generated,
        design,
        quality,
        heatScore: rng(),
        forgeScore: rng(),
        quenchScore: rng(),
        warp: rng() * 0.6,
        cracks: Math.floor(rng() * 4),
        createdAt: generated,
        damage: rng() * 100,
        defense: rng() * 100,
        agility: rng() * 100,
        durability: rng() * 100,
        rarity: pick(RARITIES),
        structuralState: quality < 40 ? "deformed" : "stable",
        physicalProfile,
        installedComponents,
      };
      const genome = deriveWeaponVisualGenome(source);
      const geo = buildWeaponGeometry(genome);
      try {
        assertGeometryInvariants(genome, geo, "sweep#" + generated + " " + family + " q" + quality);
        checked += 1;
      } catch (error) {
        const detail = "sweep#" + generated + " family=" + family + " profile=" + design.profile +
          " steel=" + design.steel + " guard=" + design.guard + " pommel=" + design.pommel +
          " quality=" + quality + " warp=" + source.warp + " cracks=" + source.cracks;
        assert.fail(detail + "\n" + String(error && (error as Error).message ? (error as Error).message : error));
      }
    }
    assert.equal(checked, 520);
  });
});

type ProfileIdLike = (typeof PROFILE_KEYS)[number];
