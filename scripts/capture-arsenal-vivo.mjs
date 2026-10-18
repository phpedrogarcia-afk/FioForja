import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = join(root, "public", "game", "evidence");
const brainDir = "C:\\Users\\phped\\.gemini\\antigravity\\brain\\16b7ab6e-30b0-476a-ba2e-47187fc3eee6";

mkdirSync(outDir, { recursive: true });

async function run() {
  console.log("Starting in-process Vite server on port 8933...");
  const server = await createServer({
    server: { port: 8933, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8933/";
  console.log(`Vite listening at ${url}`);

  const launchArgs = [
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-features=CDPScreenshotNewSurface",
    "--no-sandbox",
  ];
  const browser = await chromium
    .launch({ channel: "chrome", headless: true, args: launchArgs })
    .catch(() => chromium.launch({ channel: "msedge", headless: true, args: launchArgs }))
    .catch(() => chromium.launch({ headless: true, args: launchArgs }));

  console.log(`Browser launched: ${browser.version()}`);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Navigate to Vite root
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Set up mock SaveData in localStorage with swords, components, catalyst
  await page.evaluate(async () => {
    const mockSwords = [
      {
        id: "sword_01",
        design: {
          name: "Vingadora de Aço",
          family: "royal",
          profile: "long",
          steel: "steel",
          guard: "cross",
          pommel: "disc",
          wrap: "leather",
          inscription: "VERITAS",
          runes: false,
          length: 1.0,
        },
        quality: 92,
        grade: "Magistral",
        rarity: "Épica",
        heatScore: 92,
        forgeScore: 90,
        quenchScore: 94,
        warp: 0.02,
        createdAt: Date.now() - 50000,
        damage: 235,
        defense: 120,
        agility: 88,
        durability: 96,
        upgradesApplied: 1,
        flaws: [],
        perks: ["Gume Impecável", "Alinhamento Perfeito"],
        affixes: ["Gume Impecável", "Alinhamento Perfeito"],
        forgeRunId: "run_mock_01",
        structuralState: "stable",
        broken: false,
        cracks: 0,
        physicalProfile: { lengthMm: 980, widthMm: 46, spineMm: 6.2, edgeMm: 0.7, distalTaper: 0.52, profilePurity: 0.94 },
        history: [],
      },
      {
        id: "sword_02",
        design: {
          name: "Lâmina das Estrelas",
          family: "meteor",
          profile: "saber",
          steel: "meteor",
          guard: "wings",
          pommel: "sphere",
          wrap: "goldwire",
          inscription: "ASTRA",
          runes: true,
          length: 1.05,
        },
        quality: 98,
        grade: "Obra-prima",
        rarity: "Lendária",
        heatScore: 98,
        forgeScore: 97,
        quenchScore: 99,
        warp: 0.01,
        createdAt: Date.now() - 40000,
        damage: 295,
        defense: 145,
        agility: 110,
        durability: 100,
        upgradesApplied: 2,
        flaws: [],
        perks: ["Gume de Obra-prima", "Pó Meteórico", "Ressonância Rúnica"],
        affixes: ["Gume de Obra-prima", "Pó Meteórico", "Ressonância Rúnica"],
        forgeRunId: "run_mock_02",
        structuralState: "stable",
        broken: false,
        cracks: 0,
        physicalProfile: { lengthMm: 1020, widthMm: 42, spineMm: 6.5, edgeMm: 0.5, distalTaper: 0.58, profilePurity: 0.98 },
        history: [],
      },
      {
        id: "sword_03",
        design: {
          name: "Cinza Ancestral",
          family: "relic",
          profile: "relic_blade",
          steel: "ancient_alloy",
          guard: "runic",
          pommel: "wolf",
          wrap: "bone",
          inscription: "PRIMA",
          runes: true,
          length: 1.1,
        },
        quality: 99,
        grade: "Obra-prima",
        rarity: "Relíquia",
        heatScore: 99,
        forgeScore: 99,
        quenchScore: 99,
        warp: 0.0,
        createdAt: Date.now() - 30000,
        damage: 340,
        defense: 175,
        agility: 95,
        durability: 100,
        upgradesApplied: 0,
        flaws: [],
        perks: ["Herança dos Primeiros Homens", "Martensita Pura"],
        affixes: ["Herança dos Primeiros Homens", "Martensita Pura"],
        forgeRunId: "run_mock_03",
        structuralState: "stable",
        broken: false,
        cracks: 0,
        physicalProfile: { lengthMm: 1100, widthMm: 55, spineMm: 7.2, edgeMm: 0.6, distalTaper: 0.48, profilePurity: 0.99 },
        history: [],
      },
      {
        id: "sword_04",
        design: {
          name: "Gume de Damasco",
          family: "damascus",
          profile: "falchion",
          steel: "damascus",
          guard: "curved",
          pommel: "disc",
          wrap: "braided",
          inscription: "ACIES",
          runes: false,
          length: 0.95,
        },
        quality: 89,
        grade: "Magistral",
        rarity: "Rara",
        heatScore: 88,
        forgeScore: 89,
        quenchScore: 90,
        warp: 0.03,
        createdAt: Date.now() - 20000,
        damage: 215,
        defense: 110,
        agility: 82,
        durability: 92,
        upgradesApplied: 0,
        flaws: [],
        perks: ["Dobra Perfeita"],
        affixes: ["Dobra Perfeita"],
        forgeRunId: "run_mock_04",
        structuralState: "stable",
        broken: false,
        cracks: 0,
        physicalProfile: { lengthMm: 920, widthMm: 50, spineMm: 6.0, edgeMm: 0.8, distalTaper: 0.5, profilePurity: 0.91 },
        history: [],
      },
    ];

    const mockComponents = [
      { id: "c1", name: "Guarda Real de Bronze", category: "guard", componentKey: "guard_royal", rarity: "Incomum", icon: "🛡", description: "Guarda polida com rebites forjados", acquiredAt: 1 },
      { id: "c2", name: "Guarda Alada de Damasco", category: "guard", componentKey: "guard_damascus_cross", rarity: "Rara", icon: "🛡", description: "Padrão de ondas entrelaçadas", acquiredAt: 2 },
      { id: "c3", name: "Guarda Estelar de Asterion", category: "guard", componentKey: "guard_star", rarity: "Épica", icon: "🛡", description: "Forjada em liga meteórica pura", acquiredAt: 3 },
      { id: "c4", name: "Guarda Rúnica Primitiva", category: "guard", componentKey: "guard_runic", rarity: "Rara", icon: "🛡", description: "Gravada com entalhes de proteção", acquiredAt: 4 },
      { id: "c5", name: "Pomo de Lobo de Prata", category: "pommel", componentKey: "pommel_wolf", rarity: "Rara", icon: "🐺", description: "Esculpido em prata densa", acquiredAt: 5 },
      { id: "c6", name: "Runa Ansuz dos Ventos", category: "rune", componentKey: "rune_ansuz", rarity: "Épica", icon: "ᚨ", description: "Desperta velocidade e leveza", acquiredAt: 6 },
    ];

    const saveData = {
      version: 5,
      gallery: mockSwords,
      lastDesign: mockSwords[1].design,
      wallet: { gold: 1850, rubies: 34, diamonds: 16 },
      inventory: {
        unlockedTools: ["hammer_standard", "hammer_precision", "hammer_sledge"],
        equipped: { hammer: "precision", anvil: "anvil_heavy", furnace: "furnace_bellows", quench: "quench_oil" },
        materials: { catalyst_astral: 3, fusion_fragment: 12, iron_chunk: 45, meteor_shard: 6 },
        components: mockComponents,
        fusionCores: [],
      },
      career: { totalForged: 42, masterpieces: 14, legendaries: 6, relics: 1, brokenBlades: 2, highestQuality: 99, totalValueEarned: 38400 },
      muted: true,
      shake: true,
      claimedForgeRewardIds: [],
    };

    localStorage.setItem("a-forja-save", JSON.stringify(saveData));
  });

  // Reload page so GameApp picks up localStorage
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 1. Capture Gallery Arsenal with P.ATK, DEF, AGI, DUR
  console.log("Navigating to Galeria...");
  await page.getByRole("button", { name: /arsenal do ferreiro/i }).click();
  await page.waitForTimeout(600);

  const shotArsenal = join(outDir, "arsenal-vivo-01-arsenal-cards.png");
  await page.screenshot({ path: shotArsenal });
  console.log(`Captured: ${shotArsenal}`);
  if (existsSync(brainDir)) copyFileSync(shotArsenal, join(brainDir, "arsenal-vivo-01-arsenal-cards.png"));

  // 2. Open inspection table for Lâmina das Estrelas
  console.log("Opening inspection for Lâmina das Estrelas...");
  const starSword = page.locator("h3", { hasText: "Lâmina das Estrelas" });
  if (await starSword.isVisible()) {
    await starSword.click();
    await page.waitForTimeout(600);

    // Capture Workbench Mounting view with components
    const shotWorkbench = join(outDir, "arsenal-vivo-04-workbench-mounting.png");
    await page.screenshot({ path: shotWorkbench });
    console.log(`Captured: ${shotWorkbench}`);
    if (existsSync(brainDir)) copyFileSync(shotWorkbench, join(brainDir, "arsenal-vivo-04-workbench-mounting.png"));

    console.log("Clicking Reivindicar Recompensas...");
    const rewardsBtn = page.getByRole("button", { name: /reivindicar recompensas/i });
    if (await rewardsBtn.isVisible()) {
      await rewardsBtn.click();
      await page.waitForTimeout(600);

      const shotRewards = join(outDir, "arsenal-vivo-03-loot-drops-rank-s.png");
      await page.screenshot({ path: shotRewards });
      console.log(`Captured: ${shotRewards}`);
      if (existsSync(brainDir)) copyFileSync(shotRewards, join(brainDir, "arsenal-vivo-03-loot-drops-rank-s.png"));

      // Click "Ver no Arsenal" to return to gallery
      const backArsenal = page.getByRole("button", { name: /ver no arsenal/i });
      if (await backArsenal.isVisible()) {
        await backArsenal.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // 3. Click "Crisol de Fusão" Tab in Gallery (now populated with inventory & available swords!)
  console.log("Navigating to Crisol de Fusão...");
  const fusionTab = page.locator("button").filter({ hasText: "Crisol de Fusão" });
  if (await fusionTab.isVisible()) {
    await fusionTab.click();
    await page.waitForTimeout(600);

    // Select the 4 available swords to populate the crucible slots and reveal canonical live odds
    const swordCards = page.locator(".cursor-pointer", { hasText: "Qualidade:" });
    const count = await swordCards.count();
    console.log(`Selecting ${Math.min(4, count)} swords in Crisol...`);
    for (let i = 0; i < Math.min(4, count); i++) {
      await swordCards.nth(i).click();
      await page.waitForTimeout(150);
    }

    // Toggle Catalyst Astral checkbox
    const catalystCheckbox = page.locator("input[type='checkbox']");
    if (await catalystCheckbox.isVisible()) {
      await catalystCheckbox.check();
      await page.waitForTimeout(300);
    }

    const shotFusao = join(outDir, "arsenal-vivo-02-crisol-fusao.png");
    await page.screenshot({ path: shotFusao });
    console.log(`Captured: ${shotFusao}`);
    if (existsSync(brainDir)) copyFileSync(shotFusao, join(brainDir, "arsenal-vivo-02-crisol-fusao.png"));
  }

  await browser.close();
  await server.close();
  console.log("Screenshot capture complete!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
