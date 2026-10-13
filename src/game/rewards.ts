import { gradeFor, STEELS } from "./catalog";
import { rankFor } from "./performance";
import type { Boon, ForgeRank, Rarity, RewardDrop, SwordDesign, SwordStats } from "./types";

export const DROP_CATALOG: Record<string, Omit<RewardDrop, "amount">> = {
  scrap: {
    id: "scrap",
    name: "Sucata de ferro",
    category: "material",
    tier: 0,
    unlocks: [],
    description: "Metal recuperado da peça. Seu estoque fica no Compêndio.",
  },
  refined: {
    id: "refined",
    name: "Ferro refinado",
    category: "material",
    tier: 1,
    unlocks: ["iron"],
    description: "Material de treino com ampla janela térmica.",
  },
  leather: {
    id: "leather",
    name: "Couro de artesão",
    category: "grip",
    tier: 1,
    unlocks: ["leather", "wood"],
    description: "Desbloqueia também a empunhadura de nogueira.",
  },
  minor: {
    id: "minor",
    name: "Runa da Brasa",
    category: "rune",
    tier: 1,
    unlocks: ["ember"],
    description: "Gravação ígnea que responde aos golpes perfeitos.",
  },
  tempered: {
    id: "tempered",
    name: "Liga temperada",
    category: "material",
    tier: 2,
    unlocks: ["steel"],
    description: "Aço de reflexos frios e gume uniforme.",
  },
  elemental: {
    id: "elemental",
    name: "Runas elementais",
    category: "rune",
    tier: 2,
    unlocks: ["frost", "gold"],
    description: "Desbloqueia inscrições de gelo e ouro.",
  },
  ornate: {
    id: "ornate",
    name: "Guarda ornamentada",
    category: "guard",
    tier: 2,
    unlocks: ["wings", "ring", "wolf", "cross-pommel"],
    description: "Asas, anel e novos pomos para sua oficina.",
  },
  ancestral: {
    id: "ancestral",
    name: "Runa Ancestral",
    category: "rune",
    tier: 4,
    unlocks: ["ancestral"],
    description: "Conquistada com desempenho S. Luz contida nos canais gravados.",
  },
  damascus: {
    id: "damascus",
    name: "Damasco magistral",
    category: "material",
    tier: 4,
    unlocks: ["damascus"],
    description: "Ondas estruturais no aço, com exigência térmica maior.",
  },
  star: {
    id: "star",
    name: "Metal estelar",
    category: "material",
    tier: 4,
    unlocks: ["meteor"],
    description: "Inclusões minerais e reflexos de estrelas.",
  },
  legendaryGrip: {
    id: "legendaryGrip",
    name: "Empunhadura do legado",
    category: "grip",
    tier: 4,
    unlocks: ["goldwire", "metal"],
    description: "Fio dourado e metal trabalhado para sua próxima obra.",
  },
};
export const RANK_DROPS: Record<ForgeRank, string[]> = {
  S: ["ancestral", "damascus", "legendaryGrip", "star"],
  A: ["elemental", "tempered", "ornate"],
  B: ["refined", "leather", "minor"],
  C: ["refined", "scrap"],
  F: ["scrap"],
};
const BASE: Record<SwordDesign["profile"], SwordStats> = {
  short: { atk: 8, def: 7, agi: 14 },
  long: { atk: 12, def: 11, agi: 10 },
  claymore: { atk: 17, def: 13, agi: 6 },
  falchion: { atk: 16, def: 8, agi: 9 },
  saber: { atk: 11, def: 8, agi: 15 },
};
const RARITY: Record<ForgeRank, Rarity> = {
  S: "lendaria",
  A: "epica",
  B: "rara",
  C: "comum",
  F: "quebrada",
};
const NAMES: Record<ForgeRank, string> = {
  S: "Juramento de Estrelas",
  A: "Herança da Brasa",
  B: "Vigília da Forja",
  C: "Ferro de Estrada",
  F: "Promessa Partida",
};
export function rollReward(input: {
  design: SwordDesign;
  quality: number;
  heatScore: number;
  forgeScore: number;
  quenchScore: number;
  warp: number;
  perfects: number;
  strikes: number;
  broken: boolean;
  performance?: number;
}) {
  const performance = input.performance ?? input.quality;
  const rank = rankFor(performance, input.broken);
  const rarity = RARITY[rank];
  const broken = rank === "F";
  const base = BASE[input.design.profile];
  const scale = broken ? 0.15 : 0.6 + (input.quality / 100) * 0.8;
  const stats = {
    atk: Math.round((base.atk + STEELS[input.design.steel].hardness * 6) * scale),
    def: Math.round((base.def + (input.design.guard === "ring" ? 3 : 1)) * scale),
    agi: Math.round((base.agi + (input.design.pommel === "sphere" ? 2 : 0)) * scale),
  };
  const boon: Boon = input.design.runes ? "runas" : "nenhum";
  return {
    rank,
    performance,
    rarity,
    title:
      input.design.name.trim() && input.design.name !== "Lâmina sem nome"
        ? input.design.name
        : NAMES[rank],
    stats,
    boon,
    grade: broken ? "Falha" : gradeFor(input.quality),
    drops: RANK_DROPS[rank].map((id) => ({
      ...DROP_CATALOG[id]!,
      amount: id === "scrap" ? (broken ? 3 : 1) : 1,
    })),
  };
}
export function boonLabel(boon: Boon): string {
  return boon === "runas-elfico"
    ? "Runas e cabo élfico"
    : boon === "runas"
      ? "Inscrição rúnica"
      : boon === "elfico"
        ? "Cabo élfico"
        : "";
}
export function rarityLabel(rarity: Rarity): string {
  return {
    quebrada: "Quebrada",
    comum: "Comum",
    incomum: "Incomum",
    rara: "Rara",
    epica: "Épica",
    lendaria: "Lendária",
  }[rarity];
}
