import type {
  GuardId,
  PommelId,
  ProfileId,
  SteelId,
  SwordDesign,
  WrapId,
} from "./types";

export const PROFILES: Record<
  ProfileId,
  { name: string; blurb: string; length: number; width: number; curve: number }
> = {
  short: { name: "Espada curta", blurb: "Ágil e equilibrada", length: 0.78, width: 1.08, curve: 0 },
  long: { name: "Espada longa", blurb: "O clássico europeu", length: 1, width: 1, curve: 0 },
  claymore: { name: "Claymore", blurb: "Larga, de duas mãos", length: 1.18, width: 1.18, curve: 0 },
  falchion: { name: "Alfange", blurb: "Gume largo de corte", length: 0.92, width: 1.22, curve: 0.12 },
  saber: { name: "Sabre", blurb: "Curva e veloz", length: 1.06, width: 0.82, curve: 0.26 },
};

export const STEELS: Record<
  SteelId,
  {
    name: string;
    blurb: string;
    hue: number;
    sat: number;
    light: number;
    hardness: number;
    heatMin: number;
    heatMax: number;
    sweetWidth: number;
    damascus: boolean;
    stars: boolean;
  }
> = {
  iron: {
    name: "Ferro",
    blurb: "Perdoa erros, brilha menos",
    hue: 28,
    sat: 10,
    light: 46,
    hardness: 0.62,
    heatMin: 0.52,
    heatMax: 0.82,
    sweetWidth: 0.22,
    damascus: false,
    stars: false,
  },
  steel: {
    name: "Aço",
    blurb: "Duro e fiel ao golpe",
    hue: 210,
    sat: 8,
    light: 58,
    hardness: 0.84,
    heatMin: 0.58,
    heatMax: 0.78,
    sweetWidth: 0.16,
    damascus: false,
    stars: false,
  },
  damascus: {
    name: "Damasco",
    blurb: "Ondas no metal, janela estreita",
    hue: 220,
    sat: 12,
    light: 38,
    hardness: 0.94,
    heatMin: 0.62,
    heatMax: 0.76,
    sweetWidth: 0.12,
    damascus: true,
    stars: false,
  },
  meteor: {
    name: "Meteorito",
    blurb: "Estrelas no gume, implacável",
    hue: 230,
    sat: 14,
    light: 26,
    hardness: 1,
    heatMin: 0.64,
    heatMax: 0.74,
    sweetWidth: 0.1,
    damascus: false,
    stars: true,
  },
};

export const WRAPS: Record<WrapId, { name: string; color: string }> = {
  leather: { name: "Couro", color: "#6b3f2a" },
  linen: { name: "Linho", color: "#cbb99a" },
  goldwire: { name: "Fio dourado", color: "#b0893a" },
  bone: { name: "Osso", color: "#e6dcc8" },
};

export const GUARDS: Record<GuardId, { name: string }> = {
  cross: { name: "Cruz" },
  curved: { name: "Curvada" },
  wings: { name: "Asas" },
  ring: { name: "Anel" },
};

export const POMMELS: Record<PommelId, { name: string }> = {
  disc: { name: "Disco" },
  sphere: { name: "Esfera" },
  wolf: { name: "Lobo" },
  cross: { name: "Cruz" },
};

export const DEFAULT_DESIGN: SwordDesign = {
  name: "Lâmina sem nome",
  profile: "long",
  steel: "steel",
  wrap: "leather",
  guard: "cross",
  pommel: "disc",
  inscription: "",
  runes: false,
  length: 1,
};

export function gradeFor(quality: number): string {
  if (quality >= 92) return "Obra-prima";
  if (quality >= 80) return "Excelente";
  if (quality >= 66) return "Boa";
  if (quality >= 48) return "Medíocre";
  return "Falha";
}

const RUNES: Record<string, string> = {
  a: "ᚨ",
  b: "ᛒ",
  c: "ᚲ",
  d: "ᛞ",
  e: "ᛖ",
  f: "ᚠ",
  g: "ᚷ",
  h: "ᚺ",
  i: "ᛁ",
  j: "ᛃ",
  k: "ᚲ",
  l: "ᛚ",
  m: "ᛗ",
  n: "ᚾ",
  o: "ᛟ",
  p: "ᛈ",
  q: "ᚲ",
  r: "ᚱ",
  s: "ᛊ",
  t: "ᛏ",
  u: "ᚢ",
  v: "ᚹ",
  w: "ᚹ",
  x: "ᚲ",
  y: "ᛃ",
  z: "ᛉ",
};

export function renderInscription(text: string, runes: boolean): string {
  const trimmed = text.trim().slice(0, 24);
  if (!runes) return trimmed;
  return [...trimmed]
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (lower === " ") return "·";
      return RUNES[lower] ?? ch;
    })
    .join("");
}
