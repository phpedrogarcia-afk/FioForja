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
  shot,
} from "./lib.mjs";

const results = {
  mission: "M04-collection-intuitive",
  date: new Date().toISOString(),
  checks: [],
  sizes: {},
};
const failures = [];
function check(name, pass, detail) {
  results.checks.push({ name, pass, detail });
  if (!pass) failures.push(name);
}

const { server, url } = await startApp(8969);
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

async function cardMetrics(page) {
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
        fullyVisible: Boolean(cr && r.top >= cr.top && r.bottom <= cr.bottom),
      };
    });
    return {
      count: cards.length,
      fullyVisible: cards.filter((c) => c.fullyVisible).length,
      titles: cards.map((c) => c.title),
    };
  });
}

async function dialogStats(page) {
  return page.locator('[role="dialog"]').evaluate((dialog) => {
    const labels = ["P.ATK", "DEF", "AGI", "DUR"];
    const stats = {};
    for (const label of labels) {
      const p = Array.from(dialog.querySelectorAll("p")).find(
        (el) => el.textContent?.trim() === label,
      );
      if (p?.nextElementSibling) stats[label] = p.nextElementSibling.textContent?.trim();
    }
    return {
      title: dialog.querySelector("h2")?.textContent?.trim(),
      text: (dialog.textContent || "").replace(/\s+/g, " ").trim(),
      stats,
      notice: dialog.querySelector('[role="status"]')?.textContent?.trim() || null,
    };
  });
}

for (const size of SIZES) {
  const entry = { size: size.name };
  const { context, page } = await openContext(makeSave(), size);
  await openCollection(page);
  await page.waitForTimeout(300);

  const selector = page.locator('button[aria-label^="Seção da Coleção"]');
  const selectorBox = await selector.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height) };
  });
  entry.selector = {
    count: await selector.count(),
    text: (await selector.innerText()).replace(/\s+/g, " ").trim(),
    ariaLabel: await selector.getAttribute("aria-label"),
    expanded: await selector.getAttribute("aria-expanded"),
    box: selectorBox,
    visible: await selector.isVisible(),
  };
  check(
    `${size.name}: seletor visível com a seção ativa`,
    entry.selector.count === 1 && entry.selector.visible && entry.selector.text === "SEÇÃO Arsenal",
    entry.selector,
  );
  check(
    `${size.name}: alvo do seletor >= 56 px`,
    selectorBox.height >= 56 && selectorBox.width >= 300,
    selectorBox,
  );
  const residualTabs = await page.evaluate(() => {
    const main = document.querySelector('section[aria-label="Arsenal"]')?.closest("main");
    return main ? main.querySelectorAll('[role="tablist"]').length : -1;
  });
  check(`${size.name}: faixa horizontal removida`, residualTabs === 0, residualTabs);

  entry.arsenal = await cardMetrics(page);
  entry.countLabel = await page.locator("section[aria-label='Arsenal'] p").first().innerText();
  entry.overflow = await page.evaluate(() => ({
    doc: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    section: (() => {
      const s = document.querySelector('section[aria-label="Arsenal"]');
      return s ? Math.max(0, s.scrollWidth - s.clientWidth) : null;
    })(),
  }));
  check(
    `${size.name}: Arsenal com 6 armas e 4 cartões inteiros`,
    entry.arsenal.count === 6 && entry.arsenal.fullyVisible === 4,
    entry.arsenal,
  );
  check(
    `${size.name}: resumo do Arsenal correto`,
    entry.countLabel === "6 armas no Arsenal",
    entry.countLabel,
  );
  check(
    `${size.name}: sem rolagem horizontal no Arsenal`,
    entry.overflow.doc === 0 && entry.overflow.section === 0,
    entry.overflow,
  );

  await shot(page, `final-arsenal-${size.name}.jpg`);
  entry.longName = await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('section[aria-label="Arsenal"] h3')).find(
      (el) => el.textContent?.includes("Juramento das Cinzas"),
    );
    return {
      text: h3?.textContent,
      clientHeight: h3?.clientHeight,
      scrollHeight: h3?.scrollHeight,
      clientWidth: h3?.clientWidth,
      scrollWidth: h3?.scrollWidth,
      title: h3?.getAttribute("title"),
    };
  });
  check(
    `${size.name}: nome longo legível em duas linhas`,
    entry.longName.text === "Juramento das Cinzas de Valdoria" &&
      entry.longName.scrollHeight <= entry.longName.clientHeight + 1 &&
      entry.longName.clientHeight >= 30,
    entry.longName,
  );

  // Painel das seis seções.
  await selector.click();
  await page.waitForTimeout(400);
  const panel = page.locator('[role="dialog"]');
  entry.panel = await panel.evaluate((dialog) => {
    const options = Array.from(dialog.querySelectorAll('input[type="radio"]')).map((input) => {
      const label = input.closest("label");
      const r = label.getBoundingClientRect();
      return {
        label: label.textContent?.trim(),
        checked: input.checked,
        width: Math.round(r.width),
        height: Math.round(r.height),
        fullyVisible: r.top >= 0 && r.bottom <= window.innerHeight,
      };
    });
    return {
      title: dialog.querySelector("h2")?.textContent?.trim(),
      options,
      allVisible: options.every((o) => o.fullyVisible),
    };
  });
  check(
    `${size.name}: seis seções no painel, todas visíveis`,
    entry.panel.options.length === 6 && entry.panel.allVisible && entry.panel.options[0].checked,
    entry.panel,
  );
  check(
    `${size.name}: áreas de toque do painel >= 56 px`,
    entry.panel.options.every((o) => o.height >= 56 && o.width >= 120),
    entry.panel.options,
  );
  await shot(page, `final-sections-${size.name}.jpg`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  entry.escape = {
    closed: (await page.locator('[role="dialog"]').count()) === 0,
    focused: await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
  };
  check(
    `${size.name}: Escape fecha o seletor e devolve o foco`,
    entry.escape.closed && /Seção da Coleção/.test(entry.escape.focused || ""),
    entry.escape,
  );

  await selector.click();
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  entry.back = {
    closed: (await page.locator('[role="dialog"]').count()) === 0,
    collection: await page.locator('section[aria-label="Arsenal"]').count(),
    focused: await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
  };
  check(
    `${size.name}: Voltar fecha o seletor sem sair da Coleção`,
    entry.back.closed &&
      entry.back.collection === 1 &&
      /Seção da Coleção/.test(entry.back.focused || ""),
    entry.back,
  );

  // Runas, Núcleos, Comparar.
  const visit = async (value, label, sectionAria = label) => {
    await selector.click();
    await page.waitForTimeout(250);
    await panel.getByRole("radio", { name: label }).click();
    await page.waitForTimeout(400);
    return {
      selector: (await selector.innerText()).replace(/\s+/g, " ").trim(),
      section: await page.locator(`section[aria-label="${sectionAria}"]`).count(),
      panelOpen: await page.locator('[role="dialog"]').count(),
      overflow: await page.evaluate(
        (sectionLabel) => ({
          doc: Math.max(
            0,
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
          section: (() => {
            const s = document.querySelector(`section[aria-label="${sectionLabel}"]`);
            return s ? Math.max(0, s.scrollWidth - s.clientWidth) : null;
          })(),
        }),
        sectionAria,
      ),
    };
  };

  entry.runas = await visit("runas", "Runas");
  entry.runas.text = await page.locator('section[aria-label="Runas"]').innerText();
  check(
    `${size.name}: Runas alcançada em dois toques e identificada`,
    entry.runas.section === 1 &&
      entry.runas.panelOpen === 0 &&
      entry.runas.selector === "SEÇÃO Runas" &&
      entry.runas.overflow.doc === 0,
    entry.runas,
  );
  await shot(page, `final-runas-${size.name}.jpg`);

  entry.nucleos = await visit("nucleos", "Núcleos", "Núcleos de fusão");
  entry.nucleos.text = await page.locator('section[aria-label="Núcleos de fusão"]').innerText();
  check(
    `${size.name}: Núcleos alcançado e com núcleo real`,
    entry.nucleos.section === 1 && /Núcleo de Asterion/.test(entry.nucleos.text),
    entry.nucleos,
  );
  await shot(page, `final-nucleos-${size.name}.jpg`);

  entry.comparar = await visit("comparar", "Comparar", "Comparação de espadas");
  check(`${size.name}: Comparar alcançado`, entry.comparar.section === 1, entry.comparar);
  await page.getByLabel("Escolher espada 1 para comparar").selectOption("s1");
  await page.getByLabel("Escolher espada 2 para comparar").selectOption("s3");
  await page.waitForTimeout(300);
  entry.comparison = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim()),
    );
    return { rows };
  });
  check(
    `${size.name}: comparação calcula diferenças por atributo`,
    entry.comparison.rows.length === 4 && entry.comparison.rows[0][3] === "-102",
    entry.comparison,
  );
  await shot(page, `final-comparar-${size.name}.jpg`);

  // Peças e instalação avulsa.
  entry.pecas = await visit("componentes", "Peças", "Componentes");
  entry.pecas.text = await page.locator('section[aria-label="Componentes"]').innerText();
  check(
    `${size.name}: Peças lista componentes soltos`,
    entry.pecas.section === 1 && /Guarda de Asas de Valdoria/.test(entry.pecas.text),
    entry.pecas,
  );

  entry.compendio = await visit("compendio", "Compêndio", "Compêndio");
  entry.compendio.articles = await page.locator('section[aria-label="Compêndio"] article').count();
  entry.compendio.text = await page.locator('section[aria-label="Compêndio"]').innerText();
  check(
    `${size.name}: Compêndio acessível com os oito projetos`,
    entry.compendio.section === 1 &&
      entry.compendio.articles === 8 &&
      /Guarda da Fronteira/.test(entry.compendio.text),
    { section: entry.compendio.section, articles: entry.compendio.articles },
  );

  // Volta ao Arsenal e testa filtros.
  await selector.click();
  await page.waitForTimeout(250);
  await panel.getByRole("radio", { name: "Arsenal" }).click();
  await page.waitForTimeout(350);

  await page.getByLabel("Filtrar por raridade").selectOption("Relíquia");
  await page.waitForTimeout(300);
  entry.filterEmpty = await page.evaluate(() => {
    const main = document.querySelector("main");
    const section = document.querySelector('section[aria-label="Arsenal"]');
    return {
      text: (section?.textContent || "").replace(/\s+/g, " ").trim(),
      forjar: Array.from(section?.querySelectorAll("button") || []).some((b) =>
        b.textContent?.includes("Forjar a primeira"),
      ),
      summary: section?.querySelector("p")?.textContent?.trim(),
    };
  });
  check(
    `${size.name}: filtro sem resultado não finge coleção vazia`,
    /Nenhuma arma com raridade Relíquia/.test(entry.filterEmpty.text) &&
      !entry.filterEmpty.forjar &&
      /0 de 6 armas/.test(entry.filterEmpty.text),
    entry.filterEmpty,
  );
  await shot(page, `final-filter-empty-${size.name}.jpg`);

  await page.getByRole("button", { name: "Mostrar todas as armas" }).click();
  await page.waitForTimeout(300);
  entry.filterCleared = {
    value: await page.getByLabel("Filtrar por raridade").inputValue(),
    cards: await cardMetrics(page),
  };
  check(
    `${size.name}: ação limpa o filtro e restaura as armas`,
    entry.filterCleared.value === "Todas" && entry.filterCleared.cards.count === 6,
    entry.filterCleared,
  );

  await page.getByLabel("Filtrar por raridade").selectOption("Lendária");
  await page.waitForTimeout(300);
  entry.filterResults = {
    cards: await cardMetrics(page),
    summary: await page.locator("section[aria-label='Arsenal'] p").first().innerText(),
  };
  check(
    `${size.name}: filtro com resultado mantém total e nomes`,
    entry.filterResults.cards.count === 2 &&
      entry.filterResults.summary === "2 de 6 armas · Lendária",
    entry.filterResults,
  );
  await shot(page, `final-filter-results-${size.name}.jpg`);
  await page.getByLabel("Filtrar por raridade").selectOption("Todas");
  await page.waitForTimeout(250);

  // Inspeção, favorito e montagem.
  const juramentoCard = () =>
    page
      .locator('section[aria-label="Arsenal"] button')
      .filter({ hasText: "Juramento das Cinzas de Valdoria" })
      .first();
  const juramentoShield = () =>
    juramentoCard().locator('[role="img"][aria-label="Protegida contra fusão"]').count();
  const openJuramento = async () => {
    await juramentoCard().click();
    await page.waitForTimeout(450);
    return page.locator('[role="dialog"]');
  };

  let dialog = await openJuramento();
  entry.inspection = await dialogStats(page);
  check(
    `${size.name}: inspeção mostra imagem, nome e atributos reais`,
    entry.inspection.title === "Juramento das Cinzas de Valdoria" &&
      entry.inspection.stats["P.ATK"] === "312" &&
      entry.inspection.stats.DEF === "148",
    entry.inspection,
  );
  await shot(page, `final-inspection-${size.name}.jpg`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  entry.inspectionEscape = { closed: (await page.locator('[role="dialog"]').count()) === 0 };
  check(
    `${size.name}: Escape fecha a inspeção`,
    entry.inspectionEscape.closed,
    entry.inspectionEscape,
  );
  dialog = await openJuramento();

  await dialog.getByRole("button", { name: "Proteger" }).click();
  await page.waitForTimeout(350);
  entry.favorite = await dialogStats(page);
  check(
    `${size.name}: Proteger confirma dentro da inspeção`,
    /Espada protegida/.test(entry.favorite.notice || ""),
    entry.favorite.notice,
  );
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await page.waitForTimeout(350);
  entry.protectedIcon = await juramentoShield();
  check(
    `${size.name}: cartão protegido identificado`,
    entry.protectedIcon === 1,
    entry.protectedIcon,
  );

  // Persistência do favorito após recarregar.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await openCollection(page);
  await page.waitForTimeout(250);
  entry.protectedIconPersisted = await juramentoShield();
  dialog = await openJuramento();
  entry.favoritePersisted = await dialogStats(page);
  check(
    `${size.name}: proteção persiste após recarregar`,
    /Desproteger/.test(entry.favoritePersisted.text) && entry.protectedIconPersisted === 1,
    { icon: entry.protectedIconPersisted, buttons: entry.favoritePersisted.text.slice(-160) },
  );

  // Instalar guarda na lâmina.
  const before = entry.favoritePersisted.stats.DEF;
  await dialog.getByRole("button", { name: "Instalar guarda" }).click();
  await page.waitForTimeout(300);
  entry.installPicker = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      text: (dialog?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });
  check(
    `${size.name}: seleção de peça disponível para a guarda`,
    /Guarda de Asas de Valdoria/.test(entry.installPicker.text),
    entry.installPicker.text.slice(0, 300),
  );
  await page.getByRole("button", { name: /Instalar Guarda de Asas de Valdoria em/ }).click();
  await page.waitForTimeout(500);
  entry.installed = await dialogStats(page);
  check(
    `${size.name}: instalar guarda recalcula atributos e confirma`,
    entry.installed.stats.DEF !== before &&
      /Peça instalada e atributos recalculados/.test(entry.installed.notice || "") &&
      /Guarda de Asas de Valdoria/.test(entry.installed.text) &&
      (await dialog.getByRole("button", { name: "Trocar guarda" }).count()) === 1,
    { before, after: entry.installed.stats, notice: entry.installed.notice },
  );
  await shot(page, `final-inspection-installed-${size.name}.jpg`);
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await page.waitForTimeout(300);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await openCollection(page);
  await page.waitForTimeout(250);
  dialog = await openJuramento();
  entry.installedPersisted = await dialogStats(page);
  check(
    `${size.name}: montagem persiste após recarregar`,
    entry.installedPersisted.stats.DEF === entry.installed.stats.DEF &&
      /Guarda de Asas de Valdoria/.test(entry.installedPersisted.text),
    { before, after: entry.installedPersisted.stats },
  );
  await shot(page, `final-inspection-persisted-${size.name}.jpg`);

  const atkBeforeRefine = Number(entry.installedPersisted.stats["P.ATK"]);
  await dialog.getByRole("button", { name: "Refinar" }).click();
  await page.waitForTimeout(450);
  entry.refined = await dialogStats(page);
  check(
    `${size.name}: refino recalcula ATK/DUR e confirma`,
    Number(entry.refined.stats["P.ATK"]) === atkBeforeRefine + 8 &&
      entry.refined.stats.DUR === "100" &&
      /Lâmina refinada na bancada/.test(entry.refined.notice || ""),
    {
      before: entry.installedPersisted.stats,
      after: entry.refined.stats,
      notice: entry.refined.notice,
    },
  );
  await shot(page, `final-refined-${size.name}.jpg`);

  await dialog.getByRole("button", { name: "Desproteger" }).click();
  await page.waitForTimeout(350);
  entry.unfavorite = await dialogStats(page);
  check(
    `${size.name}: Desproteger confirma`,
    /Proteção removida/.test(entry.unfavorite.notice || ""),
    entry.unfavorite.notice,
  );
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await openCollection(page);
  await page.waitForTimeout(250);
  entry.unfavoritePersisted = {
    icons: await juramentoShield(),
  };
  dialog = await openJuramento();
  entry.finalPersisted = await dialogStats(page);
  check(
    `${size.name}: desfavoritar e refino persistem após recarregar`,
    entry.unfavoritePersisted.icons === 0 &&
      /Proteger/.test(entry.finalPersisted.text) &&
      entry.finalPersisted.stats["P.ATK"] === entry.refined.stats["P.ATK"] &&
      entry.finalPersisted.stats.DUR === "100",
    { icons: entry.unfavoritePersisted.icons, stats: entry.finalPersisted.stats },
  );

  await context.close();

  // Coleção vazia.
  {
    const empty = await openContext(makeSave({ gallery: [] }), size);
    await openCollection(empty.page);
    entry.empty = await empty.page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Arsenal"]');
      return {
        text: (section?.textContent || "").replace(/\s+/g, " ").trim(),
        buttons: Array.from(section?.querySelectorAll("button") || []).map((b) =>
          b.textContent?.trim(),
        ),
      };
    });
    check(
      `${size.name}: coleção vazia pede a primeira forja`,
      /Nenhuma lâmina aqui ainda/.test(entry.empty.text) &&
        entry.empty.buttons.includes("Forjar a primeira"),
      entry.empty,
    );
    await empty.page.getByLabel("Filtrar por raridade").selectOption("Relíquia");
    await empty.page.waitForTimeout(250);
    entry.emptyFiltered = await empty.page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Arsenal"]');
      return (section?.textContent || "").replace(/\s+/g, " ").trim();
    });
    check(
      `${size.name}: coleção vazia com filtro continua sendo coleção vazia`,
      /Nenhuma lâmina aqui ainda/.test(entry.emptyFiltered) &&
        !/Nenhuma arma com raridade/.test(entry.emptyFiltered),
      entry.emptyFiltered,
    );
    await empty.page.getByLabel("Filtrar por raridade").selectOption("Todas");
    await empty.page.waitForTimeout(200);
    await shot(empty.page, `final-empty-${size.name}.jpg`);
    await empty.context.close();
  }

  // Coleção maior + rolagem.
  {
    const large = await openContext(makeSave({ gallery: largeGallery(14) }), size);
    await openCollection(large.page);
    entry.large = await cardMetrics(large.page);
    await large.page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Arsenal"]');
      let scroller = section?.parentElement;
      while (scroller && getComputedStyle(scroller).overflowY !== "auto")
        scroller = scroller.parentElement;
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
    await large.page.waitForTimeout(400);
    entry.largeBottom = await large.page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Arsenal"]');
      const cards = Array.from(section?.querySelectorAll("button") || []);
      const last = cards[cards.length - 1]?.getBoundingClientRect();
      return {
        lastVisible: Boolean(last && last.bottom <= window.innerHeight && last.top >= 0),
        lastTitle: cards[cards.length - 1]?.querySelector("h3")?.textContent?.trim(),
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      };
    });
    check(
      `${size.name}: coleção maior rola até a última arma sem overflow horizontal`,
      entry.large.count === 14 && entry.largeBottom.lastVisible && entry.largeBottom.overflow === 0,
      entry.largeBottom,
    );
    await shot(large.page, `final-large-${size.name}.jpg`);
    await large.context.close();
  }

  // Renderer DNA.
  {
    const dna = await openContext(makeSave(), size);
    await dna.page.getByRole("button", { name: /Visual:/ }).click();
    await dna.page.waitForTimeout(500);
    await openCollection(dna.page);
    await dna.page.waitForTimeout(700);
    entry.dna = await dna.page.evaluate(() => ({
      control: document
        .querySelector('button[aria-label^="Seção da Coleção"]')
        ?.textContent?.trim(),
      canvases: document.querySelectorAll('section[aria-label="Arsenal"] canvas').length,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    }));
    check(
      `${size.name}: Coleção abre no renderer DNA`,
      entry.dna.canvases >= 6 && entry.dna.overflow === 0,
      entry.dna,
    );
    await shot(dna.page, `final-arsenal-dna-${size.name}.jpg`);
    await dna.context.close();
  }

  results.sizes[size.name] = entry;
  console.log("done", size.name);
}

results.failures = failures;
results.pass = failures.length === 0;
await browser.close();
await server.close();
writeFileSync(join(evidenceDir, "checks.json"), JSON.stringify(results, null, 2));
console.log(failures.length === 0 ? "ALL CHECKS PASS" : "FAILURES: " + failures.join(" | "));
