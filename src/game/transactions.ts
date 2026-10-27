import type {
  ActiveForgeAttempt,
  BlacksmithCommission,
  CareerStats,
  FinishedSword,
  ForgeRewardsData,
  ForgeSnapshot,
  FusionCore,
  InventoryComponent,
  PlayerInventory,
  PlayerWallet,
  SaveData,
  SimState,
  SwordDesign,
} from "./types.ts";
import { writeSave, defaultWallet, defaultInventory, defaultCareer, defaultEquippedGear, generateUniqueId } from "./save.ts";
import { recalculateSwordStats, CANONICAL_PRESETS } from "./catalog.ts";
import {
  applyComponentFusionTransaction,
  applySwordFusionTransaction,
  validateComponentFusionTransaction,
  validateSwordFusionTransaction,
  type ComponentFusionOutcome,
  type SwordFusionOutcome,
} from "./fusion.ts";
import { createSim, createForgeSnapshot, finishSword, isForgeSnapshotValid, isFusionCoreValid, isSwordDesignValid, restoreForgeSnapshot, sameForgeValue, strikeGoldReward } from "./sim.ts";
import {
  BASIC_IRON_RECOVERY_COST,
  addMaterialStock,
  deductMaterialStock,
  getMaterialStock,
  getRequiredMaterialForSteel,
  recycleScrapToIron,
} from "./materials.ts";
import { getPreparationBlocker } from "./preparation.ts";
import { findShopArticle } from "./shop.ts";
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
export function getSwordUpgradeQuote(sword: FinishedSword) {
  const upgrades = sword.upgradesApplied || 0;
  const updatedSword = recalculateSwordStats({ ...sword, upgradesApplied: upgrades + 1 });
  return {
    goldCost: 60 * (upgrades + 1),
    rubyCost: upgrades >= 1 ? 1 : 0,
    maxed: upgrades >= 3,
    updatedSword,
    damageDelta: (updatedSword.damage || 0) - (sword.damage || 0),
    durabilityDelta: (updatedSword.durability || 0) - (sword.durability || 0),
  };
}

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
  const { goldCost, rubyCost, updatedSword } = getSwordUpgradeQuote(targetSword);

  if (currentWallet.gold < goldCost || currentWallet.rubies < rubyCost) {
    return { success: false, save: currentSave, error: "Recursos insuficientes para o refino.", code: "INSUFFICIENT_FUNDS" };
  }

  const nextWallet: PlayerWallet = {
    ...currentWallet,
    gold: currentWallet.gold - goldCost,
    rubies: currentWallet.rubies - rubyCost,
  };

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
  const reject = (code: string, error: string): TransactionExecutionResult => ({
    success: false,
    save: currentSave,
    code,
    error,
  });

  // O catálogo comercial é a fonte de verdade: ID, tipo e preço precisam bater.
  // Chamadas diretas não compram item inexistente nem pagam menos que a etiqueta.
  if (!purchase || typeof purchase.id !== "string" || purchase.id.length === 0) {
    return reject("INVALID_PURCHASE", "Produto inválido: ID canônico ausente.");
  }
  const article = findShopArticle(purchase.id);
  if (!article) {
    return reject("ITEM_NOT_FOUND", `Produto inexistente no catálogo da Loja: ${purchase.id}.`);
  }
  if (article.type !== purchase.type) {
    return reject("ITEM_TYPE_MISMATCH", "Tipo de produto incompatível com o catálogo canônico.");
  }
  const quantity = purchase.quantity ?? 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    return reject("INVALID_QUANTITY", "Quantidade inválida para aquisição (1 a 99).");
  }
  if (article.type !== "material" && quantity !== 1) {
    return reject("INVALID_QUANTITY", "Este produto só pode ser adquirido em unidade única.");
  }
  const goldCost = article.costGold * quantity;
  const rubyCost = (article.costRubies || 0) * quantity;
  if (
    !Number.isFinite(purchase.costGold) ||
    purchase.costGold !== goldCost ||
    (purchase.costRubies || 0) !== rubyCost
  ) {
    return reject("PRICE_MISMATCH", "Preço divergente do catálogo canônico da Loja.");
  }
  if ((article.type === "component" || article.type === "rune") && !article.componentData) {
    return reject("INVALID_COMPONENT", "Componente sem dados canônicos de montagem.");
  }

  const currentWallet = currentSave.wallet || defaultWallet;
  const currentInventory = currentSave.inventory || defaultInventory;

  if (currentWallet.gold < goldCost || currentWallet.rubies < rubyCost) {
    return {
      success: false,
      save: currentSave,
      error: "Saldo insuficiente de moedas para esta aquisição.",
      code: "INSUFFICIENT_FUNDS",
    };
  }

  const nextWallet: PlayerWallet = {
    ...currentWallet,
    gold: currentWallet.gold - goldCost,
    rubies: currentWallet.rubies - rubyCost,
  };

  let nextMaterials = { ...(currentInventory.materials || {}) };
  const nextUnlockedTools = [...(currentInventory.unlockedTools || [])];
  const nextUnlockedBlueprints = [...(currentInventory.unlockedBlueprints || ["guarda_medieval"])];
  const nextComponents = [...(currentInventory.components || [])];

  if (article.type === "tool") {
    if (nextUnlockedTools.includes(article.id)) {
      return reject("ALREADY_OWNED", "Ferramenta já adquirida.");
    }
    nextUnlockedTools.push(article.id);
  } else if (article.type === "material") {
    nextMaterials = addMaterialStock(nextMaterials, article.id, quantity);
  } else if (article.type === "catalyst") {
    nextMaterials.catalyst_astral = (nextMaterials.catalyst_astral || 0) + quantity;
  } else if (article.type === "recipe") {
    const blueprintId = article.id.replace(/^recipe_/, "");
    if (!CANONICAL_PRESETS.some((preset) => preset.id === blueprintId)) {
      return reject("BLUEPRINT_NOT_FOUND", "Receita sem projeto correspondente no Compêndio.");
    }
    if (nextUnlockedBlueprints.includes(blueprintId)) {
      return reject("ALREADY_OWNED", "Receita já adquirida.");
    }
    nextUnlockedBlueprints.push(blueprintId);
  } else if ((article.type === "component" || article.type === "rune") && article.componentData) {
    const data = article.componentData;
    nextComponents.push({
      id: generateUniqueId(`shop_${article.id}`),
      name: article.name,
      category: data.category,
      componentKey: data.componentKey,
      rarity: data.rarity,
      icon: data.icon,
      description: data.description,
      statModifier: data.statModifier,
      acquiredAt: Date.now(),
    });
  } else {
    return reject("INVALID_PURCHASE", "Tipo de produto não suportado pela Loja.");
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
  const runId = rewards.forgeRunId || finishedSword?.forgeRunId;
  const claimedRuns = currentSave.claimedForgeRewardIds || [];
  const storedSword = runId ? currentSave.gallery.find(s => s.forgeRunId === runId) : null;
  const reject = (code: string): TransactionExecutionResult => ({ success: false, save: currentSave, code, error: "Recompensa sem lâmina econômica correspondente ou payload incompatível." });
  if (finishedSword?.isTraining || currentSave.trainingGallery?.some(s => s.forgeRunId === runId)) return reject("TRAINING_MODE_NO_REWARDS");
  if (!storedSword || storedSword.isTraining || storedSword.broken || finishedSword && finishedSword.id !== storedSword.id) return reject("REWARD_SWORD_NOT_FOUND");
  const canonicalRewards = storedSword.pendingRewards;
  if (!canonicalRewards || !sameForgeValue(rewards, canonicalRewards) || ![rewards.gold, rewards.rubies, rewards.diamonds].every(v => Number.isFinite(v) && v >= 0) || !rewards.items.every(i => i.quantity === undefined || Number.isSafeInteger(i.quantity) && i.quantity > 0)) return reject("INVALID_REWARD_PAYLOAD");

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
  const attempt = currentSave.activeForgeAttempt;
  const reject = (code: string): TransactionExecutionResult<FinishedSword> => ({ success: false, save: currentSave, code, error: "A conclusão não corresponde ao último estado físico confirmado desta tentativa." });
  if (!attempt || attempt.status !== "ACTIVE") return reject("ATTEMPT_NOT_ACTIVE");
  const snapshot = attempt.snapshot;
  if (!isForgeSnapshotValid(snapshot) || !sim.done || !snapshot.state.done || attempt.strikesCount !== snapshot.state.strikes) return reject("FORGE_NOT_COMPLETE");
  if (sim.forgeRunId !== attempt.forgeRunId || !sameForgeValue(design, attempt.design) || sim.isTraining !== attempt.isTraining || !sameForgeValue(createForgeSnapshot(sim, design, snapshot.revision), snapshot)) return reject("ATTEMPT_MISMATCH");
  if ((sim.activeCore?.id || null) !== (attempt.activeCoreId || null)) return reject("CORE_MISMATCH");
  const core = attempt.activeCoreId ? currentSave.inventory.fusionCores.find(c => c.id === attempt.activeCoreId) : null;
  if (attempt.activeCoreId && (!core || !sameForgeValue(core, snapshot.state.activeCore))) return reject("CORE_NOT_FOUND");
  if ([...currentSave.gallery, ...(currentSave.trainingGallery || [])].some(s => s.forgeRunId === attempt.forgeRunId)) return reject("ALREADY_COMPLETED");
  const canonicalSim = restoreForgeSnapshot(snapshot)!;
  const sword = finishSword(canonicalSim, attempt.design);
  sword.id = `sword_${attempt.forgeRunId}`;
  if (![sword.quality, sword.heatScore, sword.forgeScore, sword.quenchScore, sword.warp, sword.baseDamage, sword.baseDefense, sword.baseAgility, sword.baseDurability, sword.damage, sword.defense, sword.agility, sword.durability].every(Number.isFinite)) return reject("INVALID_FORGE_RESULT");
  const isTraining = attempt.isTraining;

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
  // 2. Emergency training recovery: unbroken Q >= 50 yields +1 scrap only while
  // needsTrainingRecovery holds (gold < basic iron price, no iron/steel and scrap < 2).
  // Two eligible successes recover one ingot; training cannot stockpile beyond 2 scrap.
  if (isTraining && !sim.broken && sword.quality >= 50 && needsTrainingRecovery(currentSave)) {
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

/** Emergency recovery stops as soon as an ordinary forge is accessible. Rare locked metals do not count. */
export function needsTrainingRecovery(save: SaveData): boolean {
  const materials = save.inventory.materials;
  return save.wallet.gold < BASIC_IRON_RECOVERY_COST && getMaterialStock(materials, "iron_ingot") < 1 && getMaterialStock(materials, "steel_ingot") < 1 && (materials.scrap || 0) < 2;
}

/** One physical checkpoint atomically binds strike identity, physical state, count and gold. */
export function executeForgeCheckpointTransaction(currentSave: SaveData, snapshot: ForgeSnapshot): TransactionExecutionResult<ActiveForgeAttempt> {
  const attempt = currentSave.activeForgeAttempt;
  const reject = (code: string): TransactionExecutionResult<ActiveForgeAttempt> => ({ success: false, save: currentSave, code, error: "Checkpoint de forja incompatível com a tentativa ativa." });
  if (!attempt || !["PREPARED", "ACTIVE"].includes(attempt.status)) return reject("ATTEMPT_NOT_ACTIVE");
  if (!isForgeSnapshotValid(snapshot) || !isForgeSnapshotValid(attempt.snapshot)) return reject("INVALID_FORGE_SNAPSHOT");
  const previous = attempt.snapshot;
  if (snapshot.state.forgeRunId !== attempt.forgeRunId || !sameForgeValue(snapshot.design, attempt.design) || snapshot.state.isTraining !== attempt.isTraining || !sameForgeValue(snapshot.state.activeCore, previous.state.activeCore) || !sameForgeValue(snapshot.state.equippedGear, previous.state.equippedGear)) return reject("ATTEMPT_MISMATCH");
  if ((snapshot.state.activeCore?.id || null) !== (attempt.activeCoreId || null)) return reject("CORE_MISMATCH");
  if (snapshot.revision <= previous.revision) {
    if (snapshot.revision === previous.revision && !sameForgeValue(snapshot, previous)) return reject("CHECKPOINT_CONFLICT");
    return { success: true, save: currentSave, payload: attempt, code: "CHECKPOINT_ALREADY_APPLIED" };
  }
  if (attempt.strikesCount !== previous.state.strikes || snapshot.revision !== previous.revision + 1 || previous.state.done) return reject("CHECKPOINT_SEQUENCE_INVALID");
  const physical = snapshot.state;
  const newStrikes = physical.strikes - attempt.strikesCount;
  if (newStrikes < 0 || newStrikes > 1 || physical.elapsedTime < previous.state.elapsedTime || !sameForgeValue(physical.history.slice(0, previous.state.history.length), previous.state.history)) return reject("STRIKE_SEQUENCE_INVALID");
  const phaseRank = { heat: 0, forge: 1, quench: 2 };
  if (phaseRank[physical.phase] < phaseRank[previous.state.phase] || phaseRank[physical.phase] - phaseRank[previous.state.phase] > 1 || physical.activeHammer !== "standard" && !currentSave.inventory.unlockedTools.includes(`hammer_${physical.activeHammer}`)) return reject("INVALID_FORGE_TRANSITION");
  const gold = newStrikes === 1 ? strikeGoldReward(physical, attempt.design) : 0;
  const strikeId = `${attempt.forgeRunId}:${physical.strikes}`;
  const claimed = currentSave.claimedStrikeRewardIds || [];
  if (newStrikes === 1 && claimed.includes(strikeId)) return reject("STRIKE_SEQUENCE_INVALID");
  const nextAttempt: ActiveForgeAttempt = { ...attempt, status: physical.strikes > 0 ? "ACTIVE" : "PREPARED", strikesCount: physical.strikes, snapshot: structuredClone(snapshot), ...(newStrikes ? { lastStrikeAt: Date.now() } : {}) };
  const nextSave: SaveData = { ...currentSave, activeForgeAttempt: nextAttempt, wallet: { ...currentSave.wallet, gold: currentSave.wallet.gold + gold }, claimedStrikeRewardIds: newStrikes ? [...claimed, strikeId].slice(-200) : claimed };
  const result = writeSave(nextSave);
  if (!result.ok) return { success: false, save: currentSave, code: result.code || "PERSISTENCE_FAILED", error: result.error };
  return { success: true, save: nextSave, payload: nextAttempt };
}

/** Retained import compatibility; detached callbacks cannot mutate the economy. */
export function executeStrikeRewardTransaction(currentSave: SaveData, reward: { amount: number; id: string }): TransactionExecutionResult {
  const code = currentSave.activeForgeAttempt?.isTraining ? "TRAINING_MODE_NO_GOLD" : !Number.isFinite(reward.amount) ? "INVALID_STRIKE_REWARD" : "STRIKE_EVENT_REQUIRED";
  return { success: false, save: currentSave, code, error: "O ouro é gravado exclusivamente junto ao evento físico do golpe." };
}

export function executeRecordStrikeTransaction(currentSave: SaveData): TransactionExecutionResult<ActiveForgeAttempt> {
  return { success: false, save: currentSave, code: "STRIKE_EVENT_REQUIRED", error: "Registre o checkpoint físico identificado do golpe." };
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
  if (!isSwordDesignValid(design)) return { success: false, save: currentSave, code: "INVALID_FORGE_DESIGN", error: "Projeto de forja inválido." };

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
    attempt.snapshot = createForgeSnapshot(createSim(attempt.design, { forgeRunId: attempt.forgeRunId, isTraining: true, equippedGear: structuredClone(currentInv.equipped || defaultEquippedGear) }), attempt.design, 0);

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
    if (!isFusionCoreValid(activeCore)) return { success: false, save: currentSave, code: "INVALID_FUSION_CORE", error: "Núcleo de fusão inválido." };
    if (design.steel !== activeCore.steel || design.family !== activeCore.family || design.profile !== activeCore.profile) {
      return { success: false, save: currentSave, code: "CORE_DESIGN_MISMATCH", error: "Projeto incompatível com a identidade do núcleo de fusão." };
    }
  }

  const blocker = getPreparationBlocker(design, currentInv, currentSave.career || defaultCareer, currentSave.gallery || [], activeCore);
  if (blocker) return { success: false, save: currentSave, ...blocker };

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
    design: structuredClone(design),
    isTraining: false,
    materialConsumed: { key: reqMat.key, name: reqMat.name, quantity: 1 },
    activeCoreId: activeCore ? activeCore.id : null,
    startedAt: Date.now(),
    status: "PREPARED",
    strikesCount: 0,
  };
  attempt.snapshot = createForgeSnapshot(createSim(attempt.design, { forgeRunId: attempt.forgeRunId, isTraining: false, activeCore: activeCore ? structuredClone(activeCore) : null, equippedGear: structuredClone(currentInv.equipped || defaultEquippedGear) }), attempt.design, 0);

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
 * - Após o primeiro golpe regular (ACTIVE, strikesCount > 0): Sem estorno de lingote; concede +1 sucata metálica.
 * - Treino nunca concede sucata por cancelamento; só recuperação limitada por conclusão elegível.
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
  } else if (!attempt.isTraining) {
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
