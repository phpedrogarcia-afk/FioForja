import type {
  CareerStats,
  EquippedWorkshopGear,
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
import { writeSave, defaultWallet, defaultInventory, defaultCareer } from "./save.ts";
import { recalculateSwordStats, WORKSHOP_EQUIPMENT } from "./catalog.ts";
import {
  applyComponentFusionTransaction,
  applySwordFusionTransaction,
  validateComponentFusionTransaction,
  validateSwordFusionTransaction,
  type ComponentFusionOutcome,
  type SwordFusionOutcome,
} from "./fusion.ts";
import { finishSword, applyStrikeRewardTransaction } from "./sim.ts";

export interface TransactionExecutionResult<T = unknown> {
  success: boolean;
  save: SaveData;
  error?: string;
  code?: string;
  payload?: T;
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
  type: "tool" | "material" | "component" | "rune" | "catalyst";
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

  const nextMaterials = { ...(currentInventory.materials || {}) };
  let nextUnlockedTools = [...(currentInventory.unlockedTools || [])];
  const nextComponents = [...(currentInventory.components || [])];

  if (purchase.type === "tool") {
    if (nextUnlockedTools.includes(purchase.id)) {
      return { success: false, save: currentSave, error: "Ferramenta já adquirida.", code: "ALREADY_OWNED" };
    }
    nextUnlockedTools.push(purchase.id);
  } else if (purchase.type === "material") {
    const qty = purchase.quantity || 1;
    nextMaterials[purchase.id] = (nextMaterials[purchase.id] || 0) + qty;
  } else if (purchase.type === "catalyst") {
    const qty = purchase.quantity || 1;
    nextMaterials.catalyst_astral = (nextMaterials.catalyst_astral || 0) + qty;
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

  const nextMaterials = { ...(currentInventory.materials || {}) };
  const nextComponents = [...(currentInventory.components || [])];

  for (const item of (rewards.items || [])) {
    if (item.category === "material" || item.category === "fusion") {
      const key = item.catalogKey || item.id;
      nextMaterials[key] = (nextMaterials[key] || 0) + (item.quantity || 1);
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
      nextMaterials[key] = (nextMaterials[key] || 0) + (item.quantity || 1);
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
 * 7. Finish Sword Transaction: Finishes sword, consumes active FusionCore atomically, updates career and saves to gallery.
 */
export function executeFinishSwordTransaction(
  currentSave: SaveData,
  sim: SimState,
  design: SwordDesign,
): TransactionExecutionResult<FinishedSword> {
  const sword = finishSword(sim, design);
  const swordValue = sword.value ?? Math.round(sword.quality * 28 + (sword.rarity === "Lendária" ? 1800 : sword.rarity === "Relíquia" ? 3500 : 250));
  sword.value = swordValue;

  let nextInventory = currentSave.inventory || defaultInventory;
  if (sim.activeCore) {
    const remainingCores = (currentSave.inventory.fusionCores || []).filter((c) => c.id !== sim.activeCore!.id);
    nextInventory = {
      ...currentSave.inventory,
      fusionCores: remainingCores,
    };
  }

  const prevCareer = currentSave.career || defaultCareer;
  const isMasterpiece = sword.quality >= 95;
  const nextCareer: CareerStats = {
    totalForged: prevCareer.totalForged + 1,
    masterpieces: prevCareer.masterpieces + (isMasterpiece ? 1 : 0),
    legendaries: prevCareer.legendaries + (sword.rarity === "Lendária" ? 1 : 0),
    relics: prevCareer.relics + (sword.rarity === "Relíquia" ? 1 : 0),
    brokenBlades: prevCareer.brokenBlades + (sim.broken ? 1 : 0),
    highestQuality: Math.max(prevCareer.highestQuality, sword.quality),
    totalValueEarned: prevCareer.totalValueEarned + (sim.broken ? 0 : swordValue),
  };

  const nextGallery = !sim.broken ? [sword, ...currentSave.gallery] : currentSave.gallery;

  const nextSave: SaveData = {
    ...currentSave,
    gallery: nextGallery,
    career: nextCareer,
    inventory: nextInventory,
  };

  const writeRes = writeSave(nextSave);
  if (!writeRes.ok) {
    return {
      success: false,
      save: currentSave,
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
 */
export function executeStrikeRewardTransaction(
  currentSave: SaveData,
  reward: { amount: number; id: string },
): TransactionExecutionResult {
  const tx = applyStrikeRewardTransaction(currentSave, reward);
  if (!tx.applied) {
    return {
      success: false,
      save: currentSave,
      error: "Recompensa de golpe inválida ou já creditada.",
      code: "STRIKE_REWARD_REJECTED",
    };
  }

  const nextSave: SaveData = {
    ...currentSave,
    wallet: tx.wallet,
    claimedStrikeRewardIds: tx.claimedStrikeRewardIds,
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
