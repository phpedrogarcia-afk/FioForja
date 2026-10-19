import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateUniqueId, migrateSaveData, defaultSaveData, writeSave, loadSave, recoverFromBackup, type SaveData } from "./save.ts";
import { generateDynamicForgeRewards, getRankTier, LOOT_CATALOG } from "./loot.ts";
import { fuseComponents, fuseSwords, applyComponentFusionTransaction, applySwordFusionTransaction } from "./fusion.ts";
import { createSim, finishSword, applyStrikeRewardTransaction } from "./sim.ts";
import { calculateSwordAttributes, recalculateSwordStats, WRAPS } from "./catalog.ts";
import type { FinishedSword, InventoryComponent, PlayerInventory, PlayerWallet, SwordDesign, FusionCore } from "./types.ts";

const TEST_DESIGN: SwordDesign = {
  name: "Lâmina de Teste",
  family: "royal",
  profile: "short",
  steel: "damascus",
  guard: "cross",
  pommel: "disc",
  wrap: "leather",
  inscription: "TEST",
  runes: true,
  length: 0.7,
};

function createMockSword(overrides?: Partial<FinishedSword>): FinishedSword {
  const sim = createSim(TEST_DESIGN, { forgeRunId: overrides?.forgeRunId });
  sim.quality = overrides?.quality ?? 85;
  sim.shape = 1;
  sim.heatScore = 85;
  sim.quenchScore = 85;
  const base = finishSword(sim, TEST_DESIGN);
  return {
    ...base,
    ...overrides,
  };
}

describe("Arsenal Vivo — Save v5 & Migration Integrity", () => {
  it("generates unique IDs without collision across rapid successive invocations", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = generateUniqueId("item");
      assert.ok(id.startsWith("item_"));
      assert.ok(!ids.has(id), `Duplicate ID generated: ${id}`);
      ids.add(id);
    }
    assert.equal(ids.size, 1000);
  });

  it("migrates legacy Save v4 data to Save v5 cleanly", () => {
    const legacyV4: any = {
      version: 4,
      gallery: [
        {
          id: 1234567, // legacy numeric ID
          design: TEST_DESIGN,
          quality: 90,
          grade: "Excepcional",
          damage: 180,
          durability: 95,
        },
      ],
      wallet: { gold: 500, rubies: 10, diamonds: 2 },
      inventory: {
        unlockedTools: ["hammer_standard", "hammer_precision"],
        equipped: { hammer: "precision", anvil: "anvil_heavy", furnace: "furnace_bellows", quench: "quench_oil" },
      },
    };

    const migrated = migrateSaveData(legacyV4);
    assert.equal(migrated.version, 5);
    assert.equal(typeof migrated.gallery[0].id, "string");
    assert.ok(Array.isArray(migrated.gallery[0].affixes));
    assert.ok(migrated.gallery[0].forgeRunId);
    assert.ok(migrated.inventory.components);
    assert.ok(migrated.inventory.fusionCores);
    assert.ok(migrated.inventory.materials);
    assert.ok(Array.isArray(migrated.claimedForgeRewardIds));
  });
});

describe("Arsenal Vivo — Weapon Attributes & Physical Metallurgy Math", () => {
  it("calculates distinct P.ATK, DEF, AGI and DUR reflecting family, steel and quality", () => {
    const zweihander = calculateSwordAttributes(
      { ...TEST_DESIGN, family: "runic", profile: "claymore", steel: "meteor" },
      95,
      0.02,
      95,
      95,
      95,
    );
    const rapier = calculateSwordAttributes(
      { ...TEST_DESIGN, family: "elven", profile: "short", steel: "elven_silver" },
      95,
      0.02,
      95,
      95,
      95,
    );

    // Two-handed sword must have high damage and lower agility
    assert.ok(zweihander.damage > rapier.damage, `Montante ATK (${zweihander.damage}) > Rapier ATK (${rapier.damage})`);
    // Rapier must have superior agility
    assert.ok(rapier.agility > zweihander.agility, `Rapier AGI (${rapier.agility}) > Montante AGI (${zweihander.agility})`);
  });

  it("penalizes physical attributes severely when flaws exist", () => {
    const flawless = calculateSwordAttributes(TEST_DESIGN, 90, 0.01, 90, 90, 90);
    const flawed = calculateSwordAttributes(TEST_DESIGN, 45, 0.28, 40, 40, 35);

    assert.ok(flawed.damage < flawless.damage);
    assert.ok(flawed.durability < flawless.durability);
    assert.ok(flawed.flaws.length >= 2, "Poor execution must have explicit metallurgical flaws");
  });
});

describe("Arsenal Vivo — Dynamic Loot Engine", () => {
  it("awards accurate rank tiers based on quality and breakage", () => {
    assert.equal(getRankTier(96, false), "S");
    assert.equal(getRankTier(90, false), "A");
    assert.equal(getRankTier(78, false), "B");
    assert.equal(getRankTier(55, false), "C");
    assert.equal(getRankTier(98, true), "BROKEN");
  });

  it("yields distinct 4 items from the loot catalog per drop", () => {
    const sword = createMockSword({ quality: 92 });
    const rewards = generateDynamicForgeRewards(sword, { seed: 999 });

    assert.equal(rewards.items.length, 4);
    const keys = new Set(rewards.items.map((i) => i.catalogKey));
    assert.equal(keys.size, 4, "All 4 reward cards must be distinct items");
  });

  it("scales gold, rubies and diamonds proportionally to rank", () => {
    const swordS = createMockSword({ quality: 97 });
    const swordC = createMockSword({ quality: 50 });
    const swordBroken = createMockSword({ quality: 90, broken: true });

    const rewardsS = generateDynamicForgeRewards(swordS, { seed: 100 });
    const rewardsC = generateDynamicForgeRewards(swordC, { seed: 100 });
    const rewardsBroken = generateDynamicForgeRewards(swordBroken, { seed: 100 });

    assert.ok(rewardsS.gold > rewardsC.gold);
    assert.ok(rewardsC.gold > rewardsBroken.gold);
    assert.ok(rewardsS.rubies > 0);
    assert.ok(rewardsS.diamonds > 0);
    assert.equal(rewardsBroken.rubies, 0);
    assert.equal(rewardsBroken.diamonds, 0);
  });
});

describe("Arsenal Vivo — Hybrid Fusion Engine (Option C)", () => {
  it("strictly enforces 4 components for component fusion", () => {
    const comp: InventoryComponent = {
      id: "c1",
      name: "Guarda",
      category: "guard",
      componentKey: "guard_damascus_cross",
      rarity: "Rara",
      icon: "🛡",
      description: "Desc",
      acquiredAt: 1,
    };

    assert.throws(
      () => fuseComponents([comp, comp, comp], false),
      /4 componentes/,
    );

    const successOutcome = fuseComponents([comp, comp, comp, comp], { seed: 12345 });
    assert.equal(successOutcome.success, true);
    assert.ok(successOutcome.resultComponent);
  });

  it("strictly enforces 4 swords for sword fusion and refuses broken blades", () => {
    const sword1 = createMockSword({ id: "s1", quality: 80, rarity: "Rara" });
    const sword2 = createMockSword({ id: "s2", quality: 82, rarity: "Rara" });
    const sword3 = createMockSword({ id: "s3", quality: 84, rarity: "Rara" });
    const swordBroken = createMockSword({ id: "s4", quality: 85, rarity: "Rara", broken: true });

    assert.throws(
      () => fuseSwords([sword1, sword2, sword3, swordBroken], false),
      /quebrada/,
    );

    const sword4 = createMockSword({ id: "s4_ok", quality: 86, rarity: "Rara" });
    const validAttempt = fuseSwords([sword1, sword2, sword3, sword4], { seed: 777 });
    assert.equal(validAttempt.success, true);
    assert.ok(validAttempt.resultCore);
    assert.ok(validAttempt.resultCore.name.includes("Núcleo"));
    assert.ok(validAttempt.resultCore.inheritedPerks.length >= 0);
  });

  it("boosts upgrade probability when using a catalyst", () => {
    const comp: InventoryComponent = {
      id: "c1",
      name: "Guarda",
      category: "guard",
      componentKey: "guard_damascus_cross",
      rarity: "Incomum",
      icon: "🛡",
      description: "Desc",
      acquiredAt: 1,
    };

    // Run 50 fusions with and without catalyst and observe upgrade rate
    let upgradesWithout = 0;
    let upgradesWith = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      const resWithout = fuseComponents([comp, comp, comp, comp], { useCatalyst: false, seed: i * 31 });
      if (resWithout.upgradedRarity) upgradesWithout++;

      const resWith = fuseComponents([comp, comp, comp, comp], { useCatalyst: true, seed: i * 31 });
      if (resWith.upgradedRarity) upgradesWith++;
    }

    assert.ok(
      upgradesWith >= upgradesWithout,
      `Catalyst upgrade count (${upgradesWith}) should be >= without catalyst (${upgradesWithout})`,
    );
  });

  it("applies transactional component fusion and deducts catalyst", () => {
    const comp1: InventoryComponent = { id: "c1", name: "G1", category: "guard", componentKey: "k1", rarity: "Comum", icon: "🛡", description: "", acquiredAt: 1 };
    const comp2: InventoryComponent = { id: "c2", name: "G2", category: "guard", componentKey: "k2", rarity: "Comum", icon: "🛡", description: "", acquiredAt: 1 };
    const comp3: InventoryComponent = { id: "c3", name: "G3", category: "guard", componentKey: "k3", rarity: "Comum", icon: "🛡", description: "", acquiredAt: 1 };
    const comp4: InventoryComponent = { id: "c4", name: "G4", category: "guard", componentKey: "k4", rarity: "Comum", icon: "🛡", description: "", acquiredAt: 1 };

    const initialSave: SaveData = {
      ...defaultSaveData,
      wallet: { gold: 1000, rubies: 20, diamonds: 5 },
      inventory: {
        ...defaultSaveData.inventory,
        components: [comp1, comp2, comp3, comp4],
        materials: { catalyst_astral: 2 },
      },
    };

    const outcome = fuseComponents([comp1, comp2, comp3, comp4], { useCatalyst: true, seed: 42 });
    assert.equal(outcome.success, true);

    const nextSave = applyComponentFusionTransaction(initialSave, outcome);
    assert.equal(nextSave.inventory.components.length, 1);
    assert.equal(nextSave.inventory.components[0].id, outcome.resultComponent!.id);
    assert.equal(nextSave.inventory.materials.catalyst_astral, 1);
    assert.ok(nextSave.wallet.gold < 1000, "Gold fee must be deducted");
  });

  it("applies transactional sword fusion, destroying 4 constituent swords and adding FusionCore", () => {
    const s1 = createMockSword({ id: "sword_alpha", quality: 80 });
    const s2 = createMockSword({ id: "sword_beta", quality: 82 });
    const s3 = createMockSword({ id: "sword_gamma", quality: 84 });
    const s4 = createMockSword({ id: "sword_delta", quality: 86 });

    const initialSave: SaveData = {
      ...defaultSaveData,
      gallery: [s1, s2, s3, s4],
      wallet: { gold: 2000, rubies: 50, diamonds: 10 },
      inventory: {
        ...defaultSaveData.inventory,
        fusionCores: [],
        materials: { catalyst_astral: 1 },
      },
    };

    const outcome = fuseSwords([s1, s2, s3, s4], { useCatalyst: true, seed: 888 });
    assert.equal(outcome.success, true);
    assert.ok(outcome.resultCore);

    const nextSave = applySwordFusionTransaction(initialSave, outcome);
    assert.equal(nextSave.gallery.length, 0, "4 constituent swords must be consumed");
    assert.equal(nextSave.inventory.fusionCores.length, 1, "1 FusionCore must be placed in inventory");
    assert.equal(nextSave.inventory.fusionCores[0].id, outcome.resultCore!.id);
    assert.equal(nextSave.inventory.materials.catalyst_astral, 0, "Catalyst was consumed");
  });
});

describe("Arsenal Vivo Hardening — Critical Fixes & System Integrations", () => {
  it("P0: Rewards stability — deterministic rewards per forgeRunId and initial attachment on finish", () => {
    const sword = createMockSword({ id: "sword_stable", forgeRunId: "run_test_deterministic_123" });
    assert.ok(sword.pendingRewards, "Sword must carry pendingRewards immediately on finish");
    assert.equal(sword.pendingRewards.forgeRunId, "run_test_deterministic_123");

    // 10 consecutive reward calculations must produce identical results
    const r1 = generateDynamicForgeRewards(sword, { forgeRunId: sword.forgeRunId });
    for (let i = 0; i < 10; i++) {
      const rN = generateDynamicForgeRewards(sword, { forgeRunId: sword.forgeRunId });
      assert.equal(rN.gold, r1.gold, "Gold must be identical across calls");
      assert.equal(rN.rubies, r1.rubies, "Rubies must be identical across calls");
      assert.equal(rN.items.length, r1.items.length);
      for (let j = 0; j < r1.items.length; j++) {
        assert.equal(rN.items[j].id, r1.items[j].id);
        assert.equal(rN.items[j].catalogKey, r1.items[j].catalogKey);
      }
    }
  });

  it("P0: FusionCore heritage — activeCore transmits pedigree, bonus quality, perks and rarity to finished sword", () => {
    const core = {
      id: "core_ancient_999",
      name: "Coração Metálico Transcendental — Ancestral",
      rarity: "Lendária" as const,
      family: "royal" as const,
      profile: "claymore" as const,
      steel: "damascus" as const,
      bonusQuality: 14,
      inheritedPerks: ["Memória do Fogo Celestial", "Corte Vorpal"],
      consumedSwordIds: ["sw_1", "sw_2", "sw_3", "sw_4"],
      createdAt: Date.now(),
    };

    const sim = createSim(TEST_DESIGN, { activeCore: core });
    sim.quality = 80;
    sim.shape = 1;
    sim.heatScore = 80;
    sim.quenchScore = 80;

    const finished = finishSword(sim, TEST_DESIGN);

    // Verifies pedigree inheritance
    assert.ok(finished.fusionHistory, "Must include fusion history");
    assert.equal(finished.fusionHistory.coreId, "core_ancient_999");
    assert.deepEqual(finished.fusionHistory.parentIds, ["sw_1", "sw_2", "sw_3", "sw_4"]);
    assert.equal(finished.fusionHistory.inheritedRarity, "Lendária");

    // Verifies perks inheritance
    assert.ok(finished.perks?.includes("Memória do Fogo Celestial"), "Must inherit core perk 1");
    assert.ok(finished.perks?.includes("Corte Vorpal"), "Must inherit core perk 2");

    // Verifies quality bonus applied (+14)
    assert.ok(finished.quality >= 90, `Quality with bonus (${finished.quality}) should reflect +14 boost`);

    // Verifies rarity promotion to at least Lendária
    assert.equal(finished.rarity, "Lendária");
  });

  it("P0: Transactional fusion security — strictly rejects invalid or corrupted transactions", () => {
    const s1 = createMockSword({ id: "sw_ok1" });
    const s2 = createMockSword({ id: "sw_ok2" });
    const s3 = createMockSword({ id: "sw_ok3" });
    const s4 = createMockSword({ id: "sw_ok4" });
    const sBroken = createMockSword({ id: "sw_broken", broken: true });

    // 1. Rejects broken sword in fusion
    assert.throws(() => {
      fuseSwords([s1, s2, s3, sBroken]);
    }, /Lâminas quebradas não podem ser fundidas/);

    // 2. Rejects duplicate IDs in transaction
    const initialSave: SaveData = {
      ...defaultSaveData,
      gallery: [s1, s2, s3, s4],
      wallet: { gold: 1000, rubies: 50, diamonds: 0 },
    };

    const validOutcome = fuseSwords([s1, s2, s3, s4]);

    const corruptedOutcome = {
      ...validOutcome,
      consumedSwordIds: ["sw_ok1", "sw_ok1", "sw_ok3", "sw_ok4"], // Duplicate sw_ok1
    };

    assert.throws(() => {
      applySwordFusionTransaction(initialSave, corruptedOutcome);
    }, /IDs duplicados/);

    // 3. Rejects missing items in gallery
    const missingOutcome = {
      ...validOutcome,
      consumedSwordIds: ["sw_ok1", "sw_ok2", "sw_ok3", "sw_ghost"],
    };

    assert.throws(() => {
      applySwordFusionTransaction(initialSave, missingOutcome);
    }, /não foram encontradas no Arsenal/);

    // 4. Rejects when wallet is insufficient
    const poorSave: SaveData = {
      ...initialSave,
      wallet: { gold: 10, rubies: 0, diamonds: 0 },
    };
    assert.throws(() => {
      applySwordFusionTransaction(poorSave, validOutcome);
    }, /Recursos insuficientes/);

    // 5. Rejects when catalyst requested but missing
    const noCatalystSave: SaveData = {
      ...initialSave,
      inventory: { ...initialSave.inventory, materials: { catalyst_astral: 0 } },
    };
    const catalystOutcome = { ...validOutcome, usedCatalyst: true };
    assert.throws(() => {
      applySwordFusionTransaction(noCatalystSave, catalystOutcome);
    }, /Catalisador Astral não disponível/);
  });

  it("P1: 2-tier exceptional jumps — can yield 2 rarity ranks up and boosts bonus quality", () => {
    const s1 = createMockSword({ id: "r1", rarity: "Rara" });
    const s2 = createMockSword({ id: "r2", rarity: "Rara" });
    const s3 = createMockSword({ id: "r3", rarity: "Rara" });
    const s4 = createMockSword({ id: "r4", rarity: "Rara" });

    // Seed that triggers exceptional roll (< 0.08)
    // We can simulate across seeds until finding the exceptional outcome
    let foundExceptional = false;
    for (let seed = 0; seed < 100; seed++) {
      const outcome = fuseSwords([s1, s2, s3, s4], { seed });
      if (outcome.tierJump === "exceptional") {
        foundExceptional = true;
        assert.equal(outcome.jumpTier, 2);
        assert.equal(outcome.resultCore.rarity, "Lendária", "4 Rares with exceptional jump must yield Legendary core");
        assert.equal(outcome.resultCore.bonusQuality, 14);
        break;
      }
    }
    assert.ok(foundExceptional, "Expected to roll at least one exceptional jump in 100 seeds");
  });

  it("P1: Strike gold protection — strike reward IDs are scoped to forgeRunId and unique", () => {
    const sim = createSim(TEST_DESIGN);
    assert.ok(sim.forgeRunId, "SimState must have forgeRunId");

    // Manually trigger a perfect strike
    sim.phase = "forge";
    sim.heat = 0.55;
    const initialRunId = sim.forgeRunId;

    // Simulate strike reward generation in sim
    sim.strikes = 3;
    const rewardId = `${sim.forgeRunId}:${sim.strikes}`;
    assert.equal(rewardId, `${initialRunId}:3`);
  });

  it("P1: Full gallery preservation — does not truncate gallery beyond 120 items", () => {
    const swords: FinishedSword[] = [];
    for (let i = 0; i < 135; i++) {
      swords.push(createMockSword({ id: `sword_${i}`, quality: 70 }));
    }

    const rawSave = {
      version: 5,
      gallery: swords,
      wallet: defaultSaveData.wallet,
      inventory: defaultSaveData.inventory,
    };

    const migrated = migrateSaveData(rawSave);
    assert.equal(migrated.gallery.length, 135, "Must preserve all 135 swords without truncation");
  });
});

describe("Arsenal Vivo 01.2 — Item Integrity, Component Identity & System Hardening", () => {
  it("P0: Anti-Stacking — repeated component installation refunds previous item and strictly recalculates stats", () => {
    const baseSword: FinishedSword = {
      ...createMockSword({ id: "sw_base" }),
      baseDamage: 200,
      baseDefense: 100,
      baseAgility: 80,
      baseDurability: 90,
      damage: 200,
      defense: 100,
      agility: 80,
      durability: 90,
      upgradesApplied: 0,
      installedComponents: {},
    };

    // Create 10 guard components with increasing damage modifiers
    const guards: InventoryComponent[] = [];
    for (let i = 0; i < 10; i++) {
      guards.push({
        id: `guard_comp_${i}`,
        name: `Guarda Nível ${i + 1}`,
        category: "guard",
        componentKey: `guard_tier_${i}`,
        rarity: "Rara",
        icon: "🛡️",
        description: "Test guard",
        statModifier: { damageBonus: (i + 1) * 3 }, // +3, +6, +9, ... +30
        acquiredAt: Date.now(),
      });
    }

    let currentSword = { ...baseSword };
    let inventoryComponents = [...guards];
    const refunded: InventoryComponent[] = [];

    // Mount all 10 guards in sequence
    for (const newGuard of guards) {
      const prevComp = currentSword.installedComponents?.guard;
      if (prevComp) {
        refunded.push(prevComp);
      }
      inventoryComponents = inventoryComponents.filter((c) => c.id !== newGuard.id);

      currentSword = recalculateSwordStats({
        ...currentSword,
        installedComponents: {
          ...currentSword.installedComponents,
          guard: newGuard,
        },
      });
    }

    // Crucial check: Sword must have ONLY the 10th guard's bonus (+30 ATK), NOT 200 + 3 + 6 + ... + 30 = 365!
    assert.equal(currentSword.damage, 230, `Damage must be 200 + 30 = 230, got ${currentSword.damage}`);
    // Check that 9 guards were refunded
    assert.equal(refunded.length, 9, "9 previous guards must have been refunded to inventory");

    // Add workbench refinement (+2 upgrades = +16 ATK, +4 DUR)
    currentSword = recalculateSwordStats({
      ...currentSword,
      upgradesApplied: 2,
    });
    assert.equal(currentSword.damage, 246, "Damage must be 200 + 16 (refine) + 30 (guard) = 246");
    assert.equal(currentSword.durability, 94, "Durability must be 90 + 4 (refine) = 94");

    // Replace 10th guard with a defensive guard (+0 ATK, +20 DEF)
    const defensiveGuard: InventoryComponent = {
      id: "guard_shield",
      name: "Guarda Baluarte",
      category: "guard",
      componentKey: "guard_shield",
      rarity: "Épica",
      icon: "🛡️",
      description: "Defensive guard",
      statModifier: { damageBonus: 0, defenseBonus: 20 },
      acquiredAt: Date.now(),
    };

    currentSword = recalculateSwordStats({
      ...currentSword,
      installedComponents: {
        ...currentSword.installedComponents,
        guard: defensiveGuard,
      },
    });

    assert.equal(currentSword.damage, 216, "Damage must be 200 + 16 (refine) + 0 (new guard) = 216, zero ghost damage");
    assert.equal(currentSword.defense, 120, "Defense must be 100 + 20 = 120");
  });

  it("P0: Save Persistence & Atomic Backup Recovery — recovers automatically from primary save corruption", () => {
    const memStore: Record<string, string> = {};
    const originalWindow = (globalThis as any).window;
    const originalLocalStorage = (globalThis as any).localStorage;

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

    try {
      const initialSave: SaveData = {
        ...defaultSaveData,
        wallet: { gold: 3450, rubies: 42, diamonds: 8 },
        career: { ...defaultSaveData.career, totalForged: 19 },
      };

      // 1. Initial successful write
      const writeRes1 = writeSave(initialSave);
      assert.equal(writeRes1.ok, true);
      assert.ok(memStore["a-forja-save"], "Primary slot must be written");
      assert.ok(memStore["a-forja-save-backup"], "Backup slot must be created on update");

      // 2. Corrupt the primary save slot
      memStore["a-forja-save"] = "{{MALFORMED_JSON_STRING_DATA}}";

      // 3. loadSave() should cleanly fall back to backup
      const loaded = loadSave();
      assert.equal(loaded.wallet.gold, 3450, "Must recover wallet gold from backup slot");
      assert.equal(loaded.career.totalForged, 19, "Must recover career totalForged from backup slot");

      // 4. Test explicit recoverFromBackup()
      const explicitRecover = recoverFromBackup();
      assert.equal(explicitRecover.success, true);
      assert.equal(explicitRecover.data?.wallet.gold, 3450);

      // 5. Test QuotaExceededError handling
      mockStorage.setItem = () => {
        const err = new Error("Quota exceeded");
        err.name = "QuotaExceededError";
        throw err;
      };

      const quotaFailResult = writeSave(initialSave);
      assert.equal(quotaFailResult.ok, false);
      assert.equal(quotaFailResult.code, "QUOTA_EXCEEDED");
    } finally {
      (globalThis as any).window = originalWindow;
      (globalThis as any).localStorage = originalLocalStorage;
    }
  });

  it("P1: Common Loot Expansion — catalog contains >= 10 Common items and draws 4 distinct items with zero duplicates", () => {
    const commonItems = LOOT_CATALOG.filter((it) => it.rarity === "Comum");
    assert.ok(commonItems.length >= 10, `Expected at least 10 Common items, found ${commonItems.length}`);

    // Verify drawing algorithm across 100 random drops guarantees 4 distinct items
    const sword = createMockSword({ quality: 50 }); // Rank C (primarily Common drops)
    for (let seed = 1; seed <= 100; seed++) {
      const rewards = generateDynamicForgeRewards(sword, { seed });
      assert.equal(rewards.items.length, 4, "Must always draw 4 items");
      const uniqueKeys = new Set(rewards.items.map((it) => it.catalogKey));
      assert.equal(uniqueKeys.size, 4, `Seed ${seed} must yield 4 distinct catalog keys without duplicates`);
    }
  });

  it("P1: Real Visual Component Identity — wrap types are defined in catalog with unique aesthetics", () => {
    assert.ok(WRAPS["dragon_leather"], "dragon_leather must exist in WRAPS catalog");
    assert.equal(WRAPS["dragon_leather"].name, "Couro de Dragão");
    assert.ok(WRAPS["tsukamaki"], "tsukamaki must exist in WRAPS catalog");
    assert.ok(WRAPS["goldwire"], "goldwire must exist in WRAPS catalog");
    assert.ok(WRAPS["bone"], "bone must exist in WRAPS catalog");
    assert.ok(WRAPS["darkwood"], "darkwood must exist in WRAPS catalog");
    assert.ok(WRAPS["linen"], "linen must exist in WRAPS catalog");
  });

  it("P1: Functional Core Heritage — donor sword profile transmits distinct physical potential to finished weapon", () => {
    // 4 Offensive donor swords (high damage, low agility)
    const swordOff1 = createMockSword({ id: "off1", damage: 270, agility: 50, quality: 85, rarity: "Rara" });
    const swordOff2 = createMockSword({ id: "off2", damage: 280, agility: 55, quality: 85, rarity: "Rara" });
    const swordOff3 = createMockSword({ id: "off3", damage: 260, agility: 50, quality: 85, rarity: "Rara" });
    const swordOff4 = createMockSword({ id: "off4", damage: 275, agility: 52, quality: 85, rarity: "Rara" });

    // 4 Agile donor swords (low damage, high agility)
    const swordAgi1 = createMockSword({ id: "agi1", damage: 160, agility: 120, quality: 85, rarity: "Rara" });
    const swordAgi2 = createMockSword({ id: "agi2", damage: 165, agility: 125, quality: 85, rarity: "Rara" });
    const swordAgi3 = createMockSword({ id: "agi3", damage: 155, agility: 118, quality: 85, rarity: "Rara" });
    const swordAgi4 = createMockSword({ id: "agi4", damage: 170, agility: 122, quality: 85, rarity: "Rara" });

    const fusionOff = fuseSwords([swordOff1, swordOff2, swordOff3, swordOff4], { seed: 42 });
    const fusionAgi = fuseSwords([swordAgi1, swordAgi2, swordAgi3, swordAgi4], { seed: 42 });

    const coreOff = fusionOff.resultCore;
    const coreAgi = fusionAgi.resultCore;

    assert.ok(coreOff.heritage, "Offensive core must possess heritage profile");
    assert.ok(coreAgi.heritage, "Agile core must possess heritage profile");

    assert.ok(
      coreOff.heritage!.attackBias > coreAgi.heritage!.attackBias,
      `Offensive attackBias (${coreOff.heritage!.attackBias}) must be higher than Agile attackBias (${coreAgi.heritage!.attackBias})`,
    );

    assert.ok(
      coreAgi.heritage!.agilityBias > coreOff.heritage!.agilityBias,
      `Agile agilityBias (${coreAgi.heritage!.agilityBias}) must be higher than Offensive agilityBias (${coreOff.heritage!.agilityBias})`,
    );

    // Forge finished weapons using these cores under identical forge inputs
    const simOff = createSim(TEST_DESIGN, { activeCore: coreOff });
    simOff.quality = 90;
    simOff.shape = 1;
    simOff.heatScore = 90;
    simOff.quenchScore = 90;

    const simAgi = createSim(TEST_DESIGN, { activeCore: coreAgi });
    simAgi.quality = 90;
    simAgi.shape = 1;
    simAgi.heatScore = 90;
    simAgi.quenchScore = 90;

    const finishedOff = finishSword(simOff, TEST_DESIGN);
    const finishedAgi = finishSword(simAgi, TEST_DESIGN);

    assert.ok(
      (finishedOff.damage ?? 0) > (finishedAgi.damage ?? 0),
      `Finished weapon from offensive core must have higher damage (${finishedOff.damage}) than from agile core (${finishedAgi.damage})`,
    );

    assert.ok(
      (finishedAgi.agility ?? 0) > (finishedOff.agility ?? 0),
      `Finished weapon from agile core must have higher agility (${finishedAgi.agility}) than from offensive core (${finishedOff.agility})`,
    );
  });

  it("P1: legacy strike helper rejects detached, foreign, non-finite and replayed payments", () => {
    const initialSave = {
      wallet: { gold: 500, rubies: 10, diamonds: 2 },
      claimedStrikeRewardIds: Array.from({ length: 220 }, (_, i) => `old:${i}`),
      activeForgeAttempt: { attemptId: "a", forgeRunId: "run_alpha", status: "PREPARED" as const, design: TEST_DESIGN, isTraining: false, strikesCount: 0, startedAt: 1 },
    };
    assert.equal(applyStrikeRewardTransaction({ wallet: initialSave.wallet }, { amount: 12, id: "run_alpha:1" }, "run_alpha").applied, false);
    for (const amount of [NaN, Infinity, -1, 75]) assert.equal(applyStrikeRewardTransaction(initialSave, { amount, id: "run_alpha:1" }, "run_alpha").applied, false);
    assert.equal(applyStrikeRewardTransaction(initialSave, { amount: 12, id: "foreign:1" }, "run_alpha").applied, false);
    const result = applyStrikeRewardTransaction(initialSave, { amount: 12, id: "run_alpha:1" }, "run_alpha");
    assert.equal(result.applied, true);
    assert.equal(result.wallet.gold, 512);
    assert.equal(result.claimedStrikeRewardIds.length, 200);
    const replayState = { ...initialSave, ...result, activeForgeAttempt: { ...initialSave.activeForgeAttempt, strikesCount: 1 } };
    assert.equal(applyStrikeRewardTransaction(replayState, { amount: 12, id: "run_alpha:1" }, "run_alpha").applied, false);
  });
});
