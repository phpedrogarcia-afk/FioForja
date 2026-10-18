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
  console.log("Starting Vite server on port 8945 for Progression Captures...");
  const server = await createServer({
    server: { port: 8945, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8945/";
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

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 1. Setup save data showcasing progression, materials, and commissions
  console.log("Injecting canonical progression state into localStorage...");
  await page.evaluate(async () => {
    const demoSwords = [
      {
        id: "sword_valerius_ready",
        design: {
          name: "Guarda da Muralha",
          family: "iron",
          profile: "short",
          steel: "iron",
          wrap: "leather",
          guard: "cross",
          pommel: "disc",
          inscription: "VALERIUS",
          runes: false,
          length: 0.95,
        },
        quality: 78,
        grade: "Mestre",
        rarity: "Comum",
        combatRole: "Defensiva",
        heatScore: 82,
        forgeScore: 78,
        quenchScore: 80,
        warp: 0.02,
        createdAt: Date.now() - 3600000,
        damage: 165,
        defense: 120,
        agility: 28,
        durability: 88,
        baseDamage: 165,
        baseDefense: 120,
        baseAgility: 28,
        baseDurability: 88,
        upgradesApplied: 0,
        value: 380,
      },
      {
        id: "sword_damascus_crafted",
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
        quality: 91,
        grade: "Magistral",
        rarity: "Rara",
        combatRole: "Ofensiva",
        heatScore: 92,
        forgeScore: 90,
        quenchScore: 92,
        warp: 0.01,
        createdAt: Date.now() - 7200000,
        damage: 280,
        defense: 75,
        agility: 42,
        durability: 82,
        baseDamage: 280,
        baseDefense: 75,
        baseAgility: 42,
        baseDurability: 82,
        upgradesApplied: 1,
        value: 1200,
      },
    ];

    const demoSave = {
      version: 5,
      wallet: { gold: 1250, rubies: 45, diamonds: 2 },
      career: {
        totalForged: 6,
        masterpieces: 1,
        legendaries: 0,
        relics: 0,
        brokenBlades: 1,
        highestQuality: 96,
        totalValueEarned: 3400,
      },
      inventory: {
        materials: {
          iron_ingot: 8,
          steel_ingot: 4,
          damascus_billet: 2,
          blacksteel_chunk: 0,
          starmetal_ore: 1,
          scrap: 4,
        },
        unlockedTools: ["hammer_standard", "anvil_basic", "furnace_basic", "quench_water", "hammer_precision"],
        unlockedBlueprints: ["guarda_medieval", "cimitarra_damasco"],
        masteredBlueprints: ["guarda_medieval"],
        fusionCores: [],
        components: [],
        equipped: {
          hammer: "hammer_precision",
          anvil: "anvil_basic",
          furnace: "furnace_basic",
          quench: "quench_water",
        },
      },
      gallery: demoSwords,
      commissions: [
        {
          id: "comm_guard_captain",
          clientName: "Capitão Valerius",
          clientTitle: "Sentinela da Muralha Norte",
          icon: "🛡️",
          description: "A guarnição do portão norte necessita de lâminas sólidas com têmpera defensiva para conter invasores nas paliçadas.",
          family: "iron",
          steel: "iron",
          minQuality: 60,
          requiredRole: "Defensiva",
          rewardGold: 350,
          rewardMaterial: { key: "steel_ingot", name: "Lingote de Aço Forjado", quantity: 2 },
          rewardRubies: 5,
          completed: false,
        },
        {
          id: "comm_mercenary_leader",
          clientName: "Comandante Kael",
          clientTitle: "Líder dos Falcões Cinzentos",
          icon: "🦅",
          description: "Minhas tropas de cavalaria ligeira precisam de alfanges ou sabres rápidos com boa manobrabilidade para corte a cavalo.",
          minQuality: 75,
          minStat: { stat: "agility", minValue: 22 },
          rewardGold: 600,
          rewardMaterial: { key: "damascus_billet", name: "Tarugo Dobrado de Damasco", quantity: 1 },
          rewardRubies: 10,
          completed: false,
        },
        {
          id: "comm_noble_duel",
          clientName: "Lord Alistair",
          clientTitle: "Campeão da Alta Nobreza",
          icon: "👑",
          description: "Um duelo de honra foi marcado perante a corte imperial. Preciso de uma obra de alta lâmina com potencial ofensivo temível.",
          minQuality: 88,
          minStat: { stat: "damage", minValue: 32 },
          rewardGold: 1200,
          rewardMaterial: { key: "starmetal_ore", name: "Fragmento de Minério Estelar", quantity: 1 },
          rewardRubies: 20,
          completed: false,
        },
      ],
      activeForgeAttempt: null,
      lastDesign: demoSwords[0].design,
    };

    localStorage.setItem("a-forja-save", JSON.stringify(demoSave));
    localStorage.setItem("a-forja-save-backup", JSON.stringify(demoSave));
  });

  // Reload page to pick up updated save
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Capture 1: Design Screen with Blueprint states, Stock indicators and Practice mode button
  console.log("Capturing progression-01-design-screen-gating.png...");
  const designScreenPath = join(outDir, "progression-01-design-screen-gating.png");
  await page.screenshot({ path: designScreenPath });

  // Navigate to Gallery by clicking "Voltar ao Arsenal" or "Arsenal"
  console.log("Navigating to Gallery...");
  const arsenalBtn = page.getByRole("button", { name: /Arsenal/i });
  if (await arsenalBtn.isVisible()) {
    await arsenalBtn.click();
  }
  await page.waitForTimeout(500);

  // Click on "Encomendas" tab (8th pillar)
  console.log("Switching to Encomendas tab...");
  const encomTab = page.getByRole("button", { name: /Encomendas/i });
  if (await encomTab.isVisible()) {
    await encomTab.click();
    await page.waitForTimeout(400);

    // Capture 2: Commissions Tab with Captain Valerius, Kael, Alistair
    console.log("Capturing progression-02-gallery-commissions-tab.png...");
    const commTabPath = join(outDir, "progression-02-gallery-commissions-tab.png");
    await page.screenshot({ path: commTabPath });

    // Select the eligible sword in dropdown and deliver commission
    console.log("Selecting eligible sword for Capitão Valerius...");
    const selectTrigger = page.locator("select").first();
    if (await selectTrigger.isVisible()) {
      await selectTrigger.selectOption("sword_valerius_ready");
      await page.waitForTimeout(200);

      const deliverBtn = page.getByRole("button", { name: /Entregar Arma/i }).first();
      if (await deliverBtn.isVisible()) {
        await deliverBtn.click();
        await page.waitForTimeout(500);

        // Capture 3: Delivered commission with rewards credited
        console.log("Capturing progression-03-commission-delivered.png...");
        const deliveredPath = join(outDir, "progression-03-commission-delivered.png");
        await page.screenshot({ path: deliveredPath });
      }
    }
  }

  // Switch to "Oficina" tab to show Scrap Recycling tool
  console.log("Switching to Oficina tab for Scrap Recycling tool...");
  const oficinaTab = page.getByRole("button", { name: /Oficina/i });
  if (await oficinaTab.isVisible()) {
    await oficinaTab.click();
    await page.waitForTimeout(400);

    // Capture 4: Workshop with Scrap Recycling tool and Anti-Softlock guarantees
    console.log("Capturing progression-04-workshop-scrap-recycle.png...");
    const recyclePath = join(outDir, "progression-04-workshop-scrap-recycle.png");
    await page.screenshot({ path: recyclePath });
  }

  // Navigate back to Design screen and start Practice Mode (Treino Básico de Oficina)
  console.log("Navigating to Design and starting Practice Forge...");
  const forjarNovaBtn = page.getByRole("button", { name: /\+ Forjar Nova/i });
  if (await forjarNovaBtn.isVisible()) {
    await forjarNovaBtn.click();
    await page.waitForTimeout(400);

    const treinoBtn = page.getByRole("button", { name: /Treino Básico de Oficina/i });
    if (await treinoBtn.isVisible()) {
      await treinoBtn.click();
      await page.waitForTimeout(600);

      // Capture 5: Practice Mode live canvas
      console.log("Capturing progression-05-practice-forge-live.png...");
      const practicePath = join(outDir, "progression-05-practice-forge-live.png");
      await page.screenshot({ path: practicePath });
    }
  }

  // Copy all evidence screenshots to brainDir for persistent user artifact review
  console.log("Syncing captures to brain directory...");
  const filesToSync = [
    "progression-01-design-screen-gating.png",
    "progression-02-gallery-commissions-tab.png",
    "progression-03-commission-delivered.png",
    "progression-04-workshop-scrap-recycle.png",
    "progression-05-practice-forge-live.png",
  ];

  for (const f of filesToSync) {
    const src = join(outDir, f);
    if (existsSync(src)) {
      copyFileSync(src, join(brainDir, f));
      console.log(`Synced ${f} -> brain artifact`);
    }
  }

  console.log("Closing browser and Vite server...");
  await browser.close();
  await server.close();
  console.log("=== PROGRESSION CAPTURE COMPLETE ===");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
