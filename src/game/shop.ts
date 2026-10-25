import type { RarityGrade } from "./types";
import { CANONICAL_PRESETS, WORKSHOP_EQUIPMENT } from "./catalog.ts";
import { BASIC_IRON_RECOVERY_COST } from "./materials.ts";

/**
 * Catálogo comercial canônico da oficina.
 *
 * Fonte única da Loja: nome, categoria, preço, moeda, efeito e destino.
 * `executeShopPurchaseTransaction` valida este catálogo por ID e preço, então
 * uma chamada direta não consegue comprar item inexistente nem pagar menos.
 *
 * Preços de metais e componentes vêm do Bazar histórico. Receitas e ferramentas
 * são derivadas de `CANONICAL_PRESETS`/`WORKSHOP_EQUIPMENT` para não duplicar
 * identidade nem balanceamento de fusão.
 */
export type ShopCategoryId =
  | "materials"
  | "tools"
  | "wraps"
  | "guards"
  | "pommels"
  | "runes"
  | "catalysts"
  | "recipes";

export interface ShopArticle {
  id: string;
  name: string;
  category: "materials" | "components" | "runes" | "catalysts" | "tools" | "recipes";
  type: "material" | "component" | "rune" | "catalyst" | "tool" | "recipe";
  costGold: number;
  costRubies?: number;
  icon: string;
  desc: string;
  stats?: string;
  rarity: RarityGrade;
  componentData?: {
    category: "guard" | "pommel" | "wrap" | "rune";
    componentKey: string;
    rarity: RarityGrade;
    icon: string;
    description: string;
    statModifier?: { damageBonus?: number; defenseBonus?: number; agilityBonus?: number; durabilityBonus?: number };
  };
}

const CATALOG_BASE: ShopArticle[] = [
  // MATERIAIS & LINGOTES
  {
    id: "iron",
    name: "Lingote de Ferro Forjado",
    category: "materials",
    type: "material",
    costGold: BASIC_IRON_RECOVERY_COST,
    icon: "🧱",
    rarity: "Comum",
    desc: "Massa sólida de ferro maleável tradicional para forjamento básico.",
    stats: "Dureza: 75% · Faixa Térmica: 48-68%",
  },
  {
    id: "steel",
    name: "Barra de Aço Nobre do Reino",
    category: "materials",
    type: "material",
    costGold: 140,
    icon: "🪙",
    rarity: "Incomum",
    desc: "Liga de carbono balanceada para corte fino e lâminas cavalheirescas.",
    stats: "Dureza: 88% · Faixa Térmica: 55-72%",
  },
  {
    id: "damascus",
    name: "Tarugo Dobrado de Damasco",
    category: "materials",
    type: "material",
    costGold: 350,
    costRubies: 1,
    icon: "🌊",
    rarity: "Rara",
    desc: "Múltiplas dobras de aços nobres que produzem padrões ondulados e retenção elástica.",
    stats: "Dureza: 94% · Padrão Moiré Natural",
  },
  {
    id: "blacksteel",
    name: "Bloco de Aço Negro Forjado",
    category: "materials",
    type: "material",
    costGold: 450,
    costRubies: 1,
    icon: "⬛",
    rarity: "Épica",
    desc: "Aço de dureza extrema temperado em cinzas vulcânicas para retenção navalha.",
    stats: "Dureza: 98% · Retenção Extrema de Fio",
  },
  {
    id: "elven_silver",
    name: "Lingote de Prata Élfica Sagrada",
    category: "materials",
    type: "material",
    costGold: 850,
    costRubies: 3,
    icon: "✨",
    rarity: "Lendária",
    desc: "Liga ancestral luminosa forjada com harmonia natural e massa ultraleve.",
    stats: "Dureza: 92% · Leveza Mítica e Equilíbrio",
  },
  {
    id: "meteor",
    name: "Fragmento de Meteorito Celestial",
    category: "materials",
    type: "material",
    costGold: 1400,
    costRubies: 5,
    icon: "☄️",
    rarity: "Relíquia",
    desc: "Núcleo de bólido estelar colhido nas cordilheiras do norte cintilando com partículas astrais.",
    stats: "Dureza: 105% · Estrutura Estelar Inquebrável",
  },

  // GUARNIÇÕES & CABOS
  {
    id: "guard_cross_iron",
    name: "Guarda em Cruz Clássica",
    category: "components",
    type: "component",
    costGold: 120,
    icon: "🛡️",
    rarity: "Comum",
    desc: "Quilhões retos tradicionais de ferro maciço para proteção lateral confiável.",
    stats: "+10 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_cross",
      rarity: "Comum",
      icon: "🛡️",
      description: "Quilhões retos tradicionais de ferro maciço.",
      statModifier: { defenseBonus: 10 },
    },
  },
  {
    id: "guard_curved_falchion",
    name: "Guarda Curva de Falchion",
    category: "components",
    type: "component",
    costGold: 220,
    icon: "🌙",
    rarity: "Incomum",
    desc: "Quilhões sinuosos que protegem os nós dos dedos e facilitam deflexões de corte.",
    stats: "+6 ATK · +8 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_curved",
      rarity: "Incomum",
      icon: "🌙",
      description: "Quilhões sinuosos com deflexão de corte.",
      statModifier: { damageBonus: 6, defenseBonus: 8 },
    },
  },
  {
    id: "guard_tsuba_forged",
    name: "Tsuba Oriental Cinzelada",
    category: "components",
    type: "component",
    costGold: 400,
    costRubies: 1,
    icon: "🔘",
    rarity: "Rara",
    desc: "Disco octogonal cinzelado em ferro escurecido com abertura de corte.",
    stats: "+14 AGI · +8 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_tsuba",
      rarity: "Rara",
      icon: "🔘",
      description: "Disco tradicional de balanceamento para golpes rápidos.",
      statModifier: { agilityBonus: 14, defenseBonus: 8 },
    },
  },
  {
    id: "guard_leaf_elven",
    name: "Guarda em Gavinha Élfica",
    category: "components",
    type: "component",
    costGold: 700,
    costRubies: 2,
    icon: "🌿",
    rarity: "Lendária",
    desc: "Quilhões moldados como folhas entrelaçadas que absorvem vibrações de impacto.",
    stats: "+12 ATK · +12 AGI · +12 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_leaf",
      rarity: "Lendária",
      icon: "🌿",
      description: "Gavinhas florais de prata viva com absorção cinética.",
      statModifier: { damageBonus: 12, agilityBonus: 12, defenseBonus: 12 },
    },
  },
  {
    id: "guard_wings_celestial",
    name: "Guarda de Asas Celestes",
    category: "components",
    type: "component",
    costGold: 1100,
    costRubies: 4,
    icon: "🪽",
    rarity: "Relíquia",
    desc: "Asas abertas esculpidas em bronze celestial que distribuem o peso da lâmina com perfeição.",
    stats: "+18 ATK · +15 DEF · +10 DUR",
    componentData: {
      category: "guard",
      componentKey: "guard_wings",
      rarity: "Relíquia",
      icon: "🪽",
      description: "Asas heráldicas de proteção absoluta.",
      statModifier: { damageBonus: 18, defenseBonus: 15, durabilityBonus: 10 },
    },
  },

  // POMOS
  {
    id: "pommel_disc_balance",
    name: "Pomo de Disco Balanceado",
    category: "components",
    type: "component",
    costGold: 90,
    icon: "💿",
    rarity: "Comum",
    desc: "Contrapeso clássico circular chanfrado que equilibra o centro de massa.",
    stats: "+8 AGI",
    componentData: {
      category: "pommel",
      componentKey: "pommel_disc",
      rarity: "Comum",
      icon: "💿",
      description: "Disco clássico torneado de contrapeso.",
      statModifier: { agilityBonus: 8 },
    },
  },
  {
    id: "pommel_crescent_kashira",
    name: "Pomo Crescente Oriental (Kashira)",
    category: "components",
    type: "component",
    costGold: 240,
    icon: "🌘",
    rarity: "Incomum",
    desc: "Kashira metálico sóbrio que firma o aperto na base da empunhadura.",
    stats: "+10 AGI · +5 ATK",
    componentData: {
      category: "pommel",
      componentKey: "pommel_crescent",
      rarity: "Incomum",
      icon: "🌘",
      description: "Kashira curvado de ferro temperado.",
      statModifier: { agilityBonus: 10, damageBonus: 5 },
    },
  },
  {
    id: "pommel_elven_crystal",
    name: "Pomo em Gema Élfica Lapidada",
    category: "components",
    type: "component",
    costGold: 600,
    costRubies: 2,
    icon: "💎",
    rarity: "Lendária",
    desc: "Cristal gota lapidado em engaste floral que canaliza o fluxo de energia da espada.",
    stats: "+15 AGI · +10 ATK · +8 DEF",
    componentData: {
      category: "pommel",
      componentKey: "pommel_elven",
      rarity: "Lendária",
      icon: "💎",
      description: "Cristal gota lapidado em engaste de prata sagrada.",
      statModifier: { agilityBonus: 15, damageBonus: 10, defenseBonus: 8 },
    },
  },

  // EMPUNHADURAS
  {
    id: "wrap_braided_leather",
    name: "Empunhadura em Couro Trançado",
    category: "components",
    type: "component",
    costGold: 110,
    icon: "🧶",
    rarity: "Comum",
    desc: "Tiras de couro curtido trançadas com firmeza que não escorregam com suor.",
    stats: "+6 DUR · +6 AGI",
    componentData: {
      category: "wrap",
      componentKey: "wrap_braided",
      rarity: "Comum",
      icon: "🧶",
      description: "Trançado de alta aderência para combate prolongado.",
      statModifier: { durabilityBonus: 6, agilityBonus: 6 },
    },
  },
  {
    id: "wrap_tsukamaki_silk",
    name: "Empunhadura Tsukamaki em Seda",
    category: "components",
    type: "component",
    costGold: 340,
    costRubies: 1,
    icon: "🪢",
    rarity: "Rara",
    desc: "Cordão de seda vermelha entrelaçado em diamantes sobre base de arraia.",
    stats: "+16 AGI · +8 ATK",
    componentData: {
      category: "wrap",
      componentKey: "wrap_tsukamaki",
      rarity: "Rara",
      icon: "🪢",
      description: "Trançado geométrico tradicional de seda oriental.",
      statModifier: { agilityBonus: 16, damageBonus: 8 },
    },
  },
  {
    id: "wrap_goldwire_royal",
    name: "Empunhadura em Fio de Ouro",
    category: "components",
    type: "component",
    costGold: 750,
    costRubies: 2,
    icon: "👑",
    rarity: "Lendária",
    desc: "Espiral contínua de fio de ouro maciço sobre madeira nobre de ébano.",
    stats: "+14 ATK · +12 DEF · +10 DUR",
    componentData: {
      category: "wrap",
      componentKey: "wrap_goldwire",
      rarity: "Lendária",
      icon: "👑",
      description: "Fio de ouro nobre enrolado com acabamento de corte imperial.",
      statModifier: { damageBonus: 14, defenseBonus: 12, durabilityBonus: 10 },
    },
  },

  // RUNAS FUTHARK
  {
    id: "rune_fehu_stone",
    name: "Pedra Rúnica Fehu (Brasa)",
    category: "runes",
    type: "rune",
    costGold: 320,
    costRubies: 1,
    icon: "ᚠ",
    rarity: "Rara",
    desc: "Inscrita com a runa da primeira faísca arrancada do sílex. Aumenta a retenção de calor.",
    stats: "+12 ATK · +8 DUR",
    componentData: {
      category: "rune",
      componentKey: "rune_fehu",
      rarity: "Rara",
      icon: "ᚠ",
      description: "Fehu — O calor da fornalha vibra no gume.",
      statModifier: { damageBonus: 12, durabilityBonus: 8 },
    },
  },
  {
    id: "rune_uruz_stone",
    name: "Pedra Rúnica Uruz (Força Bruta)",
    category: "runes",
    type: "rune",
    costGold: 220,
    icon: "ᚢ",
    rarity: "Incomum",
    desc: "Inscrita com a runa do auroque primitivo. Aumenta o impacto e a massa dos golpes.",
    stats: "+15 ATK",
    componentData: {
      category: "rune",
      componentKey: "rune_uruz",
      rarity: "Incomum",
      icon: "ᚢ",
      description: "Uruz — Poder de impacto primordial.",
      statModifier: { damageBonus: 15 },
    },
  },
  {
    id: "rune_thurisaz_stone",
    name: "Pedra Rúnica Thurisaz (Trovão)",
    category: "runes",
    type: "rune",
    costGold: 520,
    costRubies: 2,
    icon: "ᚦ",
    rarity: "Épica",
    desc: "Inscrita com o martelo que estilhaça pedras. Libera centelhas de precisão extrema.",
    stats: "+22 ATK · +8 AGI",
    componentData: {
      category: "rune",
      componentKey: "rune_thurisaz",
      rarity: "Épica",
      icon: "ᚦ",
      description: "Thurisaz — Centelhas de ressonância no impacto.",
      statModifier: { damageBonus: 22, agilityBonus: 8 },
    },
  },
  {
    id: "rune_sowilo_stone",
    name: "Pedra Rúnica Sowilo (Raio Solar)",
    category: "runes",
    type: "rune",
    costGold: 950,
    costRubies: 3,
    icon: "ᛊ",
    rarity: "Lendária",
    desc: "Inscrita com a luz invencível que corta as trevas. Dá corte ágil sem atrito.",
    stats: "+18 ATK · +24 AGI",
    componentData: {
      category: "rune",
      componentKey: "rune_sowilo",
      rarity: "Lendária",
      icon: "ᛊ",
      description: "Sowilo — Gume de luz solar e velocidade estelar.",
      statModifier: { damageBonus: 18, agilityBonus: 24 },
    },
  },
  {
    id: "rune_tiwaz_stone",
    name: "Pedra Rúnica Tiwaz (Vitória)",
    category: "runes",
    type: "rune",
    costGold: 1600,
    costRubies: 6,
    icon: "ᛏ",
    rarity: "Relíquia",
    desc: "O juramento sagrado dos primeiros ferreiros. Concede integridade inabalável.",
    stats: "+25 ATK · +20 DEF · +15 DUR",
    componentData: {
      category: "rune",
      componentKey: "rune_tiwaz",
      rarity: "Relíquia",
      icon: "ᛏ",
      description: "Tiwaz — A lâmina nunca curva ou recua.",
      statModifier: { damageBonus: 25, defenseBonus: 20, durabilityBonus: 15 },
    },
  },

  // CRISOL & CATALISADORES
  {
    id: "catalyst_astral",
    name: "Catalisador Astral do Crisol",
    category: "catalysts",
    type: "catalyst",
    costGold: 400,
    costRubies: 1,
    icon: "🔮",
    rarity: "Rara",
    desc: "Insumo indispensável para estabilizar a fusão de espadas no crisol e elevar a probabilidade de herança mítica.",
    stats: "+1 Catalisador Astral no Inventário",
  },
];

/** Ferramentas vendáveis derivadas do catálogo de equipamentos da oficina. */
export const SHOP_TOOLS: ShopArticle[] = WORKSHOP_EQUIPMENT.filter((tool) => tool.costGold > 0).map((tool) => ({
  id: tool.id,
  name: tool.name,
  category: "tools" as const,
  type: "tool" as const,
  costGold: tool.costGold,
  costRubies: tool.costRubies,
  icon: tool.icon,
  rarity: tool.rarity,
  desc: tool.description,
  stats: tool.stats,
}));

/**
 * Receitas de projeto: compram o desbloqueio do blueprint correspondente.
 * A compra é idempotente (recusa segunda aquisição) e não substitui o
 * requisito de material na forja.
 */
export const SHOP_RECIPES: ShopArticle[] = [
  {
    id: "recipe_cimitarra_damasco",
    name: "Receita: Cimitarra do Damasco",
    category: "recipes",
    type: "recipe",
    costGold: 900,
    costRubies: 8,
    icon: "📜",
    rarity: "Rara",
    desc: "Segredo das dobras de Damasco registrado em pergaminho de couro.",
    stats: "Desbloqueia o projeto Cimitarra do Damasco no Compêndio.",
  },
  {
    id: "recipe_juramento_ferro",
    name: "Receita: Juramento de Ferro",
    category: "recipes",
    type: "recipe",
    costGold: 1800,
    costRubies: 22,
    icon: "📜",
    rarity: "Épica",
    desc: "Tratado de têmpera negra para lâminas de guarda pesada.",
    stats: "Desbloqueia o projeto Juramento de Ferro no Compêndio.",
  },
  {
    id: "recipe_lua_silenciosa",
    name: "Receita: Lua Silenciosa",
    category: "recipes",
    type: "recipe",
    costGold: 1600,
    costRubies: 18,
    icon: "📜",
    rarity: "Épica",
    desc: "Notas de um mestre oriental sobre o fio que não anuncia o corte.",
    stats: "Desbloqueia o projeto Lua Silenciosa no Compêndio.",
  },
  {
    id: "recipe_folha_aereth",
    name: "Receita: Folha de Aereth",
    category: "recipes",
    type: "recipe",
    costGold: 1400,
    costRubies: 15,
    icon: "📜",
    rarity: "Rara",
    desc: "Cantos élficos copiados em casca de bétula prateada.",
    stats: "Desbloqueia o projeto Folha de Aereth no Compêndio.",
  },
  {
    id: "recipe_sol_imperial",
    name: "Receita: Sol Imperial",
    category: "recipes",
    type: "recipe",
    costGold: 2400,
    costRubies: 30,
    icon: "📜",
    rarity: "Lendária",
    desc: "Carta de forja da casa imperial, selada com cera dourada.",
    stats: "Desbloqueia o projeto Sol Imperial no Compêndio.",
  },
  {
    id: "recipe_queda_asterion",
    name: "Receita: Queda de Asterion",
    category: "recipes",
    type: "recipe",
    costGold: 3000,
    costRubies: 40,
    icon: "📜",
    rarity: "Lendária",
    desc: "Mapa estelar que indica onde o metal do céu foi encontrado.",
    stats: "Desbloqueia o projeto Queda de Asterion no Compêndio.",
  },
  {
    id: "recipe_cinzas_ancestrais",
    name: "Receita: Cinzas Ancestrais",
    category: "recipes",
    type: "recipe",
    costGold: 3600,
    costRubies: 55,
    icon: "📜",
    rarity: "Relíquia",
    desc: "Fragmento de tábula primordial com a liga anterior ao primeiro fogo.",
    stats: "Desbloqueia o projeto Cinzas Ancestrais no Compêndio.",
  },
];

export const BAZAAR_ARTICLES: ShopArticle[] = [
  ...CATALOG_BASE,
  ...SHOP_TOOLS,
  ...SHOP_RECIPES,
];

const articleIndex = new Map(BAZAAR_ARTICLES.map((article) => [article.id, article]));

/** Localiza um produto comercial pelo ID canônico. */
export function findShopArticle(id: string): ShopArticle | undefined {
  return articleIndex.get(id);
}

export const SHOP_CATEGORIES: Array<{ id: ShopCategoryId; label: string; icon: string }> = [
  { id: "materials", label: "Metais e materiais", icon: "🧱" },
  { id: "tools", label: "Ferramentas", icon: "⚒️" },
  { id: "wraps", label: "Cabos", icon: "🧵" },
  { id: "guards", label: "Guardas", icon: "🛡️" },
  { id: "pommels", label: "Pomos", icon: "🔘" },
  { id: "runes", label: "Runas", icon: "ᚠ" },
  { id: "catalysts", label: "Catalisadores", icon: "🔮" },
  { id: "recipes", label: "Projetos e receitas", icon: "📜" },
];

/** Categoria de exibição da Loja para um produto. */
export function shopCategoryOf(article: ShopArticle): ShopCategoryId {
  if (article.type === "material") return "materials";
  if (article.type === "tool") return "tools";
  if (article.type === "recipe") return "recipes";
  if (article.type === "catalyst") return "catalysts";
  if (article.type === "rune") return "runes";
  if (article.componentData?.category === "guard") return "guards";
  if (article.componentData?.category === "pommel") return "pommels";
  return "wraps";
}

/** Próximo desbloqueio de receita ainda não possuído, para orientar a Loja. */
export function unownedRecipes(unlockedBlueprints: string[] | undefined): ShopArticle[] {
  const owned = new Set(unlockedBlueprints || []);
  return SHOP_RECIPES.filter((recipe) => {
    const blueprintId = recipe.id.replace(/^recipe_/, "");
    return CANONICAL_PRESETS.some((preset) => preset.id === blueprintId) && !owned.has(blueprintId);
  });
}
