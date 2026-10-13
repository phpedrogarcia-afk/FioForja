import { STEELS } from "./catalog";
import type { Boon, Rarity, SwordDesign, SwordStats } from "./types";

const TITLES: Record<Rarity, string[]> = {
  quebrada: ["Ferro Partido", "Gume Cego", "Lasca da Bigorna", "Promessa Rachada"],
  comum: ["Ferro de Estrada", "Lâmina de Quartel", "Aço de Feira", "Ponta Honesta"],
  incomum: ["Vigília do Portão", "Canto da Bigorna", "Sombra Curta", "Dente de Carvalho"],
  rara: ["Véu de Cinzas", "Presa do Crepúsculo", "Jura da Brasa", "Olho da Fornalha"],
  epica: ["Coroa Sem Rei", "Canção do Inverno", "Manto de Faísca", "Herança do Carvalho"],
  lendaria: ["Aurora do Gume", "Sangue de Estrela", "Juramento de Brasa", "Lamento do Rei", "Sol Partido"],
};

const BASE: Record<SwordDesign["profile"], SwordStats> = {
  short: { atk: 8, def: 7, agi: 14 },
  long: { atk: 12, def: 11, agi: 10 },
  claymore: { atk: 17, def: 13, agi: 6 },
  falchion: { atk: 16, def: 8, agi: 9 },
  saber: { atk: 11, def: 8, agi: 15 },
};

const MUL: Record<Rarity, number> = {
  quebrada: 0.42,
  comum: 0.72,
  incomum: 0.92,
  rara: 1.12,
  epica: 1.38,
  lendaria: 1.72,
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function jitter() {
  return 0.84 + Math.random() * 0.32;
}

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
}): { rarity: Rarity; title: string; stats: SwordStats; boon: Boon; grade: string } {
  const perfectRate = input.strikes > 0 ? input.perfects / input.strikes : 0;
  const score =
    input.quality * 0.62 +
    input.heatScore * 0.12 +
    input.forgeScore * 0.14 +
    input.quenchScore * 0.12 +
    perfectRate * 18 -
    input.warp * 28;

  let rarity: Rarity;
  if (input.broken) rarity = "quebrada";
  else if (score >= 86) rarity = Math.random() < 0.72 ? "lendaria" : "epica";
  else if (score >= 74) rarity = Math.random() < 0.22 ? "lendaria" : Math.random() < 0.55 ? "epica" : "rara";
  else if (score >= 60) {
    const r = Math.random();
    rarity = r < 0.5 ? "incomum" : r < 0.82 ? "rara" : "comum";
  } else if (score >= 45) rarity = Math.random() < 0.7 ? "comum" : "incomum";
  else rarity = "comum";

  let boon: Boon = "nenhum";
  if (!input.broken && (rarity === "lendaria" || rarity === "epica")) {
    const r = Math.random();
    boon = r < 0.34 ? "runas-elfico" : r < 0.67 ? "runas" : "elfico";
  } else if (!input.broken && rarity === "rara") {
    boon = Math.random() < 0.5 ? "runas" : Math.random() < 0.45 ? "elfico" : "nenhum";
  } else if (!input.broken && score >= 48 && score < 68 && Math.random() < 0.55) {
    boon = "nenhum";
    rarity = Math.random() < 0.65 ? "comum" : rarity;
  }

  const stats = statsFor(input.design, rarity, input.quality, boon, input.broken);
  const title = pick(TITLES[rarity]);
  const grade =
    rarity === "quebrada"
      ? "Quebrada"
      : rarity === "lendaria"
        ? "Lendária"
        : rarity === "epica"
          ? "Épica"
          : rarity === "rara"
            ? "Rara"
            : rarity === "incomum"
              ? "Incomum"
              : "Comum";

  return { rarity, title, stats, boon, grade };
}

function statsFor(
  design: SwordDesign,
  rarity: Rarity,
  quality: number,
  boon: Boon,
  broken: boolean,
): SwordStats {
  const base = BASE[design.profile];
  const steel = STEELS[design.steel].hardness;
  const q = 0.75 + (quality / 100) * 0.45;
  const m = MUL[rarity] * q * (broken ? 0.85 : 1);
  const atk = base.atk + steel * 6;
  const def = base.def + (1 - steel) * 3;
  const agi = base.agi;
  const rune = boon === "runas" || boon === "runas-elfico";
  const elf = boon === "elfico" || boon === "runas-elfico";
  return {
    atk: Math.round(atk * m * jitter() + (rune ? 4 : 0)),
    def: Math.round(def * m * jitter() + (rune ? 2 : 0)),
    agi: Math.round(agi * m * jitter() + (elf ? 5 : 0)),
  };
}

export function boonLabel(boon: Boon): string {
  if (boon === "runas-elfico") return "Runas raras e cabo élfico";
  if (boon === "runas") return "Runas raras";
  if (boon === "elfico") return "Cabo élfico";
  return "";
}

export function rarityLabel(rarity: Rarity): string {
  if (rarity === "quebrada") return "Quebrada";
  if (rarity === "lendaria") return "Lendária";
  if (rarity === "epica") return "Épica";
  if (rarity === "rara") return "Rara";
  if (rarity === "incomum") return "Incomum";
  return "Comum";
}
