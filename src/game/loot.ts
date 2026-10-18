import type { FinishedSword, ForgeRewardItem, ForgeRewardsData, RarityGrade } from "./types.ts";
import { generateUniqueId } from "./save.ts";

export interface LootTableItem {
  catalogKey: string;
  name: string;
  category: "material" | "guard" | "pommel" | "wrap" | "rune" | "fusion" | "recipe";
  rarity: RarityGrade;
  icon: string;
  description: string;
  baseQuantity?: number;
  value: number;
  statsModifier?: {
    damageBonus?: number;
    defenseBonus?: number;
    agilityBonus?: number;
    durabilityBonus?: number;
  };
}

export const LOOT_CATALOG: LootTableItem[] = [
  // MATERIAIS BÁSICOS E NOBRES
  {
    catalogKey: "iron_ingot",
    name: "Lingote de Ferro Batido",
    category: "material",
    rarity: "Comum",
    icon: "🧱",
    description: "Ferro purificado com teor moderado de carbono. Insumo fundamental para armas de oficina.",
    baseQuantity: 3,
    value: 20,
  },
  {
    catalogKey: "steel_ingot",
    name: "Lingote de Aço Forjado",
    category: "material",
    rarity: "Incomum",
    icon: "🪙",
    description: "Aço refinado com tratamento térmico preliminar, ideal para lâminas militares.",
    baseQuantity: 2,
    value: 45,
  },
  {
    catalogKey: "damascus_billet",
    name: "Tarugo Dobrado de Damasco",
    category: "material",
    rarity: "Rara",
    icon: "🌊",
    description: "Aço dobrado em centenas de camadas, exibindo ondulações hidrográficas e elasticidade incomparável.",
    baseQuantity: 1,
    value: 120,
  },
  {
    catalogKey: "blacksteel_chunk",
    name: "Aço Negro dos Abismos",
    category: "material",
    rarity: "Rara",
    icon: "⬛",
    description: "Liga enriquecida com grafite e minério vulcânico. Retém o fio de corte sob choques extremos.",
    baseQuantity: 1,
    value: 140,
  },
  {
    catalogKey: "elven_wood_block",
    name: "Madeira Fóssil das Florestas Antigas",
    category: "material",
    rarity: "Rara",
    icon: "🪵",
    description: "Cerne de madeira clara mineralizada com seiva pura, imune a cupins e umidade.",
    baseQuantity: 1,
    value: 110,
  },
  {
    catalogKey: "starmetal_ore",
    name: "Fragmento de Minério Estelar",
    category: "material",
    rarity: "Épica",
    icon: "✨",
    description: "Rocha meteórica brilhante que caiu dos confins do cosmos. Irradia centelhas frias.",
    baseQuantity: 1,
    value: 280,
  },
  {
    catalogKey: "ancient_relic_shard",
    name: "Estilhaço de Liga Primordial",
    category: "material",
    rarity: "Relíquia",
    icon: "🏺",
    description: "Resíduo de metal forjado antes do primeiro cataclismo. Dureza indecifrável e aura silenciosa.",
    baseQuantity: 1,
    value: 650,
  },

  // ITENS DE FUSÃO E CATALISADORES
  {
    catalogKey: "fusion_fragment",
    name: "Fragmento de Crisol",
    category: "fusion",
    rarity: "Incomum",
    icon: "🧩",
    description: "Cristal formado pela evaporação de ligas raras. Acumule 10 para criar um catalisador rúnico.",
    baseQuantity: 2,
    value: 35,
  },
  {
    catalogKey: "catalyst_crystal",
    name: "Catalisador de Transmutação",
    category: "fusion",
    rarity: "Rara",
    icon: "🔮",
    description: "Reagente alquímico que potencializa as chances de transmutação superior no Crisol de Fusão.",
    baseQuantity: 1,
    value: 150,
  },

  // COMPONENTES FÍSICOS (GUARDAS, CABOS, POMOS)
  {
    catalogKey: "guard_cross_iron",
    name: "Guarda em Cruz Simples",
    category: "guard",
    rarity: "Comum",
    icon: "🛡️",
    description: "Cruz reta de ferro escuro que protege os nós dos dedos com sobriedade.",
    value: 30,
    statsModifier: { defenseBonus: 4 },
  },
  {
    catalogKey: "guard_wings_royal",
    name: "Guarda Real em Asas de Falcão",
    category: "guard",
    rarity: "Rara",
    icon: "🦅",
    description: "Quillons esculpidos em curva ascendente com equilíbrio que facilita aparos rápidos.",
    value: 130,
    statsModifier: { defenseBonus: 10, agilityBonus: 6 },
  },
  {
    catalogKey: "guard_imperial_gold",
    name: "Guarda Imperial Áurea",
    category: "guard",
    rarity: "Épica",
    icon: "👑",
    description: "Guarda bifurcada banhada a eletro com reforço interno de aço e asas de águia majestosas.",
    value: 320,
    statsModifier: { defenseBonus: 16, agilityBonus: 8, durabilityBonus: 6 },
  },
  {
    catalogKey: "wrap_dragon_leather",
    name: "Empunhadura em Couro de Dragão",
    category: "wrap",
    rarity: "Épica",
    icon: "🐉",
    description: "Couro escamoso espesso que repele suor e concede aderência inabalável em combate.",
    value: 290,
    statsModifier: { damageBonus: 8, agilityBonus: 12 },
  },
  {
    catalogKey: "pommel_wolf_bronze",
    name: "Pomo de Lobo em Bronze",
    category: "pommel",
    rarity: "Incomum",
    icon: "🐺",
    description: "Cabeça de lobo fundida em bronze sólido que atua como contrapeso perfeito para corte.",
    value: 60,
    statsModifier: { damageBonus: 5, agilityBonus: 4 },
  },
  {
    catalogKey: "pommel_crown_gold",
    name: "Pomo da Coroa Soberana",
    category: "pommel",
    rarity: "Épica",
    icon: "⚜️",
    description: "Pomo octogonal encimado por volutas de coroa gótica com engaste de rubi.",
    value: 310,
    statsModifier: { damageBonus: 12, defenseBonus: 8 },
  },

  // RUNAS SAGRADAS
  {
    catalogKey: "rune_fehu",
    name: "Runa Fehu (Prosperidade)",
    category: "rune",
    rarity: "Incomum",
    icon: "ᚠ",
    description: "Inscrição ancestral gravada no metal que atrai fortuna e perfeição em cada golpe.",
    value: 75,
    statsModifier: { damageBonus: 6 },
  },
  {
    catalogKey: "rune_uruz",
    name: "Runa Uruz (Força Primordial)",
    category: "rune",
    rarity: "Rara",
    icon: "ᚢ",
    description: "Runa de impacto maciço talhada a cinzel profundo, conferindo peso demolidor ao fio.",
    value: 160,
    statsModifier: { damageBonus: 14, durabilityBonus: 8 },
  },
  {
    catalogKey: "rune_ansuz",
    name: "Runa Ansuz (Espírito Celestial)",
    category: "rune",
    rarity: "Épica",
    icon: "ᚨ",
    description: "Entalhe sagrado dos ventos antigos que reduz a inércia da lâmina e desperta o gume.",
    value: 340,
    statsModifier: { damageBonus: 16, agilityBonus: 18 },
  },
  {
    catalogKey: "rune_fire_elder",
    name: "Pedra Rúnica de Chama Viva",
    category: "rune",
    rarity: "Lendária",
    icon: "🔥",
    description: "Artefato gravado no coração de um vulcão primordial. Emite calor perpétuo no sangradouro.",
    value: 750,
    statsModifier: { damageBonus: 28, defenseBonus: 14, agilityBonus: 10, durabilityBonus: 15 },
  },
];

export function getRankTier(quality: number, broken = false): "S" | "A" | "B" | "C" | "BROKEN" {
  if (broken || quality < 30) return "BROKEN";
  if (quality >= 95) return "S";
  if (quality >= 88) return "A";
  if (quality >= 75) return "B";
  return "C";
}

// Probabilidades por Rank
const RARITY_PROBS: Record<"S" | "A" | "B" | "C" | "BROKEN", Record<RarityGrade, number>> = {
  S: {
    Comum: 0.27,
    Incomum: 0.33,
    Rara: 0.30,
    Épica: 0.085,
    Lendária: 0.015,
    Relíquia: 0.0,
  },
  A: {
    Comum: 0.37,
    Incomum: 0.35,
    Rara: 0.22,
    Épica: 0.05,
    Lendária: 0.01,
    Relíquia: 0.0,
  },
  B: {
    Comum: 0.49,
    Incomum: 0.33,
    Rara: 0.15,
    Épica: 0.03,
    Lendária: 0.0,
    Relíquia: 0.0,
  },
  C: {
    Comum: 0.65,
    Incomum: 0.25,
    Rara: 0.09,
    Épica: 0.01,
    Lendária: 0.0,
    Relíquia: 0.0,
  },
  BROKEN: {
    Comum: 0.85,
    Incomum: 0.15,
    Rara: 0.0,
    Épica: 0.0,
    Lendária: 0.0,
    Relíquia: 0.0,
  },
};

// Deterministic Pseudo-Random Number Generator (Mulberry32) for seeds
export function createRng(seed?: number) {
  if (seed === undefined) {
    return Math.random;
  }
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRarityForSlot(tier: "S" | "A" | "B" | "C" | "BROKEN", rng: () => number, allowRelic = false): RarityGrade {
  if (allowRelic && tier === "S" && rng() < 0.005) {
    return "Relíquia";
  }

  const roll = rng();
  const probs = RARITY_PROBS[tier];
  let cumulative = 0;

  for (const rarity of ["Comum", "Incomum", "Rara", "Épica", "Lendária"] as RarityGrade[]) {
    cumulative += probs[rarity];
    if (roll < cumulative) {
      return rarity;
    }
  }
  return "Comum";
}

export function generateDynamicForgeRewards(
  sword: FinishedSword,
  options?: { seed?: number; forgeRunId?: string },
): ForgeRewardsData {
  const rng = createRng(options?.seed);
  const forgeRunId = options?.forgeRunId || generateUniqueId("run");
  const isBroken = sword.broken || sword.structuralState === "broken";
  const tier = getRankTier(sword.quality, isBroken);

  // Escala balanceada de moedas por rank
  let gold = 75;
  let rubies = 1;
  let diamonds = 0;
  let rankDisplay = "C (50%)";

  if (tier === "S") {
    rankDisplay = `S (${Math.round(sword.quality)}%)`;
    gold = Math.round(480 + rng() * 140);
    rubies = Math.round(18 + rng() * 6);
    diamonds = Math.round(12 + rng() * 4);
  } else if (tier === "A") {
    rankDisplay = `A (${Math.round(sword.quality)}%)`;
    gold = Math.round(280 + rng() * 100);
    rubies = Math.round(10 + rng() * 5);
    diamonds = Math.round(6 + rng() * 3);
  } else if (tier === "B") {
    rankDisplay = `B (${Math.round(sword.quality)}%)`;
    gold = Math.round(160 + rng() * 60);
    rubies = Math.round(4 + rng() * 4);
    diamonds = Math.round(2 + rng() * 2);
  } else if (tier === "C") {
    rankDisplay = `C (${Math.round(sword.quality)}%)`;
    gold = Math.round(50 + rng() * 40);
    rubies = Math.round(1 + rng() * 2);
    diamonds = 0;
  } else {
    rankDisplay = "FALHA / QUEBRA";
    gold = Math.round(15 + rng() * 15);
    rubies = 0;
    diamonds = 0;
  }

  // Draw 4 distinct items from the loot catalog based on rolled rarities
  const allowRelic = sword.quality >= 95 && (sword.design.steel === "ancient_alloy" || sword.design.steel === "meteor");
  const drawnItems: ForgeRewardItem[] = [];
  const pickedKeys = new Set<string>();

  for (let i = 0; i < 4; i++) {
    const targetRarity = pickRarityForSlot(tier, rng, allowRelic);
    let candidates = LOOT_CATALOG.filter((it) => it.rarity === targetRarity && !pickedKeys.has(it.catalogKey));

    if (candidates.length === 0) {
      candidates = LOOT_CATALOG.filter((it) => it.rarity === targetRarity);
    }
    if (candidates.length === 0) {
      candidates = LOOT_CATALOG.filter((it) => it.rarity === "Comum");
    }

    const itemTemplate = candidates[Math.floor(rng() * candidates.length)] || LOOT_CATALOG[0];
    pickedKeys.add(itemTemplate.catalogKey);

    drawnItems.push({
      id: generateUniqueId(`item_${itemTemplate.catalogKey}`),
      catalogKey: itemTemplate.catalogKey,
      name: itemTemplate.name,
      type: itemTemplate.category === "material" ? "Material Raro" : itemTemplate.category === "rune" ? "Runa Sagrada" : itemTemplate.category === "fusion" ? "Crisol & Fusão" : "Componente de Forja",
      category: itemTemplate.category,
      rarity: itemTemplate.rarity,
      icon: itemTemplate.icon,
      description: itemTemplate.description,
      quantity: itemTemplate.baseQuantity || 1,
      value: itemTemplate.value,
      statsModifier: itemTemplate.statsModifier ? { ...itemTemplate.statsModifier } : undefined,
    });
  }

  return {
    forgeRunId,
    rank: rankDisplay,
    scorePercent: sword.quality,
    gold,
    rubies,
    diamonds,
    items: drawnItems,
    claimed: false,
  };
}
