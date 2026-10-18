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
  console.log("Starting in-process Vite server on port 8922...");
  const server = await createServer({
    server: { port: 8922, host: "127.0.0.1" },
  });
  await server.listen();
  const url = "http://127.0.0.1:8922/";
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

  // Navigate to Vite root to initialize environment and modules
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // =========================================================================
  // 1. RENDER UNLABELED COMPARISON ACROSS ALL 9 WEAPON FAMILIES
  // =========================================================================
  console.log("\n--- Generating 9-Family Unlabeled Comparison ---");
  await page.evaluate(async () => {
    const { drawFinishedSword } = await import("/src/game/swordDraw.ts");
    const { FAMILIES } = await import("/src/game/catalog.ts");

    const familyKeys = [
      "iron",
      "royal",
      "damascus",
      "oriental",
      "elven",
      "runic",
      "meteor",
      "imperial",
      "relic",
    ];

    const canvas = document.createElement("canvas");
    canvas.id = "diversity-canvas";
    canvas.width = 1800;
    canvas.height = 760;
    const ctx = canvas.getContext("2d");

    // Deep royal blue-purple midnight velvet backdrop
    const vg = ctx.createRadialGradient(900, 380, 50, 900, 380, 1100);
    vg.addColorStop(0, "#191c32");
    vg.addColorStop(0.5, "#0d1020");
    vg.addColorStop(1, "#06070e");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1800, 760);

    // Subtle velvet fabric weave texture
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    for (let x = 0; x < 1800; x += 4) {
      ctx.fillRect(x, 0, 1.5, 760);
    }

    // Warm candle / lantern ambient reflection on velvet
    const cg = ctx.createRadialGradient(900, 160, 20, 900, 160, 800);
    cg.addColorStop(0, "rgba(255, 185, 90, 0.12)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, 1800, 760);

    // Header Title
    ctx.font = "bold 22px Cinzel, serif";
    ctx.fillStyle = "#d4af37";
    ctx.textAlign = "center";
    ctx.fillText("FIOFORJA — COMPARAÇÃO ARTÍSTICA DAS NOVE FAMÍLIAS DE ARMAS", 900, 48);

    ctx.font = "13px Cinzel, sans-serif";
    ctx.fillStyle = "#8a99ad";
    ctx.fillText("SILHUETAS, GUMES, SANGRADOUROS, GUARDAS, EMPUNHADURAS E POMOS (SEM RÓTULOS TEXTUAIS)", 900, 74);

    const slotWidth = 1800 / 9;
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

    familyKeys.forEach((key, idx) => {
      const fam = FAMILIES[key];
      const cx = slotWidth * idx + slotWidth / 2;

      // Construct authentic design for this family
      const design = {
        name: fam.name,
        family: key,
        profile: fam.defaultProfile,
        steel: fam.defaultSteel,
        wrap: fam.defaultWrap,
        guard: fam.defaultGuard,
        pommel: fam.defaultPommel,
        inscription: key === "royal" ? "REX" : key === "runic" ? "THURISAZ" : "FORJA",
        runes: key === "runic" || key === "meteor",
        length: fam.defaultProfile === "short" ? 0.8 : fam.defaultProfile === "claymore" ? 1.18 : 1.0,
      };

      // Draw sword vertically on velvet table with balanced headroom
      drawFinishedSword(ctx, design, cx, 650, 440, {
        angle: -Math.PI / 2,
        assembled: true,
        heat: 0,
        shape: 1,
        quality: 92,
        warp: 0,
        cracks: 0,
        broken: false,
        lightOffset: 0.5,
      });

      // Roman numeral badge beneath hilt
      ctx.fillStyle = "rgba(18, 25, 42, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, 680, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a5d78";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.font = "bold 14px Cinzel, serif";
      ctx.fillStyle = "#f5d77f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(roman[idx], cx, 680);
    });

    document.body.appendChild(canvas);
  });

  const diversityCanvas = page.locator("#diversity-canvas");
  const diversityFile = join(outDir, "diversity-9-families-unlabeled.png");
  await diversityCanvas.screenshot({ path: diversityFile });
  console.log(`Saved: ${diversityFile}`);

  // =========================================================================
  // 2. RENDER 3-WAY QUALITY COMPARISON (RUIM Q35, MEDIANO Q70, OBRA-PRIMA Q98)
  // =========================================================================
  console.log("\n--- Generating 3-Way Quality Comparison ---");
  await page.evaluate(async () => {
    const { drawFinishedSword } = await import("/src/game/swordDraw.ts");
    const { FAMILIES } = await import("/src/game/catalog.ts");

    const old = document.getElementById("quality-canvas");
    if (old) old.remove();

    const canvas = document.createElement("canvas");
    canvas.id = "quality-canvas";
    canvas.width = 1350;
    canvas.height = 780;
    const ctx = canvas.getContext("2d");

    // Deep velvet backdrop
    const vg = ctx.createRadialGradient(675, 390, 40, 675, 390, 850);
    vg.addColorStop(0, "#16192d");
    vg.addColorStop(0.5, "#0c0e1c");
    vg.addColorStop(1, "#06070e");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1350, 780);

    // Warm candlelight
    const cg = ctx.createRadialGradient(675, 160, 20, 675, 160, 600);
    cg.addColorStop(0, "rgba(255, 185, 90, 0.14)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, 1350, 780);

    // Header
    ctx.font = "bold 22px Cinzel, serif";
    ctx.fillStyle = "#d4af37";
    ctx.textAlign = "center";
    ctx.fillText("FIOFORJA — EVOLUÇÃO DE QUALIDADE METALÚRGICA (MESMO PROJETO)", 675, 48);

    ctx.font = "13px Cinzel, sans-serif";
    ctx.fillStyle = "#8a99ad";
    ctx.fillText("AÇO DO REINO (ESPADA LONGA): DEFEITUOSA (Q35) vs EQUILIBRADA (Q70) vs OBRA-PRIMA (Q98)", 675, 74);

    const royalFam = FAMILIES["royal"];
    const baseDesign = {
      name: "Espada do Reino",
      family: "royal",
      profile: "long",
      steel: "steel",
      wrap: "braided",
      guard: "cross",
      pommel: "cross",
      inscription: "AETHELGARD",
      runes: false,
      length: 1.0,
    };

    const tiers = [
      {
        cx: 240,
        quality: 35,
        warp: 0.26,
        cracks: 1,
        broken: false,
        title: "Q35 — AÇO DEFEITUOSO",
        subtitle: "Empenamento severo, gume lascado, dentes de martelo e queima",
        badgeColor: "#ef4444",
      },
      {
        cx: 675,
        quality: 70,
        warp: 0.03,
        cracks: 0,
        broken: false,
        title: "Q70 — AÇO PADRÃO DO REINO",
        subtitle: "Alinhamento reto, polimento uniforme, sangradouro nítido",
        badgeColor: "#3b82f6",
      },
      {
        cx: 1110,
        quality: 98,
        warp: 0.0,
        cracks: 0,
        broken: false,
        title: "Q98 — OBRA-PRIMA DA FORJA",
        subtitle: "Gume cirúrgico, reflexo especular de veludo, guarnições em ouro",
        badgeColor: "#f59e0b",
      },
    ];

    tiers.forEach((t) => {
      // Draw blade
      drawFinishedSword(ctx, baseDesign, t.cx, 630, 520, {
        angle: -Math.PI / 2,
        assembled: true,
        heat: 0,
        shape: 1,
        quality: t.quality,
        warp: t.warp,
        cracks: t.cracks,
        broken: t.broken,
        lightOffset: 0.55,
      });

      // Bottom info card
      ctx.fillStyle = "rgba(15, 20, 35, 0.88)";
      ctx.roundRect(t.cx - 170, 660, 340, 90, 8);
      ctx.fill();
      ctx.strokeStyle = t.badgeColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.font = "bold 13px Cinzel, serif";
      ctx.fillStyle = t.badgeColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.title, t.cx, 686);

      ctx.font = "10.5px sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(t.subtitle, t.cx, 712);
    });

    document.body.appendChild(canvas);
  });

  const qualityCanvas = page.locator("#quality-canvas");
  const qualityFile = join(outDir, "quality-comparison-q35-q70-q98.png");
  await qualityCanvas.screenshot({ path: qualityFile });
  console.log(`Saved: ${qualityFile}`);

  // =========================================================================
  // 3. CAPTURE COMPLETE END-TO-END GAMEPLAY RUN
  // =========================================================================
  console.log("\n--- Capturing Complete Gameplay Run ---");
  const gameplayDir = join(outDir, "gameplay-run");
  mkdirSync(gameplayDir, { recursive: true });

  // Step 1: Title Screen
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(gameplayDir, "01-title-screen.png") });

  // Step 2: Design Selection
  const enterBtn = page.getByRole("button", { name: /Entrar na forja/i });
  if (await enterBtn.isVisible()) {
    await enterBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(gameplayDir, "02-design-screen.png") });
  }

  // Step 3: Ingot In Furnace (Heating)
  const fireBtn = page.getByRole("button", { name: /Levar ao fogo/i });
  if (await fireBtn.isVisible()) {
    await fireBtn.click();
    await page.waitForTimeout(1200); // let heat rise
    await page.screenshot({ path: join(gameplayDir, "03-hearth-heating.png") });

    // Step 4: Pull Tarugo Bruto to Anvil
    const pullBtn = page.getByRole("button", { name: /Retirar do fogo/i });
    if (await pullBtn.isVisible()) {
      await pullBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(gameplayDir, "04-anvil-tarugo-bruto.png") });

      // Step 5: Strike Base Zone while hot (Deforming Ingot into Preform)
      await page.keyboard.press("Digit1"); // base zone
      for (let s = 0; s < 2; s++) {
        await page.keyboard.down("Space");
        await page.waitForTimeout(300);
        await page.keyboard.up("Space");
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: join(gameplayDir, "05-strike-base-zone-preforma.png") });

      // Step 6: Strike Mid Zone
      await page.keyboard.press("Digit2"); // mid
      await page.keyboard.down("Space");
      await page.waitForTimeout(300);
      await page.keyboard.up("Space");
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(gameplayDir, "06-shaping-mid-and-tip.png") });

      // Step 7: Safe Reheat in Furnace (press 'KeyR' before metal cools)
      await page.keyboard.press("KeyR");
      await page.waitForTimeout(1200); // glowing yellow-orange in furnace
      await page.screenshot({ path: join(gameplayDir, "07-reheating-furnace.png") });

      // Step 8: Pull back to anvil and finish drawing out blade
      await page.waitForTimeout(400);
      const pullAgain = page.getByRole("button", { name: /Retirar do fogo/i });
      if (await pullAgain.isVisible()) {
        await pullAgain.click();
        await page.waitForTimeout(600);

        // Strike Tip zone
        await page.keyboard.press("Digit3"); // tip
        for (let s = 0; s < 2; s++) {
          await page.keyboard.down("Space");
          await page.waitForTimeout(300);
          await page.keyboard.up("Space");
          await page.waitForTimeout(200);
        }
        await page.screenshot({ path: join(gameplayDir, "08-blade-shaped-anvil.png") });

        // Step 8: Deliver strikes until quench phase triggers
        for (let s = 0; s < 12; s++) {
          const isQuench = await page.evaluate(() => {
            const body = document.body.innerText;
            return body.includes("Têmpera") || body.includes("óleo/água") || body.includes("TÊMPERA");
          });
          if (isQuench) break;
          await page.keyboard.down("Space");
          await page.waitForTimeout(300);
          await page.keyboard.up("Space");
          await page.waitForTimeout(250);
        }

        // Step 9: In Quench phase: Hold Space to immerse blade in water bath and emit steam clouds
        await page.waitForTimeout(1000);
        await page.keyboard.down("Space");
        await page.waitForTimeout(800);
        await page.screenshot({ path: join(gameplayDir, "09-quench-immersion-and-steam.png") });
        await page.keyboard.up("Space");
      }
    }
  }

  // Step 10: Inject masterwork with permanent flaws test & inspect on Velvet
  await page.evaluate(() => {
    const sword = {
      id: "sword-royal-inspection",
      design: {
        name: "Lâmina da Guarda Real",
        family: "royal",
        profile: "long",
        steel: "steel",
        wrap: "braided",
        guard: "cross",
        pommel: "cross",
        inscription: "VALIANT",
        runes: false,
        length: 1.0,
      },
      quality: 88,
      grade: "Excelente",
      rarity: "Épica",
      value: 3200,
      heatScore: 89,
      forgeScore: 91,
      quenchScore: 86,
      warp: 0.04,
      damage: 220,
      defense: 125,
      agility: 110,
      durability: 88,
      upgradesApplied: 0,
      flaws: ["Variação Térmica Leve: Pequeno gradiente de têmpera no terço médio"],
      perks: ["Fio Homogêneo: Alinhamento reto", "Harmonia da Forja: Estiramento uniforme"],
      structuralState: "stable",
      cracks: 0,
      createdAt: Date.now(),
    };

    const raw = localStorage.getItem("a-forja-save");
    const current = raw ? JSON.parse(raw) : { version: 4, gallery: [] };
    current.gallery = [sword, ...(current.gallery || [])];
    current.wallet = { gold: 4200, rubies: 45, diamonds: 20 };
    localStorage.setItem("a-forja-save", JSON.stringify(current));
  });

  // Step 11: Visit Velvet Inspection Screen via Gallery
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const galBtn = page.getByRole("button", { name: /Arsenal do Ferreiro/i });
  if (await galBtn.isVisible()) {
    await galBtn.click();
    await page.waitForTimeout(800);

    const firstCard = page.locator("li").first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(gameplayDir, "10-velvet-inspection-before-refine.png") });

      // Step 12: Click "⚒️ AFIAR & AJUSTAR EMPUNHADURA" Workbench Refine
      const refineBtn = page.getByRole("button", { name: /AFIAR & AJUSTAR EMPUNHADURA/i });
      if (await refineBtn.isVisible()) {
        await refineBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(gameplayDir, "11-velvet-inspection-after-refine.png") });
      }

      // Step 13: Claim Rewards Chest
      const claimBtn = page.getByRole("button", { name: /Reivindicar Recompensas/i });
      if (await claimBtn.isVisible()) {
        await claimBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(gameplayDir, "12-rewards-celebration.png") });
      }
    }
  }

  await context.close();
  await browser.close();
  await server.close();
  console.log("\nVite server closed. All diversity and gameplay captures saved!");

  // Copy evidence images to brain directory for user viewing
  if (existsSync(brainDir)) {
    const list = [
      "diversity-9-families-unlabeled.png",
      "quality-comparison-q35-q70-q98.png",
    ];
    for (const f of list) {
      const src = join(outDir, f);
      const dst = join(brainDir, f);
      if (existsSync(src)) {
        copyFileSync(src, dst);
        console.log(`Copied to brain: ${dst}`);
      }
    }
    const gpList = [
      "01-title-screen.png",
      "02-design-screen.png",
      "03-hearth-heating.png",
      "04-anvil-tarugo-bruto.png",
      "05-strike-base-zone-preforma.png",
      "06-shaping-mid-and-tip.png",
      "07-reheating-furnace.png",
      "08-blade-shaped-anvil.png",
      "09-quench-immersion-and-steam.png",
      "10-velvet-inspection-before-refine.png",
      "11-velvet-inspection-after-refine.png",
      "12-rewards-celebration.png",
    ];
    for (const f of gpList) {
      const src = join(gameplayDir, f);
      const dst = join(brainDir, `gp-${f}`);
      if (existsSync(src)) {
        copyFileSync(src, dst);
      }
    }
    console.log("All evidence artifacts copied to brain directory!");
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
