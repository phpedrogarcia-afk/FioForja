import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeSwordFusionTransaction,
  executeComponentFusionTransaction,
  executeComponentInstallTransaction,
  executeUpgradeSwordTransaction,
  executeShopPurchaseTransaction,
  executeClaimRewardsTransaction,
  executeFinishSwordTransaction,
  executeStrikeRewardTransaction,
} from "./transactions.ts";
import { defaultSaveData, writeSave, loadSave, generateUniqueId, type SaveData } from "./save.ts";
import { CANONICAL_PRESETS, calculateSwordAttributes } from "./catalog.ts";
import { fuseSwords } from "./fusion.ts";
import { createSim } from "./sim.ts";
import type { FinishedSword, InventoryComponent, FusionCore, SwordDesign } from "./types.ts";

const BASE_DESIGN: SwordDesign = {
  name: "Espada de Teste",
  family: "royal",
  profile: "long",
  steel: "steel",
  guard: "cross",
  pommel: "disc",
  wrap: "leather",
  inscription: "TEST",
  runes: false,
  length: 1,
};

function createTestSword(overrides?: Partial<FinishedSword>): FinishedSword {
  const stats = calculateSwordAttributes(
    BASE_DESIGN,
    overrides?.quality ?? 85,
    overrides?.warp ?? 0.02,
    overrides?.heatScore ?? 85,
    overrides?.forgeScore ?? 85,
    overrides?.quenchScore ?? 85,
  );
  return {
    id: generateUniqueId("sword"),
    design: BASE_DESIGN,
    quality: overrides?.quality ?? 85,
    grade: "Mestre",
    heatScore: 85,
    forgeScore: 85,
    quenchScore: 85,
    warp: 0.02,
    createdAt: Date.now(),
    damage: stats.damage,
    defense: stats.defense,
    agility: stats.agility,
    durability: stats.durability,
    baseDamage: stats.damage,
    baseDefense: stats.defense,
    baseAgility: stats.agility,
    baseDurability: stats.durability,
    combatRole: stats.combatRole,
    rarity: overrides?.rarity ?? "Rara",
    ...overrides,
  };
}

describe("Operação 02: A Forja do Prestígio — Transações Fail-Closed & Benchmark Weapons", () => {
  it("Pilar 1: Fail-Closed na Fusão Lendária — erro de storage não consome armas e preserva estado", () => {
    const memStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memStore[key];
      },
      clear: () => {
        for (const k in memStore) delete memStore[k];
      },
    };

    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const swords = [
      createTestSword({ rarity: "Lendária", quality: 92 }),
      createTestSword({ rarity: "Lendária", quality: 94 }),
      createTestSword({ rarity: "Lendária", quality: 90 }),
      createTestSword({ rarity: "Lendária", quality: 96 }),
    ];

    const currentSave: SaveData = {
      ...defaultSaveData,
      gallery: [...swords],
      wallet: { gold: 5000, rubies: 50, diamonds: 5 },
      inventory: {
        ...defaultSaveData.inventory,
        materials: { catalyst_astral: 2 },
      },
    };

    // 1. Initial write
    const initialWrite = writeSave(currentSave);
    assert.equal(initialWrite.ok, true);

    // 2. Simulate QuotaExceededError / Disk Full on next write
    mockStorage.setItem = () => {
      const err = new Error("Quota exceeded on localStorage");
      err.name = "QuotaExceededError";
      throw err;
    };

    const outcome = fuseSwords(swords, { useCatalyst: true });
    const result = executeSwordFusionTransaction(currentSave, outcome);

    // Assert fail-closed
    assert.equal(result.success, false, "Must fail closed on storage exception");
    assert.equal(result.code, "QUOTA_EXCEEDED");
    assert.equal(result.save.gallery.length, 4, "No swords should be consumed in memory save on storage failure");

    // Restore storage and verify state in disk/storage was never corrupted
    mockStorage.setItem = (key: string, val: string) => {
      memStore[key] = val;
    };
    const loaded = loadSave();
    assert.equal(loaded.gallery.length, 4, "Storage must remain completely intact with all 4 swords");
  });

  it("Pilar 1: Fail-Closed na Compra do Bazar — erro de storage não desconta moedas", () => {
    const memStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memStore[key];
      },
      clear: () => {
        for (const k in memStore) delete memStore[k];
      },
    };

    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const currentSave: SaveData = {
      ...defaultSaveData,
      wallet: { gold: 1000, rubies: 10, diamonds: 2 },
      inventory: { ...defaultSaveData.inventory, materials: { steel: 0 } },
    };

    writeSave(currentSave);

    // Simulate disk failure
    mockStorage.setItem = () => {
      throw new Error("Disk write IO failure");
    };

    const result = executeShopPurchaseTransaction(currentSave, {
      id: "steel",
      name: "Barra de Aço Nobre",
      type: "material",
      costGold: 140,
      quantity: 1,
    });

    assert.equal(result.success, false, "Purchase must fail closed on disk write failure");
    assert.equal(result.save.wallet.gold, 1000, "Wallet gold must not be deducted");

    mockStorage.setItem = (key: string, val: string) => {
      memStore[key] = val;
    };
    const loaded = loadSave();
    assert.equal(loaded.wallet.gold, 1000, "Storage wallet gold must remain 1000");
  });

  it("Pilar 1: Fail-Closed na Instalação de Peça — erro de storage aborta substituição", () => {
    const memStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memStore[key];
      },
      clear: () => {
        for (const k in memStore) delete memStore[k];
      },
    };

    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const sword = createTestSword();
    const component: InventoryComponent = {
      id: "comp_tsuba_test",
      name: "Tsuba Oriental Cinzelada",
      category: "guard",
      componentKey: "guard_tsuba",
      rarity: "Rara",
      icon: "🔘",
      description: "Disco tradicional",
      statModifier: { agilityBonus: 14, defenseBonus: 8 },
      acquiredAt: Date.now(),
    };

    const currentSave: SaveData = {
      ...defaultSaveData,
      gallery: [sword],
      inventory: {
        ...defaultSaveData.inventory,
        components: [component],
      },
    };

    writeSave(currentSave);

    mockStorage.setItem = () => {
      throw new Error("Storage quota exceeded");
    };

    const result = executeComponentInstallTransaction(currentSave, sword.id, component.id);
    assert.equal(result.success, false, "Component install must fail closed on storage failure");

    mockStorage.setItem = (key: string, val: string) => {
      memStore[key] = val;
    };
    const loaded = loadSave();
    assert.equal(loaded.inventory.components?.length, 1, "Component must remain in inventory on failure");
  });

  it("Pilar 1: Fail-Closed na Reivindicação de Recompensas Épicas", () => {
    const memStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memStore[key];
      },
      clear: () => {
        for (const k in memStore) delete memStore[k];
      },
    };

    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const sword = createTestSword({ claimedRewards: false });
    const currentSave: SaveData = {
      ...defaultSaveData,
      gallery: [sword],
      wallet: { gold: 100, rubies: 0, diamonds: 0 },
    };

    writeSave(currentSave);

    mockStorage.setItem = () => {
      throw new Error("Storage quota exceeded");
    };

    const rewards = {
      gold: 500,
      rubies: 2,
      diamonds: 0,
      items: [],
      rank: "S",
      title: "Forja Perfeita",
      loreSnippet: "Lenda viva",
    };

    sword.forgeRunId = "prestige_claim";
    sword.pendingRewards = { ...rewards, forgeRunId: sword.forgeRunId, scorePercent: 96 };
    const result = executeClaimRewardsTransaction(currentSave, sword.pendingRewards, sword);
    assert.equal(result.success, false, "Reward claim must fail closed on storage failure");

    mockStorage.setItem = (key: string, val: string) => {
      memStore[key] = val;
    };
    const loaded = loadSave();
    assert.equal(loaded.wallet.gold, 100, "Wallet must not update on disk error");
  });

  it("Pilar 1: Execução Positiva Transacional — Fusão consome 4 espadas e cria FusionCore", () => {
    const memStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memStore[key] ?? null,
      setItem: (key: string, val: string) => {
        memStore[key] = val;
      },
      removeItem: (key: string) => {
        delete memStore[key];
      },
      clear: () => {
        for (const k in memStore) delete memStore[k];
      },
    };

    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const swords = [
      createTestSword({ rarity: "Rara", quality: 80 }),
      createTestSword({ rarity: "Rara", quality: 82 }),
      createTestSword({ rarity: "Rara", quality: 85 }),
      createTestSword({ rarity: "Rara", quality: 84 }),
    ];

    const currentSave: SaveData = {
      ...defaultSaveData,
      gallery: [...swords],
      wallet: { gold: 5000, rubies: 50, diamonds: 5 },
      inventory: {
        ...defaultSaveData.inventory,
        materials: { catalyst_astral: 1 },
        fusionCores: [],
      },
    };

    writeSave(currentSave);

    const outcome = fuseSwords(swords, { useCatalyst: true });
    const result = executeSwordFusionTransaction(currentSave, outcome);

    assert.equal(result.success, true);
    assert.equal(result.save.gallery.length, 0, "4 donor swords must be consumed");
    assert.equal(result.save.inventory.fusionCores?.length, 1, "1 FusionCore must be created");
    assert.equal(result.save.inventory.materials?.catalyst_astral, 0, "Catalyst must be consumed");
    assert.ok(result.save.inventory.fusionCores![0].heritage, "Core must have heritage profile");
  });

  it("Pilar 2: 5 Armas de Referência com Identidade Real no Catálogo Canônico", () => {
    const presets = CANONICAL_PRESETS;
    assert.ok(presets.length >= 5, "Must have at least 5 benchmark reference weapons");

    const ids = presets.map((p) => p.id);
    assert.ok(ids.includes("guarda_medieval"), "Must include Medieval Comum (Espada de Guarda Nobre)");
    assert.ok(ids.includes("cimitarra_damasco"), "Must include Aço de Damasco (Cimitarra de Damasco)");
    assert.ok(ids.includes("lua_silenciosa"), "Must include Oriental/Katana (Lua Silenciosa)");
    assert.ok(ids.includes("folha_aereth"), "Must include Élfica (Folha de Aereth)");
    assert.ok(ids.includes("queda_asterion"), "Must include Meteórica Lendária (Queda de Asterion)");

    // Test each preset's combat role & attributes
    for (const preset of presets) {
      const stats = calculateSwordAttributes(preset.design, 92, 0.02, 90, 92, 90);
      assert.ok(stats.combatRole, `Preset ${preset.id} must have a designated combat role`);
      assert.ok(stats.damage > 0, `Preset ${preset.id} must have positive damage`);
      assert.ok(stats.defense > 0, `Preset ${preset.id} must have positive defense`);
      assert.ok(stats.agility > 0, `Preset ${preset.id} must have positive agility`);
      assert.ok(stats.durability > 0, `Preset ${preset.id} must have positive durability`);
    }

    // Role Specialization Assertions
    const medieval = presets.find((p) => p.id === "guarda_medieval")!;
    const damasco = presets.find((p) => p.id === "cimitarra_damasco")!;
    const katana = presets.find((p) => p.id === "lua_silenciosa")!;
    const elven = presets.find((p) => p.id === "folha_aereth")!;
    const meteor = presets.find((p) => p.id === "queda_asterion")!;

    const statsMed = calculateSwordAttributes(medieval.design, 90, 0.02, 90, 90, 90);
    const statsDam = calculateSwordAttributes(damasco.design, 90, 0.02, 90, 90, 90);
    const statsKat = calculateSwordAttributes(katana.design, 90, 0.02, 90, 90, 90);
    const statsElv = calculateSwordAttributes(elven.design, 90, 0.02, 90, 90, 90);
    const statsMet = calculateSwordAttributes(meteor.design, 90, 0.02, 90, 90, 90);

    // Katana must be highly agile
    assert.equal(statsKat.combatRole, "Ágil");
    assert.ok(statsKat.agility > statsMed.agility, "Katana must have superior agility over medieval longsword");

    // Damasco / Falchion must be offensive
    assert.equal(statsDam.combatRole, "Ofensiva");
    assert.ok(statsDam.damage > statsMed.damage, "Damasco curved blade must have higher offensive strike");

    // Asterion (Meteor) must be Exceptional
    assert.equal(statsMet.combatRole, "Excepcional");
    assert.ok(statsMet.damage >= 280, "Meteor masterwork must have formidable cutting power");
  });
});
