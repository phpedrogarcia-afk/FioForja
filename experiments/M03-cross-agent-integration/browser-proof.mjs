#!/usr/bin/env node
/**
 * Operacao Codex05: real browser journeys, with explicit fixture boundaries.
 * Harvests isolated-context/Chromium discovery from capture-lifecycle-proof and M02.
 * Prepare: node experiments/M03-cross-agent-integration/browser-proof.mjs --preflight
 * Run after runtime edits stop:
 *   node experiments/M03-cross-agent-integration/browser-proof.mjs --run --url http://127.0.0.1:8080
 * Optional: --only A,C,D,B,E,F,G,H --headful --no-video --serve --port 8947
 * No persistent browser profile, direct transaction calls, React state injection,
 * simulation edits or save writes are used during any forge.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const selected = new Set(option('only', 'A,C,D,B,E,F,G,H').split(','));
const SAVE_KEY = 'a-forja-save';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = join(root, 'experiments/M03-cross-agent-integration/evidence/browser', stamp);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const relative = (path) => path.slice(root.length + 1).replaceAll('\\', '/');

function findChromium() {
  const candidates = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, chromium.executablePath()].filter(Boolean);
  const caches = [process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright'),
    process.env.USERPROFILE && join(process.env.USERPROFILE, 'AppData/Local/ms-playwright')].filter(Boolean);
  for (const cache of caches) if (existsSync(cache)) {
    for (const build of readdirSync(cache).filter((s) => /^chromium-/.test(s)).sort().reverse()) {
      for (const layout of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome']) {
        candidates.push(join(cache, build, layout));
      }
    }
  }
  return { executable: candidates.find(existsSync) || null, candidates };
}

function sourceHashes() {
  const files = ['package.json', 'package-lock.json', 'vite.config.ts', 'src/routes/index.tsx'];
  const walk = (dir) => { for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) walk(path); else if (/\.(tsx?|mjs)$/.test(item.name)) files.push(path);
  } };
  walk('src/game');
  return Object.fromEntries(files.sort().map((p) => [p, hash(readFileSync(join(root, p)))]));
}

const discovery = findChromium();
if (flag('preflight') || !flag('run')) {
  console.log(JSON.stringify({ status: discovery.executable ? 'PREPARED_NOT_EXECUTED' : 'BLOCKED_NO_INSTALLED_CHROMIUM',
    root, node: process.version, playwright: JSON.parse(readFileSync(join(root, 'node_modules/playwright/package.json'), 'utf8')).version,
    ...discovery, selected: [...selected], outputWhenRun: out,
    command: 'node experiments/M03-cross-agent-integration/browser-proof.mjs --run --url http://127.0.0.1:8080',
    claims: 'Preflight discovers dependencies only; it does not launch browser/server or prove gameplay.' }, null, 2));
  process.exitCode = discovery.executable ? 0 : 1;
} else {
  await run();
}

async function run() {
  assert(discovery.executable, 'No existing Chromium: set PLAYWRIGHT_CHROMIUM_EXECUTABLE; do not install browsers.');
  let server;
  let url = option('url', 'http://127.0.0.1:8080');
  const parsed = new URL(url);
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname), 'Use only an isolated local proof server.');
  if (flag('serve')) {
    const { createServer } = await import('vite');
    server = await createServer({ root, server: { port: Number(option('port', 8947)), host: '127.0.0.1', strictPort: true } });
    await server.listen();
    url = `http://127.0.0.1:${Number(option('port', 8947))}/`;
  }
  mkdirSync(out, { recursive: true });
  const before = sourceHashes();
  const report = { mission: 'FIOFORJA-CODEX05-BROWSER', status: 'RUNNING', startedAt: new Date().toISOString(),
    url, root, browserExecutable: discovery.executable, viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1, reducedMotion: 'reduce', sourcesBefore: before, cases: [],
    evidenceEnvelope: 'UI inputs drive each forge. Fixture setup, pure genome reads and save observations are explicitly recorded; no fixture output counts as a naturally earned input.' };
  const browser = await chromium.launch({ executablePath: discovery.executable, headless: !flag('headful'),
    args: ['--force-color-profile=srgb', '--disable-lcd-text', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  let live;
  const persist = () => writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));

  async function caseRun(id, provenance, fn) {
    if (!selected.has(id)) return;
    assert.deepEqual(sourceHashes(), before, 'SOURCE_CHANGED: stop edits before the final proof run.');
    const rec = { id, provenance, status: 'RUNNING', startedAt: new Date().toISOString(), observations: [], captures: [] };
    report.cases.push(rec); persist();
    console.log(`[browser-proof] ${id} ${provenance}`);
    try { await fn(rec); rec.status = 'PASS'; }
    catch (error) {
      rec.status = 'FAIL'; rec.error = { message: error.message, stack: error.stack };
      if (live?.page && !live.page.isClosed()) {
        rec.bodyOnFailure = await live.page.locator('body').innerText().catch(() => '');
        await shot(live.page, `${id}-failure`, rec).catch(() => {});
      }
    } finally {
      if (live) {
        rec.pageErrors = live.errors;
        if (live.errors.length) rec.status = 'FAIL';
        await live.context.tracing.stop({ path: join(out, `${id}-trace.zip`) }).catch(() => {});
        await live.context.close(); live = null;
      }
      rec.finishedAt = new Date().toISOString(); persist();
    }
  }

  async function open(rec, mode = 'dna', fixture = null, preferDna = false) {
    assert(!live, 'A case must own a fresh browser context.');
    const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce',
      recordVideo: flag('no-video') ? undefined : { dir: join(out, 'video'), size: { width: 1440, height: 1000 } } });
    await context.tracing.start({ screenshots: true, snapshots: false, sources: false });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    live = { context, page, errors };
    const dest = new URL(url); dest.searchParams.set('weaponRender', mode);
    await page.goto(dest.href, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Entrar na Forja', exact: true }).waitFor();
    await page.waitForTimeout(300);
    if (fixture || preferDna) {
      if (fixture) {
        await seedFixture(page, fixture);
        rec.observations.push({ setup: 'FIXTURE_LOCALSTORAGE_BEFORE_FORGE', fixture });
      }
      if (preferDna) await page.evaluate(() => localStorage.setItem('fioforja.weaponRenderMode', 'dna'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Entrar na Forja', exact: true }).waitFor();
    }
    return page;
  }

  let naturalSave;
  let naturalSword;
  try {
    // A is a dependency of E/F: the exact earned sword stays in this isolated context.
    if (selected.has('E') || selected.has('F')) selected.add('A');
    await caseRun('A', 'REAL_UI_FRESH_CONTEXT_NO_GAMEPLAY_FIXTURE', async (rec) => {
      const page = await open(rec);
      await enterForge(page, false);
      const started = await readSave(page);
      const runId = started.activeForgeAttempt.forgeRunId;
      rec.observations.push({ phase: 'started', attempt: started.activeForgeAttempt, wallet: started.wallet });
      await shot(page, 'A-prepared-heat', rec);
      await driveForge(page, rec, 'A');
      const finished = await readSave(page);
      naturalSword = finished.gallery.find((s) => s.forgeRunId === runId);
      assert(naturalSword && !naturalSword.isTraining && !naturalSword.broken, 'One real UI sword must exist.');
      assert.equal(finished.activeForgeAttempt, null);
      assert.equal(finished.gallery.filter((s) => s.forgeRunId === runId).length, 1);
      await assertRenderer(page, 'dna');
      await shot(page, 'A-E-real-sword-dna-reveal', rec);
      await claimUi(page);
      naturalSave = await readSave(page);
      assert(naturalSave.claimedForgeRewardIds.includes(runId), 'UI claim must persist its run receipt.');
      await shot(page, 'A-claimed-rewards', rec);
      rec.observations.push({ phase: 'finished-and-claimed', sword: naturalSword, save: naturalSave });
      if (selected.has('E') || selected.has('F')) {
        await galleryFromRewards(page);
        await openSword(page, naturalSword.id, naturalSword.design.name);
        const beforeImage = await canvasEvidence(page, 'E-real-sword-before', rec);
        await page.reload({ waitUntil: 'networkidle' });
        await titleGallery(page);
        await openSword(page, naturalSword.id, naturalSword.design.name);
        const afterImage = await canvasEvidence(page, 'E-real-sword-reloaded', rec);
        assert.equal(afterImage.sha256, beforeImage.sha256, 'Unmodified real sword rendering must survive reload.');
        rec.observations.push({ subcase: 'E', status: 'PASS', provenance: 'SAME_REAL_UI_SWORD', beforeImage, afterImage });
      }
      if (selected.has('F')) {
        await page.getByRole('button', { name: /Ver no Arsenal/ }).click();
        await page.getByRole('button', { name: /Oficina/ }).click();
        await page.getByRole('button', { name: /Guarnições & Peças/ }).click();
        const article = page.getByText('Guarda Curva de Falchion', { exact: true })
          .locator('xpath=ancestor::div[.//button[normalize-space()="Comprar"]][1]');
        await article.getByRole('button', { name: 'Comprar', exact: true }).click();
        let save = await readSave(page);
        const purchased = save.inventory.components.find((c) => c.name === 'Guarda Curva de Falchion');
        assert(purchased, 'Component must be bought through real UI.');
        await page.getByRole('button', { name: /^.*Arsenal/ }).first().click();
        await openSword(page, naturalSword.id, naturalSword.design.name);
        const imageBefore = await canvasEvidence(page, 'F-before-component', rec);
        const install = page.getByText(purchased.name, { exact: true })
          .locator('xpath=ancestor::div[.//button[normalize-space()="Instalar"]][1]');
        await install.getByRole('button', { name: 'Instalar', exact: true }).click();
        await poll(async () => (await readSave(page)).gallery.find((s) => s.id === naturalSword.id),
          (s) => s?.installedComponents?.guard?.id === purchased.id, 5000, 'installed guard receipt');
        const imageAfter = await canvasEvidence(page, 'F-after-component', rec);
        assert.notEqual(imageAfter.sha256, imageBefore.sha256, 'Installing a different guard must change the actual canvas.');
        save = await readSave(page); const sword = save.gallery.find((s) => s.id === naturalSword.id);
        const genome = await genomeOf(page, sword);
        await page.reload({ waitUntil: 'networkidle' });
        await titleGallery(page); await openSword(page, sword.id, sword.design.name);
        const reloaded = await canvasEvidence(page, 'F-component-after-reload', rec);
        assert.equal(reloaded.sha256, imageAfter.sha256, 'Component appearance must persist after reload.');
        const loadedSword = (await readSave(page)).gallery.find((s) => s.id === sword.id);
        assert.deepEqual(await genomeOf(page, loadedSword), genome, 'Genome must remain identical after reload.');
        rec.observations.push({ subcase: 'F', status: 'PASS', provenance: 'REAL_UI_FORGED_SWORD_AND_UI_PURCHASE',
          component: purchased, sword: loadedSword, imageBefore, imageAfter, reloaded, genome });
      }
    });

    await caseRun('C', 'FIXTURE_BANKRUPT_INPUT_REAL_TRAINING_UI', async (rec) => {
      const page = await open(rec, 'dna', 'bankrupt');
      const baseline = await readSave(page);
      // The audited shortcut was a single physical strike followed by cancellation.
      await enterForge(page, true);
      await heatAndPull(page); await physicalStrike(page, 0);
      await page.getByRole('button', { name: 'Sair', exact: true }).click();
      const cancelled = await readSave(page);
      assert.equal(cancelled.inventory.materials.scrap, 0, 'Cancelling free training cannot grant salvage.');
      assert.deepEqual(cancelled.wallet, baseline.wallet);
      assert.deepEqual(cancelled.career, baseline.career);
      rec.observations.push({ phase: 'training-cancel-after-one-physical-strike', save: cancelled });
      await shot(page, 'C-training-cancel-no-free-scrap', rec);
      const scraps = [];
      for (let i = 0; i < 3; i++) {
        if (i) await page.getByRole('button', { name: /Forjar Outra/ }).click();
        await enterForge(page, true, i > 0);
        await driveForge(page, rec, `C-training-${i + 1}`);
        const save = await readSave(page);
        assert.deepEqual(save.wallet, baseline.wallet, 'Training must not grant any currency.');
        assert.deepEqual(save.career, baseline.career, 'Training must not evolve career.');
        assert.deepEqual(save.gallery, baseline.gallery, 'Training sword must remain outside regular arsenal.');
        const sword = save.trainingGallery[0];
        assert(sword.isTraining && sword.value === 0 && sword.pendingRewards.items.length === 0);
        assert.equal(sword.pendingRewards.gold + sword.pendingRewards.rubies + sword.pendingRewards.diamonds, 0);
        scraps.push(save.inventory.materials.scrap || 0);
      }
      assert.deepEqual(scraps, [1, 2, 2], 'Recovery must stop at one recyclable retry rather than farm training.');
      await page.getByRole('button', { name: /Ver no Arsenal/ }).click();
      await page.getByRole('button', { name: /Encomendas/ }).click();
      await page.getByRole('button', { name: /Refundir Sucata em Ferro/ }).click();
      const recovered = await readSave(page);
      assert.equal(recovered.inventory.materials.iron_ingot, 1);
      assert.equal(recovered.inventory.materials.scrap, 0);
      rec.observations.push({ scraps, baseline, recovered });
      await shot(page, 'C-bounded-recovery-one-iron', rec);
    });

    await caseRun('D', 'REAL_UI_CHECKPOINT_AND_RELOAD_FRESH_CONTEXT', async (rec) => {
      const page = await open(rec);
      await enterForge(page, false);
      await heatAndPull(page);
      await physicalStrike(page, 0);
      await physicalStrike(page, 1);
      const persisted = await readSave(page);
      const attempt = persisted.activeForgeAttempt;
      const cp = checkpointOf(attempt);
      assert(cp, 'Active attempt must expose its persisted physical checkpoint.');
      await shot(page, 'D-before-reload-last-checkpoint', rec);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByText(/Forja em Andamento Detectada/).waitFor();
      const afterReload = await readSave(page);
      const recoveredCheckpoint = checkpointOf(afterReload.activeForgeAttempt);
      assert(recoveredCheckpoint, 'Reload must retain a valid physical checkpoint.');
      // pagehide may legitimately confirm a newer thermal checkpoint while reloading.
      // No hammer/quench input occurs between these observations: their outcomes stay exact.
      assert(recoveredCheckpoint.revision >= cp.revision, 'Reload cannot roll checkpoint revision back.');
      for (const key of ['phase', 'strikes', 'shape', 'warp', 'integrity', 'cracks', 'broken',
        'structuralState', 'physicalProfile', 'zoneProgress', 'history', 'equippedGear', 'activeCore', 'isTraining']) {
        assert.deepEqual(recoveredCheckpoint.state[key], cp.state[key], `Reload must preserve physical ${key}.`);
      }
      assert.equal(afterReload.activeForgeAttempt.forgeRunId, attempt.forgeRunId);
      await shot(page, 'D-recovery-modal', rec);
      await page.getByRole('button', { name: /Retomar ponto salvo|Continuar Forja|Retomar.*Forja|Restaurar.*Forja/ }).click();
      const hud = await poll(() => readHud(page), (h) => h.phase === 'forge' && h.strikes >= 2, 10000, 'restored forge HUD');
      assert.equal(hud.strikes, attempt.strikesCount, 'Reload must not reset strikes.');
      assert.equal(hud.shape, Math.round(recoveredCheckpoint.state.shape * 100), 'Visible shape must match the persisted checkpoint.');
      assert.equal(hud.integrity, Math.round(recoveredCheckpoint.state.integrity), 'Visible integrity must match the persisted checkpoint.');
      assert(Math.abs(hud.heat - recoveredCheckpoint.state.heat * 100) <= 6, 'Restored heat may cool briefly, but cannot restart from ambient.');
      await shot(page, 'D-restored-physical-state', rec);
      rec.observations.push({ savedAttempt: attempt, checkpointBeforePagehide: cp, recoveredCheckpoint, restoredHud: hud,
        claim: 'The last persisted checkpoint is restored; no promise about unsaved intermediate animation frames.' });
      await driveForge(page, rec, 'D-after-resume');
      const done = await readSave(page);
      assert.equal(done.gallery.filter((s) => s.forgeRunId === attempt.forgeRunId).length, 1);
    });

    await caseRun('B', 'FIXTURE_FOUR_DONORS_UI_FUSION_AND_MANUAL_CORE_FORGE', async (rec) => {
      const page = await open(rec, 'dna', 'fusion-four');
      const initial = await readSave(page);
      await titleGallery(page);
      await page.getByRole('button', { name: /Crisol de Fusão/ }).click();
      for (const sword of initial.gallery) await page.getByText(sword.design.name, { exact: true }).click();
      await shot(page, 'B-fixture-four-donors-selected', rec);
      await page.getByRole('button', { name: /TRANSMUTAR 4 ESPADAS EM NÚCLEO/ }).click();
      const fused = await poll(() => readSave(page), (s) => s.inventory.fusionCores.length === 1, 10000, 'core fusion');
      assert.equal(fused.gallery.length, 0, 'Fusion must produce a core, never a finished sword.');
      const core = fused.inventory.fusionCores[0];
      await shot(page, 'B-core-created-no-final-sword', rec);
      await page.getByRole('button', { name: /LEVAR PARA A BIGORNA AGORA/ }).click();
      await page.getByRole('button', { name: /Retirar do fogo/ }).waitFor();
      const begun = await readSave(page);
      assert.equal(begun.activeForgeAttempt.activeCoreId, core.id);
      assert(begun.activeForgeAttempt.materialConsumed, 'Core forge must reserve its material.');
      assert.equal(begun.inventory.fusionCores.length, 1, 'Core stays reserved until finalization.');
      await driveForge(page, rec, 'B-manual-core-forge');
      const done = await readSave(page);
      assert.equal(done.inventory.fusionCores.length, 0, 'Manual completion must consume the core once.');
      assert.equal(done.gallery.length, 1);
      assert.equal(done.gallery[0].fusionHistory.coreId, core.id);
      rec.observations.push({ fixtureDonors: initial.gallery, core, begunAttempt: begun.activeForgeAttempt, finished: done.gallery[0] });
    });

    await caseRun('E', 'FIXTURE_OLD_SAVE_DNA_LOAD_AND_RELOAD', async (rec) => {
      const page = await open(rec, 'dna', 'old-save');
      await titleGallery(page); await openSword(page, 'fixture-old-sword', 'Fixture save antigo');
      const first = await canvasEvidence(page, 'E-fixture-old-save-dna', rec);
      await page.reload({ waitUntil: 'networkidle' });
      await titleGallery(page); await openSword(page, 'fixture-old-sword', 'Fixture save antigo');
      const second = await canvasEvidence(page, 'E-fixture-old-save-reloaded', rec);
      assert.equal(first.sha256, second.sha256, 'Legacy save weapon must render identically after reload.');
      rec.observations.push({ first, second, naturalSwordSubcase: report.cases.find((c) => c.id === 'A')?.observations.some((o) => o.subcase === 'E') || false });
    });

    await caseRun('F', 'REAL_UI_COMPONENT_SUBCASE_RESULT', async (rec) => {
      const result = report.cases.find((c) => c.id === 'A')?.observations.find((o) => o.subcase === 'F');
      assert(result?.status === 'PASS', 'See A case: real sword component/reload subcase did not pass.');
      rec.observations.push(result);
    });

    await caseRun('G', 'FIXTURE_24_SWORDS_REAL_GALLERY_AND_COMPARATOR_UI', async (rec) => {
      const page = await open(rec, 'dna', 'gallery-24');
      const start = performance.now();
      await titleGallery(page);
      await page.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="dna"]').length === 24);
      const mountMs = performance.now() - start;
      await shot(page, 'G-fixture-24-dna-gallery', rec, true);
      const canvases = await page.locator('li canvas').evaluateAll((list) => list.map((c) => ({ renderer: c.dataset.renderer, width: c.width, height: c.height, data: c.toDataURL() })));
      assert.equal(canvases.length, 24);
      const hashes = canvases.map(({ data, ...c }) => ({ ...c, sha256: hash(data) }));
      assert(new Set(hashes.map((c) => c.sha256)).size > 1, 'Gallery must show distinct weapons.');
      const rafIntervals = await frameIntervals(page);
      await page.getByRole('button', { name: /Comparar Lâminas/ }).click();
      await page.locator('li').filter({ has: page.locator('canvas') }).nth(0).click();
      await page.locator('li').filter({ has: page.locator('canvas') }).nth(1).click();
      await page.getByRole('button', { name: /Comparar Lado a Lado/ }).click();
      await page.getByRole('dialog').waitFor();
      const comparatorModes = await page.getByRole('dialog').locator('canvas').evaluateAll((nodes) => nodes.map((c) => c.dataset.renderer));
      assert.deepEqual(comparatorModes, ['dna', 'dna']);
      await shot(page, 'G-two-distinct-fixture-swords-comparator', rec);
      rec.observations.push({ mountMs, canvases: hashes, rafIntervals, comparatorModes,
        performanceEnvelope: 'One UI gallery mount plus browser frame intervals, not the isolated Canvas benchmark or reliability proof.' });
    });

    await caseRun('H', 'REAL_UI_LEGACY_EXPLICIT_URL_OVERRIDES_STORED_DNA', async (rec) => {
      const page = await open(rec, 'legacy', null, true);
      await enterForge(page, false);
      const id = (await readSave(page)).activeForgeAttempt.forgeRunId;
      await driveForge(page, rec, 'H-legacy-regular');
      await assertRenderer(page, 'legacy');
      await shot(page, 'H-explicit-legacy-real-sword', rec);
      await claimUi(page);
      const save = await readSave(page);
      assert(save.claimedForgeRewardIds.includes(id));
      await galleryFromRewards(page);
      await page.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="legacy"]').length > 0);
      await shot(page, 'H-legacy-real-arsenal', rec);
      rec.observations.push({ runId: id, persistedPreference: await page.evaluate(() => localStorage.getItem('fioforja.weaponRenderMode')), explicitMode: 'legacy', save });
      // Preserve the real journey independently, then use a separately labelled collection fixture.
      rec.observations.push({ realJourneyPageErrors: [...live.errors] });
      assert.equal(live.errors.length, 0, 'Legacy real journey must have no page errors.');
      await live.context.tracing.stop({ path: join(out, 'H-real-journey-trace.zip') });
      await live.context.close(); live = null;
      const fixturePage = await open(rec, 'legacy', 'gallery-24', true);
      await titleGallery(fixturePage);
      await fixturePage.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="legacy"]').length === 24);
      await shot(fixturePage, 'H-fixture-24-explicit-legacy-gallery', rec, true);
      await fixturePage.getByRole('button', { name: /Comparar Lâminas/ }).click();
      await fixturePage.locator('li').filter({ has: fixturePage.locator('canvas') }).nth(0).click();
      await fixturePage.locator('li').filter({ has: fixturePage.locator('canvas') }).nth(1).click();
      await fixturePage.getByRole('button', { name: /Comparar Lado a Lado/ }).click();
      await fixturePage.getByRole('dialog').waitFor();
      const modes = await fixturePage.getByRole('dialog').locator('canvas').evaluateAll((nodes) => nodes.map((c) => c.dataset.renderer));
      assert.deepEqual(modes, ['legacy', 'legacy']);
      await shot(fixturePage, 'H-fixture-two-swords-legacy-comparator', rec);
      rec.observations.push({ provenance: 'FIXTURE_24_NEW_CONTEXT', comparatorModes: modes });
    });
  } finally {
    if (live) { await live.context.close().catch(() => {}); live = null; }
    await browser.close();
    if (server) await server.close();
    report.sourcesAfter = sourceHashes();
    const sourceChanged = JSON.stringify(report.sourcesAfter) !== JSON.stringify(before);
    report.status = sourceChanged ? 'INVALIDATED_SOURCE_CHANGED' : report.cases.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    report.finishedAt = new Date().toISOString();
    report.artifactHashes = Object.fromEntries(readdirSync(out).filter((f) => /\.(png|zip)$/.test(f)).map((f) => [f, hash(readFileSync(join(out, f)))]));
    persist(); console.log(JSON.stringify({ status: report.status, report: join(out, 'report.json'), cases: report.cases.map(({ id, status }) => ({ id, status })) }, null, 2));
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}

async function readSave(page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), SAVE_KEY); }
async function poll(read, predicate, timeout = 10000, label = 'condition') {
  const start = Date.now(); let last;
  while (Date.now() - start < timeout) { last = await read(); if (predicate(last)) return last; await sleep(35); }
  throw new Error(`Timeout waiting for ${label}; last=${JSON.stringify(last)}`);
}
async function shot(page, name, rec, fullPage = false) {
  const path = join(out, `${name}.png`); await page.screenshot({ path, fullPage });
  rec.captures.push({ name, path: relative(path), sha256: hash(readFileSync(path)) });
}
async function enterForge(page, training, alreadyDesign = false) {
  if (!alreadyDesign) await page.getByRole('button', { name: 'Entrar na Forja', exact: true }).click();
  await page.getByRole('button', { name: /Guarda da Fronteira.*Medieval/ }).click();
  await page.getByRole('button', { name: training ? /Treino Básico de Oficina/ : /Levar ao Fogo/ }).click();
  await page.getByRole('button', { name: /Retirar do fogo/ }).waitFor();
}
async function readHud(page) {
  return page.evaluate(() => {
    const ps = [...document.querySelectorAll('p')];
    const text = (label) => ps.find((p) => p.textContent.trim() === label)?.nextElementSibling?.textContent || '';
    const phase = ps.some((p) => p.textContent.trim() === 'Aquecer') ? 'heat' : ps.some((p) => p.textContent.trim() === 'Martelar') ? 'forge' : ps.some((p) => p.textContent.trim() === 'Temperar') ? 'quench' : 'other';
    const meter = document.querySelector('div.relative.h-9');
    return { phase, heat: parseFloat(text('Calor')), shape: parseFloat(text('Forma')), integrity: parseFloat(text('Integridade')),
      strikes: parseInt(text('Golpes').split('/')[0], 10), force: meter ? parseFloat(meter.children[2]?.style.width) / 100 : null,
      center: meter ? parseFloat(meter.children[1]?.style.left) / 100 : null };
  });
}
async function heatAndPull(page) {
  const h = await readHud(page);
  if (h.phase !== 'heat') return;
  await poll(() => readHud(page), (v) => v.heat >= 58, 10000, 'visible heat >=58%');
  await page.getByRole('button', { name: /Retirar do fogo/ }).click();
  await poll(() => readHud(page), (v) => v.phase === 'forge', 5000, 'forge phase');
}
async function physicalStrike(page, index) {
  let hud = await readHud(page);
  if (hud.heat < 58) {
    await page.keyboard.press('KeyR');
    await poll(() => readHud(page), (v) => v.heat >= 74, 6000, 'visible reheat >=74%');
  }
  await page.keyboard.press(['Digit1', 'Digit2', 'Digit3'][index % 3]);
  hud = await readHud(page); const previous = hud.strikes;
  await page.keyboard.down('Space');
  try {
    await page.waitForFunction(() => {
      const meter = document.querySelector('div.relative.h-9');
      if (!meter) return false;
      const force = parseFloat(meter.children[2]?.style.width) / 100;
      const center = parseFloat(meter.children[1]?.style.left) / 100;
      return Number.isFinite(force) && force >= center - 0.045;
    }, null, { timeout: 3000, polling: 'raf' });
  } finally { await page.keyboard.up('Space'); }
  return poll(() => readHud(page), (v) => v.phase !== 'forge' || v.strikes > previous, 6000, 'physical strike reflected in visible HUD');
}
async function driveForge(page, rec, prefix) {
  await heatAndPull(page);
  let hud = await readHud(page); let guard = 0;
  while (hud.phase === 'forge' && guard++ < 12) {
    hud = await physicalStrike(page, Number.isFinite(hud.strikes) ? hud.strikes : guard);
    const save = await readSave(page);
    rec.observations.push({ step: `${prefix}-physical-strike`, hud, attempt: save.activeForgeAttempt, wallet: save.wallet });
  }
  assert.equal(hud.phase, 'quench', 'Physical inputs must reach the quench phase without breaking.');
  await shot(page, `${prefix}-quench-before-input`, rec);
  await page.keyboard.down('Space');
  try {
    await page.waitForFunction(() => {
      const fill = document.querySelector('div.relative.h-4 > div[style*="width"]');
      return fill && parseFloat(fill.style.width) >= 48;
    }, null, { timeout: 4000, polling: 'raf' });
  } finally { await page.keyboard.up('Space'); }
  await page.getByRole('button', { name: /Reivindicar Recompensas/ }).waitFor({ timeout: 15000 });
  await shot(page, `${prefix}-finished-reveal`, rec);
}
async function claimUi(page) {
  await page.getByRole('button', { name: /Reivindicar Recompensas/ }).click();
  await page.getByRole('button', { name: 'CLAIM REWARDS', exact: true }).click();
  await page.getByRole('button', { name: /RECOMPENSAS COLETADAS/ }).waitFor();
}
async function galleryFromRewards(page) { await page.getByRole('button', { name: /Back to Inventory/ }).click(); }
async function titleGallery(page) { await page.getByRole('button', { name: /Arsenal do Ferreiro/ }).click(); }
async function openSword(page, _id, name) {
  await page.locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) }).click();
  await page.locator('canvas').first().waitFor();
  await page.getByRole('button', { name: /Reivindicar Recompensas/ }).waitFor();
}
async function assertRenderer(page, expected) {
  await page.waitForFunction((mode) => document.querySelector('canvas')?.dataset.renderer === mode, expected, { timeout: 8000 });
}
async function canvasEvidence(page, name, rec) {
  await assertRenderer(page, 'dna');
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  await canvas.hover({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.waitForTimeout(100);
  const path = join(out, `${name}.png`); await canvas.screenshot({ path });
  const value = { name, path: relative(path), sha256: hash(readFileSync(path)) };
  rec.captures.push(value); return value;
}
async function genomeOf(page, sword) {
  return page.evaluate(async (s) => {
    const { deriveWeaponVisualGenome } = await import('/src/game/visuals/weaponGenome.ts');
    return deriveWeaponVisualGenome(s);
  }, sword);
}
function checkpointOf(attempt) { return attempt?.simSnapshot || attempt?.checkpoint?.state || attempt?.checkpoint || attempt?.snapshot || null; }
async function frameIntervals(page) {
  const xs = await page.evaluate(() => new Promise((resolveFrames) => {
    const values = []; let last;
    const frame = (now) => { if (last !== undefined) values.push(now - last); last = now;
      if (values.length < 60) requestAnimationFrame(frame); else resolveFrames(values); };
    requestAnimationFrame(frame);
  }));
  const sorted = [...xs].sort((a, b) => a - b);
  return { metric: 'rAF scheduling interval ms', n: xs.length, mean: xs.reduce((a, b) => a + b, 0) / xs.length, p95: sorted[Math.ceil(xs.length * 0.95) - 1], raw: xs };
}
async function seedFixture(page, kind) {
  await page.evaluate(async ({ key, fixtureKind }) => {
    const { defaultSaveData } = await import('/src/game/save.ts');
    const { CANONICAL_PRESETS, FAMILIES } = await import('/src/game/catalog.ts');
    const save = structuredClone(defaultSaveData);
    const make = (n, family = 'iron') => {
      const f = FAMILIES[family];
      return { id: `fixture-${fixtureKind}-${n}`, design: { ...CANONICAL_PRESETS[0].design,
        name: `Fixture ${fixtureKind} ${n + 1}`, family, profile: f.defaultProfile, steel: f.defaultSteel,
        guard: f.defaultGuard, wrap: f.defaultWrap, pommel: f.defaultPommel, inscription: `FIXTURE ${n + 1}` },
        quality: 80 + n % 12, grade: 'Excelente', rarity: 'Comum', heatScore: 80, forgeScore: 85, quenchScore: 80,
        warp: 0, createdAt: 1700000000000 + n, baseDamage: 180 + n, baseDefense: 70, baseAgility: 60,
        baseDurability: 80, damage: 180 + n, defense: 70, agility: 60, durability: 80, combatRole: 'Defensiva',
        forgeRunId: `fixture-run-${fixtureKind}-${n}`, structuralState: 'stable', broken: false, cracks: 0,
        upgradesApplied: 0, history: [], perks: [], affixes: [] };
    };
    if (fixtureKind === 'bankrupt') {
      save.wallet = { gold: 0, rubies: 0, diamonds: 0 };
      save.inventory.materials = Object.fromEntries(Object.keys(save.inventory.materials).map((k) => [k, 0]));
    } else if (fixtureKind === 'fusion-four') {
      save.gallery = Array.from({ length: 4 }, (_, n) => make(n));
      save.wallet = { gold: 2000, rubies: 100, diamonds: 50 };
    } else if (fixtureKind === 'gallery-24') {
      const families = Object.keys(FAMILIES);
      save.gallery = Array.from({ length: 24 }, (_, n) => make(n, families[n % families.length]));
    } else if (fixtureKind === 'old-save') {
      save.version = 2;
      save.gallery = [{ id: 'fixture-old-sword', design: { ...CANONICAL_PRESETS[0].design, name: 'Fixture save antigo' },
        quality: 72, grade: 'Boa', rarity: 'Comum', heatScore: 75, forgeScore: 70, quenchScore: 70, warp: 0,
        createdAt: 1700000000000, damage: 150, defense: 60, agility: 50, durability: 70 }];
      delete save.trainingGallery; delete save.activeForgeAttempt; delete save.claimedForgeRewardIds; delete save.claimedStrikeRewardIds;
    } else throw new Error(`Unknown fixture ${fixtureKind}`);
    localStorage.setItem(key, JSON.stringify(save));
  }, { key: SAVE_KEY, fixtureKind: kind });
}
