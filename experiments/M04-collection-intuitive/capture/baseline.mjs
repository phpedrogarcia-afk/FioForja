import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  SIZES,
  evidenceDir,
  startApp,
  launchBrowser,
  seedSave,
  makeSave,
  largeGallery,
  openCollection,
  collectMetrics,
  shot,
} from "./lib.mjs";

const results = {
  mission: "M04-collection-intuitive",
  phase: "baseline",
  date: new Date().toISOString(),
  sizes: {},
};

const { server, url } = await startApp(8967);
const browser = await launchBrowser();
console.log("browser", browser.version(), url);

async function openContext(save, size) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  await seedSave(context, save);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  return { context, page };
}

for (const size of SIZES) {
  const entry = { size: size.name, checks: {} };
  const { context, page } = await openContext(makeSave(), size);
  await openCollection(page);
  const base = await collectMetrics(page);
  entry.baseline = base;
  await shot(page, `baseline-arsenal-${size.name}.jpg`);

  // How many tabs are discoverable without any horizontal gesture.
  entry.checks.sectionsVisibleWithoutScroll = base.fullyVisibleTabs;
  entry.checks.sectionsPartiallyVisible = base.tabs
    .filter((t) => t.centerVisible && !t.fullyVisible)
    .map((t) => t.label);
  entry.checks.sectionsHidden = base.tabs.filter((t) => !t.centerVisible).map((t) => t.label);
  entry.checks.tablistOverflowPx = base.tablist?.overflow ?? null;

  // Long name truncation on the Arsenal card.
  const longCard = page
    .locator('section[aria-label="Arsenal"] button')
    .filter({ hasText: "Juramento das Cinzas de Valdoria" })
    .first();
  entry.longName = await longCard.evaluate((el) => {
    const h3 = el.querySelector("h3");
    const rect = h3.getBoundingClientRect();
    return {
      text: h3.textContent,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      lineHeight: getComputedStyle(h3).lineHeight,
      clipped: h3.scrollWidth > h3.clientWidth,
      truncateClass: h3.className,
      visibleText: h3.innerText,
    };
  });

  // Filter with no result.
  await page.getByLabel("Filtrar por raridade").selectOption("Relíquia");
  await page.waitForTimeout(250);
  entry.filterEmpty = await page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Arsenal"]');
    return {
      text: (section?.textContent || "").replace(/\s+/g, " ").trim(),
      buttons: Array.from(section?.querySelectorAll("button") || []).map((b) =>
        (b.textContent || "").trim(),
      ),
      cardCount: section?.querySelectorAll("button h3").length || 0,
    };
  });
  await shot(page, `baseline-filter-empty-${size.name}.jpg`);

  // Clear filter, open inspection of the long-named sword.
  await page.getByLabel("Filtrar por raridade").selectOption("Todas");
  await page.waitForTimeout(200);
  await longCard.click();
  await page.waitForTimeout(500);
  entry.inspection = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const title = dialog?.querySelector("h2");
    const preview = dialog?.querySelector("canvas");
    return {
      open: Boolean(dialog),
      title: title?.textContent?.trim(),
      titleClipped: title ? title.scrollWidth > title.clientWidth : null,
      description: dialog?.querySelector("p")?.textContent?.trim(),
      hasPreview: Boolean(preview),
      previewSize: preview ? { width: preview.clientWidth, height: preview.clientHeight } : null,
      dialogHeight: dialog ? Math.round(dialog.getBoundingClientRect().height) : null,
      text: (dialog?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 900),
    };
  });
  await shot(page, `baseline-inspection-${size.name}.jpg`);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await page.waitForTimeout(350);
  entry.inspectionClosed = !(await page.locator('[role="dialog"]').count());

  // Other sections (Playwright scrolls the old strip automatically).
  for (const label of ["Peças", "Runas", "Núcleos", "Comparar"]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await page.waitForTimeout(350);
    entry["tab_" + label] = await page.evaluate((tabLabel) => {
      const selected = document.querySelector('[role="tab"][aria-selected="true"]');
      const main = document.querySelector("main");
      return {
        selected: selected?.textContent?.trim(),
        text: (main?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 500),
        documentOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      };
    }, label);
    if (label === "Núcleos" || label === "Comparar") {
      await shot(page, `baseline-${label.toLowerCase()}-${size.name}.jpg`);
    }
  }

  await context.close();

  // Empty collection.
  {
    const empty = await openContext(makeSave({ gallery: [] }), size);
    await openCollection(empty.page);
    entry.empty = await collectMetrics(empty.page);
    entry.empty.text = await empty.page.evaluate(() =>
      (document.querySelector("main")?.textContent || "").replace(/\s+/g, " ").trim(),
    );
    await shot(empty.page, `baseline-empty-${size.name}.jpg`);
    await empty.context.close();
  }

  // Larger collection.
  {
    const large = await openContext(makeSave({ gallery: largeGallery(14) }), size);
    await openCollection(large.page);
    const m = await collectMetrics(large.page);
    entry.large = {
      cardCount: m.cardCount,
      fullyVisibleCards: m.fullyVisibleCards,
      verticalScroll: m.verticalScroll,
      horizontalOverflow: m.horizontalOverflow,
    };
    await shot(large.page, `baseline-large-${size.name}.jpg`);
    await large.context.close();
  }

  results.sizes[size.name] = entry;
  console.log("done", size.name);
}

await browser.close();
await server.close();
writeFileSync(join(evidenceDir, "baseline.json"), JSON.stringify(results, null, 2));
console.log("wrote baseline.json");
