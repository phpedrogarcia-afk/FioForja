#!/usr/bin/env node
// M02 Weapon DNA - performance benchmark harness.
//
// Measures, inside headless Chromium on a real Canvas 2D context:
//   1. genome derivation          (>= 500 weapons, us/weapon)
//   2. cold geometry build        (>= 200 weapons, cache cleared each iteration, us/weapon)
//   3. cached draw @ 180/420/900  (>= 120 frames each, ms/frame)
//   4. gallery scenario, 24 weapons into one 1400x900 canvas (>= 60 frames, ms/frame)
//   5. the same gallery with the legacy drawFinishedSword renderer (>= 60 frames)
//
// Writes experiments/M02-weapon-dna/evidence/benchmark.json and prints a table.
//
// Usage:
//   node experiments/M02-weapon-dna/bench.mjs
//   node experiments/M02-weapon-dna/bench.mjs --no-build
//   node experiments/M02-weapon-dna/capture.mjs --bench

import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, arch, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { startServer } from './serve.mjs';

export const LAB_DIR = dirname(fileURLToPath(import.meta.url));
export const EVIDENCE_DIR = join(LAB_DIR, 'evidence');

function findChromiumExecutable() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) candidates.push(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE);
  candidates.push(chromium.executablePath());
  const cacheRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : null;
  if (cacheRoot && existsSync(cacheRoot)) {
    const builds = readdirSync(cacheRoot).filter((entry) => entry.startsWith('chromium-')).sort().reverse();
    for (const buildDir of builds) {
      for (const layout of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome']) {
        const candidate = join(cacheRoot, buildDir, ...layout.split('/'));
        if (existsSync(candidate)) candidates.push(candidate);
      }
    }
  }
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

/** Runs inside the browser page. Real Canvas 2D context, no mocks. */
async function benchmarkInPage(config) {
  const modules = await Promise.all([
    import('/.build/src/game/catalog.js'),
    import('/.build/src/game/visuals/weaponGenome.js'),
    import('/.build/src/game/visuals/weaponRenderer.js'),
    import('/.build/src/game/visuals/geometry.js'),
    import('/.build/src/game/swordDraw.js'),
  ]);
  const catalog = modules[0];
  const genomeMod = modules[1];
  const rendererMod = modules[2];
  const geometryMod = modules[3];
  const swordDrawMod = modules[4];
  const now = () => performance.now();
  let sink = 0;

  function stats(samples) {
    const sorted = samples.slice().sort((a, b) => a - b);
    const n = sorted.length;
    let sum = 0;
    for (const value of sorted) sum += value;
    const q = (p) => sorted[Math.min(n - 1, Math.max(0, Math.floor(p * (n - 1))))];
    return {
      iterations: n,
      mean: sum / n,
      min: sorted[0],
      p50: q(0.5),
      p95: q(0.95),
      max: sorted[n - 1],
      totalMs: sum,
      unit: 'ms',
    };
  }

  // --- fixtures: 24 distinct weapons for the gallery / draw benchmarks ------
  const presets = catalog.CANONICAL_PRESETS;
  const qualities = [32, 55, 74, 88, 96];
  const sources = [];
  for (let i = 0; i < config.galleryWeapons; i += 1) {
    const preset = presets[i % presets.length];
    const design = {
      ...preset.design,
      name: preset.design.name + ' #' + i,
      length: 0.86 + (i % 5) * 0.05,
    };
    sources.push({
      id: 'bench_' + i,
      design: design,
      quality: qualities[i % qualities.length],
      heatScore: 0.7 + (i % 4) * 0.07,
      forgeScore: 0.68 + (i % 3) * 0.09,
      quenchScore: 0.7 + (i % 5) * 0.05,
      warp: (i % 4) * 0.045,
      cracks: i % 7 === 0 ? 1 : 0,
      createdAt: 1,
      damage: 35 + ((i * 7) % 60),
      defense: 30 + ((i * 11) % 60),
      agility: 30 + ((i * 13) % 60),
      durability: 60 + ((i * 5) % 40),
      rarity: ['Comum', 'Rara', 'Épica', 'Lendária'][i % 4],
    });
  }
  const genomes = sources.map((source) => genomeMod.deriveWeaponVisualGenome(source));

  // Warm up JIT + geometry cache before measuring.
  for (const genome of genomes) {
    rendererMod.prepareFromGenome(genome);
  }

  // --- 1. genome derivation (batched so the timer resolution is not a factor)
  const genomeSamples = [];
  const genomeCalls = config.genomeIterations;
  const genomeBatch = 10;
  for (let batch = 0; batch < Math.floor(genomeCalls / genomeBatch); batch += 1) {
    const t0 = now();
    for (let k = 0; k < genomeBatch; k += 1) {
      const source = sources[(batch * genomeBatch + k) % sources.length];
      sink += genomeMod.deriveWeaponVisualGenome(source).seed;
    }
    genomeSamples.push(((now() - t0) * 1000) / genomeBatch); // us/weapon
  }

  // --- 2. cold geometry build (cache cleared before every iteration) --------
  const coldSamples = [];
  const coldCalls = config.coldGeometryIterations;
  const coldBatch = 4;
  for (let batch = 0; batch < Math.floor(coldCalls / coldBatch); batch += 1) {
    const t0 = now();
    for (let k = 0; k < coldBatch; k += 1) {
      const genome = genomes[(batch * coldBatch + k) % genomes.length];
      rendererMod.clearWeaponGeometryCache();
      const prepared = rendererMod.prepareFromGenome(genome);
      sink += prepared.geometry.blade.outline.length;
    }
    coldSamples.push(((now() - t0) * 1000) / coldBatch);
  }

  // --- 3. cached draw at the three reading sizes ----------------------------
  const cachedDraw = {};
  for (const lengthPx of config.drawSizes) {
    const side = Math.ceil(lengthPx * 1.8) + 80;
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    const genome = genomes[0];
    rendererMod.prepareFromGenome(genome); // warm the cache
    const viewport = { x: side * 0.5, y: side * 0.82, lengthPx: lengthPx, angle: -Math.PI / 2 };
    rendererMod.drawWeaponGenome(ctx, genome, viewport); // warm-up frame
    const samples = [];
    for (let frame = 0; frame < config.drawFrames; frame += 1) {
      ctx.clearRect(0, 0, side, side);
      const t0 = now();
      rendererMod.drawWeaponGenome(ctx, genome, viewport);
      samples.push(now() - t0);
    }
    cachedDraw['cachedDraw@' + lengthPx + 'px'] = {
      ...stats(samples),
      unit: 'ms/frame',
      canvas: { width: side, height: side },
      lengthPx: lengthPx,
    };
  }

  // --- 4. gallery scenario (24 weapons, one 1400x900 canvas) ---------------
  const galleryWidth = config.galleryWidth;
  const galleryHeight = config.galleryHeight;
  const columns = 6;
  const rows = Math.ceil(sources.length / columns);
  const cellW = galleryWidth / columns;
  const cellH = galleryHeight / rows;
  const galleryCanvas = document.createElement('canvas');
  galleryCanvas.width = galleryWidth;
  galleryCanvas.height = galleryHeight;
  const galleryCtx = galleryCanvas.getContext('2d');

  const boxW = cellW * 0.92;
  const boxH = cellH * 0.92;
  const dnaViewports = genomes.map((genome, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const fitted = rendererMod.fitWeaponViewport(genome, boxW, boxH);
    return {
      x: col * cellW + (cellW - boxW) / 2 + fitted.x,
      y: row * cellH + (cellH - boxH) / 2 + fitted.y,
      lengthPx: fitted.lengthPx,
      angle: fitted.angle,
    };
  });

  const dnaGallerySamples = [];
  for (let frame = 0; frame < config.galleryFrames; frame += 1) {
    galleryCtx.clearRect(0, 0, galleryWidth, galleryHeight);
    const t0 = now();
    for (let index = 0; index < genomes.length; index += 1) {
      rendererMod.drawWeaponGenome(galleryCtx, genomes[index], dnaViewports[index]);
    }
    dnaGallerySamples.push(now() - t0);
  }

  // --- 5. legacy renderer, same gallery scenario ---------------------------
  const legacyOpts = sources.map((source) => ({
    angle: -Math.PI / 2.15,
    quality: source.quality,
    warp: source.warp,
    cracks: source.cracks,
  }));
  const legacyLengthPx = cellH * 0.56;
  const legacyGallerySamples = [];
  for (let frame = 0; frame < config.galleryFrames; frame += 1) {
    galleryCtx.clearRect(0, 0, galleryWidth, galleryHeight);
    const t0 = now();
    for (let index = 0; index < sources.length; index += 1) {
      const col = index % columns;
      const row = Math.floor(index / columns);
      swordDrawMod.drawFinishedSword(
        galleryCtx,
        sources[index].design,
        cellW * (col + 0.5),
        cellH * (row + 0.5) + cellH * 0.38,
        legacyLengthPx,
        legacyOpts[index],
      );
    }
    legacyGallerySamples.push(now() - t0);
  }

  const dnaStats = stats(dnaGallerySamples);
  const legacyStats = stats(legacyGallerySamples);
  return {
    engine: {
      dnaReady: true,
      genomeExports: Object.keys(genomeMod).length,
      rendererExports: Object.keys(rendererMod).length,
      geometryExports: Object.keys(geometryMod).length,
    },
    counts: {
      genomeIterations: genomeCalls,
      coldGeometryIterations: coldCalls,
      drawFramesPerSize: config.drawFrames,
      galleryFrames: config.galleryFrames,
      galleryWeapons: sources.length,
      canvas: {
        cachedDraw: 'side = ceil(lengthPx * 1.8) + 80',
        gallery: { width: galleryWidth, height: galleryHeight },
      },
    },
    metrics: {
      // Stats are computed over batches (timer resolution); iterations is the
      // real number of weapons measured.
      genomeDerivation: { ...stats(genomeSamples), iterations: genomeCalls, batches: genomeSamples.length, unit: 'us/weapon', samples: genomeSamples },
      coldGeometryBuild: { ...stats(coldSamples), iterations: coldCalls, batches: coldSamples.length, unit: 'us/weapon', samples: coldSamples },
      ...cachedDraw,
      galleryDna: { ...dnaStats, unit: 'ms/frame', perWeaponMs: dnaStats.mean / sources.length, samples: dnaGallerySamples },
      galleryLegacy: { ...legacyStats, unit: 'ms/frame', perWeaponMs: legacyStats.mean / sources.length, samples: legacyGallerySamples },
    },
    checksum: sink >>> 0,
  };
}

function fmt(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return value >= 100 ? value.toFixed(1) : value.toFixed(2);
}

function printTable(metrics) {
  const rows = [];
  for (const [name, metric] of Object.entries(metrics)) {
    rows.push({
      metric: name,
      unit: metric.unit,
      n: metric.iterations,
      mean: fmt(metric.mean),
      p50: fmt(metric.p50),
      p95: fmt(metric.p95),
      max: fmt(metric.max),
    });
  }
  const columns = [
    ['metric', 'metric'],
    ['unit', 'unit'],
    ['n', 'n'],
    ['mean', 'mean'],
    ['p50', 'p50'],
    ['p95', 'p95'],
    ['max', 'max'],
  ];
  const widths = columns.map(([, key]) => Math.max(key.length, ...rows.map((row) => String(row[key]).length)));
  const line = (values) => values.map((value, index) => String(value).padEnd(widths[index])).join('  ');
  console.log('[bench] ' + line(columns.map(([label]) => label)));
  console.log('[bench] ' + widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log('[bench] ' + line(columns.map(([, key]) => row[key])));
  }
}

/**
 * Build (unless skipped), serve the lab, benchmark in headless Chromium and
 * write evidence/benchmark.json.
 */
export async function runBenchmark(options = {}) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const buildMeta = options.buildMeta ?? (await build());
  const executable = findChromiumExecutable();
  if (!executable) throw new Error('No Chromium binary found (set PLAYWRIGHT_CHROMIUM_EXECUTABLE)');

  const config = {
    genomeIterations: 520,
    coldGeometryIterations: 220,
    drawFrames: 120,
    drawSizes: [180, 420, 900],
    galleryFrames: 60,
    galleryWeapons: 24,
    galleryWidth: 1400,
    galleryHeight: 900,
  };

  const serverInfo = await startServer({ root: LAB_DIR, quiet: true });
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: executable,
      args: ['--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars'],
    });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));
    await page.goto(serverInfo.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__LAB_READY__ === true, null, { timeout: 60000 });
    const diagnostics = await page.evaluate(() => window.__lab.diagnostics());
    if (!diagnostics.dnaReady) throw new Error('DNA engine unavailable: ' + (diagnostics.dnaError || 'unknown'));

    console.log('[bench] running in headless Chromium ' + browser.version() + ' (deviceScaleFactor 1)');
    const startedAt = Date.now();
    const raw = await page.evaluate(benchmarkInPage, config);
    const wallMs = Date.now() - startedAt;

    const result = {
      schema: 1,
      experiment: 'M02-weapon-dna',
      artifact: 'performance-benchmark',
      generatedAt: new Date().toISOString(),
      config: config,
      environment: {
        node: process.version,
        platform: platform(),
        arch: arch(),
        cpu: (cpus()[0] && cpus()[0].model) || 'unknown',
        cpuCount: cpus().length,
        totalMemoryGiB: Math.round((totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
      },
      browser: {
        name: 'chromium',
        version: browser.version(),
        executable: executable,
        headless: true,
        deviceScaleFactor: 1,
        viewport: { width: 1600, height: 1000 },
      },
      build: {
        hash: buildMeta.hash,
        builtAt: buildMeta.builtAt,
        moduleCount: buildMeta.moduleCount,
      },
      labUrl: serverInfo.url,
      benchmarkWallMs: wallMs,
      engine: raw.engine,
      counts: raw.counts,
      metrics: raw.metrics,
      pageErrors: pageErrors,
      notes: [
        'All measurements run in headless Chromium on a real Canvas 2D context (no mocks).',
        'Genome derivation and cold geometry build are batched so timer resolution is not a factor.',
        'Cold geometry build clears the renderer geometry cache before every weapon.',
        'Cached draw uses a pre-warmed geometry cache at lengthPx 180/420/900 (120 frames each).',
        'Gallery scenario: 24 distinct weapons drawn into one 1400x900 offscreen canvas, 60 frames.',
        'Legacy comparison uses drawFinishedSword in the same 1400x900 gallery layout.',
      ],
    };

    const benchmarkPath = join(EVIDENCE_DIR, 'benchmark.json');
    await writeFile(benchmarkPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    printTable(result.metrics);
    console.log('[bench] build ' + buildMeta.hash.slice(0, 12) + ' · ' + wallMs + 'ms wall · -> experiments/M02-weapon-dna/evidence/benchmark.json');
    if (pageErrors.length > 0) {
      console.error('[bench] page errors: ' + pageErrors.join('; '));
      throw new Error('page errors during benchmark');
    }
    return result;
  } finally {
    if (browser) await browser.close();
    await serverInfo.close();
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const noBuild = process.argv.includes('--no-build');
  let buildMeta;
  if (noBuild) {
    buildMeta = JSON.parse(await readFile(join(LAB_DIR, '.build', 'build-meta.json'), 'utf8'));
  }
  runBenchmark({ buildMeta: buildMeta }).catch((err) => {
    console.error('[bench] FAILED', err);
    process.exitCode = 1;
  });
}
