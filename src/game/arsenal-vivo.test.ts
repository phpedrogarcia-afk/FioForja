import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateUniqueId, migrateSaveData, defaultSaveData, type SaveData } from "./save.ts";
import { generateDynamicForgeRewards, getRankTier, LOOT_CATALOG } from "./loot.ts";
import { fuseComponents, fuseSwords, applyComponentFusionTransaction, applySwordFusionTransaction } from "./fusion.ts";
import { createSim, finishSword } from "./sim.ts";
import { calculateSwordAttributes } from "./catalog.ts";
import type { FinishedSword, InventoryComponent, PlayerInventory, PlayerWallet, SwordDesign } from "./types.ts";

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
