// Focused check of the two fixes made after the first APK: visibility-safe forge
// preview and localized structural state. Uses the same 392x819 viewport.
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const design = {
  name: "Lâmina de Prova",
  family: "royal",
  profile: "long",
  steel: "steel",
  guard: "cross",
  pommel: "disc",
  wrap: "leather",
  inscription: "",
  runes: false,
  length: 1,
};
const save = {
  version: 5,
  gallery: [{
    id: "fx_one",
    design,
    quality: 93,
    grade: "Magistral",
    heatScore: 85,
    forgeScore: 85,
    quenchScore: 85,
    warp: 0.02,
    createdAt: 1761300000000,
    damage: 240,
    defense: 210,
    agility: 98,
    durability: 100,
    baseDamage: 240,
    baseDefense: 210,
    baseAgility: 98,
    baseDurability: 100,
    rarity: "Rara",
    forgeRunId: "fx_run",
  }],
  trainingGallery: [],
  lastDesign: design,
  wallet: { gold: 1000, rubies: 10, diamonds: 1 },
  inventory: {
    unlockedProfiles: ["long"],
    unlockedSteels: ["iron", "steel"],
    unlockedGuards: ["cross"],
    unlockedPommels: ["disc"],
    unlockedWraps: ["leather"],
    unlockedRunes: [],
    unlockedTools: ["hammer_standard", "anvil_cast", "furnace_coal", "quench_water"],
    unlockedBlueprints: ["guarda_medieval"],
    masteredBlueprints: [],
    materials: { iron_ingot: 5, steel_ingot: 5 },
    fusionCores: [],
    components: [],
    equipped: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_water" },
  },
  career: { totalForged: 1, masterpieces: 0, legendaries: 0, relics: 0, brokenBlades: 0, highestQuality: 93, totalValueEarned: 100 },
  muted: true,
  shake: true,
  claimedForgeRewardIds: [],
  claimedStrikeRewardIds: [],
  activeForgeAttempt: null,
};

const browser = await chromium.launch({ headless: true, channel: process.env.FIOFORJA_BROWSER_CHANNEL || "msedge" });
const context = await browser.newContext({ viewport: { width: 392, height: 819 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, locale: "pt-BR" });
await context.addInitScript((seed) => {
  if (!sessionStorage.getItem("fio-check-seeded")) {
    localStorage.setItem("a-forja-save", JSON.stringify(seed));
    sessionStorage.setItem("fio-check-seeded", "1");
  }
}, save);
const page = await context.newPage();
const result = { result: "FAIL" };
try {
  await page.goto("http://127.0.0.1:8952/", { waitUntil: "networkidle" });
  const nav = page.locator('nav[aria-label="Seções principais"]');
  await nav.getByRole("button", { name: "Coleção", exact: true }).click();
  await page.locator("main button").filter({ hasText: "Lâmina de Prova" }).first().click();
  const stateText = await page.locator('[role="dialog"]').getByText(/Estado:/).innerText();
  result.stateText = stateText;
  result.stateLocalized = stateText.includes("estável");
  await page.keyboard.press("Escape");

  await nav.getByRole("button", { name: "Forja", exact: true }).click();
  await page.waitForTimeout(1200);
  const painted = await page.locator("main canvas").first().evaluate((canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return { ok: false, reason: "no-context" };
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonTransparent = 0;
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 8) {
          nonTransparent++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { ok: nonTransparent > 5000 && maxY - minY > canvas.height * 0.4, nonTransparent, bounds: { minX, maxX, minY, maxY }, width: canvas.width, height: canvas.height };
  });
  result.forgeCanvas = painted;
  result.result = result.stateLocalized && painted.ok ? "PASS" : "FAIL";
  await page.screenshot({ path: join(here, "evidence", "final-check-forge.png") });
} catch (error) {
  result.error = String(error);
} finally {
  await writeFile(join(here, "final-check.json"), JSON.stringify(result, null, 2));
  await browser.close();
  if (result.result !== "PASS") process.exitCode = 1;
}
