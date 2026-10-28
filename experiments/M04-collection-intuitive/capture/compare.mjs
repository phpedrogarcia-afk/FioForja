import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  SIZES,
  evidenceDir,
  startApp,
  launchBrowser,
  seedSave,
  makeSave,
  openCollection,
  shot,
} from "./lib.mjs";

const phase = (process.argv[2] || "A").toUpperCase();
const results = {
  mission: "M04-collection-intuitive",
  phase: "alternative-" + phase,
  date: new Date().toISOString(),
  sizes: {},
};

const { server, url } = await startApp(8968);
const browser = await launchBrowser();
console.log("browser", browser.version(), "phase", phase);

async function measureArsenal(page) {
  return page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Arsenal"]');
    let scroller = section?.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY !== "auto")
      scroller = scroller.parentElement;
    const cr = scroller?.getBoundingClientRect();
    const cards = Array.from(section?.querySelectorAll("button") || []).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        title: el.querySelector("h3")?.textContent?.trim() || "",
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        fullyVisible: Boolean(cr && r.top >= cr.top && r.bottom <= cr.bottom),
        nameVisible: Boolean(cr && r.top >= cr.top && r.top + 150 <= cr.bottom),
      };
    });
    return {
      scroller: cr
        ? { top: Math.round(cr.top), bottom: Math.round(cr.bottom), height: Math.round(cr.height) }
        : null,
      cards,
      fullyVisibleCards: cards.filter((c) => c.fullyVisible).length,
      namesVisibleCards: cards.filter((c) => c.nameVisible).length,
    };
  });
}

for (const size of SIZES) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  await seedSave(context, makeSave());
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await openCollection(page);

  const entry = { size: size.name };
  entry.arsenal = await measureArsenal(page);
  entry.documentOverflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );

  if (phase === "A") {
    entry.navigation = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tablist"] [role="tab"]')).filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      const rects = tabs.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label: (el.textContent || "").trim(),
          width: Math.round(r.width),
          height: Math.round(r.height),
          fullyVisible: r.left >= 0 && r.right <= window.innerWidth,
        };
      });
      const tablist = document.querySelector('[role="tablist"]');
      return {
        kind: "grid",
        height: Math.round(tablist.getBoundingClientRect().height),
        overflow: tablist.scrollWidth - tablist.clientWidth,
        options: rects,
        allVisible: rects.every((r) => r.fullyVisible),
        tapsToSection: 1,
      };
    });
    await shot(page, `alternative-a-${size.name}.jpg`);
    await page.getByRole("tab", { name: "Runas", exact: true }).click();
    await page.waitForTimeout(300);
    entry.runasReached = await page.evaluate(() =>
      document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim(),
    );
  } else {
    const button = page.locator('button[aria-haspopup="dialog"]').first();
    entry.navigation = {
      kind: "selector",
      label: await button.getAttribute("aria-label"),
      text: (await button.innerText()).replace(/\s+/g, " ").trim(),
      height: await button.evaluate((el) => Math.round(el.getBoundingClientRect().height)),
      expandedBefore: await button.getAttribute("aria-expanded"),
      tapsToSection: 2,
    };
    await shot(page, `alternative-b-${size.name}.jpg`);
    await button.click();
    await page.waitForTimeout(400);
    entry.panel = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const options = Array.from(dialog?.querySelectorAll('input[type="radio"]') || []).map(
        (input) => {
          const label = input.closest("label");
          const r = label.getBoundingClientRect();
          return {
            label: (label.textContent || "").trim(),
            checked: input.checked,
            width: Math.round(r.width),
            height: Math.round(r.height),
            fullyVisible: r.top >= 0 && r.bottom <= window.innerHeight,
          };
        },
      );
      const r = dialog?.getBoundingClientRect();
      return {
        open: Boolean(dialog),
        top: r ? Math.round(r.top) : null,
        height: r ? Math.round(r.height) : null,
        options,
        allVisible: options.every((o) => o.fullyVisible),
        selected: options.find((o) => o.checked)?.label,
      };
    });
    entry.navigation.expandedOpen = await page
      .locator('button[aria-haspopup="dialog"]')
      .first()
      .getAttribute("aria-expanded");
    await shot(page, `panel-b-${size.name}.jpg`);

    // Back closes the panel and keeps the Collection.
    await page.goBack();
    await page.waitForTimeout(400);
    entry.back = await page.evaluate(() => ({
      panelOpen: Boolean(document.querySelector('[role="dialog"]')),
      collectionVisible: Boolean(document.querySelector('section[aria-label="Arsenal"]')),
      focused:
        document.activeElement?.getAttribute("aria-label") ||
        document.activeElement?.textContent?.trim() ||
        null,
    }));

    // Reopen and choose Runas in two taps.
    await button.click();
    await page.waitForTimeout(350);
    await page.getByRole("radio", { name: "Runas" }).click();
    await page.waitForTimeout(450);
    entry.runasReached = await page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Runas"]');
      const button = document.querySelector('button[aria-label^="Seção da Coleção"]');
      return {
        sectionVisible: Boolean(section),
        selectorText: (button?.innerText || "").replace(/\s+/g, " ").trim(),
        panelOpen: Boolean(document.querySelector('[role="dialog"]')),
      };
    });
    await shot(page, `runas-${size.name}.jpg`);
  }

  results.sizes[size.name] = entry;
  await context.close();
  console.log("done", size.name);
}

await browser.close();
await server.close();
writeFileSync(
  join(evidenceDir, `alternative-${phase.toLowerCase()}.json`),
  JSON.stringify(results, null, 2),
);
console.log("wrote", `alternative-${phase.toLowerCase()}.json`);
