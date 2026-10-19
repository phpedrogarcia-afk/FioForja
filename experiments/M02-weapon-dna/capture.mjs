#!/usr/bin/env node
// Playwright evidence capture for the M02 Weapon DNA lab.
//
// Builds the transpiled module graph, serves experiments/M02-weapon-dna/ on an
// ephemeral port, renders each matrix through window.__lab, screenshots every
// canvas at deviceScaleFactor 1 and writes evidence/<matrix-id>.png plus
// evidence/manifest.json (sizes, hashes, timings, render mode, warnings).
//
// Usage:
//   node experiments/M02-weapon-dna/capture.mjs
//   node experiments/M02-weapon-dna/capture.mjs --mode=dna
//   node experiments/M02-weapon-dna/capture.mjs --mode=legacy
//   node experiments/M02-weapon-dna/capture.mjs --only=A,G --no-build

import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { startServer } from './serve.mjs';
import { runBenchmark } from './bench.mjs';

const LAB_DIR = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(LAB_DIR, 'evidence');
const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const value = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const requestedMode = value('mode', 'auto');
const onlyArg = value('only', '');
const only = onlyArg.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const skipBuild = flag('no-build');

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

await mkdir(EVIDENCE_DIR, { recursive: true });

let buildMeta;
if (skipBuild) {
  buildMeta = JSON.parse(await readFile(join(LAB_DIR, '.build', 'build-meta.json'), 'utf8'));
  console.log('[capture] build skipped; using hash ' + buildMeta.hash.slice(0, 12));
} else {
  buildMeta = await build();
}

// Playwright 1.63 (junctioned node_modules) expects chromium-1243, while the
// machine cache has chromium-1228. Both are Chromium; resolve a real binary from
// the cache instead of running playwright install.
function findChromiumExecutable() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) candidates.push(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE);
  candidates.push(chromium.executablePath());
  const cacheRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : null;
  if (cacheRoot && existsSync(cacheRoot)) {
    const builds = readdirSync(cacheRoot)
      .filter((entry) => entry.startsWith('chromium-'))
      .sort()
      .reverse();
    const layouts = ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome'];
    for (const build of builds) {
      for (const layout of layouts) {
        const candidate = join(cacheRoot, build, ...layout.split('/'));
        if (existsSync(candidate)) candidates.push(candidate);
      }
    }
  }
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

const executable = findChromiumExecutable();
if (!executable) {
  throw new Error('No Chromium binary found. Checked ' + chromium.executablePath() + ' and the %LOCALAPPDATA%\\ms-playwright cache; set PLAYWRIGHT_CHROMIUM_EXECUTABLE to override.');
}

if (flag('bench')) {
  const result = await runBenchmark({ buildMeta });
  console.log('[capture] --bench complete: ' + result.metrics.galleryDna.iterations + ' gallery frames, build ' + buildMeta.hash.slice(0, 12) + '; evidence PNGs untouched.');
  process.exit(0);
}

const serverInfo = await startServer({ root: LAB_DIR });
const pageErrors = [];
const consoleErrors = [];
let browser;
let exitCode = 0;

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: executable,
    args: ['--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars'],
  });
  const context = await browser.newContext({
    viewport: { width: 2200, height: 1700 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => pageErrors.push('pageerror: ' + String(err && err.message ? err.message : err)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push('console: ' + message.text());
  });

  const startedAt = Date.now();
  await page.goto(serverInfo.url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__LAB_READY__ === true, null, { timeout: 60000 });
  const bootMs = Date.now() - startedAt;

  const labError = await page.evaluate(() => window.__LAB_ERROR__ || null);
  if (labError) throw new Error('lab boot error: ' + labError);

  const diagnostics = await page.evaluate(() => window.__lab.diagnostics());
  let mode = requestedMode;
  if (mode === 'auto') mode = diagnostics.dnaReady ? 'dna' : 'legacy';
  if (mode !== 'legacy' && mode !== 'dna') throw new Error('invalid --mode: ' + mode);
  if (mode === 'dna' && !diagnostics.dnaReady) {
    throw new Error('DNA renderer requested but unavailable: ' + (diagnostics.dnaError || 'unknown'));
  }
  await page.evaluate((nextMode) => window.__lab.setMode(nextMode), mode);

  let matrices = await page.evaluate(() => window.__lab.listMatrices());
  if (only.length > 0) {
    const known = new Set(matrices.map((m) => m.id));
    for (const id of only) if (!known.has(id)) throw new Error('unknown matrix id: ' + id);
    matrices = matrices.filter((m) => only.includes(m.id));
  } else if (!diagnostics.dnaReady) {
    // Legacy baseline milestone: matrix G already contains the legacy column.
    console.log('[capture] DNA engine unavailable -> capturing legacy baseline only (matrix G included).');
  }

  const records = [];
  for (const matrix of matrices) {
    const info = await page.evaluate((id) => window.__lab.renderMatrix(id), matrix.id);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // Exact backing-store pixels, independent of CSS layout / viewport scroll.
    const dataUrl = await page.evaluate(() => document.getElementById('matrix-canvas').toDataURL('image/png'));
    const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    const file = join(EVIDENCE_DIR, matrix.id + '.png');
    await writeFile(file, buffer);
    const size = pngSize(buffer);
    if (size.width !== info.width || size.height !== info.height) {
      throw new Error('PNG size mismatch for ' + matrix.id + ': ' + size.width + 'x' + size.height + ' != ' + info.width + 'x' + info.height);
    }
    if (info.inkRatio < 0.002) {
      pageErrors.push('matrix ' + matrix.id + ' appears blank (inkRatio ' + info.inkRatio + ')');
    }
    const renderErrors = info.items.filter((item) => item.error);
    for (const item of renderErrors) pageErrors.push('matrix ' + matrix.id + ': ' + item.label + ' -> ' + item.error);

    records.push({
      id: matrix.id,
      title: info.title,
      subtitle: info.subtitle,
      file: 'evidence/' + matrix.id + '.png',
      width: size.width,
      height: size.height,
      bytes: buffer.length,
      renderer: info.mode,
      inkRatio: info.inkRatio,
      itemCount: info.items.length,
      items: info.items.map((item) => ({
        label: item.label,
        mode: item.mode,
        missing: !!item.missing,
        bbox: item.bbox || null,
        scale: item.scale == null ? null : item.scale,
        clipped: !!item.clipped,
        fitted: !!item.fitted,
        error: item.error || null,
      })),
      warnings: info.warnings,
    });
    const warn = info.warnings.length ? ' warnings=' + info.warnings.length : '';
    console.log('[capture] ' + matrix.id + '  ' + size.width + 'x' + size.height + '  ink=' + (info.inkRatio * 100).toFixed(1) + '%  ' + info.mode + warn + '  -> ' + records[records.length - 1].file);
  }

  const manifest = {
    schema: 1,
    experiment: 'M02-weapon-dna',
    description: 'Weapon DNA visual evidence matrices A-G rendered by the transpiled game renderers',
    generatedAt: new Date().toISOString(),
    renderMode: mode,
    dnaReady: diagnostics.dnaReady,
    dnaError: diagnostics.dnaError || null,
    dnaDetails: diagnostics.dnaDetails || null,
    labUrl: serverInfo.url,
    bootMs: bootMs,
    captureMs: Date.now() - startedAt,
    build: {
      hash: buildMeta.hash,
      builtAt: buildMeta.builtAt,
      moduleCount: buildMeta.moduleCount,
      entries: buildMeta.entries,
      outDir: buildMeta.outDir,
    },
    browser: {
      name: 'chromium',
      version: browser.version(),
      executable: executable,
      headless: true,
      viewport: { width: 2200, height: 1700 },
      deviceScaleFactor: 1,
    },
    captureCommand: 'node experiments/M02-weapon-dna/capture.mjs' + (mode === 'auto' ? '' : ' --mode=' + mode),
    matrices: records,
    warnings: records.flatMap((record) => record.warnings.map((warning) => record.id + ': ' + warning)),
    pageErrors: pageErrors,
    consoleErrors: consoleErrors,
  };

  const manifestPath = join(EVIDENCE_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('[capture] manifest -> experiments/M02-weapon-dna/evidence/manifest.json (' + records.length + ' matrices, build ' + buildMeta.hash.slice(0, 12) + ')');
  if (pageErrors.length > 0) {
    exitCode = 1;
    console.error('[capture] ' + pageErrors.length + ' fatal problem(s):');
    for (const problem of pageErrors) console.error('  - ' + problem);
  }
  if (consoleErrors.length > 0) {
    console.warn('[capture] ' + consoleErrors.length + ' console error(s) recorded in manifest (non-fatal):');
    for (const problem of consoleErrors) console.warn('  - ' + problem);
  }
} catch (err) {
  exitCode = 1;
  console.error('[capture] FAILED: ' + String(err && err.stack ? err.stack : err));
  if (pageErrors.length > 0) for (const problem of pageErrors) console.error('  - ' + problem);
} finally {
  if (browser) await browser.close();
  await serverInfo.close();
}

process.exit(exitCode);
