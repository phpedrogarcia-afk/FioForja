import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DESIGN } from "../catalog.ts";
import { buildWeaponGeometry } from "./geometry.ts";
import { deriveWeaponVisualGenome } from "./weaponGenome.ts";
import type { WeaponVisualGenome } from "./weaponGenome.ts";
import { clearWeaponGeometryCache, prepareFromGenome, weaponGeometryCacheSize } from "./weaponRenderer.ts";

const base = () => deriveWeaponVisualGenome({ id: "cache-regression", design: { ...DEFAULT_DESIGN }, quality: 80 });
const bytes = (value: unknown) => JSON.stringify(value);
afterEach(clearWeaponGeometryCache);

describe("geometry cache semantic identity", () => {
  const changes: Array<[string, (g: WeaponVisualGenome) => void]> = [
    ["equal-length edge profiles", (g) => { g.silhouette.edgeProfile = "waisted"; }],
    ["equal-length spine profiles", (g) => { g.silhouette.spineProfile = "sori"; }],
    ["equal-length tip profiles", (g) => { g.silhouette.tipProfile = "chisel"; }],
    ["equal-length guard archetypes", (g) => { g.mount.guard.archetype = "wings"; }],
    ["equal-length pommel archetypes", (g) => { g.mount.pommel.archetype = "wolf"; }],
    ["ridge enabled", (g) => { g.structure.ridge.enabled = true; }],
    ["guard plating carried by geometry", (g) => { g.mount.guard.plating = "gold"; }],
  ];
  for (const [label, change] of changes) {
    it(`warm cache respects ${label}`, () => {
      const first = base();
      first.silhouette.edgeProfile = "recurve";
      first.silhouette.spineProfile = "arch";
      first.silhouette.tipProfile = "needle";
      first.mount.guard.archetype = "cross";
      first.mount.pommel.archetype = "disc";
      first.mount.guard.plating = "steel";
      first.structure.fuller.enabled = false;
      first.structure.fuller.style = "none";
      first.structure.ridge.enabled = false;
      const second = structuredClone(first);
      change(second);
      assert.notEqual(bytes(buildWeaponGeometry(first)), bytes(buildWeaponGeometry(second)), "fixture must change geometry");
      prepareFromGenome(first);
      assert.equal(bytes(prepareFromGenome(second).geometry), bytes(buildWeaponGeometry(second)));
    });
  }

  it("does not quantise distinct inputs before nonlinear geometry construction", () => {
    const first = base();
    const second = structuredClone(first);
    first.silhouette.curvature = 0.040001;
    second.silhouette.curvature = 0.040049;
    assert.notEqual(bytes(buildWeaponGeometry(first)), bytes(buildWeaponGeometry(second)));
    prepareFromGenome(first);
    assert.equal(bytes(prepareFromGenome(second).geometry), bytes(buildWeaponGeometry(second)));
  });

  it("keeps every geometry after cache clearing and bounded eviction", () => {
    const genome = base();
    const expected = bytes(buildWeaponGeometry(genome));
    const initial = prepareFromGenome(genome).geometry;
    assert.equal(prepareFromGenome(structuredClone(genome)).geometry, initial);
    for (let i = 0; i < 250; i++) {
      const variant = structuredClone(genome);
      variant.mount.guard.ornament = i / 250;
      prepareFromGenome(variant);
    }
    assert.equal(weaponGeometryCacheSize(), 240);
    assert.equal(bytes(prepareFromGenome(genome).geometry), expected);
    clearWeaponGeometryCache();
    assert.equal(bytes(prepareFromGenome(genome).geometry), expected);
  });
});
