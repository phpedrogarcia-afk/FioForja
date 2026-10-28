import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../..", import.meta.url));
export const evidenceDir = join(root, "experiments", "M04-collection-intuitive", "evidence");
mkdirSync(evidenceDir, { recursive: true });

export const SIZES = [
  { name: "360x800", width: 360, height: 800 },
  { name: "392x819", width: 392, height: 819 },
];

const FIXED = 1760000000000;
const baseInventory = {
  unlockedProfiles: ["short", "long", "falchion", "saber", "katana"],
  unlockedSteels: ["iron", "steel", "damascus", "blacksteel", "meteor"],
  unlockedGuards: ["cross", "curved", "wings", "ring"],
  unlockedPommels: ["disc", "sphere", "cross"],
  unlockedWraps: ["leather", "braided", "linen", "goldwire"],
  unlockedRunes: ["fehu", "uruz"],
  unlockedTools: ["hammer_standard", "anvil_cast", "furnace_coal", "quench_water"],
  unlockedBlueprints: ["guarda_medieval"],
  masteredBlueprints: [],
  materials: {
    iron_ingot: 8,
    steel_ingot: 4,
    damascus_billet: 2,
    starmetal_ore: 1,
    fusion_fragment: 12,
    catalyst_astral: 2,
    scrap: 1,
    refined_iron: 1,
  },
  components: [
    {
      id: "comp_guard_wings",
      name: "Guarda de Asas de Valdoria",
      category: "guard",
      componentKey: "guard_wings_valdoria",
      rarity: "Rara",
      icon: "🪽",
      description: "Guarda em asas, equilíbrio de lâminas longas.",
      statModifier: { defenseBonus: 8, agilityBonus: 4 },
      acquiredAt: FIXED,
    },
    {
      id: "comp_rune_fehu",
      name: "Pedra Rúnica Fehu",
      category: "rune",
      componentKey: "rune_fehu",
      rarity: "Rara",
      icon: "ᚠ",
      description: "Fehu — prosperidade e corte constante.",
      statModifier: { damageBonus: 6 },
      acquiredAt: FIXED,
    },
  ],
  fusionCores: [
    {
      id: "core_asterion",
      name: "Núcleo de Asterion — Memória de Metal",
      rarity: "Épica",
      family: "meteor",
      profile: "saber",
      steel: "meteor",
      bonusQuality: 8,
      inheritedPerks: ["Luz Azul Celeste", "Dureza Astral"],
      consumedSwordIds: ["sx1", "sx2", "sx3", "sx4"],
      createdAt: FIXED,
      heritage: {
        attackBias: 18,
        defenseBias: 6,
        agilityBias: 9,
        durabilityBias: 4,
        runicAffinity: 0.6,
        dominantFamily: "meteor",
        dominantSteel: "meteor",
      },
    },
  ],
  equipped: {
    hammer: "standard",
    anvil: "anvil_cast",
    furnace: "furnace_coal",
    quench: "quench_water",
  },
};

function sword({
  id,
  name,
  rarity,
  quality,
  family,
  profile,
  steel,
  guard,
  wrap,
  pommel,
  stats,
  createdAt,
  favorite,
  broken,
  installed,
}) {
  return {
    id,
    design: {
      name,
      family,
      profile,
      steel,
      guard,
      wrap,
      pommel,
      inscription: name.split(" ")[0].toUpperCase(),
      runes: false,
      length: 1,
    },
    quality,
    grade: quality >= 95 ? "Obra-prima" : quality >= 85 ? "Mestre" : "Aprendiz",
    rarity,
    combatRole: "Equilibrada",
    heatScore: quality,
    forgeScore: quality,
    quenchScore: quality,
    warp: 0.01,
    createdAt,
    damage: stats[0],
    defense: stats[1],
    agility: stats[2],
    durability: stats[3],
    baseDamage: stats[0],
    baseDefense: stats[1],
    baseAgility: stats[2],
    baseDurability: stats[3],
    upgradesApplied: 0,
    flaws: [],
    perks: ["Alinhamento Perfeito: Centro de massa ideal"],
    affixes: ["Lâmina Fiel"],
    structuralState: broken ? "broken" : "stable",
    broken: Boolean(broken),
    cracks: broken ? 3 : 0,
    forgeRunId: "run_" + id,
    claimedRewards: true,
    favorite: Boolean(favorite),
    ...(installed ? { installedComponents: installed } : {}),
  };
}

export const MAIN_GALLERY = [
  sword({
    id: "s1",
    name: "Juramento das Cinzas de Valdoria",
    rarity: "Lendária",
    quality: 97,
    family: "meteor",
    profile: "saber",
    steel: "meteor",
    guard: "wings",
    wrap: "goldwire",
    pommel: "sphere",
    stats: [312, 148, 162, 98],
    createdAt: FIXED + 6000,
  }),
  sword({
    id: "s2",
    name: "Cimitarra de Damasco",
    rarity: "Lendária",
    quality: 94,
    family: "damascus",
    profile: "falchion",
    steel: "damascus",
    guard: "curved",
    wrap: "braided",
    pommel: "disc",
    stats: [288, 138, 96, 94],
    createdAt: FIXED + 5000,
  }),
  sword({
    id: "s3",
    name: "Lâmina do Primeiro Inverno",
    rarity: "Rara",
    quality: 82,
    family: "royal",
    profile: "long",
    steel: "steel",
    guard: "cross",
    wrap: "leather",
    pommel: "cross",
    stats: [210, 150, 90, 88],
    createdAt: FIXED + 4000,
    installed: { guard: baseInventory.components[0] },
  }),
  sword({
    id: "s4",
    name: "Véu de Ferro",
    rarity: "Comum",
    quality: 61,
    family: "iron",
    profile: "short",
    steel: "iron",
    guard: "cross",
    wrap: "linen",
    pommel: "disc",
    stats: [120, 140, 70, 75],
    createdAt: FIXED + 3000,
  }),
  sword({
    id: "s5",
    name: "Lua Silenciosa",
    rarity: "Épica",
    quality: 90,
    family: "oriental",
    profile: "katana",
    steel: "blacksteel",
    guard: "ring",
    wrap: "leather",
    pommel: "disc",
    stats: [232, 104, 182, 90],
    createdAt: FIXED + 2000,
    favorite: true,
  }),
  sword({
    id: "s6",
    name: "Fragmento da Bigorna",
    rarity: "Comum",
    quality: 18,
    family: "iron",
    profile: "short",
    steel: "iron",
    guard: "cross",
    wrap: "leather",
    pommel: "disc",
    stats: [45, 30, 20, 15],
    createdAt: FIXED + 1000,
    broken: true,
  }),
];

export function makeSave({
  gallery = MAIN_GALLERY,
  wallet = { gold: 4000, rubies: 35, diamonds: 20 },
} = {}) {
  return {
    version: 5,
    gallery,
    wallet,
    inventory: structuredClone(baseInventory),
    career: {
      totalForged: gallery.length,
      masterpieces: gallery.filter((s) => s.quality >= 95).length,
      legendaries: gallery.filter((s) => s.rarity === "Lendária").length,
      relics: 0,
      brokenBlades: gallery.filter((s) => s.broken).length,
      highestQuality: Math.max(0, ...gallery.map((s) => s.quality)),
      totalValueEarned: 0,
    },
    muted: true,
    shake: false,
    claimedForgeRewardIds: gallery.map((s) => s.forgeRunId),
    claimedStrikeRewardIds: [],
    activeForgeAttempt: null,
    commissions: [],
    lastDesign: {
      name: "Lâmina de Teste",
      family: "iron",
      profile: "long",
      steel: "iron",
      wrap: "leather",
      guard: "cross",
      pommel: "disc",
      inscription: "",
      runes: false,
      length: 1,
    },
  };
}

export function largeGallery(count = 14) {
  const templates = MAIN_GALLERY.slice(0, 5);
  return Array.from({ length: count }, (_, index) => {
    const base = structuredClone(templates[index % templates.length]);
    base.id = "large_" + index;
    base.createdAt = FIXED + 100000 - index * 1000;
    base.design.name =
      index === 0 ? "Juramento das Cinzas de Valdoria" : base.design.name + " " + (index + 1);
    return base;
  });
}

export async function startApp(port = 8967) {
  const server = await createServer({
    root,
    server: { port, host: "127.0.0.1" },
    logLevel: "error",
  });
  await server.listen();
  return { server, url: "http://127.0.0.1:" + port + "/" };
}

export async function launchBrowser() {
  const args = [
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-features=CDPScreenshotNewSurface",
  ];
  return chromium
    .launch({ channel: "msedge", headless: true, args })
    .catch(() => chromium.launch({ channel: "chrome", headless: true, args }))
    .catch(() => chromium.launch({ headless: true, args }));
}

export async function seedSave(context, save) {
  // Seed once per context. Re-running this on every reload would overwrite the
  // game's own persisted mutations and make persistence tests meaningless.
  await context.addInitScript((value) => {
    if (!localStorage.getItem("a-forja-save")) {
      localStorage.setItem("a-forja-save", JSON.stringify(value));
      localStorage.setItem("a-forja-save-backup", JSON.stringify(value));
    }
  }, save);
}

export async function openCollection(page) {
  await page.getByRole("button", { name: "Coleção" }).click();
  await page.waitForTimeout(450);
}

export async function collectMetrics(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const tabs = Array.from(document.querySelectorAll('[role="tablist"] [role="tab"]'));
    const tablist = document.querySelector('[role="tablist"]');
    const tabRects = tabs.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        label: (el.textContent || "").trim(),
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        fullyVisible: r.left >= 0 && r.right <= vw,
        centerVisible: r.left + r.width / 2 > 0 && r.left + r.width / 2 < vw,
      };
    });
    const cards = Array.from(document.querySelectorAll('section[aria-label="Arsenal"] button'));
    const cardRects = cards.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        fullyVisible: r.top >= 0 && r.bottom <= vh,
        title: (el.querySelector("h3")?.textContent || "").trim(),
      };
    });
    const scrollRegion = document.querySelector("main")?.parentElement;
    const active = document.activeElement;
    return {
      viewport: { width: vw, height: vh },
      documentWidth: doc.scrollWidth,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
      bodyHorizontalOverflow: Math.max(0, document.body.scrollWidth - document.body.clientWidth),
      headerHeight:
        Math.round((document.querySelector("header")?.getBoundingClientRect().height || 0) * 10) /
        10,
      tablist: tablist
        ? {
            left: Math.round(tablist.getBoundingClientRect().left),
            width: Math.round(tablist.clientWidth),
            scrollWidth: tablist.scrollWidth,
            overflow: tablist.scrollWidth - tablist.clientWidth,
            height: Math.round(tablist.getBoundingClientRect().height),
            scrollLeft: tablist.scrollLeft,
          }
        : null,
      tabs: tabRects,
      fullyVisibleTabs: tabRects.filter((t) => t.fullyVisible).map((t) => t.label),
      centerVisibleTabs: tabRects.filter((t) => t.centerVisible).map((t) => t.label),
      cardCount: cardRects.length,
      fullyVisibleCards: cardRects.filter((c) => c.fullyVisible).length,
      cards: cardRects,
      text: (document.querySelector("main")?.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200),
      activeElement: active
        ? (active.getAttribute("aria-label") || active.textContent || "").trim().slice(0, 80)
        : null,
      verticalScroll: scrollRegion
        ? {
            clientHeight: scrollRegion.clientHeight,
            scrollHeight: scrollRegion.scrollHeight,
            overflow: scrollRegion.scrollHeight - scrollRegion.clientHeight,
          }
        : null,
    };
  });
}

export async function shot(page, name) {
  const path = join(evidenceDir, name);
  await page.screenshot({ path, type: "jpeg", quality: 82 });
  return path;
}
