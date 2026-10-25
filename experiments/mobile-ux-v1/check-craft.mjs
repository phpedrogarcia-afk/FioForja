// Companion-only UI proof; no original app, save, transactions or device control.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("./evidence/craft/", import.meta.url));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
const context = await browser.newContext({ viewport: { width: 392, height: 819 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
const nav = name => page.getByRole("navigation").getByRole("button", { name, exact: true });
const observations = [];
async function measure(name) {
  const value = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight, devicePixelRatio], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    storage: { local: Object.keys(localStorage), session: Object.keys(sessionStorage) },
    slots: [...document.querySelectorAll(".craft-slot")].map(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }),
    canvas: [...document.querySelectorAll(".craft-page:not([hidden]) canvas")].map(c => { const p = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let l=c.width,t=c.height,r=-1,b=-1; for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>8){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);} return { hasInk:r>=0, margin:Math.min(l,t,c.width-r-1,c.height-b-1) }; }),
  }));
  assert.ok(value.document[0] <= 392, "no horizontal page overflow");
  assert.equal(value.storage.local.length + value.storage.session.length, 0, "no persistence");
  observations.push({ name, ...value });
}

try {
  await page.goto("http://127.0.0.1:8951/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "O Crisol", exact: true }).waitFor();
  assert.equal(await nav("Craft").getAttribute("aria-current"), "page");
  assert.equal(await nav("Jogador").count(), 0);
  assert.equal(await page.getByRole("button", { name: /Revisar fusão/ }).isDisabled(), true);
  await shot("01-empty"); await measure("empty");
  await page.getByRole("button", { name: "Selecionar espada 1", exact: true }).click();
  await page.getByRole("button", { name: /Selecionar doadora, qualidade 91,/ }).click();
  await page.getByRole("button", { name: /Selecionar doadora, qualidade 93,/ }).click();
  await page.getByRole("button", { name: "Próximas doadoras", exact: true }).click();
  await page.getByRole("button", { name: /Selecionar doadora, qualidade 87,/ }).click();
  await page.getByRole("button", { name: /Selecionar doadora, qualidade 91,/ }).click();
  await shot("02-picker");
  await page.getByRole("button", { name: "Próximas doadoras", exact: true }).click();
  const lastButtons = page.locator(".candidate-caption .secondary");
  assert.equal(await lastButtons.nth(0).isDisabled(), true);
  assert.equal(await lastButtons.nth(1).isDisabled(), true);
  await page.getByRole("button", { name: /Usar seleção/ }).click();
  await page.locator(".craft-slot canvas").first().waitFor();
  await shot("03-selected"); await measure("selected");
  const selectedMeasure = observations.at(-1);
  assert.equal(selectedMeasure.canvas.length, 4);
  assert.ok(selectedMeasure.canvas.every(c => c.hasInk && c.margin > 0), "four swords fit their canvases");
  assert.ok(selectedMeasure.slots[2].y > selectedMeasure.slots[0].y && selectedMeasure.slots[1].x > selectedMeasure.slots[0].x, "2 by 2 slots");
  assert.match(await page.locator(".craft-odds").innerText(), /50/);
  await page.getByRole("checkbox", { name: "Catalisador" }).check();
  assert.match(await page.locator(".craft-odds").innerText(), /35/);
  await page.getByRole("checkbox", { name: "Catalisador" }).uncheck();
  await page.getByRole("button", { name: "Inspecionar doadora 1, qualidade 91", exact: true }).click();
  await page.getByRole("heading", { name: "Inspecionar doadora", exact: true }).waitFor();
  await shot("04-inspection");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: /Revisar fusão/ }).click();
  await page.getByRole("heading", { name: "Confirmar as quatro doadoras", exact: true }).waitFor();
  assert.equal(await page.locator(".craft-review-list details").count(), 4);
  await page.locator(".craft-review-list summary").first().click();
  await shot("05-confirmation");
  await page.getByRole("button", { name: "Voltar à seleção", exact: true }).click();
  assert.equal(await page.locator(".craft-slot canvas").count(), 4);
  await page.getByRole("button", { name: /Revisar fusão/ }).click();
  // Rapid repeated activation must create exactly one in-memory core.
  await page.getByRole("button", { name: "Confirmar fusão de demonstração", exact: true }).evaluate(el => { el.click(); el.click(); });
  await page.getByRole("button", { name: "Guardar núcleo", exact: true }).waitFor();
  await page.locator(".core-art").evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  await shot("06-core"); await measure("revealed");
  await page.getByRole("button", { name: "Guardar núcleo", exact: true }).click();
  assert.equal(await page.locator(".stored-cores .text-button").count(), 1);
  await nav("Coleção").click(); await nav("Craft").click();
  assert.equal(await page.locator(".stored-cores .text-button").count(), 1);
  await page.locator(".stored-cores .text-button").click();
  await page.getByText(/O núcleo continua guardado na demonstração/).waitFor();
  await shot("07-forge-preview");
  await page.getByRole("tab", { name: /Montagem/ }).click();
  assert.equal(await page.getByRole("button", { name: "Aplicação do núcleo ainda não conectada", exact: true }).isDisabled(), true);
  await nav("Craft").click();
  await page.getByRole("tab", { name: "Componentes", exact: true }).click();
  await shot("08-components");
  await nav("Início").click();
  await page.getByRole("button", { name: "Seu perfil e progresso", exact: true }).click();
  await page.getByText(/Carreira · Conquistas · Encomendas · Configurações/).waitFor();
  await nav("Craft").click();
  await page.getByRole("tab", { name: "Espadas", exact: true }).click();
  await page.getByRole("button", { name: "Recomeçar demonstração", exact: true }).click();
  await measure("reset");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".stored-cores .text-button").count(), 0);
  await measure("reload");
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/observations.json`, JSON.stringify({ result:"PASS", errors, observations }, null, 2));
  console.log(JSON.stringify({ result:"PASS", scenarios:18, viewport:"392x819 @2.75", evidence:out, errors }));
} catch (error) {
  await shot("failure"); throw error;
} finally { await browser.close(); }
