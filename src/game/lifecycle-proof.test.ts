import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executeStartForgeTransaction,
  executeCancelForgeTransaction,
  executeFinishSwordTransaction,
  executeStrikeRewardTransaction,
  executeRecordStrikeTransaction,
  executeDeliverCommissionTransaction,
  executeRecycleScrapTransaction,
} from "./transactions.ts";
import {
  defaultSaveData,
  defaultInventory,
  defaultCareer,
} from "./save.ts";
import { CANONICAL_PRESETS, calculateSwordAttributes } from "./catalog.ts";
import { createSim, stepSim, finishSword, type SimInput } from "./sim.ts";
import { isSwordEligibleForCommission, DEFAULT_COMMISSIONS } from "./commissions.ts";
import { fuseSwords, validateSwordFusionTransaction } from "./fusion.ts";
import type { FinishedSword, SaveData, SwordDesign } from "./types.ts";

describe("Operação 04: A Prova da Forja — Ciclo de Vida, Isolamento do Treino & Anti-Softlock", () => {
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
        for (const k of Object.keys(memStore)) delete memStore[k];
      },
    };
    (globalThis as any).localStorage = mockStorage;
  };

  it("1. P0 — Modo Treino: Rejeita ouro por golpe e zera economia de simulação", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);

    const design: SwordDesign = {
      name: "Prática do Aprendiz",
      profile: "short",
      steel: "iron",
      wrap: "leather",
      guard: "cross",
      pommel: "disc",
      inscription: "",
      runes: false,
      length: 0.78,
    };

    const startRes = executeStartForgeTransaction(save, design, { isTraining: true });
    assert.equal(startRes.success, true);
    assert.equal(startRes.save.activeForgeAttempt?.isTraining, true);

    // 1. Strike reward transaction directly rejects crediting gold
    const strikeRewardRes = executeStrikeRewardTransaction(startRes.save, {
      amount: 12,
      id: "run_test:1",
    });
    assert.equal(strikeRewardRes.success, false);
    assert.equal(strikeRewardRes.code, "TRAINING_MODE_NO_GOLD");
    assert.equal(strikeRewardRes.save.wallet.gold, defaultSaveData.wallet.gold);

    // 2. Sim core applyStrike does not generate goldReward when isTraining is true
    const sim = createSim(design, { isTraining: true });
    assert.equal(sim.isTraining, true);
    sim.phase = "forge";
    sim.heat = 0.65; // Sweet spot
    const input: SimInput = { charging: false, action: false, reheat: false };

    // Charge and release perfect strike
    sim.charging = true;
    sim.force = sim.sweetCenter;
    const ev = stepSim(sim, 0.016, input, design, 0);

    assert.equal(ev.goldReward, undefined, "Treino não pode gerar evento de ouro");
    assert.equal(sim.strikeReward, null, "Treino não pode emitir recompensa de strikeReward");
  });

  it("2. P0 — Modo Treino: Conclusão isola estatísticas de carreira e salva em trainingGallery", () => {
    setupMockStorage();
    const initialSave: SaveData = {
      ...defaultSaveData,
      career: {
        totalForged: 5,
        masterpieces: 1,
        legendaries: 1,
        relics: 0,
        brokenBlades: 0,
        highestQuality: 96,
        totalValueEarned: 3500,
      },
      gallery: [],
      trainingGallery: [],
    };

    const design = CANONICAL_PRESETS[0].design;
    const startRes = executeStartForgeTransaction(initialSave, design, { isTraining: true });
    assert.equal(startRes.success, true);

    const sim = createSim(design, { isTraining: true });
    sim.quality = 98; // Would be a masterpiece if real
    const finishRes = executeFinishSwordTransaction(startRes.save, sim, design);
    assert.equal(finishRes.success, true);

    const sword = finishRes.payload!;
    assert.equal(sword.isTraining, true);
    assert.equal(sword.value, 0);

    // Career stats are untouched (0 increments!)
    const afterCareer = finishRes.save.career;
    assert.equal(afterCareer.totalForged, 5, "totalForged não pode incrementar no treino");
    assert.equal(afterCareer.masterpieces, 1, "masterpieces não pode incrementar no treino");
    assert.equal(afterCareer.legendaries, 1, "legendaries não pode incrementar no treino");
    assert.equal(afterCareer.totalValueEarned, 3500, "totalValueEarned inalterado");

    // Regular gallery is untouched; sword is placed in trainingGallery
    assert.equal(finishRes.save.gallery.length, 0, "Arma de treino NÃO pode entrar no Arsenal regular");
    assert.equal(finishRes.save.trainingGallery?.length, 1, "Arma de treino deve residir em trainingGallery");
    assert.equal(finishRes.save.trainingGallery?.[0].id, sword.id);

    // Active attempt is cleared
    assert.equal(finishRes.save.activeForgeAttempt, null);
  });

  it("3. P0 — Armas de treino e armas entregues são bloqueadas no Crisol de Fusão", () => {
    setupMockStorage();

    const baseDesign = CANONICAL_PRESETS[0].design;
    const makeSword = (id: string, opts?: { isTraining?: boolean; commissionDelivered?: string }): FinishedSword => ({
      id,
      design: baseDesign,
      quality: 75,
      grade: "A",
      rarity: "Comum",
      heatScore: 80,
      forgeScore: 80,
      quenchScore: 80,
      warp: 0,
      createdAt: Date.now(),
      damage: 180,
      defense: 60,
      agility: 45,
      durability: 85,
      isTraining: opts?.isTraining,
      commissionDelivered: opts?.commissionDelivered,
    });

    const realSwords = [
      makeSword("s1"),
      makeSword("s2"),
      makeSword("s3"),
    ];

    // 1. Test training sword rejection in fuseSwords and transaction validation
    const trainingSword = makeSword("s_train", { isTraining: true });
    assert.throws(
      () => fuseSwords([...realSwords, trainingSword]),
      /Armas de treino não podem ser consumidas no Crisol/,
    );

    const saveWithTraining: SaveData = {
      ...defaultSaveData,
      gallery: [...realSwords, trainingSword],
    };
    assert.throws(
      () => validateSwordFusionTransaction(saveWithTraining, {
        success: true,
        consumedSwordIds: ["s1", "s2", "s3", "s_train"],
        resultCore: {} as any,
        goldCost: 100,
        rubiesCost: 2,
        usedCatalyst: false,
        fragmentsAwarded: 0,
        upgradedRarity: false,
        tierJump: "refined",
      }),
      /Transação inválida: Armas de treino não podem ser consumidas no Crisol de Fusão/,
    );

    // 2. Test commission-delivered sword rejection
    const deliveredSword = makeSword("s_delivered", { commissionDelivered: "comm_guard_captain" });
    assert.throws(
      () => fuseSwords([...realSwords, deliveredSword]),
      /Armas entregues em encomendas da guilda não podem ser consumidas no Crisol/,
    );

    const saveWithDelivered: SaveData = {
      ...defaultSaveData,
      gallery: [...realSwords, deliveredSword],
    };
    assert.throws(
      () => validateSwordFusionTransaction(saveWithDelivered, {
        success: true,
        consumedSwordIds: ["s1", "s2", "s3", "s_delivered"],
        resultCore: {} as any,
        goldCost: 100,
        rubiesCost: 2,
        usedCatalyst: false,
        fragmentsAwarded: 0,
        upgradedRarity: false,
        tierJump: "refined",
      }),
      /Transação inválida: Armas entregues em encomendas da guilda não podem ser consumidas no Crisol/,
    );
  });

  it("4. P0 — Ciclo de Vida: Impede iniciar nova forja com tentativa ativa", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);

    const design = CANONICAL_PRESETS[0].design;
    const start1 = executeStartForgeTransaction(save, design, { isTraining: false });
    assert.equal(start1.success, true);
    assert.equal(start1.save.activeForgeAttempt?.status, "PREPARED");

    // Attempting to start another forge while one is active fail-closes
    const start2 = executeStartForgeTransaction(start1.save, design, { isTraining: false });
    assert.equal(start2.success, false);
    assert.equal(start2.code, "ATTEMPT_ALREADY_ACTIVE");
  });

  it("5. P0 — Política Justa de Cancelamento: 100% de reembolso antes do golpe, sucata após primeiro golpe", () => {
    setupMockStorage();
    const initialIron = 8;
    const save: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        materials: { iron_ingot: initialIron, scrap: 0 },
      },
    };

    const design = CANONICAL_PRESETS[0].design; // Requires iron_ingot

    // SCENARIO A: Cancel BEFORE first strike (PREPARED, strikesCount === 0)
    const startResA = executeStartForgeTransaction(save, design, { isTraining: false });
    assert.equal(startResA.success, true);
    assert.equal(startResA.save.inventory.materials.iron_ingot, initialIron - 1);
    assert.equal(startResA.save.activeForgeAttempt?.status, "PREPARED");
    assert.equal(startResA.save.activeForgeAttempt?.strikesCount, 0);

    const cancelResA = executeCancelForgeTransaction(startResA.save);
    assert.equal(cancelResA.success, true);
    assert.equal(cancelResA.payload?.refundedMaterial, true);
    assert.equal(cancelResA.payload?.scrapAwarded, 0);
    assert.equal(cancelResA.save.inventory.materials.iron_ingot, initialIron, "Reembolso integral (100%) antes do 1º golpe");
    assert.equal(cancelResA.save.activeForgeAttempt, null);

    // SCENARIO B: Cancel AFTER first strike (ACTIVE, strikesCount > 0)
    const startResB = executeStartForgeTransaction(save, design, { isTraining: false });
    assert.equal(startResB.success, true);

    // Record a strike on the anvil
    const strikeRes = executeRecordStrikeTransaction(startResB.save);
    assert.equal(strikeRes.success, true);
    assert.equal(strikeRes.save.activeForgeAttempt?.status, "ACTIVE");
    assert.equal(strikeRes.save.activeForgeAttempt?.strikesCount, 1);

    const cancelResB = executeCancelForgeTransaction(strikeRes.save);
    assert.equal(cancelResB.success, true);
    assert.equal(cancelResB.payload?.refundedMaterial, false, "Sem reembolso de lingote após golpear");
    assert.equal(cancelResB.payload?.scrapAwarded, 1, "+1 sucata concedida pelo tarugo descartado");
    assert.equal(cancelResB.save.inventory.materials.iron_ingot, initialIron - 1, "Lingote não foi devolvido");
    assert.equal(cancelResB.save.inventory.materials.scrap, 1, "Sucata creditada no inventário");
    assert.equal(cancelResB.save.activeForgeAttempt, null);
  });

  it("6. P0 — Identidade Consistente: forgeRunId preservado entre transação, simulação e lâmina final", () => {
    setupMockStorage();
    const save: SaveData = structuredClone(defaultSaveData);
    const design = CANONICAL_PRESETS[0].design;

    const startRes = executeStartForgeTransaction(save, design, { isTraining: false });
    assert.equal(startRes.success, true);

    const attempt = startRes.save.activeForgeAttempt!;
    assert.ok(attempt.forgeRunId);

    // Create sim passing the exact forgeRunId from the active attempt
    const sim = createSim(design, {
      forgeRunId: attempt.forgeRunId,
      isTraining: attempt.isTraining,
    });
    assert.equal(sim.forgeRunId, attempt.forgeRunId);

    const finishRes = executeFinishSwordTransaction(startRes.save, sim, design);
    assert.equal(finishRes.success, true);
    assert.equal(finishRes.payload!.forgeRunId, attempt.forgeRunId, "O forgeRunId da arma deve ser idêntico ao da tentativa");
  });

  it("7. P0 — Encomenda do Capitão Valerius: Forjável legitimamente com combatRole Defensiva", () => {
    setupMockStorage();
    const valeriusComm = DEFAULT_COMMISSIONS.find((c) => c.id === "comm_guard_captain")!;
    assert.ok(valeriusComm);

    // Design conforming to Valerius specifications: Steel Iron, Cross Guard, Short Profile
    const garrisonDesign: SwordDesign = {
      name: "Guarda da Guarnição",
      family: "iron",
      profile: "short",
      steel: "iron",
      guard: "cross",
      pommel: "disc",
      wrap: "leather",
      inscription: "",
      runes: false,
      length: 0.78,
    };

    // Verify catalog attribute calculation naturally confers combatRole: "Defensiva"
    const attrs = calculateSwordAttributes(garrisonDesign, 78);
    assert.equal(attrs.combatRole, "Defensiva", "Lâmina de ferro com guarda cross e perfil short deve ter papel Defensiva");

    // Forge sword with simulation
    const sim = createSim(garrisonDesign);
    sim.heatScore = 80;
    sim.shape = 0.8;
    sim.quenchScore = 80;
    const sword = finishSword(sim, garrisonDesign);
    assert.equal(sword.combatRole, "Defensiva");
    assert.ok(sword.defense && sword.defense >= 50, "DEF >= 50");
    assert.ok(sword.quality >= valeriusComm.minQuality, `Qualidade (${sword.quality}) >= ${valeriusComm.minQuality}`);

    // Verify eligibility check
    const elig = isSwordEligibleForCommission(valeriusComm, sword);
    assert.equal(elig.eligible, true, `Valerius deve aceitar a espada: ${elig.reasons.join(", ")}`);

    // Deliver commission transactionally
    const initialWalletGold = 500;
    const initialWalletRubies = 10;
    const save: SaveData = {
      ...defaultSaveData,
      wallet: { gold: initialWalletGold, rubies: initialWalletRubies, diamonds: 0 },
      gallery: [sword],
      commissions: [valeriusComm],
    };

    const deliverRes = executeDeliverCommissionTransaction(save, valeriusComm.id, sword.id);
    assert.equal(deliverRes.success, true);
    assert.equal(deliverRes.save.wallet.gold, initialWalletGold + valeriusComm.rewardGold);
    assert.equal(deliverRes.save.wallet.rubies, initialWalletRubies + (valeriusComm.rewardRubies || 0));

    // Sword in gallery is tagged as delivered
    const delivered = deliverRes.save.gallery.find((s) => s.id === sword.id);
    assert.equal(delivered?.commissionDelivered, valeriusComm.id);

    // Cannot deliver the same sword again
    const secondDelivery = executeDeliverCommissionTransaction(deliverRes.save, valeriusComm.id, sword.id);
    assert.equal(secondDelivery.success, false);
  });

  it("8. P1 — Verdadeiro Anti-Softlock: Treino de aprendiz com Q>=50 gera sucata para recomeçar carreira", () => {
    setupMockStorage();
    // Bankrupt beginner: 0 gold, 0 iron, 0 scrap
    const destituteSave: SaveData = {
      ...defaultSaveData,
      wallet: { gold: 0, rubies: 0, diamonds: 0 },
      inventory: {
        ...defaultInventory,
        materials: { iron_ingot: 0, scrap: 0 },
      },
    };

    const design = CANONICAL_PRESETS[0].design;

    // Session 1: Practice forge with good quality (Q >= 50)
    const start1 = executeStartForgeTransaction(destituteSave, design, { isTraining: true });
    assert.equal(start1.success, true);
    const sim1 = createSim(design, { isTraining: true });
    sim1.heatScore = 80;
    sim1.shape = 0.75;
    sim1.quenchScore = 80;
    const finish1 = executeFinishSwordTransaction(start1.save, sim1, design);
    assert.equal(finish1.success, true);
    assert.ok(finish1.payload!.quality >= 50, `Quality must be >= 50 (got ${finish1.payload!.quality})`);
    assert.equal(finish1.save.inventory.materials.scrap, 1, "Sessão 1 de treino (Q>=50) rende 1x sucata de limalhas");

    // Session 2: Practice forge with good quality (Q >= 50)
    const start2 = executeStartForgeTransaction(finish1.save, design, { isTraining: true });
    assert.equal(start2.success, true);
    const sim2 = createSim(design, { isTraining: true });
    sim2.heatScore = 85;
    sim2.shape = 0.8;
    sim2.quenchScore = 80;
    const finish2 = executeFinishSwordTransaction(start2.save, sim2, design);
    assert.equal(finish2.success, true);
    assert.ok(finish2.payload!.quality >= 50);
    assert.equal(finish2.save.inventory.materials.scrap, 2, "Sessão 2 de treino rende mais 1x sucata (total 2)");

    // Apprentice recycles 2x scrap into 1x iron ingot!
    const recycleRes = executeRecycleScrapTransaction(finish2.save);
    assert.equal(recycleRes.success, true);
    assert.equal(recycleRes.save.inventory.materials.iron_ingot, 1, "2 sucatas recicladas geram 1 lingote de ferro");
    assert.equal(recycleRes.save.inventory.materials.scrap, 0);

    // Apprentice can now start a real career forge with the iron ingot!
    const realForgeRes = executeStartForgeTransaction(recycleRes.save, design, { isTraining: false });
    assert.equal(realForgeRes.success, true, "Aprendiz superou o softlock e iniciou forja real com lingote obtido por esforço!");
    assert.equal(realForgeRes.save.inventory.materials.iron_ingot, 0);
    assert.equal(realForgeRes.save.activeForgeAttempt?.isTraining, false);
  });

  it("9. P1 — Gating da Metalurgia: Impede craft de aços raros em design livre sem prestígio ou núcleo", () => {
    setupMockStorage();
    // Beginner with default career (0 masterpieces, 0 legendaries)
    const beginnerSave: SaveData = {
      ...defaultSaveData,
      inventory: {
        ...defaultInventory,
        materials: { starmetal_ore: 2, ancient_ingot: 2 },
      },
    };

    const meteorCustomDesign: SwordDesign = {
      name: "Sabre Celeste Falso",
      profile: "saber",
      steel: "meteor",
      wrap: "leather",
      guard: "cross",
      pommel: "disc",
      inscription: "",
      runes: false,
      length: 1.0,
    };

    // Attempting custom meteor design without masterpieces fails
    const meteorRes = executeStartForgeTransaction(beginnerSave, meteorCustomDesign);
    assert.equal(meteorRes.success, false);
    assert.equal(meteorRes.code, "METALLURGY_LOCKED");

    // Master blacksmith with 1 masterpiece can forge meteor
    const masterSave: SaveData = {
      ...beginnerSave,
      career: {
        ...defaultCareer,
        masterpieces: 1,
      },
    };
    const masterMeteorRes = executeStartForgeTransaction(masterSave, meteorCustomDesign);
    assert.equal(masterMeteorRes.success, true, "Ferreiro com Obra-prima desbloqueia metalurgia meteórica");
  });
});
