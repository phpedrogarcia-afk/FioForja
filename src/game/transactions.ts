import type {
  ActiveForgeAttempt,
  BlacksmithCommission,
  CareerStats,
  FinishedSword,
  ForgeRewardsData,
  FusionCore,
  InventoryComponent,
  PlayerInventory,
  PlayerWallet,
  SaveData,
  SimState,
  SwordDesign,
} from "./types.ts";
import { writeSave, defaultWallet, defaultInventory, defaultCareer, generateUniqueId } from "./save.ts";
import { recalculateSwordStats, CANONICAL_PRESETS } from "./catalog.ts";
import {
  applyComponentFusionTransaction,
  applySwordFusionTransaction,
  validateComponentFusionTransaction,
  validateSwordFusionTransaction,
  type ComponentFusionOutcome,
  type SwordFusionOutcome,
} from "./fusion.ts";
import { finishSword, applyStrikeRewardTransaction } from "./sim.ts";
import {
  addMaterialStock,
  deductMaterialStock,
  getMaterialStock,
  getRequiredMaterialForSteel,
  recycleScrapToIron,
} from "./materials.ts";
import { evaluateBlueprintStatus } from "./blueprints.ts";
import { isSwordEligibleForCommission } from "./commissions.ts";

export interface TransactionExecutionResult<T = unknown> {
  success: boolean;
  save: SaveData;
  error?: string;
  code?: string;
  payload?: T;
  uncommittedSave?: SaveData;
}

/**
 * 1. Sword Fusion Transaction: Consumes 4 swords and produces a FusionCore with heritage profile.
 */
export function executeSwordFusionTransaction(
  currentSave: SaveData,
  outcome: SwordFusionOutcome,
): TransactionExecutionResult<FusionCore> {
  try {
    validateSwordFusionTransaction(currentSave, outcome);
  } catch (err: any) {
    return {
      success: false,
      save: currentSave,
      error: err?.message || "Validação da fusão de espadas falhou.",
      code: "VALIDATION_FAILED",
    };
  }

  const nextSave = applySwordFusionTransaction(currentSave, outcome);
  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar persistência da fusão de espadas.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: outcome.resultCore,
  };
}

/**
 * 2. Component Fusion Transaction: Consumes 4 components and produces an upgraded component.
 */
export function executeComponentFusionTransaction(
  currentSave: SaveData,
  outcome: ComponentFusionOutcome,
): TransactionExecutionResult<InventoryComponent> {
  try {
    validateComponentFusionTransaction(currentSave, outcome);
  } catch (err: any) {
    return {
      success: false,
      save: currentSave,
      error: err?.message || "Validação da fusão de componentes falhou.",
      code: "VALIDATION_FAILED",
    };
  }

  const nextSave = applyComponentFusionTransaction(currentSave, outcome);
  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar persistência da fusão de componentes.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: outcome.resultComponent,
  };
}

/**
 * 3. Component Installation & Swap Transaction: Installs component, uninstalls and refunds previous piece to inventory, and strictly recalculates stats.
 */
export function executeComponentInstallTransaction(
  currentSave: SaveData,
  swordId: string,
  componentId: string,
  finishedFallback?: FinishedSword | null,
): TransactionExecutionResult<FinishedSword> {
  const targetSword =
    currentSave.gallery.find((s) => s.id === swordId) ||
    (finishedFallback && finishedFallback.id === swordId ? finishedFallback : null);
  const comp = currentSave.inventory.components.find((c) => c.id === componentId);

  if (!targetSword) {
    return { success: false, save: currentSave, error: "Espada não encontrada no Arsenal.", code: "SWORD_NOT_FOUND" };
  }
  if (!comp) {
    return { success: false, save: currentSave, error: "Componente não encontrado no inventário.", code: "COMPONENT_NOT_FOUND" };
  }
  if (targetSword.broken) {
    return { success: false, save: currentSave, error: "Lâminas quebradas não aceitam montagem.", code: "BLADE_BROKEN" };
  }

  const existingInstalled = targetSword.installedComponents || {};
  const previousComp = existingInstalled[comp.category];

  // Remove newly installed component from inventory
  const nextComponents = currentSave.inventory.components.filter((c) => c.id !== componentId);
  // Refund previous component in this category back to inventory
  if (previousComp) {
    nextComponents.push(previousComp);
  }

  // Visual design alterations
  const nextDesign = { ...targetSword.design };
  if (comp.category === "guard") {
    const raw = comp.componentKey.replace(/^guard_/, "");
    const match = ["cross", "curved", "wings", "ring", "tsuba", "leaf", "imperial", "runic"].find((g) => raw.startsWith(g));
    if (match) nextDesign.guard = match as any;
  } else if (comp.category === "pommel") {
    const raw = comp.componentKey.replace(/^pommel_/, "");
    const match = ["disc", "sphere", "wolf", "cross", "crescent", "elven", "crown", "knot"].find((p) => raw.startsWith(p));
    if (match) nextDesign.pommel = match as any;
  } else if (comp.category === "wrap") {
    const raw = comp.componentKey.replace(/^wrap_/, "");
    const match = ["leather", "braided", "linen", "darkwood", "bone", "goldwire", "tsukamaki", "dragon_leather", "elven_wood"].find((w) => raw.startsWith(w));
    if (match) nextDesign.wrap = match as any;
  } else if (comp.category === "rune") {
    nextDesign.runes = true;
    if (comp.componentKey) nextDesign.runeKey = comp.componentKey;
  }

  const nextInstalled = {
    ...existingInstalled,
    [comp.category]: comp,
  };

  const existingAffixes = (targetSword.affixes || []).filter(
    (affix) => !affix.startsWith(`Montagem [${comp.category}]:`) && !affix.startsWith(`Montagem de Bancada: ${previousComp?.name}`),
  );
  const newAffix = `Montagem [${comp.category}]: ${comp.name}`;

  const updatedSword = recalculateSwordStats({
    ...targetSword,
    design: nextDesign,
    affixes: [...existingAffixes, newAffix],
    installedComponents: nextInstalled,
  });

  const nextInventory: PlayerInventory = {
    ...currentSave.inventory,
    components: nextComponents,
  };

  const nextGallery = currentSave.gallery.some((s) => s.id === swordId)
    ? currentSave.gallery.map((s) => (s.id === swordId ? updatedSword : s))
    : [updatedSword, ...currentSave.gallery];

  const nextSave: SaveData = {
    ...currentSave,
    inventory: nextInventory,
    gallery: nextGallery,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar montagem do componente no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: updatedSword,
  };
}

/**
 * 4. Weapon Refinement / Upgrade Transaction: Workbench edge polish and grip reinforcement (+8 ATK, +2 DUR).
 */
export function executeUpgradeSwordTransaction(
  currentSave: SaveData,
  swordId: string,
): TransactionExecutionResult<FinishedSword> {
  const targetSword = currentSave.gallery.find((s) => s.id === swordId);
  if (!targetSword) {
    return { success: false, save: currentSave, error: "Espada não encontrada no Arsenal.", code: "SWORD_NOT_FOUND" };
  }
  if (targetSword.broken) {
    return { success: false, save: currentSave, error: "Lâminas quebradas não podem ser refinadas.", code: "BLADE_BROKEN" };
  }

  const upgrades = targetSword.upgradesApplied || 0;
  if (upgrades >= 3) {
    return { success: false, save: currentSave, error: "Nível máximo de refino de bancada atingido (3/3).", code: "MAX_UPGRADE" };
  }

  const currentWallet = currentSave.wallet || defaultWallet;
  const goldCost = 60 * (upgrades + 1);
  const rubyCost = upgrades >= 1 ? 1 : 0;

  if (currentWallet.gold < goldCost || currentWallet.rubies < rubyCost) {
    return { success: false, save: currentSave, error: "Recursos insuficientes para o refino.", code: "INSUFFICIENT_FUNDS" };
  }

  const nextWallet: PlayerWallet = {
    ...currentWallet,
    gold: currentWallet.gold - goldCost,
    rubies: currentWallet.rubies - rubyCost,
  };

  const updatedSword = recalculateSwordStats({
    ...targetSword,
    upgradesApplied: upgrades + 1,
  });

  const nextGallery = currentSave.gallery.map((s) => (s.id === swordId ? updatedSword : s));
  const nextSave: SaveData = {
    ...currentSave,
    wallet: nextWallet,
    gallery: nextGallery,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar refino da lâmina.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: updatedSword,
  };
}

/**
 * 5. Shop Purchase Transaction: Debits gold/rubies and credits tools, materials, components, or runes.
 */
export interface ShopPurchaseItem {
  id: string;
  name: string;
  type: "tool" | "material" | "component" | "rune" | "catalyst" | "recipe";
  costGold: number;
  costRubies?: number;
  quantity?: number;
  componentData?: Omit<InventoryComponent, "id" | "acquiredAt">;
}

export function executeShopPurchaseTransaction(
  currentSave: SaveData,
  purchase: ShopPurchaseItem,
): TransactionExecutionResult {
  const currentWallet = currentSave.wallet || defaultWallet;
  const currentInventory = currentSave.inventory || defaultInventory;
  const rubyCost = purchase.costRubies || 0;

  if (currentWallet.gold < purchase.costGold || currentWallet.rubies < rubyCost) {
    return {
      success: false,
      save: currentSave,
      error: "Saldo insuficiente de moedas para esta aquisição.",
      code: "INSUFFICIENT_FUNDS",
    };
  }

  const nextWallet: PlayerWallet = {
    ...currentWallet,
    gold: currentWallet.gold - purchase.costGold,
    rubies: currentWallet.rubies - rubyCost,
  };

  let nextMaterials = { ...(currentInventory.materials || {}) };
  const nextUnlockedTools = [...(currentInventory.unlockedTools || [])];
  const nextUnlockedBlueprints = [...(currentInventory.unlockedBlueprints || ["guarda_medieval"])];
  const nextComponents = [...(currentInventory.components || [])];

  if (purchase.type === "tool") {
    if (nextUnlockedTools.includes(purchase.id)) {
      return { success: false, save: currentSave, error: "Ferramenta já adquirida.", code: "ALREADY_OWNED" };
    }
    nextUnlockedTools.push(purchase.id);
  } else if (purchase.type === "material") {
    const qty = purchase.quantity || 1;
    nextMaterials = addMaterialStock(nextMaterials, purchase.id, qty);
  } else if (purchase.type === "catalyst") {
    const qty = purchase.quantity || 1;
    nextMaterials.catalyst_astral = (nextMaterials.catalyst_astral || 0) + qty;
  } else if (purchase.type === "recipe") {
    const blueprintId = purchase.id.replace(/^recipe_/, "");
    if (!nextUnlockedBlueprints.includes(blueprintId)) {
      nextUnlockedBlueprints.push(blueprintId);
    }
  } else if (purchase.type === "component" || purchase.type === "rune") {
    if (purchase.componentData) {
      nextComponents.push({
        id: `shop_${purchase.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: purchase.name,
        category: purchase.componentData.category,
        componentKey: purchase.componentData.componentKey,
        rarity: purchase.componentData.rarity,
        icon: purchase.componentData.icon,
        description: purchase.componentData.description,
        statModifier: purchase.componentData.statModifier,
        acquiredAt: Date.now(),
      });
    }
  }

  const nextInventory: PlayerInventory = {
    ...currentInventory,
    materials: nextMaterials,
    unlockedTools: nextUnlockedTools,
    unlockedBlueprints: nextUnlockedBlueprints,
    components: nextComponents,
  };

  const nextSave: SaveData = {
    ...currentSave,
    wallet: nextWallet,
    inventory: nextInventory,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar compra no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
  };
}

/**
 * 6. Rewards Claim Transaction: Credits rewards idempotently and records forgeRunId in claimedForgeRewardIds.
 */
export function executeClaimRewardsTransaction(
  currentSave: SaveData,
  rewards: ForgeRewardsData,
  finishedSword?: FinishedSword | null,
): TransactionExecutionResult {
  const currentWallet = currentSave.wallet || defaultWallet;
  const currentInventory = currentSave.inventory || defaultInventory;
  const runId = rewards.forgeRunId || (finishedSword ? finishedSword.forgeRunId : null);
  const claimedRuns = currentSave.claimedForgeRewardIds || [];

  if (runId && claimedRuns.includes(runId)) {
    return {
      success: false,
      save: currentSave,
      error: "Recompensas desta forja já foram resgatadas anteriormente.",
      code: "ALREADY_CLAIMED",
    };
  }

  const nextWallet: PlayerWallet = {
    gold: currentWallet.gold + (rewards.gold || 0),
    rubies: currentWallet.rubies + (rewards.rubies || 0),
    diamonds: currentWallet.diamonds + (rewards.diamonds || 0),
  };

  let nextMaterials = { ...(currentInventory.materials || {}) };
  const nextComponents = [...(currentInventory.components || [])];

  for (const item of (rewards.items || [])) {
    if (item.category === "material" || item.category === "fusion") {
      const key = item.catalogKey || item.id;
      nextMaterials = addMaterialStock(nextMaterials, key, item.quantity || 1);
    } else if (item.category === "guard" || item.category === "pommel" || item.category === "wrap" || item.category === "rune") {
      nextComponents.push({
        id: item.id,
        name: item.name,
        category: item.category,
        componentKey: item.catalogKey || item.id,
        rarity: item.rarity,
        icon: item.icon,
        description: item.description,
        statModifier: item.statsModifier,
        acquiredAt: Date.now(),
      });
    } else {
      const key = item.catalogKey || item.id;
      nextMaterials = addMaterialStock(nextMaterials, key, item.quantity || 1);
    }
  }

  const nextClaimedRuns = runId ? [...claimedRuns, runId] : claimedRuns;
  const nextInventory: PlayerInventory = {
    ...currentInventory,
    materials: nextMaterials,
    components: nextComponents,
  };

  const nextSave: SaveData = {
    ...currentSave,
    wallet: nextWallet,
    inventory: nextInventory,
    claimedForgeRewardIds: nextClaimedRuns,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar resgate de recompensas.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
  };
}

/**
 * 7. Finish Sword Transaction: Finishes sword, consumes active FusionCore atomically, updates career, unlocks/masters blueprints, and saves to gallery.
 * On persistence failure, it returns fail-closed state preserving temporary uncommittedSave for manual retry without regenerating attributes or drops.
 */
export function executeFinishSwordTransaction(
  currentSave: SaveData,
  sim: SimState,
  design: SwordDesign,
): TransactionExecutionResult<FinishedSword> {
  const sword = finishSword(sim, design);
  const attempt = currentSave.activeForgeAttempt;
  const isTraining = Boolean(attempt?.isTraining || sim.isTraining);

  if (isTraining) {
    sword.value = 0;
    sword.isTraining = true;
    sword.pendingRewards = {
      forgeRunId: sword.forgeRunId,
      rank: "TREINO",
      scorePercent: Math.round(sword.quality),
      gold: 0,
      rubies: 0,
      diamonds: 0,
      items: [],
      claimed: true,
    };
  } else {
    const swordValue = sword.value ?? Math.round(sword.quality * 28 + (sword.rarity === "Lendária" ? 1800 : sword.rarity === "Relíquia" ? 3500 : 250));
    sword.value = swordValue;
  }

  const nextInventory = { ...(currentSave.inventory || defaultInventory) };
  const nextMaterials = { ...(nextInventory.materials || {}) };

  // Anti-softlock recovery:
  // 1. Scrap reward on blade break in real forge (+2 scrap)
  if (sim.broken && !isTraining) {
    nextMaterials.scrap = (nextMaterials.scrap || 0) + 2;
  }
  // 2. Training mode filings/trimmings: apprentice completing practice sword with Q >= 50 gets +1 scrap
  // (2 treinos bem-sucedidos = 2 sucatas = 1 lingote de ferro reciclado na oficina)
  if (isTraining && !sim.broken && sword.quality >= 50) {
    nextMaterials.scrap = (nextMaterials.scrap || 0) + 1;
  }

  if (sim.activeCore) {
    const remainingCores = (nextInventory.fusionCores || []).filter((c) => c.id !== sim.activeCore!.id);
    nextInventory.fusionCores = remainingCores;
  }

  // Blueprint mastery & discovery tracking (ONLY FOR REAL FORGES — NEVER IN TRAINING)
  const nextBlueprints = [...(nextInventory.unlockedBlueprints || ["guarda_medieval"])];
  const nextMastered = [...(nextInventory.masteredBlueprints || [])];
  if (!isTraining) {
    const matchedPreset = CANONICAL_PRESETS.find(
      (p) =>
        p.id === (design as any).id ||
        p.name === design.name ||
        p.design.name === design.name ||
        (p.family === design.family && p.design.profile === design.profile),
    );
    if (matchedPreset) {
      if (sword.quality >= 95 && !nextMastered.includes(matchedPreset.id)) {
        nextMastered.push(matchedPreset.id);
      }
    }
  }
  nextInventory.unlockedBlueprints = nextBlueprints;
  nextInventory.masteredBlueprints = nextMastered;
  nextInventory.materials = nextMaterials;

  // Career stats: STRICTLY PRESERVED IN TRAINING (ZERO PROGRESS)
  const prevCareer = currentSave.career || defaultCareer;
  let nextCareer: CareerStats = prevCareer;
  if (!isTraining) {
    const isMasterpiece = sword.quality >= 95;
    nextCareer = {
      totalForged: prevCareer.totalForged + 1,
      masterpieces: prevCareer.masterpieces + (isMasterpiece ? 1 : 0),
      legendaries: prevCareer.legendaries + (sword.rarity === "Lendária" ? 1 : 0),
      relics: prevCareer.relics + (sword.rarity === "Relíquia" ? 1 : 0),
      brokenBlades: prevCareer.brokenBlades + (sim.broken ? 1 : 0),
      highestQuality: Math.max(prevCareer.highestQuality, sword.quality),
      totalValueEarned: prevCareer.totalValueEarned + (sim.broken ? 0 : (sword.value || 0)),
    };
  }

  // Gallery destination: Training swords go to trainingGallery, real swords go to regular gallery
  let nextGallery = currentSave.gallery;
  let nextTrainingGallery = currentSave.trainingGallery || [];

  if (isTraining) {
    if (!sim.broken) {
      nextTrainingGallery = [sword, ...nextTrainingGallery];
    }
  } else {
    if (!sim.broken) {
      nextGallery = [sword, ...currentSave.gallery];
    }
  }

  const nextSave: SaveData = {
    ...currentSave,
    gallery: nextGallery,
    trainingGallery: nextTrainingGallery,
    career: nextCareer,
    inventory: nextInventory,
    activeForgeAttempt: null, // Clear active attempt on finish
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      uncommittedSave: nextSave,
      error: writeRes.error || "Falha ao gravar lâmina finalizada no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
      payload: sword,
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: sword,
  };
}

/**
 * 8. Strike Reward Transaction: Credits gold per strike, checks forgeRunId lifecycle, and compacts history.
 * Isolado no modo treino: rejeita concessão de ouro.
 */
export function executeStrikeRewardTransaction(
  currentSave: SaveData,
  reward: { amount: number; id: string },
): TransactionExecutionResult {
  if (currentSave.activeForgeAttempt?.isTraining) {
    return {
      success: false,
      save: currentSave,
      error: "Modo Treino não gera recompensas financeiras por golpes.",
      code: "TRAINING_MODE_NO_GOLD",
    };
  }

  const tx = applyStrikeRewardTransaction(currentSave, reward);
  if (!tx.applied) {
    return {
      success: false,
      save: currentSave,
      error: "Recompensa de golpe inválida ou já creditada.",
      code: "STRIKE_REWARD_REJECTED",
    };
  }

  const nextAttempt = currentSave.activeForgeAttempt
    ? {
        ...currentSave.activeForgeAttempt,
        status: "ACTIVE" as const,
        strikesCount: (currentSave.activeForgeAttempt.strikesCount || 0) + 1,
        lastStrikeAt: Date.now(),
      }
    : null;

  const nextSave: SaveData = {
    ...currentSave,
    wallet: tx.wallet,
    claimedStrikeRewardIds: tx.claimedStrikeRewardIds,
    activeForgeAttempt: nextAttempt,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar ouro do golpe no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
  };
}

/**
 * Registra um golpe no ciclo de vida da tentativa ativa (transição PREPARED -> ACTIVE e contador)
 * Utilizado para golpes em treino ou sem premiação direta de ouro.
 */
export function executeRecordStrikeTransaction(currentSave: SaveData): TransactionExecutionResult<ActiveForgeAttempt> {
  if (!currentSave.activeForgeAttempt) {
    return { success: true, save: currentSave };
  }

  const nextAttempt: ActiveForgeAttempt = {
    ...currentSave.activeForgeAttempt,
    status: "ACTIVE",
    strikesCount: (currentSave.activeForgeAttempt.strikesCount || 0) + 1,
    lastStrikeAt: Date.now(),
  };

  const nextSave: SaveData = {
    ...currentSave,
    activeForgeAttempt: nextAttempt,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao registrar golpe no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: nextAttempt,
  };
}

/**
 * 9. Start Forge Transaction: Transactionally validates blueprint knowledge, checks raw material stock,
 * reserves/deducts 1x material (unless free training), records activeForgeAttempt with attemptId, and persists fail-closed.
 */
export function executeStartForgeTransaction(
  currentSave: SaveData,
  design: SwordDesign,
  options?: { isTraining?: boolean; activeCoreId?: string },
): TransactionExecutionResult<ActiveForgeAttempt> {
  const currentInv = currentSave.inventory || defaultInventory;
  const isTraining = Boolean(options?.isTraining);

  // Impede iniciar uma nova forja caso uma tentativa já esteja ativa ou preparada
  if (
    currentSave.activeForgeAttempt &&
    (currentSave.activeForgeAttempt.status === "PREPARED" ||
      currentSave.activeForgeAttempt.status === "ACTIVE" ||
      !currentSave.activeForgeAttempt.status)
  ) {
    return {
      success: false,
      save: currentSave,
      error: "Uma forja já está em andamento. Conclua ou cancele a tentativa atual antes de iniciar outra.",
      code: "ATTEMPT_ALREADY_ACTIVE",
    };
  }

  if (isTraining) {
    const attempt: ActiveForgeAttempt = {
      attemptId: generateUniqueId("attempt"),
      forgeRunId: generateUniqueId("run"),
      design: { ...design, steel: "iron" },
      isTraining: true,
      materialConsumed: null,
      activeCoreId: null,
      startedAt: Date.now(),
      status: "PREPARED",
      strikesCount: 0,
    };

    const nextSave: SaveData = {
      ...currentSave,
      activeForgeAttempt: attempt,
    };

    const writeRes = writeSave(nextSave);
    if (!writeRes.ok) {
      return {
        success: false,
        save: currentSave,
        error: writeRes.error || "Falha ao registrar início do treino no armazenamento.",
        code: writeRes.code || "PERSISTENCE_FAILED",
      };
    }

    return {
      success: true,
      save: nextSave,
      payload: attempt,
    };
  }

  let activeCore: FusionCore | null = null;
  if (options?.activeCoreId) {
    activeCore = (currentInv.fusionCores || []).find((c) => c.id === options.activeCoreId) || null;
    if (!activeCore) {
      return {
        success: false,
        save: currentSave,
        error: "Núcleo de Fusão especificado não existe ou já foi consumido.",
        code: "CORE_NOT_FOUND",
      };
    }
  }

  // Validate blueprint lock
  const matchedPreset = CANONICAL_PRESETS.find(
    (p) =>
      p.id === (design as any).id ||
      p.name === design.name ||
      p.design.name === design.name ||
      (p.family === design.family && p.design.profile === design.profile),
  );
  if (matchedPreset) {
    const status = evaluateBlueprintStatus(
      matchedPreset,
      currentInv,
      currentSave.career || defaultCareer,
      currentSave.gallery || [],
      activeCore,
    );
    if (!status.unlocked || status.state === "locked") {
      return {
        success: false,
        save: currentSave,
        error: `Projeto "${matchedPreset.name}" bloqueado. ${status.requirementText}`,
        code: "BLUEPRINT_LOCKED",
      };
    }
  }

  // Proteção da metalurgia em design livre (gating contra craft de aço raro sem prestígio/núcleo)
  const career = currentSave.career || defaultCareer;
  if (design.steel === "damascus") {
    const unlockedDamascus =
      career.totalForged >= 3 ||
      currentInv.unlockedBlueprints?.includes("cimitarra_damasco") ||
      activeCore?.steel === "damascus";
    if (!unlockedDamascus) {
      return {
        success: false,
        save: currentSave,
        error: "Metalurgia do Damasco bloqueada: Requer pelo menos 3 forjas concluídas ou autorização por Núcleo/Receita.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (design.steel === "blacksteel") {
    const unlockedBlacksteel =
      career.totalForged >= 4 ||
      currentInv.unlockedBlueprints?.includes("juramento_ferro") ||
      activeCore?.steel === "blacksteel";
    if (!unlockedBlacksteel) {
      return {
        success: false,
        save: currentSave,
        error: "Metalurgia do Aço Negro bloqueada: Requer pelo menos 4 forjas concluídas ou receita/núcleo.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (design.steel === "elven_silver") {
    const unlockedElven =
      career.totalForged >= 7 ||
      currentInv.unlockedBlueprints?.includes("folha_aereth") ||
      activeCore?.steel === "elven_silver";
    if (!unlockedElven) {
      return {
        success: false,
        save: currentSave,
        error: "Metalurgia Élfica bloqueada: Requer pelo menos 7 forjas concluídas ou receita élfica no Bazar.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (design.steel === "meteor") {
    const unlockedMeteor =
      career.masterpieces >= 1 ||
      career.legendaries >= 1 ||
      currentInv.unlockedBlueprints?.includes("queda_asterion") ||
      activeCore?.steel === "meteor";
    if (!unlockedMeteor) {
      return {
        success: false,
        save: currentSave,
        error: "Metalurgia Meteórica bloqueada: Requer pelo menos 1 Obra-prima (Rank S) ou Núcleo de Fusão meteórico.",
        code: "METALLURGY_LOCKED",
      };
    }
  } else if (design.steel === "ancient_alloy") {
    const unlockedAncient =
      career.legendaries >= 1 ||
      currentInv.unlockedBlueprints?.includes("cinzas_ancestrais") ||
      activeCore?.steel === "ancient_alloy";
    if (!unlockedAncient) {
      return {
        success: false,
        save: currentSave,
        error: "Metalurgia Primordial bloqueada: Requer pelo menos 1 arma Lendária ou Núcleo de Fusão primordial.",
        code: "METALLURGY_LOCKED",
      };
    }
  }

  const reqMat = getRequiredMaterialForSteel(design.steel);
  const stock = getMaterialStock(currentInv.materials, reqMat.key);

  if (stock < 1) {
    return {
      success: false,
      save: currentSave,
      error: `Insumos insuficientes: requer 1x ${reqMat.name}. Disponível no inventário: ${stock}.`,
      code: "INSUFFICIENT_MATERIALS",
    };
  }

  const nextMaterials = deductMaterialStock(currentInv.materials, reqMat.key, 1);
  const attempt: ActiveForgeAttempt = {
    attemptId: generateUniqueId("attempt"),
    forgeRunId: generateUniqueId("run"),
    design,
    isTraining: false,
    materialConsumed: { key: reqMat.key, name: reqMat.name, quantity: 1 },
    activeCoreId: activeCore ? activeCore.id : null,
    startedAt: Date.now(),
    status: "PREPARED",
    strikesCount: 0,
  };

  const nextInventory: PlayerInventory = {
    ...currentInv,
    materials: nextMaterials,
  };

  const nextSave: SaveData = {
    ...currentSave,
    inventory: nextInventory,
    activeForgeAttempt: attempt,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar consumo de materiais no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: attempt,
  };
}

/**
 * 10. Cancel Forge Transaction: Fair cancellation policy.
 * - Antes do primeiro golpe (PREPARED, strikesCount === 0): Reembolso integral (100%) do lingote consumido.
 * - Após o primeiro golpe (ACTIVE, strikesCount > 0): Sem estorno de lingote; concede +1 sucata metálica.
 * - Rejeita cancelamento se a tentativa já estiver COMPLETED ou CANCELLED.
 */
export function executeCancelForgeTransaction(
  currentSave: SaveData,
  options?: { strikesCount?: number },
): TransactionExecutionResult<{ refundedMaterial: boolean; scrapAwarded: number }> {
  const attempt = currentSave.activeForgeAttempt;
  if (!attempt) {
    return {
      success: true,
      save: currentSave,
      payload: { refundedMaterial: false, scrapAwarded: 0 },
    };
  }

  if (attempt.status === "COMPLETED" || attempt.status === "CANCELLED") {
    return {
      success: false,
      save: currentSave,
      error: "A tentativa de forja já foi encerrada e não pode ser cancelada.",
      code: "ATTEMPT_ALREADY_COMPLETED",
    };
  }

  const effectiveStrikes = Math.max(attempt.strikesCount || 0, options?.strikesCount || 0);
  const isStruck = effectiveStrikes > 0 || attempt.status === "ACTIVE";

  const nextInventory = { ...(currentSave.inventory || defaultInventory) };
  let nextMaterials = { ...(nextInventory.materials || {}) };
  let refundedMaterial = false;
  let scrapAwarded = 0;

  if (!isStruck) {
    // Reembolso de 100% dos insumos antes da primeira batida do martelo
    if (attempt.materialConsumed && attempt.materialConsumed.quantity > 0) {
      nextMaterials = addMaterialStock(
        nextMaterials,
        attempt.materialConsumed.key,
        attempt.materialConsumed.quantity,
      );
      refundedMaterial = true;
    }
  } else {
    // Tarugo deformado após a primeira martelada: perde o lingote mas recupera 1 sucata para reciclagem
    nextMaterials.scrap = (nextMaterials.scrap || 0) + 1;
    scrapAwarded = 1;
  }

  nextInventory.materials = nextMaterials;

  const nextSave: SaveData = {
    ...currentSave,
    inventory: nextInventory,
    activeForgeAttempt: null,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao registrar cancelamento da forja.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: { refundedMaterial, scrapAwarded },
  };
}

/**
 * 11. Retry Persistence Transaction: Re-attempts persisting an uncommitted save without generating new RNG/attributes/rewards.
 */
export function retryPersistSave(uncommittedSave: SaveData): TransactionExecutionResult {
  const writeRes = writeSave(uncommittedSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: uncommittedSave,
      uncommittedSave,
      error: writeRes.error || "Falha repetida ao gravar no armazenamento local.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }
  return {
    success: true,
    save: uncommittedSave,
  };
}

/**
 * 12. Deliver Commission Transaction: Validates weapon matches commission specifications, credits rewards, and tags sword.
 */
export function executeDeliverCommissionTransaction(
  currentSave: SaveData,
  commissionId: string,
  swordId: string,
): TransactionExecutionResult<{ commission: BlacksmithCommission; sword: FinishedSword }> {
  const commissions = currentSave.commissions || [];
  const commIndex = commissions.findIndex((c) => c.id === commissionId);
  if (commIndex === -1) {
    return { success: false, save: currentSave, error: "Encomenda não encontrada.", code: "COMMISSION_NOT_FOUND" };
  }
  const comm = commissions[commIndex];
  if (comm.completed) {
    return { success: false, save: currentSave, error: "Encomenda já entregue e recompensada.", code: "COMMISSION_ALREADY_COMPLETED" };
  }

  const sword = (currentSave.gallery || []).find((s) => s.id === swordId);
  if (!sword) {
    return { success: false, save: currentSave, error: "Espada não encontrada no Arsenal.", code: "SWORD_NOT_FOUND" };
  }

  const check = isSwordEligibleForCommission(comm, sword);
  if (!check.eligible) {
    return {
      success: false,
      save: currentSave,
      error: `A arma não atende a todos os requisitos: ${check.reasons.join(" ")}`,
      code: "INELIGIBLE_SWORD",
    };
  }

  const updatedComm: BlacksmithCommission = {
    ...comm,
    completed: true,
    deliveredSwordId: sword.id,
  };

  const nextCommissions = [...commissions];
  nextCommissions[commIndex] = updatedComm;

  const updatedSword: FinishedSword = {
    ...sword,
    commissionDelivered: comm.id,
  };

  const nextGallery = (currentSave.gallery || []).map((s) => (s.id === sword.id ? updatedSword : s));

  const currentWallet = currentSave.wallet || defaultWallet;
  const nextWallet: PlayerWallet = {
    ...currentWallet,
    gold: currentWallet.gold + comm.rewardGold,
    rubies: currentWallet.rubies + (comm.rewardRubies || 0),
  };

  let nextMaterials = { ...(currentSave.inventory?.materials || {}) };
  if (comm.rewardMaterial) {
    nextMaterials = addMaterialStock(nextMaterials, comm.rewardMaterial.key, comm.rewardMaterial.quantity);
  }

  const nextInventory: PlayerInventory = {
    ...(currentSave.inventory || defaultInventory),
    materials: nextMaterials,
  };

  const nextSave: SaveData = {
    ...currentSave,
    wallet: nextWallet,
    inventory: nextInventory,
    gallery: nextGallery,
    commissions: nextCommissions,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar entrega de encomenda no armazenamento.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: { commission: updatedComm, sword: updatedSword },
  };
}

/**
 * 13. Recycle Scrap Transaction: Recycles 2x scrap into 1x iron ingot (anti-softlock).
 */
export function executeRecycleScrapTransaction(
  currentSave: SaveData,
): TransactionExecutionResult<{ ironCreated: number }> {
  const currentMaterials = currentSave.inventory?.materials || {};
  const res = recycleScrapToIron(currentMaterials);
  if (!res.success) {
    return {
      success: false,
      save: currentSave,
      error: "Sucata insuficiente para reciclagem (são necessárias pelo menos 2 unidades de sucata).",
      code: "INSUFFICIENT_SCRAP",
    };
  }

  const nextInventory: PlayerInventory = {
    ...(currentSave.inventory || defaultInventory),
    materials: res.nextMaterials,
  };

  const nextSave: SaveData = {
    ...currentSave,
    inventory: nextInventory,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
      error: writeRes.error || "Falha ao gravar reciclagem de sucata.",
      code: writeRes.code || "PERSISTENCE_FAILED",
    };
  }

  return {
    success: true,
    save: nextSave,
    payload: { ironCreated: res.ironCreated },
  };
}
