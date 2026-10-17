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
  console.log("Starting in-process Vite server...");
  const server = await createServer({
    server: { port: 8899, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8899/";
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

  const viewports = [
    { name: "desktop", width: 1366, height: 768 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Capturing viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Title Screen
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const titleFile = join(outDir, `${vp.name}-01-title.png`);
    await page.screenshot({ path: titleFile });
    console.log(`Saved: ${titleFile}`);

    // 2. Click "Entrar na forja" -> Design Screen
    const enterBtn = page.getByRole("button", { name: /Entrar na forja/i });
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
      await page.waitForTimeout(600);
      const designFile = join(outDir, `${vp.name}-02-design.png`);
      await page.screenshot({ path: designFile });
      console.log(`Saved: ${designFile}`);
    }

    // 3. Click "Levar ao fogo" -> Forge Screen
    const fireBtn = page.getByRole("button", { name: /Levar ao fogo/i });
    if (await fireBtn.isVisible()) {
      await fireBtn.click();
      await page.waitForTimeout(600);
      const forgeFile = join(outDir, `${vp.name}-03-forge-heat.png`);
      await page.screenshot({ path: forgeFile });
      console.log(`Saved: ${forgeFile}`);

      // Pull to anvil (Initial Stage: Tarugo Bruto, shape = 0)
      const pullBtn = page.getByRole("button", { name: /Retirar do fogo/i });
      if (await pullBtn.isVisible()) {
        await pullBtn.click();
        await page.waitForTimeout(800);
        const tarugoFile = join(outDir, `${vp.name}-04-forge-tarugo-bruto.png`);
        await page.screenshot({ path: tarugoFile });
        console.log(`Saved: ${tarugoFile}`);

        // Deliver 2 strikes to elongate into Stage 2: Pré-forma (shape ~0.35)
        for (let i = 0; i < 2; i++) {
          await page.keyboard.down("Space");
          await page.waitForTimeout(450);
          await page.keyboard.up("Space");
          await page.waitForTimeout(350);
        }
        const preformaFile = join(outDir, `${vp.name}-04b-forge-preforma.png`);
        await page.screenshot({ path: preformaFile });
        console.log(`Saved: ${preformaFile}`);

        // Deliver more strikes to form Stage 3: Lâmina Forjada
        for (let i = 0; i < 3; i++) {
          await page.keyboard.down("Space");
          await page.waitForTimeout(450);
          await page.keyboard.up("Space");
          await page.waitForTimeout(350);
        }
        const anvilFile = join(outDir, `${vp.name}-04-forge-anvil.png`);
        await page.screenshot({ path: anvilFile });
        console.log(`Saved: ${anvilFile}`);
      }
    }

    // 4. Inject Finished Sword and view Reveal Screen (Velvet Inspection Table)
    await page.evaluate(() => {
      // Simulate saving a Q98 masterpiece into localStorage and navigating to Gallery
      const masterpiece = {
        id: "masterpiece-asterion",
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
        quality: 98,
        grade: "Obra-prima",
        rarity: "Lendária",
        value: 4850,
        heatScore: 97,
        forgeScore: 98,
        quenchScore: 96,
        warp: 0.01,
        damage: 288,
        defense: 165,
        agility: 142,
        durability: 96,
        flaws: [],
        perks: [
          "Gume de Obra-prima: Corte sem atrito",
          "Ressonância Rúnica: Lâmina desperta",
          "Pó Meteórico: Dureza estelar",
          "Harmonia da Forja: Estiramento uniforme entre base, centro e ponta",
        ],
        structuralState: "stable",
        cracks: 0,
        createdAt: Date.now(),
      };

      const raw = localStorage.getItem("a-forja-save");
      const current = raw ? JSON.parse(raw) : { version: 4, gallery: [] };
      current.gallery = [masterpiece, ...(current.gallery || [])];
      current.wallet = { gold: 5700, rubies: 190, diamonds: 185 };
      current.career = {
        totalForged: 14,
        masterpieces: 5,
        legendaries: 4,
        relics: 1,
        brokenBlades: 2,
        highestQuality: 98,
        totalValueEarned: 24500,
      };
      localStorage.setItem("a-forja-save", JSON.stringify(current));
    });

    // 5. Open Gallery Screen and capture all 6 tabs
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const galBtn = page.getByRole("button", { name: /Arsenal do Ferreiro/i });
    if (await galBtn.isVisible()) {
      await galBtn.click();
      await page.waitForTimeout(800);

      // Tab 1: Arsenal
      const galleryFile = join(outDir, `${vp.name}-05-gallery-arsenal.png`);
      await page.screenshot({ path: galleryFile });
      console.log(`Saved: ${galleryFile}`);

      // Tab 2: Compêndio
      const compBtn = page.getByRole("button", { name: /Compêndio/i });
      if (await compBtn.isVisible()) {
        await compBtn.click();
        await page.waitForTimeout(600);
        const compFile = join(outDir, `${vp.name}-06-gallery-compendio.png`);
        await page.screenshot({ path: compFile });
        console.log(`Saved: ${compFile}`);
      }

      // Tab 3: Componentes
      const compoBtn = page.getByRole("button", { name: /Componentes/i });
      if (await compoBtn.isVisible()) {
        await compoBtn.click();
        await page.waitForTimeout(600);
        const compoFile = join(outDir, `${vp.name}-06b-gallery-componentes.png`);
        await page.screenshot({ path: compoFile });
        console.log(`Saved: ${compoFile}`);
      }

      // Tab 4: Runas
      const runasBtn = page.getByRole("button", { name: /Runas/i });
      if (await runasBtn.isVisible()) {
        await runasBtn.click();
        await page.waitForTimeout(600);
        const runasFile = join(outDir, `${vp.name}-06c-gallery-runas.png`);
        await page.screenshot({ path: runasFile });
        console.log(`Saved: ${runasFile}`);
      }

      // Tab 5: Oficina
      const oficBtn = page.getByRole("button", { name: /Oficina/i });
      if (await oficBtn.isVisible()) {
        await oficBtn.click();
        await page.waitForTimeout(600);
        const oficFile = join(outDir, `${vp.name}-07b-gallery-oficina.png`);
        await page.screenshot({ path: oficFile });
        console.log(`Saved: ${oficFile}`);
      }

      // Tab 6: Legado
      const legBtn = page.getByRole("button", { name: /Legado/i });
      if (await legBtn.isVisible()) {
        await legBtn.click();
        await page.waitForTimeout(600);
        const legFile = join(outDir, `${vp.name}-07-gallery-legado.png`);
        await page.screenshot({ path: legFile });
        console.log(`Saved: ${legFile}`);
      }

      // Return to Arsenal and inspect the masterpiece
      const arsBtn = page.getByRole("button", { name: /Arsenal/i });
      if (await arsBtn.isVisible()) {
        await arsBtn.click();
        await page.waitForTimeout(500);
        const swordCard = page.locator("li").first();
        if (await swordCard.isVisible()) {
          await swordCard.click();
          await page.waitForTimeout(800);
          const inspectFile = join(outDir, `${vp.name}-08-velvet-inspection.png`);
          await page.screenshot({ path: inspectFile });
          console.log(`Saved: ${inspectFile}`);

          // Click on Claim Rewards
          const claimBtn = page.getByRole("button", { name: /Reivindicar Recompensas/i });
          if (await claimBtn.isVisible()) {
            await claimBtn.click();
            await page.waitForTimeout(800);
            const rewardsFile = join(outDir, `${vp.name}-09-rewards-chest.png`);
            await page.screenshot({ path: rewardsFile });
            console.log(`Saved: ${rewardsFile}`);
          }
        }
      }
    }

    await context.close();
  }

  await browser.close();
  await server.close();
  console.log("\nVite server closed. All captures complete!");

  // Copy captured images to brain directory for artifact embedding
  if (existsSync(brainDir)) {
    const files = [
      "desktop-01-title.png",
      "desktop-02-design.png",
      "desktop-03-forge-heat.png",
      "desktop-04-forge-tarugo-bruto.png",
      "desktop-04b-forge-preforma.png",
      "desktop-04-forge-anvil.png",
      "desktop-05-gallery-arsenal.png",
      "desktop-06-gallery-compendio.png",
      "desktop-06b-gallery-componentes.png",
      "desktop-06c-gallery-runas.png",
      "desktop-07b-gallery-oficina.png",
      "desktop-07-gallery-legado.png",
      "desktop-08-velvet-inspection.png",
      "desktop-09-rewards-chest.png",
      "mobile-01-title.png",
      "mobile-04-forge-anvil.png",
      "mobile-08-velvet-inspection.png",
    ];
    for (const f of files) {
      const src = join(outDir, f);
      const dst = join(brainDir, f);
      if (existsSync(src)) {
        copyFileSync(src, dst);
        console.log(`Copied to brain: ${f}`);
      }
    }
  }
}

run().catch((err) => {
  console.error("Capture failure:", err);
  process.exit(1);
});
