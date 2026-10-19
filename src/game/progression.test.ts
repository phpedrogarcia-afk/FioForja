import { describe, it } from "node:test";
import { playForgeAttempt } from "./forge-test-helpers.ts";
import assert from "node:assert/strict";
import {
  executeStartForgeTransaction,
  executeCancelForgeTransaction,
  executeFinishSwordTransaction,
  executeClaimRewardsTransaction,
  executeDeliverCommissionTransaction,
  executeRecycleScrapTransaction,
  retryPersistSave,
} from "./transactions.ts";
import {
  CANONICAL_MATERIALS,
  getMaterialStock,
  getRequiredMaterialForSteel,
} from "./materials.ts";
import { evaluateBlueprintStatus } from "./blueprints.ts";
import {
  defaultSaveData,
  defaultInventory,
  defaultCareer,
  migrateSave,
} from "./save.ts";
import { CANONICAL_PRESETS } from "./catalog.ts";
import { createSim, finishSword, generateForgeRewards } from "./sim.ts";
import type { FusionCore, SaveData, SwordDesign } from "./types.ts";

describe("Operação 03: O Ciclo do Ferreiro — Testes Adversariais de Progressão e Economia", () => {
  // Helper to setup mock memory storage
  const setupMockStorage = () => {
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
      length: 0,
      key: () => null,
    };
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = { localStorage: mockStorage };
    return { memStore, mockStorage };
  };

  it("1. Não iniciar forja especial sem material", () => {
    setupMockStorage();
    const save: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        unlockedBlueprints: ["guarda_medieval", "cimitarra_damasco"],
        materials: {
          iron_ingot: 5,
          damascus_billet: 0, // 0 Damascus
        },
      },
    };

    const damascusDesign: SwordDesign = {
      name: "Cimitarra de Teste",
      family: "damascus",
      profile: "falchion",
      steel: "damascus",
      wrap: "darkwood",
      guard: "curved",
      pommel: "disc",
      inscription: "",
      runes: false,
      length: 1.0,
    };

    const res = executeStartForgeTransaction(save, damascusDesign, { isTraining: false });
    assert.equal(res.success, false, "Must fail closed when material stock is 0");
    assert.equal(res.code, "INSUFFICIENT_MATERIALS");
    assert.equal(res.save.inventory.materials.damascus_billet, 0);
  });

  it("2. Não consumir material duas vezes", () => {
    setupMockStorage();
    const initialIron = 4;
    const save: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        materials: { iron_ingot: initialIron },
      },
    };

    const ironDesign: SwordDesign = {
      name: "Guarda da Fronteira",
      family: "iron",
      profile: "long",
      steel: "iron",
      wrap: "leather",
      guard: "cross",
      pommel: "disc",
      inscription: "LOYAL",
      runes: false,
      length: 0.95,
    };

    // First start: consumes 1x
    const res1 = executeStartForgeTransaction(save, ironDesign);
    assert.equal(res1.success, true);
    assert.equal(res1.save.inventory.materials.iron_ingot, initialIron - 1);
    assert.ok(res1.save.activeForgeAttempt);

    // Finishing the forge does NOT consume another ingot
    const played = playForgeAttempt(res1.save);
    const resFinish = executeFinishSwordTransaction(played.save, played.sim, ironDesign);
    assert.equal(resFinish.success, true);
    assert.equal(resFinish.save.inventory.materials.iron_ingot, initialIron - 1, "Must not double charge on finish");
    assert.equal(resFinish.save.activeForgeAttempt, null, "Attempt must be cleared");
  });

  it("3. Não consumir material ao apenas visualizar projeto", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);
    const initialDamascus = save.inventory.materials.damascus_billet ?? 0;

    const cimitarraPreset = CANONICAL_PRESETS.find((p) => p.id === "cimitarra_damasco")!;
    const status = evaluateBlueprintStatus(cimitarraPreset, save.inventory, save.career, save.gallery);

    assert.ok(status);
    assert.equal(save.inventory.materials.damascus_billet ?? 0, initialDamascus, "Evaluation must be purely read-only");
  });

  it("4. Não gerar novo loot após reload", () => {
    setupMockStorage();
    const design = CANONICAL_PRESETS[0].design;
    const sim = createSim(design);
    sim.quality = 90;
    const sword = finishSword(sim, design);
    sword.forgeRunId = "run_fixed_12345";
    const rewards = generateForgeRewards(sword, { forgeRunId: sword.forgeRunId });
    sword.pendingRewards = rewards;

    const originalItemsCount = rewards.items.length;
    const originalGold = rewards.gold;

    // Simulate saving and reloading through migration
    const serialized = JSON.stringify({ ...defaultSaveData, gallery: [sword] });
    const reloaded = migrateSave(JSON.parse(serialized));
    const reloadedSword = reloaded.gallery[0];

    assert.equal(reloadedSword.forgeRunId, "run_fixed_12345");
    assert.equal(reloadedSword.pendingRewards?.items.length, originalItemsCount);
    assert.equal(reloadedSword.pendingRewards?.gold, originalGold);
  });

  it("5. Não reivindicar recompensas repetidamente", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);
    const runId = "run_claim_test_999";
    const rewards = {
      forgeRunId: runId,
      rank: "S",
      scorePercent: 96,
      gold: 500,
      rubies: 5,
      diamonds: 0,
      items: [],
      claimed: false,
    };

    const storedSword = finishSword(createSim(CANONICAL_PRESETS[0].design, { forgeRunId: runId }), CANONICAL_PRESETS[0].design);
    storedSword.pendingRewards = rewards;
    save.gallery = [storedSword];
    // First claim
    const res1 = executeClaimRewardsTransaction(save, rewards);
    assert.equal(res1.success, true);
    assert.equal(res1.save.wallet.gold, save.wallet.gold + 500);
    assert.ok(res1.save.claimedForgeRewardIds.includes(runId));

    // Second claim with same runId: MUST FAIL CLOSED
    const res2 = executeClaimRewardsTransaction(res1.save, rewards);
    assert.equal(res2.success, false);
    assert.equal(res2.code, "ALREADY_CLAIMED");
    assert.equal(res2.save.wallet.gold, res1.save.wallet.gold, "Gold must not be credited again");
  });

  it("6. Não perder núcleo por cancelamento inadequado", () => {
    setupMockStorage();
    const testCore: FusionCore = {
      id: "core_preserve_test",
      name: "Núcleo — Asterion Sideral",
      rarity: "Lendária",
      family: "meteor",
      profile: "saber",
      steel: "meteor",
      bonusQuality: 15,
      inheritedPerks: ["Sideral"],
      consumedSwordIds: ["s1", "s2", "s3", "s4"],
      createdAt: Date.now(),
    };

    const save: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        fusionCores: [testCore],
        materials: { starmetal_ore: 2 },
      },
    };

    const design = CANONICAL_PRESETS.find((p) => p.id === "queda_asterion")!.design;

    // Start forge using the core
    const startRes = executeStartForgeTransaction(save, design, { activeCoreId: testCore.id });
    assert.equal(startRes.success, true);
    assert.equal(startRes.save.inventory.materials.starmetal_ore, 1);

    // Cancel forge: must refund material and retain core intact!
    const cancelRes = executeCancelForgeTransaction(startRes.save);
    assert.equal(cancelRes.success, true);
    assert.equal(cancelRes.save.inventory.materials.starmetal_ore, 2, "Material must be refunded");
    assert.equal(cancelRes.save.inventory.fusionCores.length, 1, "Core must still exist in inventory");
    assert.equal(cancelRes.save.inventory.fusionCores[0].id, testCore.id);
  });

  it("7. Não forjar duas armas com o mesmo núcleo", () => {
    setupMockStorage();
    const testCore: FusionCore = {
      id: "core_single_use_test",
      name: "Núcleo — Cinzas Ancestrais",
      rarity: "Relíquia",
      family: "relic",
      profile: "relic_blade",
      steel: "ancient_alloy",
      bonusQuality: 20,
      inheritedPerks: ["Relíquia"],
      consumedSwordIds: ["a", "b", "c", "d"],
      createdAt: Date.now(),
    };

    const save: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        fusionCores: [testCore],
        materials: { ancient_relic_shard: 2 },
      },
    };

    const design = CANONICAL_PRESETS.find((p) => p.id === "cinzas_ancestrais")!.design;

    // Start forge
    const startRes = executeStartForgeTransaction(save, design, { activeCoreId: testCore.id });
    assert.equal(startRes.success, true);

    // Finish forge with activeCore
    const played = playForgeAttempt(startRes.save);
    const finishRes = executeFinishSwordTransaction(played.save, played.sim, design);
    assert.equal(finishRes.success, true);

    // Core is now consumed and removed from inventory
    assert.equal(finishRes.save.inventory.fusionCores.some((c) => c.id === testCore.id), false, "Core must be consumed");

    // Attempting to start another forge with this core ID must fail
    const secondStart = executeStartForgeTransaction(finishRes.save, design, { activeCoreId: testCore.id });
    // Since core is gone and preset is locked without core, it fails
    assert.equal(secondStart.success, false);
  });

  it("8. Não desbloquear projeto indevidamente", () => {
    setupMockStorage();
    const noviceSave: SaveData = {
      ...defaultSaveData,
      career: { ...defaultCareer, totalForged: 0, masterpieces: 0 },
      inventory: {
        ...defaultInventory,
        unlockedBlueprints: ["guarda_medieval"],
        materials: { damascus_billet: 2 },
      },
    };

    const damascusPreset = CANONICAL_PRESETS.find((p) => p.id === "cimitarra_damasco")!;
    const status = evaluateBlueprintStatus(damascusPreset, noviceSave.inventory, noviceSave.career, []);
    assert.equal(status.state, "locked", "Damascus preset must be locked for novice with 0 forges");

    const startRes = executeStartForgeTransaction(noviceSave, damascusPreset.design);
    assert.equal(startRes.success, false);
    assert.equal(startRes.code, "BLUEPRINT_LOCKED");
  });

  it("9. Não fabricar Lendária automaticamente pela posse de metal", () => {
    setupMockStorage();
    // Novice player who gets starmetal_ore via lucky drop or bazaar
    const noviceSave: SaveData = {
      ...defaultSaveData,
      career: { ...defaultCareer, totalForged: 1, masterpieces: 0 },
      inventory: {
        ...defaultInventory,
        materials: { starmetal_ore: 5 }, // Possesses 5 meteor ingots
        unlockedBlueprints: ["guarda_medieval"],
      },
    };

    const asterionPreset = CANONICAL_PRESETS.find((p) => p.id === "queda_asterion")!;
    const status = evaluateBlueprintStatus(asterionPreset, noviceSave.inventory, noviceSave.career, []);

    // Must still be locked: metal ownership alone does NOT authorize the Legendary blueprint
    assert.equal(status.state, "locked");
    assert.equal(status.canCraft, false);

    const startRes = executeStartForgeTransaction(noviceSave, asterionPreset.design);
    assert.equal(startRes.success, false);
    assert.equal(startRes.code, "BLUEPRINT_LOCKED");
  });

  it("10. Não perder progresso por falha de armazenamento", () => {
    const { mockStorage } = setupMockStorage();
    const save = structuredClone(defaultSaveData);
    const design = CANONICAL_PRESETS[0].design;
    const started = executeStartForgeTransaction(save, design);
    const played = playForgeAttempt(started.save);
    const sim = played.sim;

    // Simulate quota exceeded error on storage write
    mockStorage.setItem = () => {
      const err: any = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    };

    const res = executeFinishSwordTransaction(played.save, sim, design);
    assert.equal(res.success, false, "Must fail closed on write failure");
    assert.equal(res.code, "QUOTA_EXCEEDED");
    assert.ok(res.uncommittedSave, "Must preserve uncommittedSave payload for retry");

    // Once storage recovers, retryPersistSave can successfully persist
    mockStorage.setItem = (_k, _v) => {};
    const retryRes = retryPersistSave(res.uncommittedSave!);
    assert.equal(retryRes.success, true, "Retry must succeed without regenerating sword");
    assert.equal(retryRes.save.gallery[0].id, res.uncommittedSave!.gallery[0].id, "Persisted sword must match uncommitted sword ID");
    assert.equal(retryRes.save.gallery[0].quality, res.uncommittedSave!.gallery[0].quality, "Quality must not re-roll");
    assert.ok(retryRes.save.gallery[0].quality >= 90);
  });

  it("11. Não permitir que treino gratuito gere economia infinita", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);
    const initialGold = save.wallet.gold;
    const initialIron = save.inventory.materials.iron_ingot;

    // Start training mode
    const design = CANONICAL_PRESETS[0].design;
    const startRes = executeStartForgeTransaction(save, design, { isTraining: true });
    assert.equal(startRes.success, true);
    assert.equal(startRes.save.inventory.materials.iron_ingot, initialIron, "0 iron consumed in training");

    // Finish sword in training
    const played = playForgeAttempt(startRes.save);
    const finishRes = executeFinishSwordTransaction(played.save, played.sim, played.save.activeForgeAttempt!.design);
    assert.equal(finishRes.success, true);

    const sword = finishRes.payload!;
    assert.equal(sword.value, 0, "Training sword must have 0 gold valuation");
    assert.equal(sword.isTraining, true);
    assert.equal(sword.pendingRewards?.gold, 0, "Training must award 0 gold");
    assert.equal(sword.pendingRewards?.rubies, 0, "Training must award 0 rubies");
    assert.equal(sword.pendingRewards?.items.length, 0, "Training must award 0 items");

    // Wallet remains unexploited
    assert.equal(finishRes.save.wallet.gold, initialGold);
  });

  it("12. Não deixar o iniciante permanentemente sem meios de jogar", () => {
    setupMockStorage();
    // Bankrupt beginner with 0 gold and 0 iron
    const bankruptSave: SaveData = {
      ...defaultSaveData,
      wallet: { gold: 0, rubies: 0, diamonds: 0 },
      inventory: {
        ...defaultInventory,
        materials: { iron_ingot: 0, scrap: 2 }, // Has 2 scrap
      },
    };

    // 1. Can always practice in workshop training
    const trainingStart = executeStartForgeTransaction(bankruptSave, CANONICAL_PRESETS[0].design, { isTraining: true });
    assert.equal(trainingStart.success, true, "Beginner can always train without resources");

    // 2. Can recycle 2x scrap into 1x iron_ingot
    const recycleRes = executeRecycleScrapTransaction(bankruptSave);
    assert.equal(recycleRes.success, true);
    assert.equal(recycleRes.payload?.ironCreated, 1);
    assert.equal(recycleRes.save.inventory.materials.iron_ingot, 1, "Recycling grants real iron to restart");
  });

  it("13. Não criar materiais que nunca possam ser utilizados", () => {
    setupMockStorage();
    // Validate that every canonical steel material maps to a forgeable steel and can be consumed
    const steels = Object.keys(CANONICAL_MATERIALS) as import("./types.ts").SteelId[];
    for (const st of steels) {
      const mat = getRequiredMaterialForSteel(st);
      assert.ok(mat.key, `Material key for ${st} must be defined`);

      const testSave: SaveData = {
        ...defaultSaveData,
        career: {
          ...defaultCareer,
          totalForged: 10,
          masterpieces: 2,
          legendaries: 1,
        },
        inventory: {
          ...defaultInventory,
          unlockedSteels: steels,
          unlockedBlueprints: ["queda_asterion", "cinzas_ancestrais", "cimitarra_damasco", "juramento_ferro", "folha_aereth"],
          materials: { [mat.key]: 2 },
        },
      };

      const stock = getMaterialStock(testSave.inventory.materials, mat.key);
      assert.equal(stock, 2, `Material ${mat.key} must be readable`);

      const testDesign: SwordDesign = {
        name: `Test Blade ${st}`,
        profile: "short",
        steel: st,
        wrap: "leather",
        guard: "cross",
        pommel: "disc",
        inscription: "",
        runes: false,
        length: 1.0,
      };

      const startRes = executeStartForgeTransaction(testSave, testDesign);
      assert.equal(startRes.success, true, `Must be able to start forge with material ${mat.key}`);
      assert.equal(startRes.save.inventory.materials[mat.key], 1, `Material ${mat.key} must be consumed`);
    }
  });

  it("14. Preservar saves antigos e armas históricas", () => {
    setupMockStorage();
    // Legacy save structure without blueprints, commissions, or activeForgeAttempt
    const legacyRawSave = {
      version: 4,
      wallet: { gold: 350 },
      gallery: [
        {
          id: "historic_sword_001",
          design: {
            name: "Espada dos Primeiros Dias",
            steel: "iron",
            profile: "long",
          },
          quality: 88,
          grade: "A",
        },
      ],
      inventory: {
        materials: { iron_ingot: 4 },
      },
    };

    const migrated = migrateSave(legacyRawSave);
    assert.equal(migrated.gallery.length, 1);
    assert.equal(migrated.gallery[0].id, "historic_sword_001");
    assert.equal(migrated.gallery[0].design.name, "Espada dos Primeiros Dias");
    assert.ok(migrated.inventory.unlockedBlueprints?.includes("guarda_medieval"), "Must inject default starter blueprint");
    assert.ok(Array.isArray(migrated.commissions), "Must inject default commissions");
    assert.equal(migrated.activeForgeAttempt, null);
  });

  it("15. Entrega de encomenda da guilda valida critérios e credita recompensas", () => {
    setupMockStorage();
    const testSword: any = {
      id: "sword_commission_valerius",
      design: {
        name: "Espada de Guarda",
        family: "iron",
        profile: "short",
        steel: "iron",
      },
      quality: 75,
      grade: "A",
      rarity: "Comum",
      combatRole: "Defensiva",
      createdAt: Date.now(),
    };

    const initialSave: SaveData = {
      ...defaultSaveData,
      wallet: { gold: 100, rubies: 0, diamonds: 0 },
      gallery: [testSword],
      inventory: {
        ...defaultInventory,
        materials: { iron_ingot: 2 },
      },
    };

    // Deliver comm_guard_captain (requires iron family, iron steel, minQuality 60, Defensiva role)
    const deliverRes = executeDeliverCommissionTransaction(initialSave, "comm_guard_captain", testSword.id);
    assert.equal(deliverRes.success, true);
    assert.equal(deliverRes.save.wallet.gold, 100 + 350, "Gold rewarded correctly");
    assert.equal(deliverRes.save.wallet.rubies, 5, "Rubies rewarded correctly");
    assert.equal(deliverRes.save.inventory.materials.steel_ingot, 2, "Steel ingot reward credited");
    assert.equal(deliverRes.save.commissions?.find((c) => c.id === "comm_guard_captain")?.completed, true);
    assert.equal(deliverRes.save.gallery[0].commissionDelivered, "comm_guard_captain", "Sword tagged with commission delivery");

    // Second delivery of same completed commission must fail
    const secondDeliver = executeDeliverCommissionTransaction(deliverRes.save, "comm_guard_captain", testSword.id);
    assert.equal(secondDeliver.success, false);
    assert.equal(secondDeliver.code, "COMMISSION_ALREADY_COMPLETED");
  });
});
