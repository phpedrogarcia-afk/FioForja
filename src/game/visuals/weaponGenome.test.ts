// FioForja - Weapon Visual DNA: genome contract tests.
//
// Run with:
//   node --experimental-strip-types --test src/game/visuals/weaponGenome.test.ts
//
// These are property/contract tests, not snapshots: they assert determinism,
// serialization stability, documented numeric ranges, legacy-save tolerance and
// the isolated component-mutation invariant of deriveWeaponVisualGenome().

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveWeaponVisualGenome,
  qualityTier,
  visualIdentityKey,
  weaponVisualSeed,
  FAMILY_GRAMMAR,
} from "./weaponGenome.ts";
import type { WeaponVisualGenome, WeaponVisualSource } from "./weaponGenome.ts";
import { hashString, makeRng } from "./math.ts";
import { CANONICAL_PRESETS, FAMILIES } from "../catalog.ts";
import type {
  FinishedSword,
  InventoryComponent,
  PhysicalBladeProfile,
  RarityGrade,
  SwordDesign,
} from "../types.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HERO_IDS = ["guarda_medieval", "cimitarra_damasco", "lua_silenciosa", "folha_aereth", "queda_asterion"];
const FAMILY_IDS = Object.keys(FAMILIES) as Array<keyof typeof FAMILIES>;

function presetDesign(id: string): SwordDesign {
  const preset = CANONICAL_PRESETS.find((entry) => entry.id === id);
  assert.ok(preset, "canonical preset " + id + " must exist");
  return { ...preset.design };
}

const BASE_DESIGN = presetDesign("guarda_medieval");

function makeSource(overrides: Partial<Omit<FinishedSword, "design">> = {}, design: SwordDesign = BASE_DESIGN): WeaponVisualSource {
  return {
    id: "sw_test_001",
    design: { ...design },
    quality: 80,
    heatScore: 0.8,
    forgeScore: 0.8,
    quenchScore: 0.8,
    warp: 0,
    cracks: 0,
    createdAt: 1700000000000,
    ...overrides,
  };
}

function makeComponent(category: InventoryComponent["category"], key: string, rarity: RarityGrade = "Comum"): InventoryComponent {
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

const FORGED_PROFILE: PhysicalBladeProfile = {
  baseWidth: 0.9,
  midWidth: 0.8,
  tipWidth: 0.3,
  distalTaper: 0.7,
  fullerDepth: 0.5,
  bevelSharpness: 0.8,
  hammerMarksCount: 12,
};

function json(genome: WeaponVisualGenome): string {
  return JSON.stringify(genome);
}

function zeroNegatives(value: unknown): unknown {
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return value.map(zeroNegatives);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) out[key] = zeroNegatives(child);
    return out;
  }
  return value;
}

function at(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node == null ? undefined : (node as Record<string, unknown>)[key]), root);
}

function numericLeaves(value: unknown): Array<{ path: string; value: number }> {
  const leaves: Array<{ path: string; value: number }> = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === "number") {
      leaves.push({ path, value: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, path + "[" + index + "]"));
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        walk(child, path ? path + "." + key : key);
      }
    }
  };
  walk(value, "");
  return leaves;
}

// ---------------------------------------------------------------------------
// Determinism + identity
// ---------------------------------------------------------------------------

describe("genome determinism", () => {
  it("same FinishedSword produces a deeply identical genome across calls", () => {
    const source = makeSource({ warp: 0.12, cracks: 1, quality: 63, physicalProfile: FORGED_PROFILE });
    const first = deriveWeaponVisualGenome(source);
    const second = deriveWeaponVisualGenome(source);
    assert.deepStrictEqual(first, second);
    assert.equal(first.seed, second.seed);
  });

  it("structurally identical but distinct design objects produce identical genomes", () => {
    const a = deriveWeaponVisualGenome(makeSource());
    const clone = { ...BASE_DESIGN, inscription: BASE_DESIGN.inscription };
    const b = deriveWeaponVisualGenome(makeSource({}, clone));
    assert.deepStrictEqual(a, b);
  });

  it("JSON serialize/parse round-trips without numeric drift", () => {
    for (const id of HERO_IDS) {
      const genome = deriveWeaponVisualGenome(makeSource({ physicalProfile: FORGED_PROFILE }, presetDesign(id)));
      const roundTripped = JSON.parse(json(genome)) as WeaponVisualGenome;
      assert.deepStrictEqual(zeroNegatives(genome), roundTripped);
      assert.equal(json(roundTripped), json(genome));
    }
  });

  it("genome seed is the stable identity hash (raw design, not component-resolved)", () => {
    const source = makeSource({ installedComponents: { guard: makeComponent("guard", "wings") } });
    const genome = deriveWeaponVisualGenome(source);
    assert.equal(genome.seed, weaponVisualSeed(source));
    assert.equal(genome.seed, hashString(visualIdentityKey(source)));
    assert.ok(Number.isInteger(genome.seed));
    assert.ok(genome.seed >= 0 && genome.seed <= 0xffffffff);
  });

  it("every hero weapon gets a distinct seed", () => {
    const seeds = new Set<number>();
    for (const id of HERO_IDS) seeds.add(weaponVisualSeed(makeSource({}, presetDesign(id))));
    assert.equal(seeds.size, HERO_IDS.length);
  });
});

// ---------------------------------------------------------------------------
// Variation: quality, forge outcomes and physical records
// ---------------------------------------------------------------------------

describe("genome variation", () => {
  it("quality changes the genome", () => {
    const genomes = [35, 68, 96].map((quality) => deriveWeaponVisualGenome(makeSource({ quality })));
    assert.notEqual(json(genomes[0]), json(genomes[1]));
    assert.notEqual(json(genomes[1]), json(genomes[2]));
    assert.notEqual(json(genomes[0]), json(genomes[2]));
    assert.deepStrictEqual(genomes.map((genome) => genome.quality.score), [35, 68, 96]);
  });

  it("warp and cracks reshape the quality record", () => {
    const clean = deriveWeaponVisualGenome(makeSource({ warp: 0, cracks: 0 }));
    const bent = deriveWeaponVisualGenome(makeSource({ warp: 0.45, cracks: 0 }));
    const cracked = deriveWeaponVisualGenome(makeSource({ warp: 0, cracks: 3 }));
    assert.ok(bent.quality.warp > clean.quality.warp);
    assert.ok(clean.quality.symmetry > bent.quality.symmetry);
    assert.equal(cracked.quality.cracks, 3);
    assert.notEqual(json(clean), json(bent));
    assert.notEqual(json(clean), json(cracked));
  });

  it("quench execution (persisted forge history) changes the warp response", () => {
    const goodQuench = deriveWeaponVisualGenome(makeSource({ warp: 0.4, quenchScore: 95 }));
    const badQuench = deriveWeaponVisualGenome(makeSource({ warp: 0.4, quenchScore: 30 }));
    assert.ok(badQuench.quality.warp > goodQuench.quality.warp);
  });

  it("physical blade profile drives the silhouette", () => {
    const withoutProfile = deriveWeaponVisualGenome(makeSource());
    const withProfile = deriveWeaponVisualGenome(makeSource({ physicalProfile: FORGED_PROFILE }));
    assert.notEqual(withoutProfile.silhouette.distalTaper, withProfile.silhouette.distalTaper);
    assert.notEqual(withoutProfile.structure.fuller.depth, withProfile.structure.fuller.depth);
  });

  it("steel, family, profile and length are part of the visual identity", () => {
    const base = makeSource();
    const otherSteel = makeSource({}, { ...BASE_DESIGN, steel: "damascus" });
    const otherFamily = makeSource({}, { ...BASE_DESIGN, family: "oriental" });
    const otherProfile = makeSource({}, { ...BASE_DESIGN, profile: "katana" });
    const otherLength = makeSource({}, { ...BASE_DESIGN, length: 1.3 });
    const baseGenome = deriveWeaponVisualGenome(base);
    for (const variant of [otherSteel, otherFamily, otherProfile, otherLength]) {
      const genome = deriveWeaponVisualGenome(variant);
      assert.notEqual(genome.seed, baseGenome.seed, "seed must change with design identity");
    }
    assert.notEqual(deriveWeaponVisualGenome(otherFamily).silhouette.spineProfile, baseGenome.silhouette.spineProfile);
    assert.notEqual(deriveWeaponVisualGenome(otherProfile).silhouette.curvature, baseGenome.silhouette.curvature);
  });

  it("different weapon ids never share a genome", () => {
    const a = deriveWeaponVisualGenome(makeSource({ id: "sw_a" }));
    const b = deriveWeaponVisualGenome(makeSource({ id: "sw_b" }));
    assert.notEqual(a.seed, b.seed);
    assert.notEqual(json(a), json(b));
  });
});

// ---------------------------------------------------------------------------
// Legacy tolerance
// ---------------------------------------------------------------------------

describe("legacy swords missing optional fields", () => {
  it("derives a complete genome from a bare design (no stats, history or profile)", () => {
    const bare: WeaponVisualSource = { design: presetDesign("guarda_medieval") };
    const genome = deriveWeaponVisualGenome(bare);
    assert.equal(genome.version, 1);
    assert.equal(genome.quality.score, 70);
    assert.equal(genome.quality.grade, "Boa");
    assert.equal(genome.identity.rarity, "Comum");
    assert.equal(genome.mount.guard.archetype, BASE_DESIGN.guard);
    assert.equal(genome.mount.grip.wrapId, BASE_DESIGN.wrap);
    assert.equal(genome.mount.pommel.archetype, BASE_DESIGN.pommel);
    for (const leaf of numericLeaves(genome)) {
      assert.ok(Number.isFinite(leaf.value), leaf.path + " must be finite, got " + leaf.value);
    }
  });

  it("falls back to the royal grammar when design.family is absent", () => {
    const design = { ...BASE_DESIGN } as SwordDesign;
    delete design.family;
    const genome = deriveWeaponVisualGenome({ design });
    assert.equal(genome.identity.family, "royal");
    assert.ok(genome.identity.familyName.length > 0);
    assert.ok(Number.isFinite(genome.seed));
  });

  it("uses only persisted physical outcomes, not the raw strike log", () => {
    const bare: WeaponVisualSource = { design: presetDesign("guarda_medieval") };
    const withHistory = { ...bare, history: [{ strike: 1, kind: "perfect" as const, force: 1, inHeat: true, zone: "tip" as const }] };
    assert.deepStrictEqual(deriveWeaponVisualGenome(bare), deriveWeaponVisualGenome(withHistory));
  });
});

// ---------------------------------------------------------------------------
// Documented numeric ranges (property sweep across all 9 families)
// ---------------------------------------------------------------------------

describe("documented numeric ranges", () => {
  it("all numeric fields are finite and inside the documented ranges", () => {
    const rangeChecks: Array<[string, number, number]> = [
      ["silhouette.bladeLengthUnits", 0.55, 1.45],
      ["silhouette.baseHalfWidth", 0.026, 0.076],
      ["silhouette.tipHalfWidth", 0.0035, 0.019],
      ["silhouette.distalTaper", 0, 1],
      ["silhouette.curvature", 0, 0.13],
      ["silhouette.curveStart", 0, 1],
      ["silhouette.asymmetry", -0.35, 0.35],
      ["silhouette.tipLengthRatio", 0.08, 0.3],
      ["silhouette.ricassoRatio", 0.03, 0.2],
      ["silhouette.wobbleAmp", 0, 0.0045],
      ["silhouette.wobblePhase", 0, 1],
      ["structure.spineHeight", 0, 1],
      ["structure.fuller.start", 0, 1],
      ["structure.fuller.end", 0, 1],
      ["structure.fuller.halfWidth", 0.1, 0.42],
      ["structure.fuller.depth", 0, 1],
      ["structure.bevels.width", 0.15, 0.42],
      ["structure.bevels.prominence", 0, 1],
      ["structure.relief.shoulder", 0, 1],
      ["structure.rootReinforcement", 0, 1],
      ["mount.guard.span", 0.09, 0.26],
      ["mount.guard.thickness", 0.01, 0.024],
      ["mount.guard.quillonCurve", 0, 1],
      ["mount.guard.ornament", 0, 1],
      ["mount.grip.lengthUnits", 0.16, 0.38],
      ["mount.grip.halfWidth", 0.019, 0.03],
      ["mount.grip.ribCount", 5, 18],
      ["mount.grip.ribSlant", -0.35, 0.35],
      ["mount.grip.taper", 0.04, 0.14],
      ["mount.pommel.radius", 0.028, 0.052],
      ["mount.ornaments.density", 0, 1],
      ["mount.ornaments.filigree", 0, 1],
      ["surface.palette.sat", 2, 24],
      ["surface.palette.light", 12, 78],
      ["surface.palette.edgeLight", 20, 92],
      ["surface.palette.shadowLight", 4, 60],
      ["surface.palette.warm", 0, 1],
      ["surface.polish", 0, 1],
      ["surface.oxidation", 0, 1],
      ["surface.patternDensity", 4, 22],
      ["surface.patternContrast", 0.22, 0.8],
      ["surface.luster", 0, 1],
      ["quality.score", 0, 100],
      ["quality.symmetry", 0, 1],
      ["quality.polish", 0, 1],
      ["quality.warp", 0, 1],
      ["quality.edgeWaver", 0, 0.0075],
      ["quality.defects.hammerMarks", 0, 34],
      ["quality.defects.edgeChips", 0, 9],
      ["quality.defects.scaleStains", 0, 7],
      ["quality.defects.misalignment", 0, 0.012],
      ["quality.defects.surfacePits", 0, 9],
      ["quality.defects.scratches", 0, 6],
      ["inscriptions.positionT", 0.18, 0.52],
      ["inscriptions.depth", 0, 1],
      ["inscriptions.grooveWidth", 0.008, 0.03],
      ["inscriptions.emission", 0, 0.4],
      ["individuality.craftsmanship", 0, 1],
      ["individuality.makerMark.x", 0.04, 0.1],
      ["individuality.makerMark.y", -0.35, 0.35],
      ["individuality.makerMark.size", 0.007, 0.016],
      ["individuality.makerMark.rotation", -0.5, 0.5],
      ["provenance.refinements", 0, 3],
      ["provenance.integrity", 0, 1],
      ["provenance.componentRarity", 0, 1],
    ];

    const qualities = [5, 35, 50, 68, 80, 90, 96, 100];
    let checked = 0;
    for (const family of FAMILY_IDS) {
      const familyDefaults = FAMILIES[family];
      for (const quality of qualities) {
        const design: SwordDesign = {
          name: "sweep " + family,
          family,
          profile: familyDefaults.defaultProfile,
          steel: familyDefaults.defaultSteel,
          wrap: familyDefaults.defaultWrap,
          guard: familyDefaults.defaultGuard,
          pommel: familyDefaults.defaultPommel,
          inscription: "SWEEP",
          runes: family === "runic" || family === "relic",
          length: 0.55 + (quality % 50) / 100,
        };
        const source = makeSource(
          {
            id: "sweep_" + family + "_" + quality,
            quality,
            warp: quality < 50 ? 0.4 : 0.02,
            cracks: quality < 40 ? 3 : 0,
            quenchScore: quality,
            structuralState: quality < 35 ? "damaged" : "stable",
            physicalProfile: quality % 2 === 0 ? FORGED_PROFILE : undefined,
          },
          design,
        );
        const genome = deriveWeaponVisualGenome(source);
        checked += 1;

        assert.equal(genome.version, 1);
        assert.ok(Number.isInteger(genome.seed) && genome.seed >= 0 && genome.seed <= 0xffffffff);
        assert.ok(genome.identity.family in FAMILY_GRAMMAR, "family grammar must exist for " + genome.identity.family);
        assert.ok(genome.identity.grade.length > 0);

        for (const leaf of numericLeaves(genome)) {
          assert.ok(Number.isFinite(leaf.value), leaf.path + " must be finite, got " + leaf.value);
        }
        for (const [path, min, max] of rangeChecks) {
          const value = at(genome, path) as number;
          assert.ok(
            typeof value === "number" && value >= min - 1e-9 && value <= max + 1e-9,
            path + " = " + value + " must be within [" + min + ", " + max + "]",
          );
        }

        // Relative invariants that depend on another field.
        const base = genome.silhouette.baseHalfWidth;
        assert.ok(genome.silhouette.midHalfWidth >= base * 0.72 - 1e-9);
        assert.ok(genome.silhouette.midHalfWidth <= base * 1.45 + 1e-9);
        assert.ok(genome.silhouette.ricassoHalfWidth >= base * 0.9 - 1e-9);
        assert.ok(genome.silhouette.ricassoHalfWidth <= base * 1.2 + 1e-9);
        assert.ok(Math.abs(genome.quality.alignmentOffset) <= 0.008 + 1e-12);

        // Counter fields must stay whole.
        for (const path of [
          "quality.defects.hammerMarks",
          "quality.defects.edgeChips",
          "quality.defects.scaleStains",
          "quality.defects.surfacePits",
          "quality.defects.scratches",
          "mount.grip.ribCount",
          "provenance.refinements",
        ]) {
          assert.ok(Number.isInteger(at(genome, path)), path + " must be an integer");
        }
      }
    }
    assert.equal(checked, FAMILY_IDS.length * qualities.length);
  });

  it("qualityTier follows the documented grade thresholds", () => {
    assert.equal(qualityTier(0), "crude");
    assert.equal(qualityTier(39), "crude");
    assert.equal(qualityTier(40), "regular");
    assert.equal(qualityTier(59), "regular");
    assert.equal(qualityTier(60), "good");
    assert.equal(qualityTier(74), "good");
    assert.equal(qualityTier(75), "excellent");
    assert.equal(qualityTier(87), "excellent");
    assert.equal(qualityTier(88), "masterwork");
    assert.equal(qualityTier(94), "masterwork");
    assert.equal(qualityTier(95), "relic");
    assert.equal(qualityTier(100), "relic");
  });
});

// ---------------------------------------------------------------------------
// Isolated component mutation
// ---------------------------------------------------------------------------

describe("component isolation", () => {
  // Independent sub-systems must not move when a mount slot is swapped: the
  // blade/surface seeds, the geometry, the quality record and the inscriptions
  // are owned by the raw design and the forge, not by the mount.
  function invariantSections(genome: WeaponVisualGenome) {
    const subSeeds = genome.individuality.subSeeds;
    return {
      seed: genome.seed,
      bladeSeed: subSeeds.blade,
      surfaceSeed: subSeeds.surface,
      markSeed: subSeeds.mark,
      inscriptionSeed: subSeeds.inscription,
      quality: genome.quality,
      silhouette: genome.silhouette,
      structure: genome.structure,
      surface: genome.surface,
      inscriptions: genome.inscriptions,
    };
  }

  it("swapping the installed guard changes only the mount (and visible identity)", () => {
    const base = deriveWeaponVisualGenome(makeSource());
    const swapped = deriveWeaponVisualGenome(makeSource({ installedComponents: { guard: makeComponent("guard", "wings") } }));

    // The blade, surface and quality seeds are owned by the RAW design: identical.
    assert.deepStrictEqual(invariantSections(base), invariantSections(swapped));
    assert.equal(swapped.identity.guard, "wings");
    assert.equal(swapped.identity.grip, base.identity.grip);
    assert.equal(swapped.identity.pommel, base.identity.pommel);

    // The guard sub-seed is namespaced to the guard slot and moves; the other
    // mount sub-seeds stay put.
    assert.notEqual(base.individuality.subSeeds.guard, swapped.individuality.subSeeds.guard);
    assert.equal(base.individuality.subSeeds.grip, swapped.individuality.subSeeds.grip);
    assert.equal(base.individuality.subSeeds.pommel, swapped.individuality.subSeeds.pommel);

    // Mount actually changes and reflects the installed component.
    assert.equal(swapped.mount.guard.archetype, "wings");
    assert.notDeepStrictEqual(swapped.mount, base.mount);

    // A Comum-rarity component does not perturb provenance.
    assert.deepStrictEqual(base.provenance, swapped.provenance);

    // Individuality keeps its quirks and maker mark; only the visible signature
    // string names the new guard.
    assert.equal(base.individuality.subSeeds.mark, swapped.individuality.subSeeds.mark);
    assert.equal(base.individuality.subSeeds.blade, swapped.individuality.subSeeds.blade);
    assert.deepStrictEqual(base.individuality.quirks, swapped.individuality.quirks);
    assert.deepStrictEqual(base.individuality.makerMark, swapped.individuality.makerMark);
    assert.equal(base.individuality.craftsmanship, swapped.individuality.craftsmanship);
    assert.notEqual(base.individuality.signature, swapped.individuality.signature);
    assert.ok(swapped.individuality.signature.includes("asas"));
  });

  it("swapping the installed wrap changes only mount.grip", () => {
    const base = deriveWeaponVisualGenome(makeSource());
    const swapped = deriveWeaponVisualGenome(makeSource({ installedComponents: { wrap: makeComponent("wrap", "braided") } }));
    assert.deepStrictEqual(invariantSections(base), invariantSections(swapped));
    assert.equal(swapped.mount.grip.wrapId, "braided");
    assert.equal(swapped.mount.guard.archetype, base.mount.guard.archetype);
    assert.equal(swapped.mount.pommel.archetype, base.mount.pommel.archetype);
    assert.equal(swapped.identity.grip, "braided");
    assert.notEqual(base.individuality.subSeeds.grip, swapped.individuality.subSeeds.grip);
    assert.equal(base.individuality.subSeeds.guard, swapped.individuality.subSeeds.guard);
    assert.equal(base.individuality.subSeeds.pommel, swapped.individuality.subSeeds.pommel);
  });

  it("swapping the installed pommel changes only mount.pommel", () => {
    const base = deriveWeaponVisualGenome(makeSource());
    const swapped = deriveWeaponVisualGenome(makeSource({ installedComponents: { pommel: makeComponent("pommel", "crown") } }));
    assert.deepStrictEqual(invariantSections(base), invariantSections(swapped));
    assert.equal(swapped.mount.pommel.archetype, "crown");
    assert.equal(swapped.mount.guard.archetype, base.mount.guard.archetype);
    assert.equal(swapped.mount.grip.wrapId, base.mount.grip.wrapId);
    assert.equal(swapped.identity.pommel, "crown");
    assert.notEqual(base.individuality.subSeeds.pommel, swapped.individuality.subSeeds.pommel);
    assert.equal(base.individuality.subSeeds.guard, swapped.individuality.subSeeds.guard);
    assert.equal(base.individuality.subSeeds.grip, swapped.individuality.subSeeds.grip);
  });

  it("an unknown component key is ignored instead of corrupting the mount", () => {
    const base = deriveWeaponVisualGenome(makeSource());
    const bogus = deriveWeaponVisualGenome(makeSource({ installedComponents: { guard: makeComponent("guard", "not-a-real-guard") } }));
    assert.deepStrictEqual(base, bogus);
  });

  it("installing a rarer component only perturbs provenance.componentRarity", () => {
    const base = deriveWeaponVisualGenome(makeSource());
    const swapped = deriveWeaponVisualGenome(makeSource({ installedComponents: { guard: makeComponent("guard", "wings", "Rara") } }));
    assert.ok(swapped.provenance.componentRarity > base.provenance.componentRarity);
    const { componentRarity: a, ...baseProvenance } = base.provenance;
    const { componentRarity: b, ...swappedProvenance } = swapped.provenance;
    assert.deepStrictEqual(baseProvenance, swappedProvenance);
    assert.ok(Number.isFinite(a) && Number.isFinite(b));
  });
});

// ---------------------------------------------------------------------------
// Deterministic primitives used by the genome
// ---------------------------------------------------------------------------

describe("deterministic primitives", () => {
  it("hashString is deterministic, unsigned and collision-free on the fixture set", () => {
    const hashes = new Set<number>();
    for (const id of HERO_IDS) {
      const first = hashString(id);
      assert.equal(first, hashString(id));
      assert.ok(Number.isInteger(first) && first >= 0 && first <= 0xffffffff);
      hashes.add(first);
    }
    assert.equal(hashes.size, HERO_IDS.length);
  });

  it("makeRng is reproducible and stays in [0, 1)", () => {
    const a = makeRng(123456);
    const b = makeRng(123456);
    const first: number[] = [];
    const second: number[] = [];
    for (let i = 0; i < 256; i += 1) {
      first.push(a());
      second.push(b());
    }
    assert.deepStrictEqual(first, second);
    for (const value of first) {
      assert.ok(value >= 0 && value < 1, "rng out of [0,1): " + value);
    }
    const different = makeRng(123457);
    assert.notDeepStrictEqual(first.slice(0, 8), [0, 1, 2, 3, 4, 5, 6, 7].map(() => different()));
  });
});
