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
  fragmentsAwarded: number;
  consumedIds: string[];
  goldCost: number;
  usedCatalyst: boolean;
}

export interface SwordFusionOutcome {
  success: boolean;
  resultCore: FusionCore;
  upgradedRarity: boolean;
  fragmentsAwarded: number;
  consumedSwordIds: string[];
  goldCost: number;
  rubiesCost: number;
  usedCatalyst: boolean;
}

const RARITY_RANK_VALUES: Record<RarityGrade, number> = {
  Comum: 1,
  Incomum: 2,
  Rara: 3,
  Épica: 4,
  Lendária: 5,
  Relíquia: 6,
};

const RANK_VALUE_TO_RARITY: Record<number, RarityGrade> = {
  1: "Comum",
  2: "Incomum",
  3: "Rara",
  4: "Épica",
  5: "Lendária",
  6: "Relíquia",
};

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

  // Probabilidade de Upgrade
  let upgradeChance = 0.5;
  if (baseRarity === "Comum") upgradeChance = 0.65;
  else if (baseRarity === "Incomum") upgradeChance = 0.55;
  else if (baseRarity === "Rara") upgradeChance = 0.42;
  else if (baseRarity === "Épica") upgradeChance = 0.35;
  else if (baseRarity === "Lendária") upgradeChance = 0.15;

  if (usedCatalyst) {
    upgradeChance += 0.18; // Catalisador de fusão aumenta a chance
  }

  const roll = rng();
  const upgradedRarity = roll < upgradeChance;
  let finalRarity: RarityGrade = baseRarity;

  let fragmentsAwarded = 0;
  if (upgradedRarity) {
    const nextRank = Math.min(6, avgRarityRank + 1);
    finalRarity = RANK_VALUE_TO_RARITY[nextRank];
  } else {
    // Bad-luck protection: concede fragmentos de fusão
    fragmentsAwarded = baseRarity === "Comum" ? 1 : baseRarity === "Incomum" ? 2 : baseRarity === "Rara" ? 3 : 5;
  }

  // Gera componente aprimorado
  const primaryItem = items[0];
  const namePrefix = upgradedRarity ? "Mestre" : "Refinado";
  const resultName = `${primaryItem.name} (${namePrefix} [${finalRarity}])`;

  // Calcula bônus acumulado
  const baseDamageBonus = Math.max(...items.map((it) => it.statModifier?.damageBonus || 0));
  const baseDefenseBonus = Math.max(...items.map((it) => it.statModifier?.defenseBonus || 0));
  const baseAgilityBonus = Math.max(...items.map((it) => it.statModifier?.agilityBonus || 0));
  const baseDurabilityBonus = Math.max(...items.map((it) => it.statModifier?.durabilityBonus || 0));

  const tierMultiplier = upgradedRarity ? 1.5 : 1.2;

  const resultComponent: InventoryComponent = {
    id: generateUniqueId(`comp_${primaryItem.componentKey}`),
    name: resultName,
    category: primaryItem.category,
    componentKey: primaryItem.componentKey,
    rarity: finalRarity,
    icon: primaryItem.icon,
    description: `Componente transmutado no Crisol de Fusão. Concentração pura de liga e equilíbrio artesanal.`,
    statModifier: {
      damageBonus: baseDamageBonus > 0 ? Math.round(baseDamageBonus * tierMultiplier) + 2 : undefined,
      defenseBonus: baseDefenseBonus > 0 ? Math.round(baseDefenseBonus * tierMultiplier) + 2 : undefined,
      agilityBonus: baseAgilityBonus > 0 ? Math.round(baseAgilityBonus * tierMultiplier) + 2 : undefined,
      durabilityBonus: baseDurabilityBonus > 0 ? Math.round(baseDurabilityBonus * tierMultiplier) + 2 : undefined,
    },
    acquiredAt: Date.now(),
  };

  return {
    success: true,
    resultComponent,
    upgradedRarity,
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

  // Probabilidade de Oportunidade Superior
  let upgradeChance = 0.45;
  if (baseRarity === "Comum") upgradeChance = 0.60;
  else if (baseRarity === "Incomum") upgradeChance = 0.50;
  else if (baseRarity === "Rara") upgradeChance = 0.42;
  else if (baseRarity === "Épica") upgradeChance = 0.40;
  else if (baseRarity === "Lendária") upgradeChance = 0.10;

  if (usedCatalyst) {
    upgradeChance += 0.15;
  }

  const roll = rng();
  const upgradedRarity = roll < upgradeChance;
  let finalRarity: RarityGrade = baseRarity;
  let fragmentsAwarded = 0;

  if (upgradedRarity) {
    const nextRank = Math.min(6, avgRarityRank + 1);
    finalRarity = RANK_VALUE_TO_RARITY[nextRank];
  } else {
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

  const resultCore: FusionCore = {
    id: generateUniqueId("core"),
    name: `${coreTitles[finalRarity]} — ${bestSword.design.name || "Heroica"}`,
    rarity: finalRarity,
    family: targetFamily,
    profile: targetProfile,
    steel: targetSteel,
    bonusQuality: upgradedRarity ? 8 : 4,
    inheritedPerks,
    consumedSwordIds: swords.map((s) => s.id),
    createdAt: Date.now(),
  };

  return {
    success: true,
    resultCore,
    upgradedRarity,
    fragmentsAwarded,
    consumedSwordIds: swords.map((s) => s.id),
    goldCost,
    rubiesCost,
    usedCatalyst,
  };
}

/**
 * Aplica a transação de fusão de componentes atomicamente sobre o estado de Save
 */
export function applyComponentFusionTransaction(
  save: SaveData,
  outcome: ComponentFusionOutcome,
): SaveData {
  if (save.wallet.gold < outcome.goldCost) {
    throw new Error("Ouro insuficiente para pagar a taxa do Crisol.");
  }

  const nextComponents = save.inventory.components.filter(
    (c) => !outcome.consumedIds.includes(c.id),
  );
  nextComponents.push(outcome.resultComponent);

  const nextMaterials = { ...save.inventory.materials };
  if (outcome.usedCatalyst && (nextMaterials.catalyst_astral || 0) > 0) {
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
  if (save.wallet.gold < outcome.goldCost || save.wallet.rubies < outcome.rubiesCost) {
    throw new Error("Recursos insuficientes para pagar a transmutação do Crisol.");
  }

  const nextGallery = save.gallery.filter(
    (s) => !outcome.consumedSwordIds.includes(s.id),
  );

  const nextFusionCores = [...(save.inventory.fusionCores || []), outcome.resultCore];

  const nextMaterials = { ...save.inventory.materials };
  if (outcome.usedCatalyst && (nextMaterials.catalyst_astral || 0) > 0) {
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
