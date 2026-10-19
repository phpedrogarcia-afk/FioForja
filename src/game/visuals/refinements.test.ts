import assert from "node:assert/strict";
import { test } from "node:test";
import { CANONICAL_PRESETS } from "../catalog.ts";
import { deriveWeaponVisualGenome } from "./weaponGenome.ts";

const ids = ["cimitarra_damasco", "lua_silenciosa", "queda_asterion"];
const genomes = ids.map(id => {
  const preset = CANONICAL_PRESETS.find(p => p.id === id)!;
  const source = { id: `refinement_${id}`, design: { ...preset.design }, quality: 96, heatScore: 96, forgeScore: 96, quenchScore: 96, warp: 0, cracks: 0 };
  const before = JSON.stringify(source);
  const genome = deriveWeaponVisualGenome(source);
  assert.equal(JSON.stringify(source), before, "visual refinement never changes the source sword");
  assert.deepEqual(deriveWeaponVisualGenome(JSON.parse(before)), genome);
  return genome;
});

test("three refined families retain distinct physical section and spine grammars", () => {
  assert.deepEqual(genomes.map(g => g.structure.section), ["lenticular", "diamond", "hexagonal"]);
  assert.deepEqual(genomes.map(g => g.silhouette.spineProfile), ["arch", "sori", "clipped"]);
  for (const g of genomes) {
    assert.ok(g.silhouette.curvature > 0 && g.silhouette.curvature <= .13);
    assert.ok(g.silhouette.baseHalfWidth > 0 && g.silhouette.baseHalfWidth < g.silhouette.bladeLengthUnits * .15);
  }
});

test("polished dark alloys use separated facets while keeping a dark body", () => {
  for (const g of genomes.slice(1)) {
    assert.ok(g.surface.palette.light >= 27 && g.surface.palette.light < 45);
    assert.ok(g.surface.palette.shadowLight < g.surface.palette.light);
    assert.ok(g.surface.palette.light < g.surface.palette.edgeLight);
  }
  assert.equal(genomes[2].mount.guard.plating, "silver");
  assert.equal(genomes[2].mount.pommel.plating, "dark-iron");
});
