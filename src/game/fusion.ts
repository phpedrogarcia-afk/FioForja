import type {
  FamilyId,
  FinishedSword,
  FusionCore,
  InventoryComponent,
  ProfileId,
  RarityGrade,
  SaveData,
  SteelId,
} from "./types.ts";
import { generateUniqueId } from "./save.ts";
import { createRng } from "./loot.ts";

export interface ComponentFusionOutcome {
  success: boolean;
  resultComponent: InventoryComponent;
  upgradedRarity: boolean;
  tierJump?: "refined" | "superior" | "exceptional";
  jumpTier?: number;
  fragmentsAwarded: number;
  consumedIds: string[];
  goldCost: number;
  usedCatalyst: boolean;
}

export interface SwordFusionOutcome {
  success: boolean;
  resultCore: FusionCore;
  upgradedRarity: boolean;
  tierJump?: "refined" | "superior" | "exceptional";
  jumpTier?: number;
  fragmentsAwarded: number;
  consumedSwordIds: string[];
  goldCost: number;
  rubiesCost: number;
  usedCatalyst: boolean;
}

export const RARITY_RANK_VALUES: Record<RarityGrade, number> = {
  Comum: 1,
  Incomum: 2,
  Rara: 3,
  Épica: 4,
  Lendária: 5,
  Relíquia: 6,
};

export const RANK_VALUE_TO_RARITY: Record<number, RarityGrade> = {
  1: "Comum",
  2: "Incomum",
  3: "Rara",
  4: "Épica",
  5: "Lendária",
  6: "Relíquia",
};

/**
 * Retorna as probabilidades canônicas exatas da Fusão (Refinado, +1 Superior, +2 Excepcional)
 * conforme a especificação em docs/canon/fusao-hibrida.md.
 */
export function getFusionOdds(
  rarity: RarityGrade,
  mode: "swords" | "components",
  useCatalyst = false,
): { refined: number; superior: number; exceptional: number } {
  let superior = 0;
  let exceptional = 0;

  if (mode === "swords") {
    switch (rarity) {
      case "Comum":
        superior = 0.60;
        exceptional = 0;
        break;
      case "Incomum":
        superior = 0.48;
        exceptional = 0.07;
        break;
      case "Rara":
        superior = 0.42;
        exceptional = 0.08;
        break;
      case "Épica":
        superior = 0.43;
        exceptional = 0.05;
        break;
      case "Lendária":
        superior = 0.15;
        exceptional = 0;
        break;
      case "Relíquia":
        superior = 0;
        exceptional = 0;
        break;
    }
  } else {
    // Components
    switch (rarity) {
      case "Comum":
        superior = 0.60;
        exceptional = 0;
        break;
      case "Incomum":
        superior = 0.50;
        exceptional = 0.05;
        break;
      case "Rara":
        superior = 0.42;
        exceptional = 0.08;
        break;
      case "Épica":
        superior = 0.40;
        exceptional = 0.05;
        break;
      case "Lendária":
        superior = 0.15;
        exceptional = 0;
        break;
      case "Relíquia":
        superior = 0;
        exceptional = 0;
        break;
    }
  }

  let refined = Math.max(0, 1 - superior - exceptional);

  if (useCatalyst) {
    if (exceptional > 0) {
      const shift = Math.min(refined, 0.15);
      refined -= shift;
      superior += shift * (10 / 15);
      exceptional += shift * (5 / 15);
    } else if (superior > 0) {
      const shift = Math.min(refined, 0.15);
      refined -= shift;
      superior += shift;
    }
  }

  return {
    refined: Math.round(refined * 100) / 100,
    superior: Math.round(superior * 100) / 100,
    exceptional: Math.round(exceptional * 100) / 100,
  };
}

/**
 * 1. FUSÃO DE COMPONENTES
 * Combina 4 componentes idênticos ou compatíveis para produzir um novo componente pronto.
 */
export function fuseComponents(
  items: InventoryComponent[],
  options?: { seed?: number; useCatalyst?: boolean } | boolean,
): ComponentFusionOutcome {
  if (items.length !== 4) {
    throw new Error("A fusão de componentes exige exatamente 4 componentes.");
  }

  const category = items[0].category;
  if (!items.every((it) => it.category === category)) {
    throw new Error("Todos os 4 componentes devem pertencer à mesma categoria (guardas, pomos, cabos ou runas).");
  }

  const usedCatalyst = typeof options === "object" ? !!options?.useCatalyst : !!options;
  const seed = typeof options === "object" ? options?.seed : undefined;
  const rng = createRng(seed);
  const avgRarityRank = Math.round(items.reduce((acc, it) => acc + RARITY_RANK_VALUES[it.rarity], 0) / 4);
  const baseRarity: RarityGrade = RANK_VALUE_TO_RARITY[avgRarityRank] || "Comum";

  // Custos em ouro
  const goldCosts: Record<RarityGrade, number> = {
    Comum: 40,
    Incomum: 80,
    Rara: 160,
    Épica: 320,
    Lendária: 600,
    Relíquia: 1000,
  };
  const goldCost = goldCosts[baseRarity];

  // Probabilidades canônicas de 3 níveis: Refinado (0), Superior (+1) e Excepcional (+2)
  const odds = getFusionOdds(baseRarity, "components", usedCatalyst);
  const roll = rng();

  let tierJump: "refined" | "superior" | "exceptional" = "refined";
  let jumpTier = 0;
  let finalRank = avgRarityRank;

  if (roll < odds.exceptional) {
    tierJump = "exceptional";
    jumpTier = 2;
    finalRank = Math.min(6, avgRarityRank + 2);
  } else if (roll < odds.exceptional + odds.superior) {
    tierJump = "superior";
    jumpTier = 1;
    finalRank = Math.min(6, avgRarityRank + 1);
  } else {
    tierJump = "refined";
    jumpTier = 0;
    finalRank = avgRarityRank;
  }

  const upgradedRarity = jumpTier > 0;
  const finalRarity: RarityGrade = RANK_VALUE_TO_RARITY[finalRank];

  let fragmentsAwarded = 0;
  if (!upgradedRarity) {
    // Bad-luck protection: concede fragmentos de fusão
    fragmentsAwarded = baseRarity === "Comum" ? 1 : baseRarity === "Incomum" ? 2 : baseRarity === "Rara" ? 3 : 5;
  }

  // Gera componente aprimorado
  const primaryItem = items[0];
  const namePrefix = tierJump === "exceptional" ? "Excepcional" : tierJump === "superior" ? "Mestre" : "Refinado";
  const resultName = `${primaryItem.name} (${namePrefix} [${finalRarity}])`;

  // Calcula bônus acumulado
  const baseDamageBonus = Math.max(...items.map((it) => it.statModifier?.damageBonus || 0));
  const baseDefenseBonus = Math.max(...items.map((it) => it.statModifier?.defenseBonus || 0));
  const baseAgilityBonus = Math.max(...items.map((it) => it.statModifier?.agilityBonus || 0));
  const baseDurabilityBonus = Math.max(...items.map((it) => it.statModifier?.durabilityBonus || 0));

  const tierMultiplier = tierJump === "exceptional" ? 2.0 : tierJump === "superior" ? 1.5 : 1.2;

  const resultComponent: InventoryComponent = {
    id: generateUniqueId(`comp_${primaryItem.componentKey}`),
    name: resultName,
    category: primaryItem.category,
    componentKey: primaryItem.componentKey,
    rarity: finalRarity,
    icon: primaryItem.icon,
    description: `Componente transmutado no Crisol de Fusão (${namePrefix}). Concentração pura de liga e equilíbrio artesanal.`,
    statModifier: {
      damageBonus: baseDamageBonus > 0 ? Math.round(baseDamageBonus * tierMultiplier) + (jumpTier * 2 + 2) : undefined,
      defenseBonus: baseDefenseBonus > 0 ? Math.round(baseDefenseBonus * tierMultiplier) + (jumpTier * 2 + 2) : undefined,
      agilityBonus: baseAgilityBonus > 0 ? Math.round(baseAgilityBonus * tierMultiplier) + (jumpTier * 2 + 2) : undefined,
      durabilityBonus: baseDurabilityBonus > 0 ? Math.round(baseDurabilityBonus * tierMultiplier) + (jumpTier * 2 + 2) : undefined,
    },
    acquiredAt: Date.now(),
  };

  return {
    success: true,
    resultComponent,
    upgradedRarity,
    tierJump,
    jumpTier,
    fragmentsAwarded,
    consumedIds: items.map((it) => it.id),
    goldCost,
    usedCatalyst,
  };
}

/**
 * 2. FUSÃO DE ESPADAS (OPÇÃO C — PILAR HÍBRIDO CANÔNICO)
 * Consome 4 espadas concluídas e gera uma OPORTUNIDADE SUPERIOR DE FABRICAÇÃO:
 * Um FusionCore que DEVE ser forjado na bigorna pelo jogador.
 */
export function fuseSwords(
  swords: FinishedSword[],
  options?: { seed?: number; useCatalyst?: boolean } | boolean,
): SwordFusionOutcome {
  if (swords.length !== 4) {
    throw new Error("A fusão de espadas exige exatamente 4 espadas elegíveis do Arsenal.");
  }

  // Verifica lâminas quebradas
  if (swords.some((s) => s.broken || s.structuralState === "broken")) {
    throw new Error("Lâminas quebradas não podem ser fundidas no Crisol Superior. Recicle-as na oficina.");
  }

  const usedCatalyst = typeof options === "object" ? !!options?.useCatalyst : !!options;
  const seed = typeof options === "object" ? options?.seed : undefined;
  const rng = createRng(seed);

  // Calcula raridade média e qualidade das doadoras
  const rarities = swords.map((s) => s.rarity || "Comum");
  const avgRarityRank = Math.round(rarities.reduce((acc, r) => acc + RARITY_RANK_VALUES[r], 0) / 4);
  const baseRarity: RarityGrade = RANK_VALUE_TO_RARITY[avgRarityRank] || "Comum";

  // Custos de operação
  const costs: Record<RarityGrade, { gold: number; rubies: number }> = {
    Comum: { gold: 120, rubies: 2 },
    Incomum: { gold: 240, rubies: 5 },
    Rara: { gold: 450, rubies: 12 },
    Épica: { gold: 800, rubies: 25 },
    Lendária: { gold: 1500, rubies: 50 },
    Relíquia: { gold: 2500, rubies: 100 },
  };
  const { gold: goldCost, rubies: rubiesCost } = costs[baseRarity];

  // Probabilidades canônicas de 3 níveis: Refinado (0), Superior (+1) e Excepcional (+2)
  const odds = getFusionOdds(baseRarity, "swords", usedCatalyst);
  const roll = rng();

  let tierJump: "refined" | "superior" | "exceptional" = "refined";
  let jumpTier = 0;
  let finalRank = avgRarityRank;

  if (roll < odds.exceptional) {
    tierJump = "exceptional";
    jumpTier = 2;
    finalRank = Math.min(6, avgRarityRank + 2);
  } else if (roll < odds.exceptional + odds.superior) {
    tierJump = "superior";
    jumpTier = 1;
    finalRank = Math.min(6, avgRarityRank + 1);
  } else {
    tierJump = "refined";
    jumpTier = 0;
    finalRank = avgRarityRank;
  }

  const upgradedRarity = jumpTier > 0;
  const finalRarity: RarityGrade = RANK_VALUE_TO_RARITY[finalRank];

  let fragmentsAwarded = 0;
  if (!upgradedRarity) {
    // Bad-luck protection
    fragmentsAwarded = baseRarity === "Comum" ? 2 : baseRarity === "Incomum" ? 3 : baseRarity === "Rara" ? 5 : 8;
  }

  // Herança inteligente de Família, Perfil e Aço a partir das doadoras
  const bestSword = [...swords].sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
  const targetFamily: FamilyId = bestSword.design.family || "royal";
  const targetProfile: ProfileId = bestSword.design.profile || "long";
  const targetSteel: SteelId = bestSword.design.steel || "steel";

  // Coleta afixos e perícias exclusivas das 4 espadas
  const allPerks = Array.from(new Set(swords.flatMap((s) => s.perks || s.affixes || [])));
  const inheritedPerks = allPerks.slice(0, 3); // Herda até 3 traços destacados

  const coreTitles: Record<RarityGrade, string> = {
    Comum: "Núcleo de Ferro Recozido",
    Incomum: "Pré-forma de Aço Retificado",
    Rara: "Núcleo Dobrado de Alta Densidade",
    Épica: "Pré-forma Ancestral das Brasas Sagradas",
    Lendária: "Coração Metálico Transcendental",
    Relíquia: "Origem Arcaica Primordial",
  };

  const bonusQuality = tierJump === "exceptional" ? 14 : tierJump === "superior" ? 8 : 4;
  const jumpLabel = tierJump === "exceptional" ? " [Salto Excepcional +2]" : "";

  const resultCore: FusionCore = {
    id: generateUniqueId("core"),
    name: `${coreTitles[finalRarity]}${jumpLabel} — ${bestSword.design.name || "Heroica"}`,
    rarity: finalRarity,
    family: targetFamily,
    profile: targetProfile,
    steel: targetSteel,
    bonusQuality,
    inheritedPerks,
    consumedSwordIds: swords.map((s) => s.id),
    createdAt: Date.now(),
  };

  return {
    success: true,
    resultCore,
    upgradedRarity,
    tierJump,
    jumpTier,
    fragmentsAwarded,
    consumedSwordIds: swords.map((s) => s.id),
    goldCost,
    rubiesCost,
    usedCatalyst,
  };
}

/**
 * Validação prévia de integridade atômica para fusão de componentes
 */
export function validateComponentFusionTransaction(
  save: SaveData,
  outcome: ComponentFusionOutcome,
): void {
  if (!outcome || !Array.isArray(outcome.consumedIds) || outcome.consumedIds.length !== 4) {
    throw new Error("Transação inválida: A fusão exige exatamente 4 IDs de componentes consumidos.");
  }
  if (new Set(outcome.consumedIds).size !== 4) {
    throw new Error("Transação inválida: IDs duplicados detectados entre os componentes consumidos.");
  }
  const existingComponents = save.inventory.components || [];
  const found = outcome.consumedIds.map((id) => existingComponents.find((c) => c.id === id));
  if (found.some((c) => !c)) {
    throw new Error("Transação inválida: Um ou mais componentes selecionados não existem no inventário.");
  }
  const category = found[0]!.category;
  if (!found.every((c) => c!.category === category)) {
    throw new Error("Transação inválida: Componentes consumidos devem pertencer à mesma categoria.");
  }
  if (save.wallet.gold < outcome.goldCost) {
    throw new Error("Ouro insuficiente para pagar a taxa do Crisol.");
  }
  if (outcome.usedCatalyst && (save.inventory.materials?.catalyst_astral || 0) < 1) {
    throw new Error("Transação inválida: Catalisador Astral não disponível no inventário.");
  }
  if (existingComponents.some((c) => c.id === outcome.resultComponent.id)) {
    throw new Error("Transação inválida: Resultado de fusão já existente no inventário.");
  }
}

/**
 * Validação prévia de integridade atômica para fusão de espadas
 */
export function validateSwordFusionTransaction(
  save: SaveData,
  outcome: SwordFusionOutcome,
): void {
  if (!outcome || !Array.isArray(outcome.consumedSwordIds) || outcome.consumedSwordIds.length !== 4) {
    throw new Error("Transação inválida: A fusão exige exatamente 4 IDs de espadas consumidas.");
  }
  if (new Set(outcome.consumedSwordIds).size !== 4) {
    throw new Error("Transação inválida: IDs duplicados detectados entre as espadas consumidas.");
  }
  const existingSwords = save.gallery || [];
  const found = outcome.consumedSwordIds.map((id) => existingSwords.find((s) => s.id === id));
  if (found.some((s) => !s)) {
    throw new Error("Transação inválida: Uma ou mais espadas selecionadas não foram encontradas no Arsenal.");
  }
  if (found.some((s) => s!.broken || s!.structuralState === "broken")) {
    throw new Error("Transação inválida: Lâminas quebradas não podem ser fundidas no Crisol.");
  }
  if (save.wallet.gold < outcome.goldCost || save.wallet.rubies < outcome.rubiesCost) {
    throw new Error("Recursos insuficientes para pagar a transmutação do Crisol.");
  }
  if (outcome.usedCatalyst && (save.inventory.materials?.catalyst_astral || 0) < 1) {
    throw new Error("Transação inválida: Catalisador Astral não disponível no inventário.");
  }
  const existingCores = save.inventory.fusionCores || [];
  if (existingCores.some((c) => c.id === outcome.resultCore.id)) {
    throw new Error("Transação inválida: Núcleo de fusão já existente no inventário.");
  }
}

/**
 * Aplica a transação de fusão de componentes atomicamente sobre o estado de Save
 */
export function applyComponentFusionTransaction(
  save: SaveData,
  outcome: ComponentFusionOutcome,
): SaveData {
  validateComponentFusionTransaction(save, outcome);

  const nextComponents = save.inventory.components.filter(
    (c) => !outcome.consumedIds.includes(c.id),
  );
  nextComponents.push(outcome.resultComponent);

  const nextMaterials = { ...save.inventory.materials };
  if (outcome.usedCatalyst) {
    nextMaterials.catalyst_astral = Math.max(0, (nextMaterials.catalyst_astral || 0) - 1);
  }
  if (outcome.fragmentsAwarded > 0) {
    nextMaterials.fusion_fragment = (nextMaterials.fusion_fragment || 0) + outcome.fragmentsAwarded;
  }

  return {
    ...save,
    wallet: {
      ...save.wallet,
      gold: save.wallet.gold - outcome.goldCost,
    },
    inventory: {
      ...save.inventory,
      components: nextComponents,
      materials: nextMaterials,
    },
  };
}

/**
 * Aplica a transação de fusão de espadas atomicamente sobre o estado de Save
 */
export function applySwordFusionTransaction(
  save: SaveData,
  outcome: SwordFusionOutcome,
): SaveData {
  validateSwordFusionTransaction(save, outcome);

  const nextGallery = save.gallery.filter(
    (s) => !outcome.consumedSwordIds.includes(s.id),
  );

  const nextFusionCores = [...(save.inventory.fusionCores || []), outcome.resultCore];

  const nextMaterials = { ...save.inventory.materials };
  if (outcome.usedCatalyst) {
    nextMaterials.catalyst_astral = Math.max(0, (nextMaterials.catalyst_astral || 0) - 1);
  }
  if (outcome.fragmentsAwarded > 0) {
    nextMaterials.fusion_fragment = (nextMaterials.fusion_fragment || 0) + outcome.fragmentsAwarded;
  }

  return {
    ...save,
    gallery: nextGallery,
    wallet: {
      ...save.wallet,
      gold: save.wallet.gold - outcome.goldCost,
      rubies: save.wallet.rubies - outcome.rubiesCost,
    },
    inventory: {
      ...save.inventory,
      fusionCores: nextFusionCores,
      materials: nextMaterials,
    },
  };
}
