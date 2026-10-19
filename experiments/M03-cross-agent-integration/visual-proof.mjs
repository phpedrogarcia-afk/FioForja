#!/usr/bin/env node
// M03 controlled donor/current comparison. Historical M02 evidence is read-only.
// --preflight checks readiness without building, painting, benchmarking or PNGs.
// The final run rebuilds only the ignored current lab .build and writes M03 evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, arch, totalmem, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { build } from '../M02-weapon-dna/build.mjs';
import { startServer } from '../M02-weapon-dna/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CURRENT_LAB = resolve(HERE, '..', 'M02-weapon-dna');
const EVIDENCE = join(HERE, 'evidence');
const DONOR_HASH = '1bec6a443a9a8751a28cbce2467817734d62803809c96829d61f84859f2bd275';
const DONOR_SHA = 'a2fa0025a2e6755c78c42777b3abd1fec4e5572d';
const PRESETS = ['cimitarra_damasco', 'lua_silenciosa', 'queda_asterion'];
const digest = (data) => createHash('sha256').update(data).digest('hex');
const argValue = (args, name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

function chromiumExecutable() {
  const candidates = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, chromium.executablePath()].filter(Boolean);
  const cache = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright');
  if (cache && existsSync(cache)) {
    for (const name of readdirSync(cache).filter((n) => n.startsWith('chromium-')).sort().reverse()) {
      for (const layout of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome']) candidates.push(join(cache, name, layout));
    }
  }
  const executable = candidates.find(existsSync);
  assert.ok(executable, 'Existing Chromium binary required; no browser install is performed');
  return executable;
}

async function verifyBuild(lab, expectedHash) {
  const dir = join(lab, '.build');
  const meta = JSON.parse(await readFile(join(dir, 'build-meta.json'), 'utf8'));
  assert.deepEqual(meta.missingModules, [], 'Build must contain a closed module graph');
  const graph = createHash('sha256');
  for (const file of [...meta.files].sort((a, b) => a.path.localeCompare(b.path))) {
    const content = await readFile(join(dir, file.path));
    assert.equal(content.length, file.bytes, `Build byte count: ${file.path}`);
    assert.equal(digest(content), file.sha256, `Build file hash: ${file.path}`);
    graph.update(file.path); graph.update('\0'); graph.update(content); graph.update('\0');
  }
  assert.equal(graph.digest('hex'), meta.hash, 'Module graph hash must match the files served');
  if (expectedHash) assert.equal(meta.hash, expectedHash, 'Before must be the frozen original donor build');
  return meta;
}

async function preflight(args) {
  const donorRoot = resolve(argValue(args, 'donor-root', join(tmpdir(), 'fioforja-codex05-donor-0663-a2fa')));
  const donorLab = join(donorRoot, 'experiments', 'M02-weapon-dna');
  const donorBuild = await verifyBuild(donorLab, DONOR_HASH);
  for (const file of ['weaponGenome.ts', 'weaponRenderer.ts', 'thumbnailCache.ts']) {
    assert.ok(existsSync(join(ROOT, 'src', 'game', 'visuals', file)), `Current source is missing ${file}`);
  }
  const executable = chromiumExecutable();
  return { schema: 1, status: 'READY', checkedAt: new Date().toISOString(), donorRoot, donorLab,
    donorCommit: DONOR_SHA, donorBuild, currentLab: CURRENT_LAB, executable, presets: PRESETS,
    fixtureQuality: 96, fixtureScores: 96, finalRunExecuted: false,
    outputs: 'Only M03 evidence; ignored current lab .build is regenerated for the final run' };
}

// This function runs entirely in Chromium. Both renderers receive the same JSON inputs.
async function browserProof(config) {
  const load = async (base, thumbnail = false) => {
    const prefix = base + '.build/src/game/';
    const [catalog, genome, renderer, cache] = await Promise.all([
      import(prefix + 'catalog.js'), import(prefix + 'visuals/weaponGenome.js'),
      import(prefix + 'visuals/weaponRenderer.js'), thumbnail ? import(prefix + 'visuals/thumbnailCache.js') : null,
    ]);
    return { catalog, genome, renderer, cache };
  };
  const [before, after] = await Promise.all([load(config.donorUrl), load(config.currentUrl, true)]);
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const fixtures = config.presets.map((id) => {
    const preset = before.catalog.CANONICAL_PRESETS.find((p) => p.id === id);
    const current = after.catalog.CANONICAL_PRESETS.find((p) => p.id === id);
    check(preset && current, 'Missing canonical preset ' + id);
    check(JSON.stringify(preset.design) === JSON.stringify(current.design), 'Preset changed between comparison arms: ' + id);
    const design = structuredClone(preset.design);
    const stats = before.catalog.calculateSwordAttributes(design, 96, 0.015, 96, 96, 96);
    return { id: 'm03-visual-' + id, presetId: id, design, quality: 96, grade: 'Obra-prima',
      heatScore: 96, forgeScore: 96, quenchScore: 96, warp: 0.015, cracks: 0,
      structuralState: 'stable', createdAt: 1, ...stats,
      baseDamage: stats.damage, baseDefense: stats.defense, baseAgility: stats.agility, baseDurability: stats.durability };
  });
  function canvas(width, height, dpr = 1) {
    const node = document.createElement('canvas');
    node.width = Math.ceil(width * dpr); node.height = Math.ceil(height * dpr);
    const ctx = node.getContext('2d');
    check(ctx, 'Canvas 2D unavailable');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { node, ctx, width, height, dpr };
  }
  function direct(target, engine, source) {
    const genome = engine.genome.deriveWeaponVisualGenome(source);
    engine.renderer.drawWeaponGenome(target.ctx, genome,
      engine.renderer.fitWeaponViewport(genome, target.width, target.height), {});
  }
  const pixels = (target) => target.ctx.getImageData(0, 0, target.node.width, target.node.height).data;
  function difference(left, right) {
    const a = pixels(left); const b = pixels(right);
    check(a.length === b.length, 'Pixel arrays have unequal dimensions');
    let changedPixels = 0; let maxChannelDelta = 0;
    for (let i = 0; i < a.length; i += 4) {
      let changed = false;
      for (let c = 0; c < 4; c++) { const delta = Math.abs(a[i + c] - b[i + c]); changed ||= delta !== 0; maxChannelDelta = Math.max(maxChannelDelta, delta); }
      changedPixels += Number(changed);
    }
    return { pixels: a.length / 4, changedPixels, changedRatio: changedPixels / (a.length / 4), maxChannelDelta };
  }
  const images = [];
  for (const source of fixtures) {
    const board = canvas(1000, 800);
    board.ctx.fillStyle = '#101621'; board.ctx.fillRect(0, 0, 1000, 800);
    board.ctx.font = 'bold 23px Segoe UI'; board.ctx.fillStyle = '#e8edf4';
    board.ctx.fillText(source.design.name + ' — q96 / scores96', 26, 36);
    board.ctx.font = '16px Segoe UI'; board.ctx.fillStyle = '#9faec0';
    board.ctx.fillText('BEFORE · frozen donor', 26, 65); board.ctx.fillText('AFTER · current build', 516, 65);
    board.ctx.fillText(config.donorHash.slice(0, 16), 26, 779); board.ctx.fillText(config.currentHash.slice(0, 16), 516, 779);
    for (const [engine, x] of [[before, 20], [after, 510]]) {
      const piece = canvas(470, 680);
      direct(piece, engine, source);
      board.ctx.drawImage(piece.node, x, 83);
    }
    images.push({ file: 'visual-pair-' + source.presetId + '.png', dataUrl: board.node.toDataURL('image/png'), width: 1000, height: 800 });
  }

  // Report exact differences. Never discard a channel delta as if it were zero.
  // A bounded one-level difference is labelled approximate, with controls below.
  const parity = [];
  const cache = after.cache;
  for (const dpr of [1, 2]) {
    for (const source of fixtures) {
      cache.clearWeaponThumbnailCache();
      const raw = canvas(400, 160, dpr); direct(raw, after, source);
      for (const phase of ['cold', 'warm']) {
        const cached = canvas(400, 160, dpr);
        const state = cache.drawWeaponThumbnail(cached.ctx, source, 400, 160, dpr);
        check(state.cacheHit === (phase === 'warm'), 'Wrong cache hit state in pixel parity');
        const diff = difference(raw, cached);
        const repeat = canvas(400, 160, dpr); direct(repeat, after, source);
        const directRepeatControl = difference(raw, repeat);
        const cachedVsRepeat = difference(repeat, cached);
        parity.push({ preset: source.presetId, dpr, phase, ...diff, directRepeatControl, cachedVsRepeat,
          status: diff.changedPixels === 0 ? 'EXACT' : diff.maxChannelDelta <= 1 && cachedVsRepeat.changedPixels === 0 ? 'PARITY_APPROX' : 'FAIL' });
      }
    }
  }

  const invalidations = [];
  const probe = (source, width = 400, height = 160, dpr = 1) => {
    const target = canvas(width, height, Math.min(dpr, 2));
    const result = cache.drawWeaponThumbnail(target.ctx, source, width, height, dpr);
    return { ...result, stats: cache.weaponThumbnailCacheStats(), target };
  };
  cache.clearWeaponThumbnailCache();
  const source = fixtures[0];
  check(!probe(source).cacheHit, 'Initial thumbnail should miss');
  check(probe(source).cacheHit, 'Repeated identical thumbnail should hit');
  const changed = structuredClone(source); changed.design.guard = 'wings';
  changed.installedComponents = { guard: { category: 'guard', componentKey: 'guard_wings_royal', rarity: 'Rara' } };
  for (const [name, args] of [['genome', [changed]], ['width', [source, 402]], ['height', [source, 400, 162]], ['DPR', [source, 400, 160, 2]]]) {
    const result = probe(...args); check(!result.cacheHit, 'Invalidation failed: ' + name);
    invalidations.push({ inputChanged: name, cacheHit: result.cacheHit, stats: result.stats });
  }
  const originalImage = canvas(400, 160); direct(originalImage, after, source);
  const changedImage = probe(changed).target;
  check(difference(originalImage, changedImage).changedPixels > 0, 'Installed guard must visibly change cached pixels');
  const restored = probe(source); check(restored.cacheHit, 'Returning to unchanged source must reuse its entry');
  const restoredPixelDifference = difference(originalImage, restored.target);
  invalidations.push({ inputChanged: 'restore-original', cacheHit: restored.cacheHit, pixelDifference: restoredPixelDifference });
  check(restoredPixelDifference.maxChannelDelta <= 1 && restoredPixelDifference.changedRatio <= 0.0001, 'Old source cache entry became stale');

  cache.clearWeaponThumbnailCache();
  for (let i = 0; i < 97; i++) probe({ ...source, id: 'lru-' + i }, 32, 32);
  const entryBound = cache.weaponThumbnailCacheStats();
  check(entryBound.entries === 96 && entryBound.bytes <= 32 * 1024 * 1024, 'Entry LRU exceeded its bounds');
  check(probe({ ...source, id: 'lru-1' }, 32, 32).cacheHit, 'Expected retained entry was missing');
  check(!probe({ ...source, id: 'lru-0' }, 32, 32).cacheHit, 'Oldest entry was not evicted');
  check(!probe({ ...source, id: 'lru-2' }, 32, 32).cacheHit, 'Reading lru-1 did not update recency');
  cache.clearWeaponThumbnailCache();
  probe({ ...source, id: 'memory-0' }, 1600, 800, 2);
  probe({ ...source, id: 'memory-1' }, 1600, 800, 2);
  const memoryBound = cache.weaponThumbnailCacheStats();
  check(memoryBound.entries === 1 && memoryBound.bytes === 3200 * 1600 * 4, 'Byte-budget LRU failed');
  check(memoryBound.bytes <= 32 * 1024 * 1024, 'Cache exceeded 32 MiB');
  check(!probe({ ...source, id: 'memory-0' }, 1600, 800, 2).cacheHit, 'Byte-budget eviction retained the old entry');
  cache.clearWeaponThumbnailCache();

  // Controlled repaint+full-readback timing. This is not first paint or presented FPS.
  const sources = Array.from({ length: 24 }, (_, i) => ({ ...structuredClone(fixtures[i % fixtures.length]), id: 'gallery-' + i }));
  const targets = Object.fromEntries(['donorDirect', 'currentDirect', 'coldRaster', 'warmRaster'].map((name) => [name, canvas(1400, 900)]));
  const samples = Object.fromEntries(Object.keys(targets).map((name) => [name, []]));
  function gallery(name) {
    const target = targets[name];
    target.ctx.clearRect(0, 0, 1400, 900);
    if (name === 'coldRaster') cache.clearWeaponThumbnailCache();
    const t0 = performance.now();
    for (let i = 0; i < sources.length; i++) {
      const ctx = target.ctx; ctx.save(); ctx.translate(20 + (i % 6) * 225, 20 + Math.floor(i / 6) * 215);
      if (name.endsWith('Raster')) cache.drawWeaponThumbnail(ctx, sources[i], 220, 210, 1);
      else direct({ ctx, width: 220, height: 210 }, name === 'donorDirect' ? before : after, sources[i]);
      ctx.restore();
    }
    const data = pixels(target); // Forces completion/readback of the entire gallery.
    const elapsed = performance.now() - t0;
    return { elapsed, checksum: data[0] + data[data.length - 1] };
  }
  let checksum = 0;
  for (let iteration = -5; iteration < config.samples; iteration++) {
    // Interleaved order reduces drift; warmRaster consumes entries populated by coldRaster.
    for (const name of Object.keys(targets)) {
      const result = gallery(name); checksum += result.checksum;
      if (iteration >= 0) samples[name].push(result.elapsed);
    }
  }
  const statistics = (raw) => {
    const sorted = [...raw].sort((a, b) => a - b);
    const sum = raw.reduce((a, b) => a + b, 0);
    return { n: raw.length, meanMs: sum / raw.length, p50Ms: sorted[Math.floor((raw.length - 1) * 0.5)],
      p95Ms: sorted[Math.ceil(raw.length * 0.95) - 1], minMs: sorted[0], maxMs: sorted.at(-1), totalMs: sum, rawMs: raw };
  };
  targets.currentDirectRepeat = canvas(1400, 900);
  gallery('currentDirectRepeat');
  const benchmark = { unit: 'ms per 24-weapon repaint plus full 1400x900 RGBA readback', warmupIterationsPerArm: 5,
    iterationOrder: Object.keys(targets), canvas: { width: 1400, height: 900, dpr: 1 }, card: { width: 220, height: 210 },
    fixtureCount: sources.length, samplesPerArm: config.samples, cacheGeometry: 'warm',
    contextAttributes: targets.currentDirect.ctx.getContextAttributes?.(),
    metrics: Object.fromEntries(Object.entries(samples).map(([name, raw]) => [name, statistics(raw)])), checksum,
    currentDirectRepeatControl: difference(targets.currentDirect, targets.currentDirectRepeat),
    currentDirectVsColdPixels: difference(targets.currentDirect, targets.coldRaster),
    currentDirectVsWarmPixels: difference(targets.currentDirect, targets.warmRaster) };
  const parityStatus = parity.some((row) => row.status === 'FAIL') ? 'FAIL'
    : parity.some((row) => row.status === 'PARITY_APPROX') ? 'PARITY_APPROX' : 'EXACT';
  cache.clearWeaponThumbnailCache();
  return { fixtures, images, parity, invalidations, lru: { entryBound, memoryBound }, benchmark,
    cacheStatus: parityStatus === 'FAIL' ? 'FAIL' : 'PASS', parityStatus,
    parityEnvelope: { maximumChannelDelta: 1, cachedVsContemporaryDirectMustBeExact: true,
      meaning: 'EXACT reports zero differences. PARITY_APPROX preserves nonzero differences within one channel level AND exact parity against a contemporary repeated direct draw. Direct-repeat drift is reported. Human acceptance remains separate.' },
    visualStatus: 'CAPTURED_FOR_HUMAN_REVIEW', browser: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency } };
}

export async function runProof(args = []) {
  const ready = await preflight(args);
  await mkdir(EVIDENCE, { recursive: true });
  if (args.includes('--preflight')) {
    await writeFile(join(EVIDENCE, 'visual-preflight.json'), JSON.stringify(ready, null, 2) + '\n');
    console.log('[visual-proof] preflight READY; final browser run not executed; donor ' + ready.donorBuild.hash.slice(0, 16));
    return ready;
  }
  const sampleCount = Number(argValue(args, 'samples', '60'));
  assert.ok(Number.isInteger(sampleCount) && sampleCount >= 10 && sampleCount <= 1000, '--samples must be an integer in 10..1000');
  await build({ quiet: true });
  const currentBuild = await verifyBuild(CURRENT_LAB);
  const out = join(EVIDENCE, 'visual-proof-' + new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(out, { recursive: true });
  const servers = [];
  let browser;
  const pageErrors = [];
  try {
    const donor = await startServer({ root: ready.donorLab, quiet: true }); servers.push(donor);
    const current = await startServer({ root: CURRENT_LAB, quiet: true }); servers.push(current);
    browser = await chromium.launch({ executablePath: ready.executable, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    // A JSON page gives an origin without launching the historical visual lab UI.
    await page.goto(current.url + '.build/build-meta.json', { waitUntil: 'load' });
    const result = await page.evaluate(browserProof, { donorUrl: donor.url, currentUrl: current.url, presets: PRESETS,
      donorHash: ready.donorBuild.hash, currentHash: currentBuild.hash, samples: sampleCount });
    assert.deepEqual(pageErrors, [], 'Unexpected page errors');
    const images = [];
    for (const item of result.images) {
      const data = Buffer.from(item.dataUrl.split(',')[1], 'base64');
      assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(data.readUInt32BE(16), item.width); assert.equal(data.readUInt32BE(20), item.height);
      await writeFile(join(out, item.file), data);
      images.push({ file: item.file, width: item.width, height: item.height, bytes: data.length, sha256: digest(data) });
    }
    const manifest = { schema: 1, experiment: 'M03-cross-agent-integration', protocol: 'same-fixtures-donor-current-flushed-canvas-v2',
      generatedAt: new Date().toISOString(), donorCommit: DONOR_SHA, donorBuild: ready.donorBuild, currentBuild,
      environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model, cpuCount: cpus().length,
        totalMemoryGiB: totalmem() / 1024 ** 3, chromium: browser.version(), executable: ready.executable, headless: true, deviceScaleFactor: 1 },
      ...result, images, pageErrors,
      limits: ['Synthetic fixtures are not gameplay evidence.', 'Pixel parity tests DPR 1 and 2 at integer dimensions.',
        'Timing includes full RGBA readback and allocation; it is not first paint, presented frame rate or device reliability.',
        'Visual comparisons include the intentional stable-seed change and require human aesthetic review.',
        'Historical M02 evidence and the frozen donor build were not overwritten.'] };
    await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(join(out, 'benchmark.json'), JSON.stringify({ environment: manifest.environment, donorHash: ready.donorBuild.hash,
      currentHash: currentBuild.hash, ...result.benchmark }, null, 2) + '\n');
    await writeFile(join(EVIDENCE, 'visual-proof-latest.json'), JSON.stringify({ output: out, currentHash: currentBuild.hash, donorHash: ready.donorBuild.hash }, null, 2) + '\n');
    console.log('[visual-proof] cache ' + result.cacheStatus + '; parity ' + result.parityStatus + '; ' + result.parity.length + ' pixel comparisons; 3 visual pairs -> ' + out);
    for (const row of result.parity.filter((item) => item.changedPixels)) console.log(`[visual-proof] ${row.preset} DPR${row.dpr} ${row.phase}: ${row.changedPixels}/${row.pixels} pixels changed; max channel delta ${row.maxChannelDelta}; direct-repeat ${JSON.stringify(row.directRepeatControl)}`);
    for (const [name, stats] of Object.entries(result.benchmark.metrics)) console.log(`[visual-proof] ${name}: mean ${stats.meanMs.toFixed(2)}ms p95 ${stats.p95Ms.toFixed(2)}ms (draw+readback)`);
    assert.notEqual(result.cacheStatus, 'FAIL', 'Cache parity failed its explicit control envelope');
    return manifest;
  } catch (error) {
    await writeFile(join(out, 'failure.json'), JSON.stringify({ status: 'FAIL', error: error.stack ?? String(error), pageErrors,
      donorHash: ready.donorBuild.hash, currentHash: currentBuild.hash }, null, 2) + '\n');
    throw error;
  } finally {
    if (browser) await browser.close();
    for (const server of servers) await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runProof(process.argv.slice(2)).then((result) => { if (result.cacheStatus === 'FAIL') process.exitCode = 1; })
    .catch((error) => { console.error('[visual-proof] FAIL', error); process.exitCode = 1; });
}
