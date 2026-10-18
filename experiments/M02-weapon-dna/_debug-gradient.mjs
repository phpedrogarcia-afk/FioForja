import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './serve.mjs';

function findChromium() {
  const cache = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : '';
  if (cache && existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
        const p = join(cache, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  return chromium.executablePath();
}

const server = await startServer({ root: new URL('.', import.meta.url).pathname.replace(/^\//, ''), quiet: true }).catch(async () => await startServer({ root: process.cwd() + '/experiments/M02-weapon-dna' }));
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const page = await browser.newPage();
await page.goto(server.url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__LAB_READY__ === true, null, { timeout: 60000 });
const result = await page.evaluate(async () => {
  const proto = CanvasRenderingContext2D.prototype;
  const guard = (name, original) => function (...args) {
    if (!args.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      const err = new Error('NON-FINITE ' + name + ' args=' + JSON.stringify(args));
      throw err;
    }
    return original.apply(this, args);
  };
  proto.createLinearGradient = guard('createLinearGradient', proto.createLinearGradient);
  proto.createRadialGradient = guard('createRadialGradient', proto.createRadialGradient);
  const renderer = await import('/.build/src/game/visuals/weaponRenderer.js');
  const catalog = await import('/.build/src/game/catalog.js');
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  const source = {
    id: 'debug_1',
    design: { ...catalog.CANONICAL_PRESETS[0].design },
    quality: 90,
    heatScore: 0.8,
    forgeScore: 0.8,
    quenchScore: 0.9,
    warp: 0,
    cracks: 0,
    createdAt: 1,
  };
  try {
    renderer.drawWeaponFromSword(ctx, source, { x: 400, y: 400, lengthPx: 560, angle: -Math.PI / 2 });
    return 'NO ERROR';
  } catch (error) {
    return String(error && error.stack ? error.stack : error);
  }
});
console.log(result);
await browser.close();
await server.close();
