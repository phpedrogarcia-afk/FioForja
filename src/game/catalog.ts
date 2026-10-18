import type {
  FamilyId,
  GuardId,
  PommelId,
  ProfileId,
  SteelId,
  SwordDesign,
  WrapId,
} from "./types.ts";

export const FAMILIES: Record<
  FamilyId,
  {
    name: string;
    fantasy: string;
    description: string;
    naturalRarity: string;
    defaultProfile: ProfileId;
    defaultSteel: SteelId;
    defaultWrap: WrapId;
    defaultGuard: GuardId;
    defaultPommel: PommelId;
    badgeColor: string;
  }
> = {
  iron: {
    name: "Ferro do Ferreiro",
    fantasy: "As primeiras armas da oficina — robustas, simples e leais.",
    description: "Lâmina de alta massa com acabamento bruto e perdão mecânico.",
    naturalRarity: "Comum → Rara",
    defaultProfile: "short",
    defaultSteel: "iron",
    defaultWrap: "leather",
    defaultGuard: "cross",
    defaultPommel: "disc",
    badgeColor: "#8c857b",
  },
  royal: {
    name: "Aço do Reino",
    fantasy: "Armas profissionais para nobres, guardas e cavaleiros.",
    description: "Simetria perfeita, gume acetinado e sangradouro central equilibrado.",
    naturalRarity: "Comum → Épica",
    defaultProfile: "long",
    defaultSteel: "steel",
    defaultWrap: "braided",
    defaultGuard: "cross",
    defaultPommel: "cross",
    badgeColor: "#6fa8dc",
  },
  damascus: {
    name: "Damasco",
    fantasy: "A própria arte da dobradura cria a beleza ondulada do metal.",
    description: "Linhas fluidas no aço, elasticidade sem igual e prestígio eterno.",
    naturalRarity: "Rara → Lendária",
    defaultProfile: "falchion",
    defaultSteel: "damascus",
    defaultWrap: "darkwood",
    defaultGuard: "curved",
    defaultPommel: "disc",
    badgeColor: "#9b59b6",
  },
  oriental: {
    name: "Oriental",
    fantasy: "Precisão cirúrgica, geometria esguia e curvatura milimétrica.",
    description: "Curva contínua, tsuba circular e empunhadura com amarração tradicional.",
    naturalRarity: "Incomum → Lendária",
    defaultProfile: "katana",
    defaultSteel: "blacksteel",
    defaultWrap: "tsukamaki",
    defaultGuard: "tsuba",
    defaultPommel: "crescent",
    badgeColor: "#e74c3c",
  },
  elven: {
    name: "Élfica",
    fantasy: "Arma nascida de escultura e harmonia natural — antiga, leve e afiada.",
    description: "Formas foliares orgânicas, liga de prata pálida e guardas aladas.",
    naturalRarity: "Rara → Relíquia",
    defaultProfile: "elven_blade",
    defaultSteel: "elven_silver",
    defaultWrap: "elven_wood",
    defaultGuard: "leaf",
    defaultPommel: "elven",
    badgeColor: "#2ecc71",
  },
  runic: {
    name: "Rúnica",
    fantasy: "Construída para abrigar inscrições profundas de poder primordial.",
    description: "Aço escurecido, canais talhados e runas Elder Futhark incandescentes.",
    naturalRarity: "Rara → Relíquia",
    defaultProfile: "claymore",
    defaultSteel: "iron",
    defaultWrap: "braided",
    defaultGuard: "runic",
    defaultPommel: "knot",
    badgeColor: "#3498db",
  },
  meteor: {
    name: "Meteórica",
    fantasy: "Forjada a partir de uma rocha estelar tombada dos céus.",
    description: "Aço negro de dureza extrema cintilando com partículas astrais.",
    naturalRarity: "Épica → Relíquia",
    defaultProfile: "saber",
    defaultSteel: "meteor",
    defaultWrap: "goldwire",
    defaultGuard: "wings",
    defaultPommel: "sphere",
    badgeColor: "#f39c12",
  },
  imperial: {
    name: "Imperial",
    fantasy: "A dignidade máxima da nobreza — poder, ouro e simetria absoluta.",
    description: "Quilhões esculpidos em águia, detalhes em ouro nobre e duplo sangradouro.",
    naturalRarity: "Rara → Lendária",
    defaultProfile: "long",
    defaultSteel: "steel",
    defaultWrap: "goldwire",
    defaultGuard: "imperial",
    defaultPommel: "crown",
    badgeColor: "#d4af37",
  },
  relic: {
    name: "Antiga / Relíquia",
    fantasy: "Armas que desafiam as eras, criadas com segredos perdidos.",
    description: "Geometria ancestral inconfundível, liga áurea e aura de divindade.",
    naturalRarity: "Relíquia",
    defaultProfile: "relic_blade",
    defaultSteel: "ancient_alloy",
    defaultWrap: "bone",
    defaultGuard: "runic",
    defaultPommel: "wolf",
    badgeColor: "#ff7675",
  },
};

export const PROFILES: Record<
  ProfileId,
  { name: string; blurb: string; length: number; width: number; curve: number; familyHint?: FamilyId }
> = {
  short: { name: "Espada curta", blurb: "Ágil e equilibrada", length: 0.78, width: 1.08, curve: 0, familyHint: "iron" },
  long: { name: "Espada longa", blurb: "O clássico europeu", length: 1, width: 1, curve: 0, familyHint: "royal" },
  claymore: { name: "Claymore", blurb: "Larga, de duas mãos", length: 1.18, width: 1.18, curve: 0, familyHint: "runic" },
  falchion: { name: "Alfange", blurb: "Gume largo de corte", length: 0.92, width: 1.22, curve: 0.12, familyHint: "iron" },
  saber: { name: "Sabre", blurb: "Curva e veloz", length: 1.06, width: 0.82, curve: 0.26, familyHint: "meteor" },
  katana: { name: "Katana", blurb: "Curvatura elegante e corte devastador", length: 1.08, width: 0.84, curve: 0.22, familyHint: "oriental" },
  elven_blade: { name: "Lâmina Foliar", blurb: "Curvas orgânicas e ponta esguia", length: 1.04, width: 0.9, curve: 0.08, familyHint: "elven" },
  relic_blade: { name: "Lâmina Ancestral", blurb: "Geometria milenar imponente", length: 1.14, width: 1.15, curve: 0.04, familyHint: "relic" },
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
    ancientAura?: boolean;
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
    name: "Aço Nobre",
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
  blacksteel: {
    name: "Aço Negro",
    blurb: "Grafite profundo e fio de prata",
    hue: 220,
    sat: 5,
    light: 24,
    hardness: 0.9,
    heatMin: 0.6,
    heatMax: 0.76,
    sweetWidth: 0.14,
    damascus: false,
    stars: false,
  },
  elven_silver: {
    name: "Prata Élfica",
    blurb: "Prata pálida de reflexos lunares",
    hue: 195,
    sat: 15,
    light: 74,
    hardness: 0.88,
    heatMin: 0.55,
    heatMax: 0.74,
    sweetWidth: 0.15,
    damascus: false,
    stars: false,
  },
  meteor: {
    name: "Meteorito",
    blurb: "Estrelas no gume, implacável",
    hue: 230,
    sat: 14,
    light: 22,
    hardness: 1,
    heatMin: 0.64,
    heatMax: 0.74,
    sweetWidth: 0.1,
    damascus: false,
    stars: true,
  },
  ancient_alloy: {
    name: "Liga Ancestral",
    blurb: "Ouro pálido e bronze celestial indestrutível",
    hue: 45,
    sat: 22,
    light: 52,
    hardness: 1.05,
    heatMin: 0.62,
    heatMax: 0.78,
    sweetWidth: 0.11,
    damascus: true,
    stars: true,
    ancientAura: true,
  },
};

export const WRAPS: Record<WrapId, { name: string; color: string; desc: string }> = {
  leather: { name: "Couro Rústico", color: "#6b3f2a", desc: "Couro bovino curtido tradicional" },
  braided: { name: "Couro Trançado", color: "#452818", desc: "Trançado firme de alta aderência" },
  linen: { name: "Linho Medieval", color: "#cbb99a", desc: "Faixa de linho rústica histórica" },
  darkwood: { name: "Madeira Nobre", color: "#2e1a12", desc: "Ébano esculpido acetinado" },
  bone: { name: "Osso / Marfim", color: "#e6dcc8", desc: "Marfim envelhecido lapidado" },
  goldwire: { name: "Fio Dourado", color: "#d4af37", desc: "Fio de ouro nobre enrolado" },
  tsukamaki: { name: "Cordão Oriental", color: "#8a1c14", desc: "Trançado geométrico tradicional de seda" },
  elven_wood: { name: "Madeira Élfica", color: "#d8c4a0", desc: "Cerne de árvore prateada eterna" },
  dragon_leather: { name: "Couro de Dragão", color: "#1c4a38", desc: "Couro escamoso de serpe esmeralda, pegada inabalável" },
};

export const GUARDS: Record<GuardId, { name: string; desc: string }> = {
  cross: { name: "Cruz Clássica", desc: "Tradicional guarda medieval com gavetas" },
  curved: { name: "Curvada", desc: "Quilhões sinuosos que protegem os nós dos dedos" },
  wings: { name: "Asas", desc: "Formato heráldico de asas abertas" },
  ring: { name: "Anel / Cesto", desc: "Anel protetor para empunhadura renascentista" },
  tsuba: { name: "Disco Oriental (Tsuba)", desc: "Disco octogonal cinzelado em ferro escurecido" },
  leaf: { name: "Folha Élfica", desc: "Quilhões em formato de folhas entrelaçadas" },
  imperial: { name: "Imperial Dourada", desc: "Águia e brasões heráldicos banhados a ouro" },
  runic: { name: "Rúnica Austera", desc: "Blocos maciços com talhos de runas ancestrais" },
};

export const POMMELS: Record<PommelId, { name: string; desc: string }> = {
  disc: { name: "Disco", desc: "Contrapeso clássico circular com chanfros" },
  sphere: { name: "Esfera", desc: "Esfera de aço maciço torneado" },
  wolf: { name: "Lobo", desc: "Esculpido na forma de um lobo predador" },
  cross: { name: "Cruz / Losango", desc: "Pomo facetado em forma de cruz heráldica" },
  crescent: { name: "Crescente Oriental", desc: "Kashira metálico de perfil curvo e sóbrio" },
  elven: { name: "Gema Élfica", desc: "Cristal gota lapidado em engaste floral" },
  crown: { name: "Coroa Imperial", desc: "Pomo em forma de diadema real" },
  knot: { name: "Nó Rúnico", desc: "Nó entrelaçado nórdico forjado em aço escuro" },
};

export interface CanonicalPreset {
  id: string;
  name: string;
  family: FamilyId;
  rarity: import("./types").RarityGrade;
  lore: string;
  design: SwordDesign;
}

export const CANONICAL_PRESETS: CanonicalPreset[] = [
  {
    id: "guarda_medieval",
    name: "Guarda da Fronteira (Medieval Comum)",
    family: "iron",
    rarity: "Comum",
    lore: "A espada do sentinela medieval — lâmina reta forjada em ferro leal, empunhadura em couro envelhecido e cruz reta firme.",
    design: {
      name: "Guarda da Fronteira",
      family: "iron",
      profile: "long",
      steel: "iron",
      wrap: "leather",
      guard: "cross",
      pommel: "disc",
      inscription: "VIGILIS",
      runes: false,
      length: 0.95,
    },
  },
  {
    id: "cimitarra_damasco",
    name: "Cimitarra de Damasco",
    family: "damascus",
    rarity: "Lendária",
    lore: "Gume curvo de falchion com padrão fluido de dobras sucessivas no aço, equilibrado com guarda sinuosa e empunhadura trançada.",
    design: {
      name: "Cimitarra de Damasco",
      family: "damascus",
      profile: "falchion",
      steel: "damascus",
      wrap: "braided",
      guard: "curved",
      pommel: "disc",
      inscription: "DAMASCUS",
      runes: false,
      length: 1.02,
    },
  },
  {
    id: "lua_silenciosa",
    name: "Lua Silenciosa (Katana)",
    family: "oriental",
    rarity: "Lendária",
    lore: "Curvatura sori milimétrica em aço escurecido, tsuba cinzelada com cortes tradicionais e tsukamaki de precisão impecável.",
    design: {
      name: "Lua Silenciosa",
      family: "oriental",
      profile: "katana",
      steel: "blacksteel",
      wrap: "tsukamaki",
      guard: "tsuba",
      pommel: "crescent",
      inscription: "SHINSOKU",
      runes: false,
      length: 1.08,
    },
  },
  {
    id: "folha_aereth",
    name: "Folha de Aereth (Élfica)",
    family: "elven",
    rarity: "Lendária",
    lore: "Geometria foliar orgânica esculpida em liga sagrada de prata élfica, quilhões em folha viva e pomo em gema lapidada.",
    design: {
      name: "Folha de Aereth",
      family: "elven",
      profile: "elven_blade",
      steel: "elven_silver",
      wrap: "elven_wood",
      guard: "leaf",
      pommel: "elven",
      inscription: "AERETHIL",
      runes: true,
      length: 1.02,
    },
  },
  {
    id: "queda_asterion",
    name: "Queda de Asterion (Meteórica)",
    family: "meteor",
    rarity: "Lendária",
    lore: "Forjada do núcleo azul-escuro de um bólido sideral; reluz com partículas astrais, empunhadura em fio de ouro e guarda de asas abertas.",
    design: {
      name: "Queda de Asterion",
      family: "meteor",
      profile: "saber",
      steel: "meteor",
      wrap: "goldwire",
      guard: "wings",
      pommel: "sphere",
      inscription: "ASTERION",
      runes: true,
      length: 1.06,
    },
  },
  {
    id: "juramento_ferro",
    name: "Juramento de Ferro (Rúnica)",
    family: "runic",
    rarity: "Lendária",
    lore: "Nenhum homem que quebrou um juramento selado por esta lâmina sobreviveu. O aço bruto ecoa cantos do Elder Futhark.",
    design: {
      name: "Juramento de Ferro",
      family: "runic",
      profile: "claymore",
      steel: "iron",
      wrap: "braided",
      guard: "runic",
      pommel: "knot",
      inscription: "TIWAZ·ODIN",
      runes: true,
      length: 1.18,
    },
  },
  {
    id: "sol_imperial",
    name: "Sol Imperial",
    family: "imperial",
    rarity: "Lendária",
    lore: "A espada coroada empunhada pela dinastia imperial nas grandes campanhas.",
    design: {
      name: "Sol Imperial",
      family: "imperial",
      profile: "long",
      steel: "steel",
      wrap: "goldwire",
      guard: "imperial",
      pommel: "crown",
      inscription: "IMPERATOR",
      runes: false,
      length: 1.0,
    },
  },
  {
    id: "cinzas_ancestrais",
    name: "Cinzas Ancestrais (Relíquia)",
    family: "relic",
    rarity: "Relíquia",
    lore: "A primeira relíquia desenterrada das fornalhas da primeira era dos homens.",
    design: {
      name: "Cinzas Ancestrais",
      family: "relic",
      profile: "relic_blade",
      steel: "ancient_alloy",
      wrap: "bone",
      guard: "runic",
      pommel: "wolf",
      inscription: "ANIMA·PRIMA",
      runes: true,
      length: 1.14,
    },
  },
];

export interface RuneEntry {
  symbol: string;
  name: string;
  school: "Fogo" | "Gelo" | "Terra" | "Vento" | "Élfica" | "Antiga";
  rarity: import("./types").RarityGrade;
  effect: string;
  lore: string;
}

export const RUNES_COMPENDIUM: RuneEntry[] = [
  { symbol: "ᚠ", name: "Fehu — Runa da Brasa", school: "Fogo", rarity: "Rara", effect: "O aço perde calor mais lentamente na bigorna.", lore: "Símbolo ancestral da primeira faísca arrancada do sílex." },
  { symbol: "ᚢ", name: "Uruz — Runa da Força Bruta", school: "Terra", rarity: "Incomum", effect: "Aumenta o impacto e a deformação plástica dos golpes.", lore: "O poder do auroque primitivo." },
  { symbol: "ᚦ", name: "Thurisaz — Runa do Trovão", school: "Fogo", rarity: "Épica", effect: "Dispara centelhas que aumentam a precisão do sweet spot.", lore: "O martelo que quebra montanhas." },
  { symbol: "ᚨ", name: "Ansuz — Runa dos Reis", school: "Élfica", rarity: "Lendária", effect: "Concede elegância soberana e alinhamento do gume.", lore: "O hálito dos deuses antigos sobre a forja." },
  { symbol: "ᛁ", name: "Isa — Runa do Gelo Estático", school: "Gelo", rarity: "Rara", effect: "Estabiliza o banho de têmpera impedindo empenamentos.", lore: "A calmaria do inverno polar cristalizando o metal." },
  { symbol: "ᛊ", name: "Sowilo — Runa do Raio Solar", school: "Vento", rarity: "Lendária", effect: "Infunde a lâmina com velocidade e corte sem atrito.", lore: "A luz invencível que corta as trevas." },
  { symbol: "ᛏ", name: "Tiwaz — Runa da Vitória", school: "Antiga", rarity: "Relíquia", effect: "Integridade inquebrável mesmo sob golpes extremos.", lore: "O juramento de ferro dos primeiros forjadores." },
];

export interface WorkshopItem {
  id: string;
  category: "hammer" | "anvil" | "furnace" | "quench";
  name: string;
  rarity: import("./types").RarityGrade;
  icon: string;
  stats: string;
  description: string;
  costGold: number;
  costRubies: number;
  unlockedByDefault?: boolean;
}

export const WORKSHOP_EQUIPMENT: WorkshopItem[] = [
  { id: "hammer_standard", category: "hammer", name: "Martelo de Forja Padrão", rarity: "Comum", icon: "🔨", stats: "Impacto: Médio | Controle: Balanceado", description: "O fiel companheiro de qualquer aprendiz de ferreiro.", costGold: 0, costRubies: 0, unlockedByDefault: true },
  { id: "hammer_precision", category: "hammer", name: "Martelo de Pena (Precisão)", rarity: "Rara", icon: "⚒️", stats: "Impacto: Leve | Controle: Altíssimo | Carga: Ágil", description: "Pena cruzada de precisão para estiramento fino e gume perfeito.", costGold: 1200, costRubies: 25 },
  { id: "hammer_sledge", category: "hammer", name: "Marreta Pesada de Desbaste", rarity: "Épica", icon: "🪓", stats: "Impacto: Devastador | Controle: Difícil | Carga: Pesada", description: "Move grandes massas de aço a cada golpe. Cuidado com metal frio!", costGold: 2400, costRubies: 50 },
  { id: "anvil_cast", category: "anvil", name: "Bigorna de Ferro Fundido", rarity: "Comum", icon: "🧱", stats: "Massa: 120kg | Rebote: Normal", description: "Bigorna tradicional com chifre cônico e mesa plana.", costGold: 0, costRubies: 0, unlockedByDefault: true },
  { id: "anvil_master", category: "anvil", name: "Bigorna do Mestre Forjador", rarity: "Lendária", icon: "🏛️", stats: "Massa: 280kg | Rebote: Perfeito | Redução de Vibração", description: "Fundida em aço de alta liga com face endurecida a espelho.", costGold: 3800, costRubies: 85 },
  { id: "furnace_coal", category: "furnace", name: "Forja de Carvão de Pedra", rarity: "Comum", icon: "🔥", stats: "Calor: Gradual | Oxigênio: Manual", description: "Fogo vivo alimentado por fole manual e carvão vegetal.", costGold: 0, costRubies: 0, unlockedByDefault: true },
  { id: "furnace_bluefire", category: "furnace", name: "Fornalha das Chamas Azuis", rarity: "Épica", icon: "💙", stats: "Calor: Rápido | Controle Térmico Superior", description: "Fornalha cerâmica de tiragem fechada com combustão completa.", costGold: 3100, costRubies: 60 },
  { id: "quench_water", category: "quench", name: "Cuba d'Água Fria", rarity: "Comum", icon: "💧", stats: "Resfriamento: Rápido | Risco de Choque", description: "Água pura de nascente da oficina para têmperas simples.", costGold: 0, costRubies: 0, unlockedByDefault: true },
  { id: "quench_oil", category: "quench", name: "Banho de Óleo Aquecido", rarity: "Rara", icon: "🏺", stats: "Resfriamento: Progressivo | Reduz Empenamento", description: "Mistura mineral balanceada que minimiza trincas e tensões.", costGold: 1600, costRubies: 30 },
];

export const DEFAULT_DESIGN: SwordDesign = {
  name: "Lâmina sem nome",
  family: "royal",
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
  if (quality >= 95) return "Obra-prima";
  if (quality >= 88) return "Magistral";
  if (quality >= 75) return "Excelente";
  if (quality >= 60) return "Boa";
  if (quality >= 40) return "Regular";
  return "Defeituosa";
}

export function rarityFor(design: SwordDesign, quality: number): import("./types").RarityGrade {
  if (design.steel === "ancient_alloy" && quality >= 88) return "Relíquia";
  if (quality >= 95 && (design.steel === "meteor" || design.steel === "damascus" || design.steel === "elven_silver" || design.steel === "blacksteel" || design.family === "imperial" || design.family === "oriental")) return "Lendária";
  if (quality >= 88 && (design.steel === "meteor" || design.steel === "damascus" || design.steel === "elven_silver" || design.steel === "blacksteel" || design.runes || design.steel === "ancient_alloy")) return "Épica";
  if (quality >= 75 || design.steel === "damascus" || design.steel === "elven_silver" || design.steel === "blacksteel") return "Rara";
  if (quality >= 45) return "Incomum";
  return "Comum";
}

export function calculateSwordAttributes(
  design: SwordDesign,
  quality: number,
  warp: number,
  heatScore: number,
  forgeScore: number,
  quenchScore: number,
) {
  const profile = PROFILES[design.profile] || PROFILES.long;
  const steel = STEELS[design.steel] || STEELS.steel;

  // Combat role archetypes
  let roleModifier = { atkMult: 1.0, defMult: 1.0, agiMult: 1.0, durAdd: 0 };
  let combatRole: import("./types.ts").CombatRole = "Equilibrada";

  if (design.family === "meteor" || design.family === "relic" || design.profile === "relic_blade" || design.profile === "elven_blade") {
    combatRole = "Excepcional";
    roleModifier = { atkMult: 1.16, defMult: 1.12, agiMult: 1.14, durAdd: 6 };
  } else if (design.profile === "claymore" || design.profile === "falchion" || (design.family === "damascus" && design.profile !== "short")) {
    combatRole = "Ofensiva";
    roleModifier = { atkMult: 1.22, defMult: 0.95, agiMult: 0.85, durAdd: 4 };
  } else if (design.profile === "long" && (design.family === "royal" || design.family === "runic")) {
    combatRole = "Defensiva";
    roleModifier = { atkMult: 0.98, defMult: 1.22, agiMult: 0.92, durAdd: 8 };
  } else if (design.profile === "katana" || design.profile === "short" || design.profile === "saber") {
    combatRole = "Ágil";
    roleModifier = { atkMult: 1.00, defMult: 0.88, agiMult: 1.28, durAdd: -4 };
  }

  // ATK: Gume bem formado, dureza do aço, qualidade do martelo e proporção de corte
  const baseAtk = (100 + steel.hardness * 140 + profile.width * 60) * roleModifier.atkMult;
  const edgeFactor = (quality / 100) * 0.75 + (forgeScore / 100) * 0.25;
  const damage = Math.round(baseAtk * edgeFactor);

  // DEF: Integridade, espessura da lâmina, têmpera limpa e capacidade de aparar
  const baseDef = (60 + profile.width * 75 + (quenchScore / 100) * 55) * roleModifier.defMult;
  const warpPenalty = Math.max(0.4, 1 - warp * 0.5);
  const defense = Math.round(baseDef * (quality / 100) * warpPenalty);

  // AGI: Equilíbrio, distribuição de massa e alinhamento
  const lightness = 1.35 - profile.length * 0.35 - profile.width * 0.25;
  const alignmentBonus = Math.max(0.3, (1 - warp * 0.7) * (0.4 + heatScore * 0.006));
  const agility = Math.max(15, Math.round((75 + lightness * 45) * alignmentBonus * (0.65 + quality * 0.0035) * roleModifier.agiMult));

  // Durability: do choque térmico e integridade
  const durability = Math.max(15, Math.min(100, Math.round(quenchScore * 0.55 + quality * 0.45 - warp * 30 + roleModifier.durAdd)));

  // Defeitos visuais e metalúrgicos
  const flaws: string[] = [];
  if (warp > 0.2) flaws.push("Empenamento visível ao longo da espinha");
  if (heatScore < 50) flaws.push("Zona de estresse por forja em temperatura fria");
  if (forgeScore < 55) flaws.push("Gume irregular com rebarbas e marcas de golpe");
  if (quenchScore < 45) flaws.push("Têmpera deficiente — aço brando");

  // Feitos e perks por maestria
  const perks: string[] = [];
  if (quality >= 95) perks.push("Gume de Obra-prima: Corte sem atrito");
  if (design.runes && quality >= 85) perks.push("Ressonância Rúnica: Lâmina desperta");
  if (steel.damascus && quality >= 78) perks.push("Dobra Perfeita: Elasticidade superior");
  if (steel.stars && quality >= 85) perks.push("Pó Meteórico: Dureza estelar");
  if (steel.ancientAura && quality >= 88) perks.push("Herança dos Primeiros Homens: Dureza mítica indestrutível");
  if (design.steel === "elven_silver" && quality >= 80) perks.push("Prata Sagrada: Leveza espectral e equilíbrio etéreo");
  if (design.steel === "blacksteel" && quality >= 80) perks.push("Coração de Grafite: Retenção extrema de fio navalha");
  if (quenchScore >= 90) perks.push("Martensita Pura: Retenção eterna de fio");
  if (warp < 0.03 && quality >= 88) perks.push("Alinhamento Perfeito: Centro de massa ideal");

  return { damage, defense, agility, durability, flaws, perks, combatRole };
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

export function recalculateSwordStats(sword: import("./types.ts").FinishedSword): import("./types.ts").FinishedSword {
  // 1. Establish pure metallurgical base stats
  const baseDamage = sword.baseDamage ?? sword.damage ?? 180;
  const baseDefense = sword.baseDefense ?? sword.defense ?? 90;
  const baseAgility = sword.baseAgility ?? sword.agility ?? 75;
  const baseDurability = sword.baseDurability ?? sword.durability ?? 90;

  // 2. Refinement bonus (+8 ATK, +2 DUR per upgrade tier, up to 3 tiers)
  const upgrades = Math.max(0, Math.min(3, sword.upgradesApplied || 0));
  const refineDamageBonus = upgrades * 8;
  const refineDurabilityBonus = upgrades * 2;

  // 3. Installed Component Modifiers (Strict slot allocation: 1 guard, 1 pommel, 1 wrap, 1 rune)
  const comps = Object.values(sword.installedComponents || {});
  let compDamage = 0;
  let compDefense = 0;
  let compAgility = 0;
  let compDurability = 0;

  for (const comp of comps) {
    if (comp?.statModifier) {
      compDamage += comp.statModifier.damageBonus || 0;
      compDefense += comp.statModifier.defenseBonus || 0;
      compAgility += comp.statModifier.agilityBonus || 0;
      compDurability += comp.statModifier.durabilityBonus || 0;
    }
  }

  // 4. Calculate final deterministic attributes
  const finalDamage = baseDamage + refineDamageBonus + compDamage;
  const finalDefense = baseDefense + compDefense;
  const finalAgility = Math.max(15, baseAgility + compAgility);
  const finalDurability = Math.max(10, Math.min(100, baseDurability + refineDurabilityBonus + compDurability));

  return {
    ...sword,
    baseDamage,
    baseDefense,
    baseAgility,
    baseDurability,
    damage: finalDamage,
    defense: finalDefense,
    agility: finalAgility,
    durability: finalDurability,
  };
}
