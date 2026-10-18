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
  // MATERIAIS BÁSICOS E COMUNS (Garantia de variedade nos ranks iniciais)
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
    catalogKey: "coal_sack",
    name: "Saco de Carvão Mineral",
    category: "material",
    rarity: "Comum",
    icon: "⬛",
    description: "Carvão fóssil de alta queima, indispensável para manter o fogo vivo na fornalha.",
    baseQuantity: 5,
    value: 15,
  },
  {
    catalogKey: "leather_strips",
    name: "Tiras de Couro Curtido",
    category: "material",
    rarity: "Comum",
    icon: "🧵",
    description: "Fitas de couro de boi para amarração e reforço de empunhaduras rústicas.",
    baseQuantity: 4,
    value: 18,
  },
  {
    catalogKey: "sharpening_stone",
    name: "Pedra de Afiar de Arenito",
    category: "material",
    rarity: "Comum",
    icon: "🪨",
    description: "Pedra sedimentar de grão abrasivo fino para retificação inicial de rebarbas do gume.",
    baseQuantity: 2,
    value: 20,
  },
  {
    catalogKey: "flux_powder",
    name: "Pó de Bórax e Fluxo",
    category: "material",
    rarity: "Comum",
    icon: "🧂",
    description: "Sal fundente que remove escórias de óxido durante o caldeamento e soldagem na bigorna.",
    baseQuantity: 3,
    value: 22,
  },

  // COMPONENTES COMUNS
  {
    catalogKey: "guard_cross_iron",
    name: "Guarda em Cruz de Ferro",
    category: "guard",
    rarity: "Comum",
    icon: "🛡️",
    description: "Cruz reta de ferro escuro que protege os nós dos dedos com sobriedade.",
    value: 30,
    statsModifier: { defenseBonus: 4 },
  },
  {
    catalogKey: "guard_ring_iron",
    name: "Guarda em Anel de Batedor",
    category: "guard",
    rarity: "Comum",
    icon: "🛡️",
    description: "Anel de ferro soldado ao ricasso para proteção básica e empunhadura firme.",
    value: 32,
    statsModifier: { defenseBonus: 5 },
  },
  {
    catalogKey: "pommel_disc_iron",
    name: "Pomo em Disco Rústico",
    category: "pommel",
    rarity: "Comum",
    icon: "⚪",
    description: "Disco chanfrado de ferro forjado para contrapeso seguro de lâminas curtas.",
    value: 25,
    statsModifier: { damageBonus: 3 },
  },
  {
    catalogKey: "pommel_sphere_iron",
    name: "Pomo Esférico Simples",
    category: "pommel",
    rarity: "Comum",
    icon: "⚫",
    description: "Esfera de ferro batido para equilíbrio rápido do punho militar.",
    value: 28,
    statsModifier: { agilityBonus: 3 },
  },
  {
    catalogKey: "wrap_linen_plain",
    name: "Faixa de Linho Medieval",
    category: "wrap",
    rarity: "Comum",
    icon: "📜",
    description: "Tira de linho entrelaçado absorvente e confiável para cabo de espada.",
    value: 22,
    statsModifier: { agilityBonus: 4 },
  },
  {
    catalogKey: "wrap_leather_rough",
    name: "Empunhadura em Couro Rústico",
    category: "wrap",
    rarity: "Comum",
    icon: "🧶",
    description: "Couro bovino curtido tradicional, conferindo pegada tenaz e amortecimento.",
    value: 26,
    statsModifier: { durabilityBonus: 4 },
  },

  // ITENS INCOMUNS
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
    catalogKey: "brass_ingot",
    name: "Barra de Latão Dourado",
    category: "material",
    rarity: "Incomum",
    icon: "🟡",
    description: "Liga de cobre e zinco polida para guarnições brilhantes e rebites de luxo.",
    baseQuantity: 2,
    value: 40,
  },
  {
    catalogKey: "fusion_fragment",
    name: "Fragmento de Crisol",
    category: "fusion",
    rarity: "Incomum",
    icon: "🧩",
    description: "Cristal formado pela evaporação de ligas no Crisol. Acumule para transmutar núcleos.",
    baseQuantity: 2,
    value: 35,
  },
  {
    catalogKey: "guard_curved_steel",
    name: "Guarda Curvada de Infantaria",
    category: "guard",
    rarity: "Incomum",
    icon: "🛡️",
    description: "Quilhões curvados para desviar golpes frontais e proteger a empunhadura.",
    value: 70,
    statsModifier: { defenseBonus: 7, agilityBonus: 3 },
  },
  {
    catalogKey: "pommel_wolf_bronze",
    name: "Pomo de Lobo em Bronze",
    category: "pommel",
    rarity: "Incomum",
    icon: "🐺",
    description: "Cabeça de lobo fundida em bronze sólido que atua como contrapeso para corte pesado.",
    value: 60,
    statsModifier: { damageBonus: 5, agilityBonus: 4 },
  },
  {
    catalogKey: "pommel_cross_steel",
    name: "Pomo Facetado em Cruz",
    category: "pommel",
    rarity: "Incomum",
    icon: "✝️",
    description: "Pomo em cruz heráldica de aço forjado que equilibra espadas longas.",
    value: 65,
    statsModifier: { defenseBonus: 6 },
  },
  {
    catalogKey: "wrap_braided_cord",
    name: "Empunhadura em Couro Trançado",
    category: "wrap",
    rarity: "Incomum",
    icon: "🪢",
    description: "Trançado firme em espinha de peixe com alta absorção de impacto.",
    value: 65,
    statsModifier: { agilityBonus: 6, durabilityBonus: 4 },
  },
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

  // ITENS RAROS
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
    description: "Liga enriquecida com grafite e minério vulcânico. Retém o fio sob choques extremos.",
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
    catalogKey: "elven_silver_ingot",
    name: "Lingote de Prata Élfica",
    category: "material",
    rarity: "Rara",
    icon: "🪙",
    description: "Liga sagrada dos elfos com reflexos lunares. Massa levíssima e resistência encantada.",
    baseQuantity: 1,
    value: 180,
  },
  {
    catalogKey: "catalyst_astral",
    name: "Catalisador Astral",
    category: "fusion",
    rarity: "Rara",
    icon: "🔮",
    description: "Reagente alquímico primordial que potencializa saltos superiores e excepcionais no Crisol.",
    baseQuantity: 1,
    value: 150,
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
    catalogKey: "guard_tsuba_oriental",
    name: "Disco Tsuba Oriental",
    category: "guard",
    rarity: "Rara",
    icon: "💮",
    description: "Disco de ferro cinzelado com aberturas hitsu-ana e pátina protetora escura.",
    value: 145,
    statsModifier: { defenseBonus: 12, agilityBonus: 8 },
  },
  {
    catalogKey: "pommel_crescent_oriental",
    name: "Pomo Crescente Oriental",
    category: "pommel",
    rarity: "Rara",
    icon: "🌙",
    description: "Kashira metálico de perfil curvo e sóbrio para empunhadura rápida.",
    value: 120,
    statsModifier: { agilityBonus: 10, damageBonus: 6 },
  },
  {
    catalogKey: "wrap_darkwood_ebony",
    name: "Empunhadura em Madeira Nobre",
    category: "wrap",
    rarity: "Rara",
    icon: "🪵",
    description: "Ébano esculpido acetinado com anéis dourados de reforço.",
    value: 135,
    statsModifier: { damageBonus: 8, durabilityBonus: 8 },
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
    catalogKey: "rune_isa",
    name: "Runa Isa (Gelo Estático)",
    category: "rune",
    rarity: "Rara",
    icon: "ᛁ",
    description: "Entalhe cristalino do inverno boreal que estabiliza as tensões do fio de corte.",
    value: 170,
    statsModifier: { defenseBonus: 14, durabilityBonus: 10 },
  },

  // ITENS ÉPICOS
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
    catalogKey: "guard_imperial_gold",
    name: "Guarda Imperial Áurea",
    category: "guard",
    rarity: "Épica",
    icon: "👑",
    description: "Guarda bifurcada banhada a ouro com reforço interno e asas de águia soberana.",
    value: 320,
    statsModifier: { defenseBonus: 16, agilityBonus: 8, durabilityBonus: 6 },
  },
  {
    catalogKey: "guard_leaf_elven",
    name: "Guarda Foliar Élfica",
    category: "guard",
    rarity: "Épica",
    icon: "🍃",
    description: "Folhas entrelaçadas esculpidas em prata élfica com fluidez e leveza inigualáveis.",
    value: 310,
    statsModifier: { defenseBonus: 15, agilityBonus: 14 },
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
    catalogKey: "wrap_goldwire_royal",
    name: "Empunhadura em Fio Dourado Real",
    category: "wrap",
    rarity: "Épica",
    icon: "✨",
    description: "Fio de ouro nobre enrolado sobre cedro aromático, conferindo empunhadura régia.",
    value: 300,
    statsModifier: { defenseBonus: 10, agilityBonus: 10, durabilityBonus: 8 },
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
  {
    catalogKey: "pommel_elven_gem",
    name: "Pomo Gema Élfica",
    category: "pommel",
    rarity: "Épica",
    icon: "💎",
    description: "Cristal gota lapidado em engaste floral de prata lunar com ressonância pura.",
    value: 330,
    statsModifier: { agilityBonus: 16, damageBonus: 10 },
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
    catalogKey: "rune_thurisaz",
    name: "Runa Thurisaz (Trovão Demolidor)",
    category: "rune",
    rarity: "Épica",
    icon: "ᚦ",
    description: "Runa de destruição com canal de energia em zig-zag que potencializa o impacto de corte.",
    value: 350,
    statsModifier: { damageBonus: 22, defenseBonus: 10 },
  },

  // ITENS LENDÁRIOS
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
  {
    catalogKey: "guard_runic_monolith",
    name: "Guarda Rúnica Monolítica",
    category: "guard",
    rarity: "Lendária",
    icon: "🛡️",
    description: "Bloco maciço de liga estelar com canal rúnico ciano profundo e absorção cinética total.",
    value: 720,
    statsModifier: { defenseBonus: 24, durabilityBonus: 18, damageBonus: 12 },
  },
  {
    catalogKey: "pommel_knot_runic",
    name: "Pomo Nó Rúnico Eterno",
    category: "pommel",
    rarity: "Lendária",
    icon: "🌌",
    description: "Nó entrelaçado forjado sem costura em aço escuro indestrutível.",
    value: 680,
    statsModifier: { damageBonus: 20, agilityBonus: 16, durabilityBonus: 14 },
  },
  {
    catalogKey: "wrap_tsukamaki_silk",
    name: "Cordão Imperial de Seda Celestial",
    category: "wrap",
    rarity: "Lendária",
    icon: "🧧",
    description: "Trançado geométrico tradicional de seda celestial sobre pele de arraia pura.",
    value: 690,
    statsModifier: { agilityBonus: 22, damageBonus: 15, defenseBonus: 12 },
  },
  {
    catalogKey: "rune_sowilo",
    name: "Runa Sowilo (Raio Solar)",
    category: "rune",
    rarity: "Lendária",
    icon: "ᛊ",
    description: "A luz invencível que corta a matéria com temperatura de sol nascente.",
    value: 780,
    statsModifier: { damageBonus: 26, agilityBonus: 20 },
  },

  // ITENS RELÍQUIA
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
  {
    catalogKey: "rune_tiwaz",
    name: "Runa Tiwaz (Vitória Primordial)",
    category: "rune",
    rarity: "Relíquia",
    icon: "ᛏ",
    description: "O juramento de ferro dos primeiros forjadores. Concede integridade mítica absoluta.",
    value: 1200,
    statsModifier: { damageBonus: 35, defenseBonus: 25, agilityBonus: 20, durabilityBonus: 30 },
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

function hashStringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDynamicForgeRewards(
  sword: FinishedSword,
  options?: { seed?: number; forgeRunId?: string },
): ForgeRewardsData {
  const forgeRunId = options?.forgeRunId || sword.forgeRunId || generateUniqueId("run");
  const effectiveSeed = options?.seed !== undefined ? options.seed : hashStringToSeed(forgeRunId);
  const rng = createRng(effectiveSeed);
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
    // 1. Try unpicked candidate of target rarity
    let candidates = LOOT_CATALOG.filter((it) => it.rarity === targetRarity && !pickedKeys.has(it.catalogKey));

    // 2. If exhausted at target rarity, pick any unpicked candidate in the catalog to enforce 4 distinct cards
    if (candidates.length === 0) {
      candidates = LOOT_CATALOG.filter((it) => !pickedKeys.has(it.catalogKey));
    }

    // 3. Fallback only if catalog itself has fewer than 4 total items (test mock environments)
    if (candidates.length === 0) {
      candidates = LOOT_CATALOG.filter((it) => it.rarity === targetRarity);
    }
    if (candidates.length === 0) {
      candidates = LOOT_CATALOG;
    }

    const itemTemplate = candidates[Math.floor(rng() * candidates.length)] || LOOT_CATALOG[0];
    pickedKeys.add(itemTemplate.catalogKey);

    drawnItems.push({
      id: `${forgeRunId}_slot_${i}_${itemTemplate.catalogKey}`,
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
