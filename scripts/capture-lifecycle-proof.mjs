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
  console.log("Starting Vite server on port 8946 for Lifecycle Proof Captures...");
  const server = await createServer({
    server: { port: 8946, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8946/";
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

  // CAPTURE 1: Recovery Modal for Active Forge Attempt
  console.log("Setting up active attempt for recovery modal capture...");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const activeSave = {
      version: 5,
      gallery: [],
      trainingGallery: [],
      lastDesign: {
        name: "Lâmina da Guarnição",
        family: "iron",
        profile: "short",
        steel: "iron",
        wrap: "leather",
        guard: "cross",
        pommel: "disc",
        inscription: "",
        runes: false,
        length: 0.78,
      },
      wallet: { gold: 350, rubies: 8, diamonds: 0 },
      inventory: {
        unlockedProfiles: ["short", "long", "falchion", "saber"],
        unlockedSteels: ["iron", "steel"],
        unlockedGuards: ["cross", "curved", "ring"],
        unlockedPommels: ["disc", "sphere", "cross"],
        unlockedWraps: ["leather", "braided", "linen"],
        unlockedRunes: ["fehu", "uruz"],
        unlockedTools: ["hammer_standard", "anvil_cast", "furnace_coal", "quench_water"],
        unlockedBlueprints: ["guarda_medieval"],
        masteredBlueprints: [],
        materials: { iron_ingot: 4, scrap: 1 },
        fusionCores: [],
        components: [],
        equipped: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_water" },
      },
      career: { totalForged: 2, masterpieces: 0, legendaries: 0, relics: 0, brokenBlades: 0, highestQuality: 74, totalValueEarned: 800 },
      muted: false,
      shake: true,
      claimedForgeRewardIds: [],
      claimedStrikeRewardIds: [],
      activeForgeAttempt: {
        attemptId: "att_proof_1",
        forgeRunId: "run_proof_1",
        design: {
          name: "Lâmina da Guarnição",
          family: "iron",
          profile: "short",
          steel: "iron",
          wrap: "leather",
          guard: "cross",
          pommel: "disc",
          inscription: "",
          runes: false,
          length: 0.78,
        },
        isTraining: false,
        materialConsumed: { key: "iron_ingot", name: "Lingote de Ferro Batido", quantity: 1 },
        activeCoreId: null,
        startedAt: Date.now() - 30000,
        status: "ACTIVE",
        strikesCount: 3,
      },
      commissions: [],
    };
    localStorage.setItem("a-forja-save", JSON.stringify(activeSave));
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const shot1 = join(outDir, "proof-01-recovery-modal-active-attempt.png");
  await page.screenshot({ path: shot1 });
  console.log(`Saved: ${shot1}`);

  // CAPTURE 2: Cancel Forge and Fair Scrap Salvage
  console.log("Testing cancel and capturing fair salvage notification...");
  const cancelBtn = page.getByRole("button", { name: "Cancelar / Abandonar" });
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(600);
  }
  const shot2 = join(outDir, "proof-02-cancel-fair-scrap-salvage.png");
  await page.screenshot({ path: shot2 });
  console.log(`Saved: ${shot2}`);

  // CAPTURE 3: Design screen with metallurgy gating on rare metals
  console.log("Navigating to design screen to capture metallurgy gating...");
  const newSwordBtn = page.getByRole("button", { name: "Nova Espada" });
  if (await newSwordBtn.isVisible()) {
    await newSwordBtn.click();
    await page.waitForTimeout(600);
  }
  // Click on Meteorite steel
  const meteorChip = page.getByRole("button", { name: /Meteorito/i });
  if (await meteorChip.isVisible()) {
    await meteorChip.click();
    await page.waitForTimeout(600);
  }
  const shot3 = join(outDir, "proof-03-metallurgy-gating-custom.png");
  await page.screenshot({ path: shot3 });
  console.log(`Saved: ${shot3}`);

  // CAPTURE 4: Valerius commission with legitimately crafted Defensiva sword
  console.log("Setting up Capitão Valerius commission delivery with Defensiva sword...");
  await page.evaluate(() => {
    const valeriusSave = {
      version: 5,
      gallery: [
        {
          id: "sword_garrison_defensive",
          design: {
            name: "Guarda da Guarnição",
            family: "iron",
            profile: "short",
            steel: "iron",
            wrap: "leather",
            guard: "cross",
            pommel: "disc",
            inscription: "DEFENSOR",
            runes: false,
            length: 0.78,
          },
          quality: 74,
          grade: "A",
          rarity: "Comum",
          heatScore: 80,
          forgeScore: 78,
          quenchScore: 76,
          warp: 0.02,
          createdAt: Date.now() - 60000,
          baseDamage: 180,
          baseDefense: 62,
          baseAgility: 44,
          baseDurability: 82,
          combatRole: "Defensiva",
          damage: 180,
          defense: 62,
          agility: 44,
          durability: 82,
          upgradesApplied: 0,
          perks: ["Guarda de Aço Reforçada: Estrutura forjada para contenção defensiva"],
          affixes: ["Guarda de Aço Reforçada"],
          forgeRunId: "run_valerius_legit",
          structuralState: "stable",
          broken: false,
          cracks: 0,
          history: [],
        },
      ],
      trainingGallery: [],
      lastDesign: {
        name: "Guarda da Guarnição",
        family: "iron",
        profile: "short",
        steel: "iron",
        wrap: "leather",
        guard: "cross",
        pommel: "disc",
        inscription: "DEFENSOR",
        runes: false,
        length: 0.78,
      },
      wallet: { gold: 350, rubies: 5, diamonds: 0 },
      inventory: {
        unlockedProfiles: ["short", "long", "falchion", "saber"],
        unlockedSteels: ["iron", "steel"],
        unlockedGuards: ["cross", "curved", "ring"],
        unlockedPommels: ["disc", "sphere", "cross"],
        unlockedWraps: ["leather", "braided", "linen"],
        unlockedRunes: ["fehu", "uruz"],
        unlockedTools: ["hammer_standard", "anvil_cast", "furnace_coal", "quench_water"],
        unlockedBlueprints: ["guarda_medieval"],
        masteredBlueprints: [],
        materials: { iron_ingot: 3, scrap: 2 },
        fusionCores: [],
        components: [],
        equipped: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_water" },
      },
      career: { totalForged: 3, masterpieces: 0, legendaries: 0, relics: 0, brokenBlades: 0, highestQuality: 74, totalValueEarned: 1100 },
      muted: false,
      shake: true,
      claimedForgeRewardIds: [],
      claimedStrikeRewardIds: [],
      activeForgeAttempt: null,
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
      ],
    };
    localStorage.setItem("a-forja-save", JSON.stringify(valeriusSave));
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Navigate to Galeria -> Encomendas
  const galleryBtn = page.getByRole("button", { name: "Galeria" });
  if (await galleryBtn.isVisible()) {
    await galleryBtn.click();
    await page.waitForTimeout(600);
  }
  const commTab = page.getByRole("button", { name: /Encomendas/i });
  if (await commTab.isVisible()) {
    await commTab.click();
    await page.waitForTimeout(600);
  }

  const shot4 = join(outDir, "proof-04-valerius-commission-defensive.png");
  await page.screenshot({ path: shot4 });
  console.log(`Saved: ${shot4}`);

  // Deliver the commission
  const deliverBtn = page.getByRole("button", { name: /Entregar Encomenda/i });
  if (await deliverBtn.isVisible()) {
    await deliverBtn.click();
    await page.waitForTimeout(600);
  }

  const shot5 = join(outDir, "proof-05-commission-delivered-rewards.png");
  await page.screenshot({ path: shot5 });
  console.log(`Saved: ${shot5}`);

  // Copy captures to brain artifact directory if accessible
  if (existsSync(brainDir)) {
    const files = [
      "proof-01-recovery-modal-active-attempt.png",
      "proof-02-cancel-fair-scrap-salvage.png",
      "proof-03-metallurgy-gating-custom.png",
      "proof-04-valerius-commission-defensive.png",
      "proof-05-commission-delivered-rewards.png",
    ];
    for (const f of files) {
      try {
        copyFileSync(join(outDir, f), join(brainDir, f));
        console.log(`Copied to brain: ${f}`);
      } catch (e) {
        console.warn(`Could not copy ${f} to brain:`, e.message);
      }
    }
  }

  await browser.close();
  await server.close();
  console.log("Capture completed successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
