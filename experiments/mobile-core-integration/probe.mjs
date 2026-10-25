// Evidence probe: real GameApp in a Chromium/WebView-shaped viewport.
// The save below is an EXPLICIT TEST FIXTURE (four forged Rara swords). It is
// never presented as naturally earned progression.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDir = join(here, "evidence");
await mkdir(evidenceDir, { recursive: true });

const design = (name) => ({
  name,
  family: "royal",
  profile: "long",
  steel: "steel",
  guard: "cross",
  pommel: "disc",
  wrap: "leather",
  inscription: "",
  runes: false,
  length: 1,
});

const fixtureSwords = [
  { id: "fx_rara_72", name: "Lâmina de Prova 72", quality: 72, atk: 268, def: 170, agi: 137, dur: 78 },
  { id: "fx_rara_85", name: "Lâmina de Prova 85", quality: 85, atk: 305, def: 186, agi: 145, dur: 83 },
  { id: "fx_rara_91", name: "Lâmina de Prova 91", quality: 91, atk: 323, def: 194, agi: 149, dur: 86 },
  { id: "fx_rara_96", name: "Lâmina de Prova 96", quality: 96, atk: 339, def: 202, agi: 153, dur: 89 },
].map((sword) => ({
  id: sword.id,
  design: design(sword.name),
  quality: sword.quality,
  grade: sword.quality >= 95 ? "Obra-prima" : sword.quality >= 88 ? "Magistral" : "Mestre",
  heatScore: 85,
  forgeScore: 85,
  quenchScore: 85,
  warp: 0.02,
  createdAt: 1761300000000 + sword.quality,
  damage: sword.atk,
  defense: sword.def,
  agility: sword.agi,
  durability: sword.dur,
  baseDamage: sword.atk,
  baseDefense: sword.def,
  baseAgility: sword.agi,
  baseDurability: sword.dur,
  rarity: "Rara",
  forgeRunId: "fx_run_" + sword.quality,
  perks: ["Traço de prova " + sword.quality],
}));

const save = {
  version: 5,
  gallery: fixtureSwords,
  trainingGallery: [],
  lastDesign: design("Lâmina de Prova 85"),
  wallet: { gold: 4000, rubies: 200, diamonds: 20 },
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
    materials: {
      iron_ingot: 6,
      steel_ingot: 5,
      damascus_billet: 0,
      starmetal_ore: 0,
      fusion_fragment: 0,
      catalyst_astral: 2,
      scrap: 0,
      refined_iron: 1,
    },
    fusionCores: [],
    components: [],
    equipped: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_water" },
  },
  career: { totalForged: 4, masterpieces: 1, legendaries: 0, relics: 0, brokenBlades: 0, highestQuality: 96, totalValueEarned: 3000 },
  muted: true,
  shake: true,
  claimedForgeRewardIds: [],
  claimedStrikeRewardIds: [],
  activeForgeAttempt: null,
};

const steps = [];
const report = { startedAt: new Date().toISOString(), fixture: "four Rara swords + gold", steps, errors: [] };

function logStep(name, detail = {}) {
  const entry = { name, at: Date.now(), ...detail };
  steps.push(entry);
  console.log("[STEP]", name, JSON.stringify(detail));
}

// Edge is installed on this machine; Playwright's bundled headless shell is not.
const browser = await chromium.launch({
  headless: true,
  channel: process.env.FIOFORJA_BROWSER_CHANNEL || "msedge",
});
const context = await browser.newContext({
  viewport: { width: 392, height: 819 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
});
await context.addInitScript((seed) => {
  // Seed exactly once per tab; reloads must read the save the game wrote.
  if (!sessionStorage.getItem("fioforja-probe-seeded")) {
    localStorage.setItem("a-forja-save", JSON.stringify(seed));
    sessionStorage.setItem("fioforja-probe-seeded", "1");
  }
}, save);
const page = await context.newPage();
page.on("pageerror", (error) => {
  report.errors.push(String(error));
  console.error("[PAGEERROR]", String(error));
});
page.on("console", (message) => {
  if (message.type() === "error") console.error("[CONSOLE]", message.text());
});

const nav = page.locator('nav[aria-label="Seções principais"]');
const navTo = (name) => nav.getByRole("button", { name, exact: true }).click();

const shot = async (name) => {
  await page.screenshot({ path: join(evidenceDir, name + ".png") });
};

const goldText = async () => {
  const header = page.locator('header [aria-label="Carteira"]');
  return (await header.innerText()).replace(/\s+/g, " ").trim();
};

try {
  await page.goto("http://127.0.0.1:8952/", { waitUntil: "networkidle" });
  await page.waitForSelector('nav[aria-label="Seções principais"]', { timeout: 20000 });
  const navLabels = await page.locator('nav[aria-label="Seções principais"] button').allInnerTexts();
  logStep("home loaded", { navLabels });
  await shot("01-home");

  // 1) Loja: compra uma guarda com ouro real
  await navTo("Loja");
  await page.getByRole("tab", { name: /Guardas/ }).click();
  const goldBefore = await goldText();
  await page.locator("button", { hasText: "Guarda Curva de Falchion" }).first().click();
  await page.getByRole("button", { name: /Comprar por/ }).click();
  await page.getByText(/entregue ao inventário/).first().waitFor({ timeout: 8000 });
  const goldAfter = await goldText();
  logStep("bought guard", { goldBefore, goldAfter });
  await shot("02-shop-purchase");

  // 2) Coleção: instala a guarda comprada numa espada e vê a defesa mudar
  await navTo("Coleção");
  const card = page.locator("main button").filter({ hasText: "Lâmina de Prova 85" }).first();
  await card.click();
  const dialog = page.locator('[role="dialog"]');
  const defBefore = await dialog.getByText("DEF", { exact: true }).first().locator("..").innerText();
  await page.getByRole("button", { name: "Instalar", exact: true }).first().click();
  await page.locator("button", { hasText: "Guarda Curva de Falchion" }).last().click();
  await page.getByText(/Peça instalada/).waitFor({ timeout: 8000 });
  const defAfter = await dialog.getByText("DEF", { exact: true }).first().locator("..").innerText();
  logStep("installed guard", { defBefore, defAfter });
  await shot("03-collection-installed");
  await page.keyboard.press("Escape");

  // 3) Craft: quatro Raras, mesma raridade, qualidades livres
  await navTo("Craft");
  await page.locator("button", { hasText: "Selecionar espada" }).first().click();
  for (const name of ["Lâmina de Prova 72", "Lâmina de Prova 85", "Lâmina de Prova 91", "Lâmina de Prova 96"]) {
    const row = page.locator("li").filter({ hasText: name }).first();
    await row.getByRole("button", { name: "Escolher" }).click();
  }
  await page.getByRole("button", { name: /Usar seleção/ }).click();
  const oddsText = await page.getByLabel("Probabilidades reais da fusão").innerText();
  logStep("four donors selected", { oddsText: oddsText.replace(/\n/g, " | ") });
  await shot("04-craft-donors");
  await page.getByRole("button", { name: /Revisar fusão/ }).click();
  await shot("05-craft-review");
  await page.getByRole("button", { name: /Confirmar fusão/ }).click();
  await page.getByText(/Núcleo ainda precisa ser forjado|ainda precisa ser forjado/i).first().waitFor({ timeout: 10000 });
  const revealSection = page.locator('[aria-label="Revelação do núcleo"]');
  const coreHeading = await revealSection.locator("h2").innerText();
  const coreRarity = await revealSection.locator("span").filter({ hasText: /^(Comum|Incomum|Rara|Épica|Lendária|Relíquia)$/ }).first().innerText();
  logStep("core revealed", { coreHeading, coreRarity });
  await shot("06-core-reveal");

  // 4) Guardar núcleo e recarregar
  await page.getByRole("button", { name: "Guardar núcleo" }).click();
  await page.getByText(/Núcleos no inventário · 1/).waitFor({ timeout: 8000 });
  logStep("core stored");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Craft" }).click();
  await page.getByText(/Núcleos no inventário · 1/).waitFor({ timeout: 10000 });
  logStep("core survived reload");

  // 5) Forjar agora → preparação com identidade travada
  await page.getByRole("button", { name: "Forjar", exact: true }).first().click();
  await page.getByText(/Núcleo de Fusão Ativo/).waitFor({ timeout: 10000 });
  await shot("07-forge-prep-core");
  const forgeCoreButton = page.getByRole("button", { name: /Forjar o Núcleo/ });
  await forgeCoreButton.scrollIntoViewIfNeeded();
  await forgeCoreButton.click();
  await page.waitForTimeout(2500);
  const navInForge = await page.locator('nav[aria-label="Seções principais"]').count();
  logStep("forge started", { navInForge, url: page.url() });
  await shot("08-forge-immersive");

  // 6) Saída segura pela barra: abre confirmação e continua
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByText("Sair da bigorna?").waitFor({ timeout: 5000 });
  await shot("09-forge-exit-confirm");
  await page.getByRole("button", { name: "Continuar martelando" }).click();
  await page.getByText("Sair da bigorna?").waitFor({ state: "hidden" });

  // 7) Joga a forja até concluir (entrada física, sem injetar resultado)
  await page.getByRole("button", { name: /Retirar do fogo/ }).click();
  await page.waitForTimeout(1200);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("forge canvas sem bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.55;
  let lastStrikes = -1;
  const readPhase = async () => {
    const texts = await page.locator("p").evaluateAll((nodes) => nodes.map((node) => (node.textContent || "").trim()));
    return texts.find((text) => /^(Aquecer|Martelar|Temperar)$/i.test(text)) || "";
  };
  const readStrikes = async () => {
    const texts = await page.locator("p").evaluateAll((nodes) => nodes.map((node) => (node.textContent || "").trim()));
    const value = texts.find((text) => /^\d\/8$/.test(text));
    return value ? Number(value.split("/")[0]) : lastStrikes;
  };
  for (let attempt = 0; attempt < 40; attempt++) {
    const phase = await readPhase();
    if (phase.toLowerCase() === "temperar") break;
    if (await page.getByText("Lâmina Quebrada").count()) throw new Error("fixture blade broke during automated strike loop");
    const reheat = page.getByRole("button", { name: /Reaquecer na fornalha/ });
    if (await reheat.count()) {
      await reheat.click();
      await page.waitForTimeout(1200);
    }
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(520);
    await page.mouse.up();
    await page.waitForTimeout(850);
    const strikes = await readStrikes();
    if (strikes !== lastStrikes) {
      logStep("strike", { strikes, phase });
      lastStrikes = strikes;
    }
    if (strikes >= 8) break;
  }
  await shot("10-forge-quench");
  for (let q = 0; q < 14; q++) {
    if (await page.getByRole("button", { name: /Ver no Arsenal/ }).count()) break;
    if ((await readPhase()).toLowerCase() === "temperar") {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForTimeout(1400);
      logStep("quench attempt", { q });
    } else {
      await page.waitForTimeout(500);
    }
  }
  await page.getByRole("button", { name: /Ver no Arsenal/ }).waitFor({ timeout: 30000 });
  logStep("reveal reached");
  await shot("11-weapon-reveal");

  // 8) Arsenal e reload final
  await page.getByRole("button", { name: /Ver no Arsenal/ }).click();
  await page.waitForTimeout(800);
  const arsenalCount = await page.locator("main").getByText(/arma\(s\) no Arsenal/).innerText();
  logStep("returned to arsenal", { arsenalCount });
  await shot("12-arsenal-after-forge");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Coleção" }).click();
  const persisted = await page.locator("main").getByText(/arma\(s\) no Arsenal/).innerText();
  logStep("arsenal survived reload", { persisted });

  report.result = "PASS";
} catch (error) {
  report.result = "FAIL";
  report.failure = String(error?.stack || error);
  console.error("[FAIL]", report.failure);
  await shot("99-failure").catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(join(evidenceDir, "probe-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  if (report.result !== "PASS") process.exitCode = 1;
}
