import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DESIGN } from "../catalog.ts";
import { defaultSaveData, loadSave, writeSave } from "../save.ts";
import { executeComponentInstallTransaction } from "../transactions.ts";
import type { FinishedSword, InventoryComponent, SaveData } from "../types.ts";
import { buildWeaponGeometry } from "./geometry.ts";
import { deriveWeaponVisualGenome, weaponVisualSeed } from "./weaponGenome.ts";

// Only the browser persistence boundary is in memory. Loading, migration,
// transaction, stat calculation and DNA derivation are production functions.
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
});
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});
function sword(): FinishedSword {
  return {
    id: "dna-real-forging-001", forgeRunId: "forge-dna-001", design: { ...DEFAULT_DESIGN, guard: "cross", wrap: "leather", pommel: "disc", runes: false, runeSymbol: undefined },
    quality: 80, grade: "Excelente", heatScore: 82, forgeScore: 80, quenchScore: 78,
    warp: 0.08, cracks: 0, structuralState: "stable", createdAt: 1700000000000,
    damage: 100, defense: 90, agility: 60, durability: 80,
    physicalProfile: { baseWidth: 0.9, midWidth: 0.8, tipWidth: 0.3, distalTaper: 0.7, fullerDepth: 0.5, bevelSharpness: 0.8, hammerMarksCount: 12 },
  };
}
function component(category: InventoryComponent["category"], key: string): InventoryComponent {
  return { id: `real-${key}`, name: key, category, componentKey: key, rarity: "Rara", icon: "", description: "", acquiredAt: 1,
    statModifier: { defenseBonus: 200, damageBonus: 15, agilityBonus: 10 } };
}
function bladeIdentity(genome: ReturnType<typeof deriveWeaponVisualGenome>) {
  return { seed: genome.seed, silhouette: genome.silhouette, structure: genome.structure,
    surface: genome.surface, makerMark: genome.individuality.makerMark,
    bladeSeed: genome.individuality.subSeeds.blade, surfaceSeed: genome.individuality.subSeeds.surface, markSeed: genome.individuality.subSeeds.mark };
}

describe("DNA with real component installation", () => {
  const installs: Array<[InventoryComponent["category"], string, string]> = [
    ["guard", "guard_wings_royal", "wings"], ["wrap", "wrap_dragon_leather", "dragon_leather"],
    ["pommel", "pommel_wolf_bronze", "wolf"], ["rune", "rune_fehu", "rune"],
  ];
  for (const [category, key, expected] of installs) {
    it(`${category} transaction changes its slot without rerolling forged blade, surface or maker mark`, () => {
      const original = sword();
      const comp = component(category, key);
      const save: SaveData = { ...structuredClone(defaultSaveData), gallery: [original] };
      save.inventory.components.push(comp);
      const before = deriveWeaponVisualGenome(original);
      const result = executeComponentInstallTransaction(save, original.id, comp.id);
      assert.equal(result.success, true, result.error);
      assert.ok(result.payload);
      assert.equal(result.payload.defense, 290, "exercise actual stat modifier calculation");
      const after = deriveWeaponVisualGenome(result.payload);
      assert.deepStrictEqual(bladeIdentity(after), bladeIdentity(before));
      if (category === "guard") assert.equal(after.mount.guard.archetype, expected);
      if (category === "wrap") assert.equal(after.mount.grip.wrapId, expected);
      if (category === "pommel") assert.equal(after.mount.pommel.archetype, expected);
      if (category === "rune") assert.equal(after.inscriptions.hasRunes, true);
      assert.deepStrictEqual(deriveWeaponVisualGenome(loadSave().gallery[0]), after, "persisted installation must derive identically");
    });
  }

  it("resolves inventory keys even when an older save retains the original design", () => {
    const source = sword();
    source.installedComponents = {
      guard: component("guard", "guard_wings_royal"),
      wrap: component("wrap", "wrap_dragon_leather"),
      pommel: component("pommel", "pommel_wolf_bronze"),
    };
    const genome = deriveWeaponVisualGenome(source);
    assert.equal(genome.mount.guard.archetype, "wings");
    assert.equal(genome.mount.grip.wrapId, "dragon_leather");
    assert.equal(genome.mount.pommel.archetype, "wolf");
  });

  it("rejects component keys that only share an archetype prefix", () => {
    const source = sword();
    source.installedComponents = { guard: component("guard", "guard_wingsXYZ") };
    assert.equal(deriveWeaponVisualGenome(source).mount.guard.archetype, "cross");
  });

  it("immutable forge outcomes still distinguish the seed while display metadata does not", () => {
    const source = sword();
    const renamed = structuredClone(source);
    renamed.design.name = "A new title";
    assert.equal(weaponVisualSeed(renamed), weaponVisualSeed(source));
    const changedForge = structuredClone(source);
    changedForge.physicalProfile!.hammerMarksCount++;
    assert.notEqual(weaponVisualSeed(changedForge), weaponVisualSeed(source));
  });
});

describe("DNA legacy save compatibility", () => {
  it("loads an old sword, renders pure geometry and survives real save/reload without adding DNA fields", () => {
    const old = { version: 1, gallery: [{ id: "legacy-001", design: { ...DEFAULT_DESIGN }, quality: 68,
      heatScore: 74, forgeScore: 68, quenchScore: 70, warp: 0.1, createdAt: 1 }] };
    storage.setItem("a-forja-save", JSON.stringify(old));
    const loaded = loadSave();
    const beforeBytes = JSON.stringify(loaded);
    const genome = deriveWeaponVisualGenome(loaded.gallery[0]);
    const geometry = buildWeaponGeometry(genome);
    assert.ok(geometry.blade.outline.length > 0);
    assert.ok(Number.isFinite(geometry.bounds.width));
    assert.equal(JSON.stringify(loaded), beforeBytes, "DNA must not mutate the loaded save");
    assert.equal(storage.getItem("a-forja-save"), JSON.stringify(old), "drawing must not write storage");
    assert.equal(writeSave(loaded).ok, true);
    const reloaded = loadSave();
    assert.deepStrictEqual(deriveWeaponVisualGenome(reloaded.gallery[0]), genome);
    assert.equal("visualGenome" in reloaded.gallery[0], false);
    assert.equal("physicalProfile" in reloaded.gallery[0], false);
  });
});
