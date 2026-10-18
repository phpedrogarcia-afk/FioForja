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
  console.log("Starting Vite server on port 8944 for Prestige Captures...");
  const server = await createServer({
    server: { port: 8944, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8944/";
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

  // Set up mock SaveData with the 5 canonical benchmark weapons
  await page.evaluate(async () => {
    const canonicalSwords = [
      {
        id: "sword_canonical_01",
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
        quality: 86,
        grade: "Mestre",
        rarity: "Comum",
        combatRole: "Equilibrada",
        heatScore: 88,
        forgeScore: 86,
        quenchScore: 88,
        warp: 0.015,
        createdAt: Date.now() - 600000,
        damage: 172,
        defense: 135,
        agility: 88,
        durability: 89,
        baseDamage: 172,
        baseDefense: 135,
        baseAgility: 88,
        baseDurability: 89,
        upgradesApplied: 0,
        flaws: [],
        perks: ["Alinhamento Perfeito: Centro de massa ideal"],
        affixes: ["Lâmina Fiel do Sentinela"],
        structuralState: "stable",
        broken: false,
        cracks: 0,
        forgeRunId: "run_bench_01",
        claimedRewards: true,
      },
      {
        id: "sword_canonical_02",
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
        quality: 94,
        grade: "Magistral",
        rarity: "Lendária",
        combatRole: "Ofensiva",
        heatScore: 92,
        forgeScore: 95,
        quenchScore: 94,
        warp: 0.01,
        createdAt: Date.now() - 500000,
        damage: 288,
        defense: 138,
        agility: 96,
        durability: 94,
        baseDamage: 288,
        baseDefense: 138,
        baseAgility: 96,
        baseDurability: 94,
        upgradesApplied: 1,
        flaws: [],
        perks: ["Dobra Perfeita: Elasticidade superior", "Gume de Obra-prima: Corte sem atrito"],
        affixes: ["Padrão Moiré Natural", "Corte sem Atrito"],
        structuralState: "stable",
        broken: false,
        cracks: 0,
        forgeRunId: "run_bench_02",
        claimedRewards: true,
      },
      {
        id: "sword_canonical_03",
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
        quality: 96,
        grade: "Obra-prima",
        rarity: "Lendária",
        combatRole: "Ágil",
        heatScore: 96,
        forgeScore: 95,
        quenchScore: 97,
        warp: 0.005,
        createdAt: Date.now() - 400000,
        damage: 232,
        defense: 104,
        agility: 182,
        durability: 90,
        baseDamage: 232,
        baseDefense: 104,
        baseAgility: 182,
        baseDurability: 90,
        upgradesApplied: 1,
        flaws: [],
        perks: ["Coração de Grafite: Retenção extrema de fio navalha", "Gume de Obra-prima: Corte sem atrito"],
        affixes: ["Lampejo Veloz da Lua", "Fio Navalha Puro"],
        structuralState: "stable",
        broken: false,
        cracks: 0,
        forgeRunId: "run_bench_03",
        claimedRewards: true,
      },
      {
        id: "sword_canonical_04",
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
        quality: 95,
        grade: "Obra-prima",
        rarity: "Lendária",
        combatRole: "Excepcional",
        heatScore: 94,
        forgeScore: 95,
        quenchScore: 96,
        warp: 0.008,
        createdAt: Date.now() - 300000,
        damage: 268,
        defense: 142,
        agility: 154,
        durability: 95,
        baseDamage: 268,
        baseDefense: 142,
        baseAgility: 154,
        baseDurability: 95,
        upgradesApplied: 1,
        flaws: [],
        perks: ["Prata Sagrada: Leveza espectral e equilíbrio etéreo", "Ressonância Rúnica: Lâmina desperta"],
        affixes: ["Aura de Aereth", "Ressonância Etérea"],
        structuralState: "stable",
        broken: false,
        cracks: 0,
        forgeRunId: "run_bench_04",
        claimedRewards: true,
      },
      {
        id: "sword_canonical_05",
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
        quality: 99,
        grade: "Obra-prima Lendária",
        rarity: "Lendária",
        combatRole: "Excepcional",
        heatScore: 98,
        forgeScore: 99,
        quenchScore: 98,
        warp: 0.003,
        createdAt: Date.now() - 200000,
        damage: 312,
        defense: 148,
        agility: 162,
        durability: 98,
        baseDamage: 312,
        baseDefense: 148,
        baseAgility: 162,
        baseDurability: 98,
        upgradesApplied: 2,
        flaws: [],
        perks: ["Pó Meteórico: Dureza estelar", "Gume de Obra-prima: Corte sem atrito", "Ressonância Rúnica: Lâmina desperta"],
        affixes: ["Luz Azul Celeste", "Dureza Astral"],
        structuralState: "stable",
        broken: false,
        cracks: 0,
        forgeRunId: "run_bench_05",
        claimedRewards: true,
      },
    ];

    const mockSave = {
      version: 5,
      gallery: canonicalSwords,
      wallet: { gold: 12500, rubies: 45, diamonds: 8 },
      inventory: {
        materials: {
          iron: 12,
          steel: 8,
          damascus: 5,
          blacksteel: 4,
          elven_silver: 3,
          meteor: 2,
          ancient_alloy: 1,
          catalyst_astral: 4,
          fusion_fragment: 18,
        },
        components: [
          {
            id: "comp_tsuba_01",
            name: "Tsuba Oriental Cinzelada",
            category: "guard",
            componentKey: "guard_tsuba",
            rarity: "Rara",
            icon: "🔘",
            description: "Disco tradicional de balanceamento.",
            statModifier: { agilityBonus: 14, defenseBonus: 8 },
            acquiredAt: Date.now(),
          },
          {
            id: "comp_tiwaz_01",
            name: "Pedra Rúnica Tiwaz",
            category: "rune",
            componentKey: "rune_tiwaz",
            rarity: "Relíquia",
            icon: "ᛏ",
            description: "Tiwaz — A lâmina nunca curva ou recua.",
            statModifier: { damageBonus: 25, defenseBonus: 20, durabilityBonus: 15 },
            acquiredAt: Date.now(),
          },
        ],
        equippedGear: {
          hammer: "standard",
          anvil: "anvil_cast",
          furnace: "furnace_coal",
          quench: "quench_water",
        },
        fusionCores: [],
        unlockedHammers: ["standard", "heavy_crosspeen"],
        unlockedAnvils: ["anvil_cast", "anvil_master"],
        unlockedFurnaces: ["furnace_coal", "furnace_blast"],
        unlockedQuenches: ["quench_water", "quench_oil"],
        unlockedProfiles: ["long", "claymore", "falchion", "saber", "katana", "elven_blade", "relic_blade"],
      },
      career: {
        totalForged: 5,
        totalStrikes: 68,
        reheatsUsed: 12,
        flawlessForges: 4,
        masterpieces: 3,
        brokenBlades: 0,
        highestQuality: 99,
        legendaries: 4,
        relics: 0,
        totalFusions: 0,
      },
      claimedForgeRewardIds: ["run_bench_01", "run_bench_02", "run_bench_03", "run_bench_04", "run_bench_05"],
      claimedStrikeRewardIds: [],
    };

    localStorage.setItem("a-forja-save", JSON.stringify(mockSave));
    localStorage.setItem("a-forja-save-backup", JSON.stringify(mockSave));
  });

  // Reload page so it picks up the populated save
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Navigate to Arsenal / Galeria
  console.log("Navigating to Arsenal / Galeria...");
  const arsenalBtn = page.getByRole("button", { name: /arsenal/i }).first();
  if (await arsenalBtn.isVisible()) {
    await arsenalBtn.click();
    await page.waitForTimeout(600);
  }

  // CAPTURE 1: Gallery with 5 benchmark weapons
  const shotGallery = join(outDir, "prestige-01-canonical-5-weapons-gallery.png");
  await page.screenshot({ path: shotGallery });
  console.log(`Captured: ${shotGallery}`);
  if (existsSync(brainDir)) copyFileSync(shotGallery, join(brainDir, "prestige-01-canonical-5-weapons-gallery.png"));

  // CAPTURE 2: Velvet inspection of Cimitarra de Damasco
  console.log("Opening Velvet Inspection for Cimitarra de Damasco...");
  const damascusCard = page.locator("h3", { hasText: "Cimitarra de Damasco" }).first();
  if (await damascusCard.isVisible()) {
    await damascusCard.click();
    await page.waitForTimeout(600);

    const shotDamascus = join(outDir, "prestige-02-velvet-inspection-damascus.png");
    await page.screenshot({ path: shotDamascus });
    console.log(`Captured: ${shotDamascus}`);
    if (existsSync(brainDir)) copyFileSync(shotDamascus, join(brainDir, "prestige-02-velvet-inspection-damascus.png"));

    // Close velvet inspection
    const backBtn = page.getByRole("button", { name: /ver no arsenal|voltar ao arsenal/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // CAPTURE 3: Velvet inspection of Queda de Asterion (Meteórica)
  console.log("Opening Velvet Inspection for Queda de Asterion...");
  const asterionCard = page.locator("h3", { hasText: "Queda de Asterion" }).first();
  if (await asterionCard.isVisible()) {
    await asterionCard.click();
    await page.waitForTimeout(600);

    const shotAsterion = join(outDir, "prestige-03-velvet-inspection-asterion.png");
    await page.screenshot({ path: shotAsterion });
    console.log(`Captured: ${shotAsterion}`);
    if (existsSync(brainDir)) copyFileSync(shotAsterion, join(brainDir, "prestige-03-velvet-inspection-asterion.png"));

    const backBtn = page.getByRole("button", { name: /ver no arsenal|voltar ao arsenal/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // CAPTURE 4: Weapon Comparison Modal (Cimitarra de Damasco vs Lua Silenciosa)
  console.log("Activating Weapon Comparison Mode...");
  const compareToggleBtn = page.getByRole("button", { name: /comparar lâminas/i }).first();
  if (await compareToggleBtn.isVisible()) {
    await compareToggleBtn.click();
    await page.waitForTimeout(300);

    // Select Slot A: Cimitarra de Damasco
    const swordA = page.locator("li", { hasText: "Cimitarra de Damasco" }).first();
    await swordA.click();
    await page.waitForTimeout(250);

    // Select Slot B: Lua Silenciosa
    const swordB = page.locator("li", { hasText: "Lua Silenciosa" }).first();
    await swordB.click();
    await page.waitForTimeout(300);

    // Click "Comparar Lado a Lado"
    const openCompareBtn = page.getByRole("button", { name: /comparar lado a lado|abrir comparador detalhado/i }).first();
    if (await openCompareBtn.isVisible()) {
      await openCompareBtn.click();
      await page.waitForTimeout(600);

      const shotCompare = join(outDir, "prestige-04-weapon-comparison-modal.png");
      await page.screenshot({ path: shotCompare });
      console.log(`Captured: ${shotCompare}`);
      if (existsSync(brainDir)) copyFileSync(shotCompare, join(brainDir, "prestige-04-weapon-comparison-modal.png"));

      // Close modal
      const closeCompare = page.locator("div[role='dialog'] button:has-text('Concluir Comparação')");
      if (await closeCompare.isVisible()) {
        await closeCompare.click();
        await page.waitForTimeout(400);
      }
    }

    // Cancel compare mode
    const cancelCompare = page.getByRole("button", { name: /cancelar comparação/i });
    if (await cancelCompare.isVisible()) {
      await cancelCompare.click();
      await page.waitForTimeout(400);
    }
  }

  // CAPTURE 5: Expanded Medieval Bazaar Screen
  console.log("Navigating to Medieval Bazaar (Oficina)...");
  const bazaarTab = page.locator("nav button:has-text('Oficina')").first();
  if (await bazaarTab.isVisible()) {
    await bazaarTab.click();
    await page.waitForTimeout(500);

    // Click "Guarnições & Peças"
    const componentsCat = page.locator("button:has-text('Guarnições & Peças')").first();
    if (await componentsCat.isVisible()) {
      await componentsCat.click();
      await page.waitForTimeout(400);
    }

    const shotBazaar = join(outDir, "prestige-05-medieval-bazaar-expanded.png");
    await page.screenshot({ path: shotBazaar });
    console.log(`Captured: ${shotBazaar}`);
    if (existsSync(brainDir)) copyFileSync(shotBazaar, join(brainDir, "prestige-05-medieval-bazaar-expanded.png"));

    // CAPTURE 6: Runas Futhark Category
    console.log("Viewing Runas Futhark Category in Bazaar...");
    const runesCat = page.locator("button:has-text('Runas Futhark')").first();
    if (await runesCat.isVisible()) {
      await runesCat.click();
      await page.waitForTimeout(400);

      const shotRunes = join(outDir, "prestige-06-bazaar-runes-futhark.png");
      await page.screenshot({ path: shotRunes });
      console.log(`Captured: ${shotRunes}`);
      if (existsSync(brainDir)) copyFileSync(shotRunes, join(brainDir, "prestige-06-bazaar-runes-futhark.png"));
    }
  }

  await browser.close();
  await server.close();
  console.log("Prestige screenshot captures successfully finished!");
}

run().catch((err) => {
  console.error("Capture execution failed:", err);
  process.exit(1);
});
