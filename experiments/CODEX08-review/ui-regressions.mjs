import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { defaultSaveData } from "../../src/game/save.ts";
import { recalculateSwordStats } from "../../src/game/catalog.ts";

// Focused browser regression proof. Uses an isolated browser save, never the user's save.
const baseUrl = process.env.FIOFORJA_REVIEW_URL || "http://127.0.0.1:8953/";
const design = { ...defaultSaveData.lastDesign, name: "Obra preservada" };
const sword = (id, name) => recalculateSwordStats({
  id, design: { ...design, name }, quality: 93, grade: "Magistral", rarity: "Rara",
  heatScore: 85, forgeScore: 85, quenchScore: 85, warp: 0.02, createdAt: 1792800000000,
  baseDamage: 240, baseDefense: 210, baseAgility: 98, baseDurability: 98,
});
const seed = structuredClone(defaultSaveData);
seed.gallery = [sword("review_keep", "Obra preservada"), sword("review_deliver", "Arma para entrega")];
seed.wallet = { gold: 12000, rubies: 300, diamonds: 2 };
seed.inventory.materials = { iron_ingot: 5, steel_ingot: 5 };
seed.inventory.components = [];
seed.muted = true;
seed.commissions = [{
  id: "review_order", clientName: "Cliente da revisão", clientTitle: "Oficina de prova", icon: "📋",
  description: "Uma arma de prova, escolhida pelo ferreiro.", minQuality: 75,
  rewardGold: 100, completed: false,
}];
const browser = await chromium.launch({ headless: true, channel: process.env.FIOFORJA_BROWSER_CHANNEL || "msedge" });
const report = { baseUrl, viewport: { width: 392, height: 819 }, checks: [] };
async function check(name, run) {
  const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
  await context.addInitScript((save) => {
    if (!sessionStorage.getItem("review-seeded")) {
      localStorage.setItem("a-forja-save", JSON.stringify(save));
      sessionStorage.setItem("review-seeded", "1");
    }
  }, seed);
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await run(page, page.locator('nav[aria-label="Seções principais"]'));
    report.checks.push({ name, result: "PASS" });
  } catch (error) {
    report.checks.push({ name, result: "FAIL", error: error.message });
  } finally { await context.close(); }
}
try {
  await check("buy, equip and restore workshop tools", async (page, nav) => {
    await nav.getByRole("button", { name: "Loja", exact: true }).click();
    await page.getByRole("tab", { name: /Ferramentas/ }).click();
    await page.getByRole("button", { name: /Bigorna do Mestre Forjador/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Comprar por/ }).click();
    await page.getByRole("button", { name: "Equipar Bigorna do Mestre Forjador", exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("a-forja-save")).inventory.equipped.anvil), "anvil_master");
    await page.reload({ waitUntil: "networkidle" });
    await nav.getByRole("button", { name: "Loja", exact: true }).click();
    await page.getByRole("tab", { name: /Ferramentas/ }).click();
    await page.getByRole("button", { name: "Equipar Bigorna de Ferro Fundido", exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("a-forja-save")).inventory.equipped.anvil), "anvil_cast");
  });
  await check("inspection shop link dismisses hidden portal and preserves inspection", async (page, nav) => {
    await nav.getByRole("button", { name: "Coleção", exact: true }).click();
    await page.getByRole("button", { name: /Obra preservada/ }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Instalar", exact: true }).first().click();
    await dialog.getByRole("button", { name: "Comprar na Loja", exact: true }).click();
    await page.getByRole("tab", { name: /Metais e materiais/ }).waitFor({ state: "visible" });
    assert.equal(await page.getByRole("dialog").count(), 0);
    await nav.getByRole("button", { name: "Coleção", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Obra preservada", exact: true }).waitFor();
  });
  await check("commission chooses second sword and retains fulfilled history", async (page) => {
    await page.getByRole("button", { name: /Encomendas.*em aberto/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Arma para Cliente da revisão" }).selectOption("review_deliver");
    await dialog.getByRole("button", { name: /Entregar Arma para entrega/ }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("a-forja-save")));
    assert.equal(saved.commissions[0].deliveredSwordId, "review_deliver");
    assert.equal(saved.gallery.find((s) => s.id === "review_keep").commissionDelivered, undefined);
    await dialog.getByRole("heading", { name: "Encomendas cumpridas", exact: true }).waitFor();
    await dialog.getByText(/Arma para entrega.*Q93/).waitFor();
  });
  await check("refinement shows canonical cost and actual capped effect before debit", async (page, nav) => {
    await nav.getByRole("button", { name: "Coleção", exact: true }).click();
    await page.getByRole("button", { name: /Obra preservada/ }).click();
    const dialog = page.getByRole("dialog");
    const refine = dialog.getByRole("button", { name: /Refinar/ });
    await dialog.getByText(/60 ouro/).waitFor();
    await dialog.getByText(/\+8 ATK.*\+2 DUR/).waitFor();
    await refine.click();
    await dialog.getByText(/120 ouro.*1 rubi/).waitFor();
    await dialog.getByText(/\+8 ATK.*\+0 DUR/).waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("a-forja-save")));
    assert.equal(saved.wallet.gold, seed.wallet.gold - 60);
    assert.equal(saved.gallery[0].durability, 100);
  });
} finally {
  await browser.close();
  report.result = report.checks.every((check) => check.result === "PASS") ? "PASS" : "FAIL";
  await mkdir(new URL("./", import.meta.url), { recursive: true });
  await writeFile(new URL(`./ui-regressions-${process.env.FIOFORJA_PROOF_PHASE || "latest"}.json`, import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (report.result !== "PASS") process.exitCode = 1;
}
