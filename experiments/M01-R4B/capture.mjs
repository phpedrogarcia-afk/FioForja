// M01-R4B: two-viewport, five-state capture of the real playable UI.
// Requires the development server at http://127.0.0.1:8080/.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const out = fileURLToPath(new URL('./evidence/', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const url = 'http://127.0.0.1:8080/';
const phases = ['heat', 'forge-rest', 'forge-charge', 'impact', 'quench'];
const viewports = [[390, 844], [1366, 768]];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const record = {
  branch: 'exp/m01-r4b-new-workspace',
  base: 'f476539f636425973481d6b33062a2fa43367df9',
  url, browser: browser.version(), dpr: 1, seed: 101,
  clock: '2026-10-07T12:00:00Z', design: 'DEFAULT_DESIGN', phases,
  viewports: [],
};

async function open(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(() => {
    let seed = 101;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    window.__r4bFrames = new WeakMap();
    const proto = CanvasRenderingContext2D.prototype;
    const clear = proto.clearRect, translate = proto.translate, image = proto.drawImage;
    proto.clearRect = function (...args) {
      if (this.canvas.isConnected) window.__r4bFrames.set(this.canvas, { awaitOuter: true });
      return clear.apply(this, args);
    };
    proto.translate = function (...args) {
      const frame = window.__r4bFrames.get(this.canvas);
      if (frame?.awaitOuter) { frame.outer = args; frame.awaitOuter = false; }
      return translate.apply(this, args);
    };
    proto.drawImage = function (img, ...args) {
      const frame = window.__r4bFrames.get(this.canvas);
      if (frame && /\/hand(?:-strike)?\.png$/.test(img.src ?? '')) {
        const t = this.getTransform();
        frame.hand = { img, args, matrix: [t.a, t.b, t.c, t.d, t.e, t.f] };
      }
      return image.call(this, img, ...args);
    };
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Entrar na forja' }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
    Object.keys(el).some(k => k.startsWith('__reactProps$') && typeof el[k]?.onClick === 'function')));
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function snapshot(page, phase, width, height) {
  await page.waitForTimeout(25);
  const metric = await page.evaluate(async (phase) => {
    const { drawFinishedSword } = await import('/src/game/swordDraw.ts');
    const { getR4BLayout } = await import('/src/game/ForgeCanvas.tsx');
    const { DEFAULT_DESIGN } = await import('/src/game/catalog.ts');
    const canvas = document.querySelector('canvas');
    const box = canvas.getBoundingClientRect();
    let fiber = canvas[Object.keys(canvas).find(k => k.startsWith('__reactFiber$'))];
    while (fiber && fiber.type?.name !== 'GameApp') fiber = fiber.return;
    let hook = fiber?.memoizedState, hud = null;
    while (hook) {
      if (hook.memoizedState?.phase && 'shape' in hook.memoizedState) hud = hook.memoizedState;
      hook = hook.next;
    }
    if (!hud) throw new Error('Cannot read actual GameApp HUD');
    const expected = { heat: 0, 'forge-rest': 3, 'forge-charge': 3, impact: 4, quench: 8 }[phase];
    if (hud.strikes !== expected) throw new Error(`Stale HUD at ${phase}: ${hud.strikes}`);
    const portrait = box.width < box.height;
    const layout = getR4BLayout(hud.phase, portrait);
    const scale = Math.max(box.width / 1280, box.height / 720);
    const frame = window.__r4bFrames.get(canvas);
    const outer = frame.outer ?? [box.width / 2 - layout.focusX * scale, (box.height - 720 * scale) / 2];
    const args = [DEFAULT_DESIGN, layout.blade.x, layout.blade.y, layout.blade.length,
      { angle: layout.blade.angle, heat: hud.heat, shape: hud.phase === 'heat' ? .12 : hud.shape,
        assembled: false, quality: hud.quality }];
    function mask(w, h, transform) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.setTransform(...transform);
      drawFinishedSword(ctx, ...args); return ctx.getImageData(0, 0, w, h).data;
    }
    const w = Math.round(box.width), h = Math.round(box.height);
    const sword = mask(w, h, [scale, 0, 0, scale, ...outer]);
    const handCanvas = document.createElement('canvas'); handCanvas.width = w; handCanvas.height = h;
    const handCtx = handCanvas.getContext('2d');
    if (frame.hand) {
      handCtx.setTransform(...frame.hand.matrix);
      handCtx.drawImage(frame.hand.img, ...frame.hand.args);
    }
    const hand = handCtx.getImageData(0, 0, w, h).data;
    let visible = 0, overlap = 0;
    for (let i = 3; i < sword.length; i += 4) if (sword[i] >= 128) {
      visible++; if (hand[i] >= 128) overlap++;
    }
    const logical = mask(1280, 720, [1, 0, 0, 1, 0, 0]);
    let full = 0, within = 0;
    const left = -outer[0] / scale, topEdge = -outer[1] / scale;
    const right = left + box.width / scale, bottom = topEdge + box.height / scale;
    for (let y = 0; y < 720; y++) for (let x = 0; x < 1280; x++) {
      if (logical[(y * 1280 + x) * 4 + 3] < 128) continue;
      full++;
      if (x >= left && x < right && y >= topEdge && y < bottom) within++;
    }
    // Conservative quadrilateral on the source asset's flat top (normalized coordinates).
    const top = [[.36, .32], [.85, .18], [.95, .25], [.42, .44]];
    function inside(point, poly) {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > point[1]) !== (yj > point[1]) &&
          point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    }
    const contact = layout.impact;
    const localContact = contact && [
      (contact[0] - layout.anvil.x) / layout.anvil.size,
      (contact[1] - layout.anvil.y) / layout.anvil.size,
    ];
    const anchor = contact && [contact[0] * scale + outer[0], contact[1] * scale + outer[1]];
    return {
      phase, width: w, height: h, hud: { phase: hud.phase, strikes: hud.strikes,
        shape: hud.shape, heat: hud.heat, force: hud.force },
      layout, outer, scale,
      bladeVisibleFraction: full ? within / full : 0,
      bladePixelsVisible: visible, bladePixelsFullLogical: full,
      overlapFraction: visible ? overlap / visible : 0,
      impactAnchor: anchor,
      impactAnchorInsideViewport: !!anchor && anchor[0] >= 0 && anchor[0] < w && anchor[1] >= 0 && anchor[1] < h,
      anvilContactValid: localContact && inside(localContact, top),
      contactTopPolygonNormalized: top,
      handSource: frame.hand?.img.src.split('/').at(-1) ?? null,
    };
  }, phase);
  const file = `${width}x${height}-${phase}.jpeg`;
  writeFileSync(join(out, file), await page.screenshot({ type: 'jpeg', quality: 86 }));
  return { ...metric, file };
}

try {
  for (const [width, height] of viewports) {
    const { context, page } = await open(width, height);
    await page.clock.install({ time: new Date(record.clock) });
    await page.clock.pauseAt(new Date('2026-10-07T12:00:01Z'));
    await page.getByRole('button', { name: 'Entrar na forja' }).click({ force: true });
    await page.clock.runFor(100);
    await page.getByRole('button', { name: 'Levar ao fogo' }).waitFor();
    await page.getByRole('button', { name: 'Levar ao fogo' }).click({ force: true });
    await page.clock.runFor(3400);
    const frames = [await snapshot(page, 'heat', width, height)];
    await page.getByRole('button', { name: 'Retirar do fogo' }).click({ force: true });
    await page.clock.runFor(100);
    const strike = async () => {
      await page.keyboard.down('Space'); await page.clock.runFor(570);
      await page.keyboard.up('Space'); await page.clock.runFor(600);
    };
    for (let i = 0; i < 3; i++) await strike();
    frames.push(await snapshot(page, 'forge-rest', width, height));
    await page.keyboard.down('Space'); await page.clock.runFor(570);
    frames.push(await snapshot(page, 'forge-charge', width, height));
    await page.keyboard.up('Space'); await page.clock.runFor(128);
    frames.push(await snapshot(page, 'impact', width, height));
    await page.clock.runFor(600);
    for (let i = 0; i < 4; i++) await strike();
    await page.keyboard.down('Space'); await page.clock.runFor(650);
    frames.push(await snapshot(page, 'quench', width, height));
    record.viewports.push({ width, height, frames });
    console.log('captured', width + 'x' + height);
    await context.close();
  }
  record.sourceHashes = Object.fromEntries([
    'src/game/ForgeCanvas.tsx', 'src/game/assets.ts', 'src/game/swordDraw.ts',
    'public/game/experimental/r4b-forge-bg.png', 'public/game/experimental/r4b-anvil.png',
    'experiments/M01-R4B/capture.mjs',
  ].map(path => [path, hash(readFileSync(join(root, path)))]));
  writeFileSync(join(out, 'measurements.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record.viewports.map(v => ({
    viewport: v.width + 'x' + v.height,
    frames: v.frames.map(f => ({ phase: f.phase, visible: f.bladeVisibleFraction,
      overlap: f.overlapFraction, impactAnchor: f.impactAnchor,
      impactInside: f.impactAnchorInsideViewport, contact: f.anvilContactValid }))
  })), null, 2));
} finally {
  await browser.close();
}
