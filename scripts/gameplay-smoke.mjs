import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
const out = process.env.FIOFORJA_QA_DIR ?? "/tmp/fioforja-qa";
mkdirSync(out, { recursive: true });
const base = process.env.FIOFORJA_TEST_URL ?? "http://127.0.0.1:4173";
const server = process.env.FIOFORJA_TEST_URL
  ? null
  : spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
      stdio: "ignore",
      env: process.env,
    });
let browser;
const errors = [],
  checks = [];
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      // The dev server may still be starting; retry within the bounded startup window.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FIOFORJA_BROWSER_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // External template chrome and Google fonts are not gameplay dependencies.
  await context.route("https://grok.com/grok-app-builder/extensions.js", (r) =>
    r.fulfill({ status: 200, body: "" }),
  );
  await context.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Entrar na forja" }).click();
  await page.getByRole("button", { name: "Levar ao fogo" }).waitFor();
  await page.getByRole("button", { name: /^Ferro Perdoa/ }).click();
  await page.getByRole("checkbox", { name: "Gravar em runas" }).check();
  await page.getByLabel("Nome da lâmina").fill("Juramento QA");
  await page.screenshot({ path: `${out}/design-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "Levar ao fogo" }).click();
  await page.waitForFunction(() => {
    const m = document.querySelector('[aria-label="Temperatura"]');
    return Number(m?.getAttribute("aria-valuenow")) >= 66;
  });
  await page.getByRole("button", { name: "Retirar do fogo" }).click();
  await page.getByRole("meter", { name: "Força do martelo" }).waitFor();
  await page.screenshot({ path: `${out}/forge-mobile.png` });
  const stage = page.locator("canvas[aria-keyshortcuts]");
  // Exercise keyboard focus change while charging: keyup must always release.
  await stage.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(450);
  await page.keyboard.press("Tab");
  await page.keyboard.up("Space");
  await page.waitForTimeout(100);
  assert.equal(
    await page.getByRole("meter", { name: "Força do martelo" }).getAttribute("aria-valuenow"),
    "0",
  );
  checks.push("keyboard keyup releases after Tab focus change");
  for (let i = 1; i < 8; i++) {
    const reheat = page.getByRole("button", { name: "Reaquecer" });
    if (await reheat.isEnabled()) {
      await reheat.click();
      await page.waitForFunction(() =>
        document.querySelector(".hud-message")?.textContent?.includes("Reaquecendo"),
      );
      await page.waitForFunction(
        () => !document.querySelector(".hud-message")?.textContent?.includes("Reaquecendo"),
      );
    }
    await stage.focus();
    await page.keyboard.down("Space");
    await page.waitForFunction(
      () => {
        const cursor = document.querySelector(".meter-fill"),
          sweet = document.querySelector(".sweet-center");
        return (
          parseFloat(cursor?.style.width ?? "0") >= parseFloat(sweet?.style.left ?? "100") - 0.005
        );
      },
      {},
      { polling: "raf" },
    );
    await page.keyboard.up("Space");
    await page.waitForTimeout(70);
  }
  await page.getByRole("meter", { name: "Têmpera" }).waitFor();
  await page.screenshot({ path: `${out}/quench-mobile.png` });
  await stage.focus();
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () =>
      Number(document.querySelector('[aria-label="Têmpera"]')?.getAttribute("aria-valuenow")) >= 51,
  );
  await page.keyboard.up("Space");
  await page.getByRole("heading", { name: "Juramento QA", exact: true }).waitFor();
  await page.getByRole("button", { name: "Aumentar zoom" }).click();
  assert.ok((await page.locator(".inspection-controls").innerText()).includes("125%"));
  await page.getByRole("button", { name: "Enquadrar" }).click();
  await page.screenshot({ path: `${out}/inspection-mobile.png`, fullPage: true });
  const saveBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("a-forja-save")));
  assert.equal(saveBefore.gallery.length, 1);
  assert.equal(saveBefore.gallery[0].history.length, 8);
  assert.ok(
    saveBefore.gallery[0].performance >= 80,
    `expected skilled run, got ${saveBefore.gallery[0].performance}`,
  );
  checks.push(
    `full keyboard loop, rank ${saveBefore.gallery[0].rank} at ${saveBefore.gallery[0].performance}%`,
  );
  await page.getByRole("button", { name: "Abrir baú de recompensas" }).click();
  await page.getByRole("button", { name: "Abrir baú", exact: true }).click();
  await page.screenshot({ path: `${out}/rewards-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "Receber recompensas" }).click();
  assert.ok(await page.getByRole("button", { name: "Recompensas recebidas" }).isDisabled());
  const claimed = await page.evaluate(
    () => JSON.parse(localStorage.getItem("a-forja-save")).collection,
  );
  assert.equal(claimed.claimed.length, 1);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Arsenal/ }).click();
  await page.getByRole("button", { name: "Compêndio" }).click();
  assert.ok((await page.locator(".compendium-grid").innerText()).includes("recebidos"));
  checks.push("claims and unlocks persist across reload");
  await page.getByRole("button", { name: "Arsenal", exact: true }).click();
  await page.getByRole("button", { name: /Juramento QA/ }).click();
  assert.equal(await page.getByRole("button", { name: "Abrir baú de recompensas" }).count(), 0);
  checks.push("claimed chest cannot grant twice");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Forjar outra" }).click();
    await page.getByRole("button", { name: "Levar ao fogo" }).click();
    await page.waitForTimeout(100);
    assert.ok(await stage.isVisible());
    await page.screenshot({ path: `${out}/forge-${viewport.width}x${viewport.height}.png` });
    await page.getByRole("button", { name: "Sair da forja" }).click();
    await page.getByRole("button", { name: /Arsenal/ }).click();
    await page.getByRole("button", { name: /Juramento QA/ }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    checks.push(`viewport ${viewport.width}×${viewport.height} no horizontal overflow`);
  }
  // A second independent run deliberately fails; only reusable scrap is awarded.
  await page.getByRole("button", { name: "Forjar outra" }).click();
  await page.getByRole("button", { name: "Levar ao fogo" }).click();
  await page.getByRole("button", { name: "Retirar do fogo" }).click();
  await page.getByRole("meter", { name: "Força do martelo" }).waitFor();
  for (let i = 0; i < 3; i++) {
    await stage.focus();
    await page.keyboard.down("Space");
    await page.waitForTimeout(30);
    await page.keyboard.up("Space");
    await page.waitForTimeout(80);
  }
  await page.getByRole("heading", { name: "Juramento QA", exact: true }).waitFor();
  const failed = await page.evaluate(
    () => JSON.parse(localStorage.getItem("a-forja-save")).gallery[0],
  );
  assert.equal(failed.rank, "F");
  assert.deepEqual(
    failed.drops.map((d) => d.id),
    ["scrap"],
  );
  checks.push("failure run produces only scrap");
  await page.getByRole("button", { name: "Abrir baú de recompensas" }).click();
  await page.getByRole("button", { name: "Abrir baú", exact: true }).click();
  await page.getByRole("button", { name: "Receber recompensas" }).click();
  await page.getByRole("button", { name: "Ver coleção" }).click();
  await page.getByRole("button", { name: "Compêndio" }).click();
  await page.getByRole("button", { name: "Refinar · 3 sucatas" }).click();
  const recycled = await page.evaluate(
    () => JSON.parse(localStorage.getItem("a-forja-save")).collection,
  );
  assert.equal(recycled.scrap, 0);
  assert.equal(recycled.items.refined, 1);
  checks.push("failed blade scrap is recycled");
  await page.getByRole("button", { name: "Legado" }).click();
  await page.screenshot({ path: `${out}/legacy-mobile.png`, fullPage: true });
  assert.deepEqual(errors, []);
  checks.push("no application page errors");
  writeFileSync(`${out}/result.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (e) {
  writeFileSync(
    `${out}/result.json`,
    JSON.stringify({ passed: false, checks, errors, error: String(e) }, null, 2),
  );
  throw e;
} finally {
  await browser?.close();
  server?.kill();
}
