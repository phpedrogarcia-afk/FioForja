import { describe, it } from "node:test";
import { playForgeAttempt } from "./forge-test-helpers.ts";
import assert from "node:assert/strict";
import {
  executeForgeCheckpointTransaction,
  executeClaimRewardsTransaction,
  needsTrainingRecovery,
  executeStartForgeTransaction,
  executeCancelForgeTransaction,
  executeFinishSwordTransaction,
  executeStrikeRewardTransaction,
  executeRecordStrikeTransaction,
  executeDeliverCommissionTransaction,
  executeRecycleScrapTransaction,
} from "./transactions.ts";
import {
  loadSave,
  writeSave,
  migrateSave,
  defaultSaveData,
  defaultInventory,
  defaultCareer,
} from "./save.ts";
import { CANONICAL_PRESETS, calculateSwordAttributes } from "./catalog.ts";
import { createForgeSnapshot, restoreForgeSnapshot, isForgeSnapshotValid, sameForgeValue, createSim, stepSim, finishSword, type SimInput } from "./sim.ts";
import { isSwordEligibleForCommission, DEFAULT_COMMISSIONS } from "./commissions.ts";
import { fuseSwords, validateSwordFusionTransaction } from "./fusion.ts";
import type { FinishedSword, FusionCore, SaveData, SwordDesign } from "./types.ts";

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

    const played = playForgeAttempt(startRes.save);
    const sim = played.sim;
    const finishRes = executeFinishSwordTransaction(played.save, sim, played.save.activeForgeAttempt!.design);
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
    const strikeRes = playForgeAttempt(startResB.save, { stopAfterStrikes: 1 });
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
    const played = playForgeAttempt(startRes.save);
    const sim = played.sim;
    assert.equal(sim.forgeRunId, attempt.forgeRunId);

    const finishRes = executeFinishSwordTransaction(played.save, sim, design);
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
    const played1 = playForgeAttempt(start1.save);
    const finish1 = executeFinishSwordTransaction(played1.save, played1.sim, design);
    assert.equal(finish1.success, true);
    assert.ok(finish1.payload!.quality >= 50, `Quality must be >= 50 (got ${finish1.payload!.quality})`);
    assert.equal(finish1.save.inventory.materials.scrap, 1, "Sessão 1 de treino (Q>=50) rende 1x sucata de limalhas");

    // Session 2: Practice forge with good quality (Q >= 50)
    const start2 = executeStartForgeTransaction(finish1.save, design, { isTraining: true });
    assert.equal(start2.success, true);
    const played2 = playForgeAttempt(start2.save);
    const finish2 = executeFinishSwordTransaction(played2.save, played2.sim, design);
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


describe("Operação 05: regressões de integridade reproduzidas antes do reparo", () => {
  function setup() {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
    (globalThis as any).localStorage = storage;
    (globalThis as any).window = { localStorage: storage };
    return structuredClone(defaultSaveData);
  }
  it("rejeita prêmio sem tentativa e IDs de execução estranhos", () => {
    const save = setup();
    assert.equal(executeStrikeRewardTransaction(save, { id: "foreign:1", amount: 12 }).success, false);
  });
  it("rejeita conclusão fora da tentativa e antes da têmpera", () => {
    const save = setup();
    const design = CANONICAL_PRESETS[0].design;
    const start = executeStartForgeTransaction(save, design);
    const foreign = createSim(design, { forgeRunId: "foreign" });
    assert.equal(executeFinishSwordTransaction(start.save, foreign, design).success, false);
    assert.equal(executeFinishSwordTransaction(save, foreign, design).success, false);
  });
  it("cancelamento de treino após golpe não concede sucata", () => {
    const save = setup();
    const start = executeStartForgeTransaction(save, CANONICAL_PRESETS[0].design, { isTraining: true });
    const struck = playForgeAttempt(start.save, { stopAfterStrikes: 1 });
    const cancel = executeCancelForgeTransaction(struck.save);
    assert.equal(cancel.payload?.scrapAwarded, 0);
    assert.equal(cancel.save.inventory.materials.scrap, 0);
  });
  it("conta também o golpe físico que fratura a lâmina", () => {
    setup();
    const design = CANONICAL_PRESETS[0].design;
    const sim = createSim(design);
    sim.phase = "forge"; sim.heat = .08; sim.integrity = 1; sim.charging = true; sim.force = 1;
    const event = stepSim(sim, .016, { charging: false, action: false, reheat: false }, design, 0);
    assert.equal(sim.broken, true);
    assert.equal(sim.strikes, 1);
    assert.equal(event.kind, "hard");
  });
});


describe("Operação 05: um único ciclo físico, econômico e recuperável", () => {
  const design = CANONICAL_PRESETS[0].design;
  function setup() {
    const store = new Map<string, string>();
    let fail = false;
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { if (fail) throw new Error("disk unavailable"); store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
    (globalThis as any).localStorage = storage;
    (globalThis as any).window = { localStorage: storage };
    return { save: structuredClone(defaultSaveData), storage, fail: (value: boolean) => { fail = value; } };
  }
  const coreFixture = (): FusionCore => ({ id: "core_real", name: "Núcleo — Guarda Herdada", family: design.family!, profile: design.profile, steel: design.steel, rarity: "Épica", bonusQuality: 0, inheritedPerks: ["Herança de teste"], consumedSwordIds: ["a", "b", "c", "d"], createdAt: 1, heritage: { attackBias: 18, defenseBias: 0, agilityBias: 0, durabilityBias: 0, runicAffinity: 0, dominantFamily: design.family!, dominantSteel: design.steel } });

  it("golpe premiado grava contador, perfil e +12 ouro uma vez, inclusive após reload", () => {
    const { save } = setup();
    const start = executeStartForgeTransaction(save, design);
    const played = playForgeAttempt(start.save, { stopAfterStrikes: 1 });
    assert.equal(played.save.activeForgeAttempt!.strikesCount, 1);
    assert.equal(played.save.activeForgeAttempt!.snapshot!.state.physicalProfile.hammerMarksCount, 1);
    assert.equal(played.save.wallet.gold, save.wallet.gold + 12);
    const checkpoint = played.save.activeForgeAttempt!.snapshot!;
    const loaded = loadSave();
    const repeated = executeForgeCheckpointTransaction(loaded, checkpoint);
    assert.equal(repeated.success, true);
    assert.equal(repeated.code, "CHECKPOINT_ALREADY_APPLIED");
    assert.deepEqual(repeated.save, loaded);
    const twice = playForgeAttempt(repeated.save, { stopAfterStrikes: 2 });
    const delayed = executeForgeCheckpointTransaction(twice.save, checkpoint);
    assert.equal(delayed.success, true);
    assert.deepEqual(delayed.save, twice.save);
  });

  it("golpe sem prêmio e golpe de treino contam uma vez sem ouro", () => {
    const { save } = setup();
    for (const isTraining of [false, true]) {
      const start = executeStartForgeTransaction(save, design, { isTraining });
      const played = playForgeAttempt(start.save, { stopAfterStrikes: 1, poor: true });
      assert.equal(played.save.activeForgeAttempt!.strikesCount, 1);
      assert.equal(played.save.wallet.gold, save.wallet.gold);
    }
  });

  it("callbacks antigos não pagam nem incrementam, e valores não finitos são rejeitados", () => {
    const { save } = setup();
    const started = executeStartForgeTransaction(save, design).save;
    assert.equal(executeRecordStrikeTransaction(started).success, false);
    for (const amount of [12, NaN, Infinity, -1]) {
      const result = executeStrikeRewardTransaction(started, { amount, id: `${started.activeForgeAttempt!.forgeRunId}:1` });
      assert.equal(result.success, false);
      assert.deepEqual(result.save, started);
    }
  });

  it("checkpoint de outro run/projeto, conflito e salto de sequência falham sem mutar estado", () => {
    const { save } = setup();
    const started = executeStartForgeTransaction(save, design).save;
    const original = started.activeForgeAttempt!.snapshot!;
    const variants = [
      { ...structuredClone(original), revision: 1, state: { ...original.state, forgeRunId: "foreign" } },
      { ...structuredClone(original), revision: 1, design: { ...original.design, name: "Outro projeto" } },
      { ...structuredClone(original), revision: 2 },
      { ...structuredClone(original), state: { ...original.state, heat: .2 } },
    ];
    for (const snapshot of variants) {
      const result = executeForgeCheckpointTransaction(started, snapshot);
      assert.equal(result.success, false, JSON.stringify(snapshot));
      assert.deepEqual(result.save, started);
    }
    const played = playForgeAttempt(started, { stopAfterStrikes: 2 });
    const jumped = structuredClone(played.save.activeForgeAttempt!.snapshot!); jumped.revision = 1;
    assert.equal(executeForgeCheckpointTransaction(started, jumped).success, false, "two strikes cannot be submitted as one occurrence");
  });

  it("roundtrip preserva metalurgia, equipamentos, relógio e próximo passo independentemente do tempo da página", () => {
    const { save } = setup();
    save.inventory.equipped = { hammer: "precision", anvil: "anvil_master", furnace: "furnace_bluefire", quench: "quench_oil" };
    save.inventory.unlockedTools.push("hammer_precision");
    const start = executeStartForgeTransaction(save, design);
    const played = playForgeAttempt(start.save, { stopAfterStrikes: 3 });
    const checkpoint = played.save.activeForgeAttempt!.snapshot!;
    const restored = restoreForgeSnapshot(JSON.parse(JSON.stringify(checkpoint)))!;
    assert.equal(restored.strikes, 3);
    assert.equal(restored.equippedGear.anvil, "anvil_master");
    assert.equal(restored.activeHammer, "precision");
    assert.deepEqual(restored.physicalProfile, played.sim.physicalProfile);
    assert.deepEqual(restored.zoneProgress, played.sim.zoneProgress);
    assert.equal(restored.integrity, played.sim.integrity);
    assert.equal(restored.heat, played.sim.heat);
    assert.equal(restored.elapsedTime, played.sim.elapsedTime);
    assert.equal("sparkAnim" in checkpoint.state, false);
    const original = restoreForgeSnapshot(checkpoint)!;
    const input = { charging: true, action: false, reheat: false };
    stepSim(original, .05, input, design, 1);
    stepSim(restored, .05, input, design, 100000);
    assert.ok(sameForgeValue(createForgeSnapshot(original, design, 99), createForgeSnapshot(restored, design, 99)));
    const quench = playForgeAttempt(played.save, { stopAfterStrikes: 8 });
    const resumedQuench = restoreForgeSnapshot(quench.save.activeForgeAttempt!.snapshot!)!;
    assert.equal(resumedQuench.phase, "quench");
    assert.equal(resumedQuench.strikes, 8);
  });

  it("snapshots truncados, não finitos, desconhecidos ou done sem execução elegível não são restauráveis", () => {
    const { save } = setup();
    const snapshot = executeStartForgeTransaction(save, design).payload!.snapshot!;
    assert.equal(isForgeSnapshotValid({ ...snapshot, version: 2 }), false);
    assert.equal(isForgeSnapshotValid({ ...snapshot, state: { ...snapshot.state, heat: NaN } }), false);
    assert.equal(isForgeSnapshotValid({ ...snapshot, state: { ...snapshot.state, done: true } }), false);
    assert.equal(restoreForgeSnapshot({ ...snapshot, version: 2 } as any), null);
    const missingProfile = structuredClone(snapshot); delete (missingProfile.state.physicalProfile as any).midWidth;
    assert.equal(isForgeSnapshotValid(missingProfile), false);
    const badDesign = structuredClone(snapshot); badDesign.design.length = NaN;
    assert.equal(isForgeSnapshotValid(badDesign), false);
  });

  it("finish exige done confirmado e identidade de projeto/run/treino/núcleo/estado físico", () => {
    const { save } = setup();
    const played = playForgeAttempt(executeStartForgeTransaction(save, design).save);
    const mutations = [
      { ...played.sim, done: false },
      { ...played.sim, forgeRunId: "foreign" },
      { ...played.sim, isTraining: true },
      { ...played.sim, activeCore: coreFixture() },
      { ...played.sim, heat: .12 },
      { ...played.sim, integrity: NaN },
    ];
    for (const sim of mutations) assert.equal(executeFinishSwordTransaction(played.save, sim, design).success, false);
    assert.equal(executeFinishSwordTransaction(played.save, played.sim, { ...design, inscription: "ADULTERADO" }).success, false);
    const corruptCount = structuredClone(played.save); corruptCount.activeForgeAttempt!.strikesCount = 0;
    assert.equal(executeFinishSwordTransaction(corruptCount, played.sim, design).success, false);
    const finished = executeFinishSwordTransaction(played.save, played.sim, design);
    assert.equal(finished.success, true);
    assert.equal(finished.payload!.forgeRunId, played.save.activeForgeAttempt!.forgeRunId);
    const repeat = executeFinishSwordTransaction(finished.save, played.sim, design);
    assert.equal(repeat.success, false);
    assert.equal(repeat.save.gallery.length, 1);
    assert.equal(executeStrikeRewardTransaction(finished.save, { id: `${finished.payload!.forgeRunId}:9`, amount: 12 }).success, false);
  });

  it("núcleo valida design/material/tentativa antes do início e transmite herança em forja manual", () => {
    const { save, fail } = setup();
    const core = coreFixture(); save.inventory.fusionCores = [core];
    fail(true);
    const failedStart = executeStartForgeTransaction(save, design, { activeCoreId: core.id });
    assert.equal(failedStart.success, false);
    assert.equal(failedStart.save, save);
    assert.equal(failedStart.save.activeForgeAttempt, null);
    assert.equal(failedStart.save.inventory.materials.iron_ingot, 8);
    fail(false);
    assert.equal(executeStartForgeTransaction(save, design, { activeCoreId: "missing" }).success, false);
    assert.equal(executeStartForgeTransaction(save, { ...design, profile: "katana" }, { activeCoreId: core.id }).code, "CORE_DESIGN_MISMATCH");
    const empty = structuredClone(save); empty.inventory.materials = { iron_ingot: 0 };
    assert.equal(executeStartForgeTransaction(empty, design, { activeCoreId: core.id }).code, "INSUFFICIENT_MATERIALS");
    const start = executeStartForgeTransaction(save, design, { activeCoreId: core.id });
    assert.equal(start.success, true);
    assert.equal(start.save.inventory.materials.iron_ingot, 7);
    assert.equal(start.payload!.snapshot!.state.activeCore!.id, core.id);
    assert.equal(executeStartForgeTransaction(start.save, design, { activeCoreId: core.id }).code, "ATTEMPT_ALREADY_ACTIVE");
    const played = playForgeAttempt(start.save);
    const missingCore = structuredClone(played.save); missingCore.inventory.fusionCores = [];
    assert.equal(executeFinishSwordTransaction(missingCore, played.sim, design).code, "CORE_NOT_FOUND");
    const finished = executeFinishSwordTransaction(played.save, played.sim, design);
    assert.equal(finished.success, true);
    assert.equal(finished.save.inventory.fusionCores.length, 0);
    assert.equal(finished.save.inventory.materials.iron_ingot, 7);
    assert.equal(finished.payload!.fusionHistory!.coreId, core.id);
    assert.ok(finished.payload!.perks!.includes("Herança de teste"));
    const noCore = finishSword({ ...played.sim, activeCore: null }, design);
    assert.equal(finished.payload!.baseDamage, noCore.baseDamage! + 18);
    assert.equal(executeFinishSwordTransaction(finished.save, played.sim, design).success, false);
  });

  it("treino canônico força ferro, ignora núcleo e preserva inventário e herança alheia", () => {
    const { save } = setup(); const core = coreFixture(); save.inventory.fusionCores = [core];
    const start = executeStartForgeTransaction(save, { ...design, steel: "meteor" }, { isTraining: true, activeCoreId: core.id });
    assert.equal(start.success, true);
    assert.equal(start.payload!.design.steel, "iron");
    assert.equal(start.payload!.activeCoreId, null);
    assert.equal(start.payload!.snapshot!.state.activeCore, null);
    const played = playForgeAttempt(start.save);
    const finished = executeFinishSwordTransaction(played.save, played.sim, start.payload!.design);
    assert.equal(finished.success, true);
    assert.deepEqual(finished.save.inventory.fusionCores, [core]);
    assert.equal(finished.payload!.fusionHistory, undefined);
  });

  it("ajuda de treino depende da rota básica acessível; metal raro bloqueado não cancela ajuda", () => {
    const cases: Array<{ gold: number; materials: Record<string, number>; want: number }> = [
      { gold: 50, materials: { iron_ingot: 0 }, want: 0 },
      { gold: 0, materials: { iron_ingot: 1 }, want: 0 },
      { gold: 0, materials: { steel: 1 }, want: 0 },
      { gold: 0, materials: { iron: 1 }, want: 0 },
      { gold: 0, materials: { scrap: 2 }, want: 2 },
      { gold: 49, materials: { iron_ingot: 0, scrap: 0 }, want: 1 },
      { gold: 0, materials: { starmetal_ore: 5, scrap: 0 }, want: 1 },
    ];
    for (const c of cases) {
      const { save } = setup(); save.wallet.gold = c.gold; save.inventory.materials = c.materials;
      const played = playForgeAttempt(executeStartForgeTransaction(save, design, { isTraining: true }).save);
      const result = executeFinishSwordTransaction(played.save, played.sim, design);
      assert.equal(result.success, true);
      assert.equal(result.save.inventory.materials.scrap || 0, c.want, JSON.stringify(c));
      assert.deepEqual(result.save.career, save.career);
    }
  });

  it("treinos repetidos ficam em 2 sucatas e reciclagem interrompe ajuda enquanto houver ferro", () => {
    const ctx = setup(); let save = ctx.save; save.wallet.gold = 0; save.inventory.materials = { scrap: 0 };
    for (let i = 0; i < 4; i++) {
      const played = playForgeAttempt(executeStartForgeTransaction(save, design, { isTraining: true }).save);
      save = executeFinishSwordTransaction(played.save, played.sim, design).save;
    }
    assert.equal(save.inventory.materials.scrap, 2);
    assert.equal(needsTrainingRecovery(save), false);
    const recycled = executeRecycleScrapTransaction(save);
    assert.equal(recycled.save.inventory.materials.iron_ingot, 1);
    assert.equal(needsTrainingRecovery(recycled.save), false);
    assert.equal(executeStartForgeTransaction(recycled.save, design).success, true);
  });

  it("falhas consecutivas de treino não geram carreira ou sucata e treino continua livre", () => {
    const { save } = setup(); save.wallet.gold = 0; save.inventory.materials = { scrap: 0 };
    let current = save;
    for (let i = 0; i < 3; i++) {
      const played = playForgeAttempt(executeStartForgeTransaction(current, design, { isTraining: true }).save, { poor: true });
      const result = executeFinishSwordTransaction(played.save, played.sim, design);
      assert.equal(result.success, true);
      assert.ok(result.payload!.quality < 50 || result.payload!.broken);
      assert.equal(result.save.inventory.materials.scrap, 0);
      assert.deepEqual(result.save.career, save.career);
      current = result.save;
    }
    assert.equal(executeStartForgeTransaction(current, design, { isTraining: true }).success, true);
  });

  it("falha ao gravar golpe mantém carteira/estado; repetir o mesmo checkpoint só paga uma vez", () => {
    const ctx = setup(); const initial = executeStartForgeTransaction(ctx.save, design).save;
    const first = playForgeAttempt(initial, { stopAfterStrikes: 1 });
    const pending = structuredClone(first.save.activeForgeAttempt!.snapshot!); pending.revision = 1;
    writeSave(initial); ctx.fail(true);
    const failed = executeForgeCheckpointTransaction(initial, pending);
    assert.equal(failed.success, false);
    assert.equal(failed.save, initial);
    assert.equal(initial.activeForgeAttempt!.strikesCount, 0);
    assert.equal(initial.wallet.gold, ctx.save.wallet.gold);
    ctx.fail(false);
    const retry = executeForgeCheckpointTransaction(failed.save, pending);
    assert.equal(retry.success, true);
    assert.equal(retry.save.activeForgeAttempt!.strikesCount, 1);
    assert.equal(retry.save.wallet.gold, initial.wallet.gold + 12);
    assert.deepEqual(executeForgeCheckpointTransaction(retry.save, pending).save, retry.save);
  });

  it("claim treino adulterado e claim regular com payload alterado não geram ouro nem drops", () => {
    const { save } = setup();
    const trained = playForgeAttempt(executeStartForgeTransaction(save, design, { isTraining: true }).save);
    const training = executeFinishSwordTransaction(trained.save, trained.sim, design);
    const forgedPayload = { ...training.payload!.pendingRewards!, gold: 500, rubies: 20, items: [] };
    assert.equal(executeClaimRewardsTransaction(training.save, forgedPayload, training.payload).success, false);
    const real = playForgeAttempt(executeStartForgeTransaction(save, design).save);
    const finished = executeFinishSwordTransaction(real.save, real.sim, design);
    const canonical = finished.payload!.pendingRewards!;
    assert.equal(executeClaimRewardsTransaction(finished.save, { ...canonical, gold: canonical.gold + 1 }, finished.payload).success, false);
    const claimed = executeClaimRewardsTransaction(finished.save, canonical, finished.payload);
    assert.equal(claimed.success, true);
    assert.equal(executeClaimRewardsTransaction(claimed.save, canonical, finished.payload).code, "ALREADY_CLAIMED");
  });

  it("save legado conserva armas e tentativa sem inventar snapshot físico", () => {
    const { save } = setup();
    const sword = finishSword(createSim(design), design); save.gallery = [sword];
    const started = executeStartForgeTransaction(save, design).save;
    delete started.activeForgeAttempt!.snapshot;
    const loaded = migrateSave(JSON.parse(JSON.stringify(started)));
    assert.equal(loaded.gallery[0].id, sword.id);
    assert.equal(loaded.activeForgeAttempt!.snapshot, undefined);
    assert.equal(executeForgeCheckpointTransaction(loaded, {} as any).success, false);
    const cancel = executeCancelForgeTransaction(loaded);
    assert.equal(cancel.payload!.refundedMaterial, true);
    assert.equal(cancel.save.inventory.materials.iron_ingot, 8);
  });
});
