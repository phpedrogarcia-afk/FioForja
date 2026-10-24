#!/usr/bin/env node
/**
 * Emulator-only Capacitor proof. Requires Node 24 (native WebSocket).
 * Install the debug APK separately, then run:
 * node scripts/android-proof.mjs --run --serial emulator-5554
 * Harvest: experiments/M03-cross-agent-integration/browser-proof.mjs HUD,
 * physical strike, quench, receipt and checkpoint assertions. No fixture setup.
 * No installation, app-data cleanup, storage writes, transaction calls or React injection.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const serial = option('serial', process.env.ANDROID_SERIAL);
const app = 'com.projetofio.fioforja';
const component = `${app}/.MainActivity`;
const sdk = process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const out = join(root, 'APK', 'evidence', new Date().toISOString().replace(/[:.]/g, '-') + `-${process.pid}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const errorInfo = (error) => ({ message: error.message, stack: error.stack, code: error.code, signal: error.signal,
  stderr: error.stderr?.toString(), stdout: error.stdout?.toString() });
const relevant = (save) => ({ gallery: save?.gallery || [], wallet: save?.wallet || null,
  forgeReceipts: save?.claimedForgeRewardIds || [], strikeReceipts: save?.claimedStrikeRewardIds || [] });
const checkpointOf = (attempt) => attempt?.snapshot || attempt?.simSnapshot || attempt?.checkpoint || null;
const stableFields = ['phase', 'strikes', 'shape', 'warp', 'integrity', 'cracks', 'broken',
  'structuralState', 'physicalProfile', 'zoneProgress', 'history', 'equippedGear', 'activeCore', 'isTraining'];

if (!argv.includes('--run')) {
  console.log(JSON.stringify({ status: 'PREPARED_NOT_EXECUTED', adb, package: app,
    command: 'node scripts/android-proof.mjs --run --serial emulator-5554',
    requirements: 'Dedicated emulator, installed debug APK, accessible WebView CDP; no installation or save seeding is performed.',
    evidenceWhenRun: out }, null, 2));
} else {
  await run();
}

async function poll(read, predicate, timeout = 12000, label = 'condition') {
  const until = Date.now() + timeout; let last;
  while (Date.now() < until) { last = await read(); if (predicate(last)) return last; await sleep(40); }
  throw new Error(`Timeout: ${label}; last=${JSON.stringify(last)}`);
}

async function run() {
  assert(serial && /^emulator-\d+$/.test(serial), 'Specify the dedicated emulator serial; physical/network device serials are refused.');
  assert(existsSync(adb), `ADB missing: ${adb}`);
  const command = (args, binary = false) => execFileSync(adb, ['-s', serial, ...args], {
    encoding: binary ? undefined : 'utf8', timeout: 25000, maxBuffer: 12 * 1024 * 1024, windowsHide: true,
  });
  const shell = (...args) => command(['shell', ...args]).trim();
  // Refuse a non-emulator before the first state mutation.
  assert.equal(shell('getprop', 'ro.kernel.qemu'), '1', 'REFUSED: ro.kernel.qemu must equal 1.');
  assert.match(shell('pm', 'path', app), /^package:/, 'Install the debug APK before running this harness.');
  mkdirSync(dirname(out), { recursive: true }); mkdirSync(out);
  const report = { mission: 'FIOFORJA-ANDROID-EMULATOR-PROOF', status: 'RUNNING', serial, app,
    startedAt: new Date().toISOString(), cases: [], captures: [], launches: [], metrics: {}, pageErrors: [], consoleErrors: [],
    remoteRequestMonitoring: 'NOT_COLLECTED', evidenceEnvelope: 'One dedicated Android emulator; native ADB touch inputs and read-only CDP save/HUD observations. No claim about Poco hardware, physical audibility or reliability across devices.' };
  const persist = () => writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  const saveText = (name, value) => { writeFileSync(join(out, name), value); return name; };
  const guard = () => assert.equal(shell('getprop', 'ro.kernel.qemu'), '1', 'Emulator identity changed.');
  let socket, page, cdp, port, logProcess, logStream, nativeBounds, nativeTouch, touchHeld = false;
  let previousAirplane, previousWifi, previousData, networkTouched = false;

  async function step(id, action) {
    const entry = { id, status: 'RUNNING', startedAt: new Date().toISOString() };
    report.cases.push(entry); persist(); console.log(`[android-proof] ${id}`);
    try { entry.observations = await action(); entry.status = 'PASS'; return entry.observations; }
    catch (error) { entry.status = 'FAIL'; entry.error = errorInfo(error); throw error; }
    finally { entry.finishedAt = new Date().toISOString(); persist(); }
  }
  async function shot(name) {
    const file = `${name}.png`;
    const bytes = await page.screenshot({ path: join(out, file) });
    report.captures.push({ name, file, sha256: hash(bytes) }); persist();
  }
  function memory(name) {
    const raw = shell('dumpsys', 'meminfo', app);
    const pss = raw.match(/TOTAL PSS:\s*(\d+)/)?.[1] || raw.match(/^\s*TOTAL\s+(\d+)/m)?.[1];
    const value = { file: saveText(`${name}-meminfo.txt`, raw), totalPssKiB: pss ? Number(pss) : null };
    report.metrics[name] = value; return value;
  }
  function stopLog() {
    logProcess?.kill(); logProcess = null; logStream?.end(); logStream = null;
  }
  function beginLog(pid) {
    stopLog();
    logStream = createWriteStream(join(out, `app-${report.launches.length}-pid-${pid}.log`));
    logProcess = spawn(adb, ['-s', serial, 'logcat', '--pid', pid, '-v', 'threadtime', '-T', '1'], { windowsHide: true });
    logProcess.stdout.pipe(logStream); logProcess.stderr.pipe(logStream, { end: false });
    logProcess.on('error', (error) => { report.logCaptureError = errorInfo(error); persist(); });
  }
  async function connectPage(webSocketUrl) {
    // Android WebView rejects Browser.setDownloadBehavior/context management.
    // A page-target WebSocket avoids the unsupported Browser.* setup entirely.
    socket = new WebSocket(webSocketUrl); const requests = new Map(); let requestId = 0;
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const request = requests.get(message.id); if (!request) return;
        requests.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
        else request.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') report.pageErrors.push(message.params.exceptionDetails);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') report.consoleErrors.push(message.params);
    });
    socket.addEventListener('close', () => { for (const request of requests.values()) {
      clearTimeout(request.timer); request.reject(new Error('WebView CDP disconnected.'));
    } requests.clear(); });
    await new Promise((resolveOpen, reject) => {
      const timeout = setTimeout(() => { socket.close(); reject(new Error('WebView WebSocket open timeout.')); }, 15000);
      socket.addEventListener('open', () => { clearTimeout(timeout); resolveOpen(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WebView WebSocket connection failed.')); }, { once: true });
    });
    cdp = { send(method, params = {}) { return new Promise((resolveCall, reject) => {
      const id = ++requestId;
      const timer = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
      requests.set(id, { resolve: resolveCall, reject, timer, method });
      socket.send(JSON.stringify({ id, method, params }));
    }); } };
    const evaluateSource = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression,
        awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const evaluate = (fn, arg) => evaluateSource(`(${fn.toString()})(${JSON.stringify(arg) ?? 'undefined'})`);
    // DOM queries observe the journey; actions use native ADB touch events.
    const element = (selector, name, exact = false) => {
      const spec = { selector, text: typeof name === 'string' ? name : null, exact,
        regex: name instanceof RegExp ? { source: name.source, flags: name.flags } : null };
      const findElement = (query) => {
        const node = [...document.querySelectorAll(query.selector)].find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(candidate).visibility === 'hidden') return false;
          const text = (candidate.getAttribute('aria-label') || candidate.textContent || '').trim().replace(/\s+/g, ' ');
          return query.regex ? new RegExp(query.regex.source, query.regex.flags).test(text)
            : query.text === null || (query.exact ? text === query.text : text.includes(query.text));
        });
        return node || null;
      };
      const inspect = (fn, arg) => evaluateSource(`(${fn.toString()})((${findElement.toString()})(${JSON.stringify(spec)}), ${JSON.stringify(arg) ?? 'undefined'})`);
      return {
        first() { return this; }, evaluate: inspect,
        waitFor: () => poll(() => inspect((node) => Boolean(node)), Boolean, 15000, `visible ${name || selector}`),
        isEnabled: () => inspect((node) => Boolean(node) && !node.disabled),
        innerText: () => inspect((node) => node?.innerText || ''),
        getAttribute: (attribute) => inspect((node, key) => node?.getAttribute(key), attribute),
        scrollIntoViewIfNeeded: async () => { await inspect((node) => node.scrollIntoView({ block: 'center', inline: 'center' })); await sleep(100); },
        boundingBox: () => inspect((node) => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }),
      };
    };
    page = { evaluate, isClosed: () => socket.readyState !== WebSocket.OPEN,
      getByRole: (role, { name, exact = false } = {}) => element(role === 'heading' ? 'h1,h2,h3,h4,h5,h6,[role="heading"]' : 'button,[role="button"]', name, exact),
      getByText: (name, { exact = false } = {}) => element('h1,h2,h3,h4,p,span,button,div', name, exact),
      locator: (selector) => element(selector),
      waitForFunction: (fn, arg, { timeout = 15000 } = {}) => poll(() => evaluate(fn, arg), Boolean, timeout, 'visible DOM condition'),
      screenshot: async ({ path }) => {
        const bytes = command(['exec-out', 'screencap', '-p'], true);
        writeFileSync(path, bytes); return bytes;
      },
    };
    await cdp.send('Runtime.enable');
    report.runtimeEventCoverage = 'Runtime exceptions/console events enabled, plus per-PID native logcat; network requests not monitored.';
  }
  async function attach() {
    if (port) { command(['forward', '--remove', `tcp:${port}`]); port = null; }
    const endpoint = await poll(async () => {
      const pid = shell('pidof', app).split(/\s+/)[0];
      if (!/^\d+$/.test(pid)) return null;
      const socket = shell('cat', '/proc/net/unix').split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).at(-1))
        .find((name) => name === `@webview_devtools_remote_${pid}`);
      return socket ? { pid, socket: socket.slice(1) } : null;
    }, Boolean, 20000, 'debug WebView socket belonging to the app PID');
    port = command(['forward', 'tcp:0', `localabstract:${endpoint.socket}`]).trim();
    assert(/^\d+$/.test(port), `Unexpected forwarded port: ${port}`);
    const target = await poll(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5000) });
      assert(response.ok, `WebView target discovery HTTP ${response.status}`);
      return (await response.json()).find((candidate) => candidate.type === 'page' &&
        /^https?:\/\/localhost(?:[/:]|$)/.test(candidate.url) && candidate.webSocketDebuggerUrl);
    }, Boolean, 12000, 'local Capacitor page target');
    const websocketUrl = new URL(target.webSocketDebuggerUrl);
    websocketUrl.hostname = '127.0.0.1'; websocketUrl.port = port;
    await connectPage(websocketUrl.href);
    let coordinates = option('webview-bounds', null)?.split(',').map(Number);
    if (!coordinates) {
      shell('uiautomator', 'dump', '/sdcard/fioforja-proof-ui.xml');
      const hierarchy = shell('cat', '/sdcard/fioforja-proof-ui.xml');
      const bounds = hierarchy.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      assert(bounds, 'Native WebView bounds must be observable before touch input.');
      coordinates = bounds.slice(1).map(Number);
    }
    assert(coordinates.length === 4 && coordinates.every(Number.isFinite), 'Four observed native WebView coordinates required.');
    const [left, top, right, bottom] = coordinates;
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
    assert(Math.abs(right - left - viewport.width * viewport.dpr) <= 3 && Math.abs(bottom - top - viewport.height * viewport.dpr) <= 3,
      'Observed WebView bounds must match the current CSS viewport/DPR.');
    nativeBounds = { left, top, scaleX: (right - left) / viewport.width, scaleY: (bottom - top) / viewport.height };
    report.nativeTouchMapping = { ...nativeBounds, viewport };
    endpoint.url = target.url;
    beginLog(endpoint.pid);
    return endpoint;
  }
  async function launch(forceStop) {
    guard();
    if (forceStop) {
      socket?.close(); socket = null; cdp = null; page = null; stopLog();
      shell('am', 'force-stop', app);
    }
    const started = Date.now();
    const raw = shell('am', 'start', '-W', '-n', component);
    assert.match(raw, /Status:\s*ok/, `Android launch failed: ${raw}`);
    const record = { forceStop, amW: raw, hostAmMs: Date.now() - started };
    for (const key of ['ThisTime', 'TotalTime', 'WaitTime']) record[key] = Number(raw.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1]) || null;
    report.launches.push(record); persist();
    if (forceStop || !page || page.isClosed()) record.webView = await attach();
    await page.getByRole('button', { name: 'Entrar na Forja', exact: true }).waitFor();
    record.hostToTitleReadyMs = Date.now() - started;
    return record;
  }
  const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('a-forja-save') || 'null'));
  const readHud = () => page.evaluate(() => {
    const ps = [...document.querySelectorAll('p')];
    const text = (label) => ps.find((p) => p.textContent.trim() === label)?.nextElementSibling?.textContent || '';
    const phase = ps.some((p) => p.textContent.trim() === 'Aquecer') ? 'heat' : ps.some((p) => p.textContent.trim() === 'Martelar') ? 'forge' : ps.some((p) => p.textContent.trim() === 'Temperar') ? 'quench' : 'other';
    const meter = document.querySelector('div.relative.h-9');
    return { phase, heat: parseFloat(text('Calor')), shape: parseFloat(text('Forma')), integrity: parseFloat(text('Integridade')),
      strikes: parseInt(text('Golpes'), 10), force: meter ? parseFloat(meter.children[2]?.style.width) / 100 : null,
      center: meter ? parseFloat(meter.children[1]?.style.left) / 100 : null };
  });
  async function touchStart(point) {
    assert(!touchHeld, 'A previous touch must be released.');
    touchHeld = true;
    nativeTouch = { x: Math.round(nativeBounds.left + point.x * nativeBounds.scaleX), y: Math.round(nativeBounds.top + point.y * nativeBounds.scaleY) };
    shell('input', 'touchscreen', 'motionevent', 'DOWN', String(nativeTouch.x), String(nativeTouch.y));
  }
  async function touchEnd() {
    if (touchHeld) { shell('input', 'touchscreen', 'motionevent', 'UP', String(nativeTouch.x), String(nativeTouch.y)); touchHeld = false; }
  }
  async function tap(locator) {
    await locator.waitFor({ state: 'visible' });
    assert(await locator.isEnabled(), `UI action disabled: ${await locator.innerText()}`);
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox(); assert(box, 'Missing touch target bounds.');
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    assert(await locator.evaluate((el, p) => { const hit = document.elementFromPoint(p.x, p.y); return hit === el || el.contains(hit); }, point), 'Touch target is covered.');
    await touchStart(point); try { await sleep(60); } finally { await touchEnd(); }
    await sleep(60);
  }
  async function canvasPoint() {
    return page.locator('canvas').first().evaluate((canvas) => {
      const box = canvas.getBoundingClientRect();
      for (const fy of [0.55, 0.62, 0.48, 0.7, 0.4]) for (const fx of [0.5, 0.7, 0.3]) {
        const point = { x: box.x + box.width * fx, y: box.y + box.height * fy };
        if (document.elementFromPoint(point.x, point.y) === canvas) return point;
      }
      throw new Error('No unobstructed visible forge canvas touch point.');
    });
  }
  async function timedCanvasHold(durationMs) {
    const point = await canvasPoint();
    const x = String(Math.round(nativeBounds.left + point.x * nativeBounds.scaleX));
    const y = String(Math.round(nativeBounds.top + point.y * nativeBounds.scaleY));
    // Android times DOWN/UP in one command; separate host commands add release latency.
    shell('input', 'touchscreen', 'swipe', x, y, x, y, String(durationMs));
  }
  async function heatAndPull() {
    if ((await readHud()).phase !== 'heat') return;
    await poll(readHud, (hud) => hud.heat >= 58, 15000, 'visible heat >=58%');
    await tap(page.getByRole('button', { name: /Retirar do fogo/ }));
    await poll(readHud, (hud) => hud.phase === 'forge', 5000, 'forge phase');
  }
  async function physicalStrike(index) {
    let hud = await readHud();
    if (hud.heat < 58) {
      await tap(page.getByRole('button', { name: /Reaquecer na fornalha/ }));
      await poll(readHud, (next) => next.heat >= 74, 10000, 'visible reheat >=74%');
    }
    const zones = [/^Base \[1\]/, /^Centro \[2\]/, /^Ponta \[3\]/];
    await tap(page.getByRole('button', { name: zones[index % 3] }));
    hud = await readHud(); const previous = hud.strikes;
    await timedCanvasHold(525);
    const after = await poll(readHud, (next) => next.phase !== 'forge' || next.strikes > previous, 6000, 'touch strike reflected in HUD');
    report.touchStrikes ||= []; report.touchStrikes.push({ zone: index % 3, before: hud, after }); persist();
    return after;
  }
  async function enterForge(fromGallery = false) {
    await tap(page.getByRole('button', { name: fromGallery ? /Forjar Nova/ : 'Entrar na Forja', exact: !fromGallery }));
    await tap(page.getByRole('button', { name: /Guarda da Fronteira.*Medieval/ }));
    await tap(page.getByRole('button', { name: /Levar ao Fogo/ }));
    await page.getByRole('button', { name: /Retirar do fogo/ }).waitFor();
    const attempt = (await readSave())?.activeForgeAttempt;
    assert(attempt && !attempt.isTraining, 'A real paid forge must be persisted.');
    return attempt;
  }
  async function finishAndClaim(runId, prefix) {
    await heatAndPull(); let hud = await readHud(); let count = 0;
    while (hud.phase === 'forge' && count++ < 24) hud = await physicalStrike(Number.isFinite(hud.strikes) ? hud.strikes : count);
    assert.equal(hud.phase, 'quench', 'Real touch inputs must reach quench without breaking.');
    await shot(`${prefix}-quench`);
    await timedCanvasHold(1080);
    await page.getByRole('button', { name: /Reivindicar Recompensas/ }).waitFor({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.renderer === 'dna');
    await shot(`${prefix}-dna-reveal`);
    const beforeClaim = await readSave();
    const sword = beforeClaim.gallery.find((item) => item.forgeRunId === runId);
    assert(sword && !sword.isTraining && !sword.broken && sword.structuralState !== 'broken', 'One naturally earned unbroken sword must exist.');
    assert.equal(beforeClaim.activeForgeAttempt, null);
    assert.equal(beforeClaim.gallery.filter((item) => item.forgeRunId === runId).length, 1);
    await tap(page.getByRole('button', { name: /Reivindicar Recompensas/ }));
    await tap(page.getByRole('button', { name: 'CLAIM REWARDS', exact: true }));
    await page.getByRole('button', { name: /RECOMPENSAS COLETADAS/ }).waitFor();
    const claimed = await readSave();
    assert(claimed.claimedForgeRewardIds.includes(runId), 'UI reward claim must persist its receipt.');
    await shot(`${prefix}-claimed-rewards`);
    await tap(page.getByRole('button', { name: /Back to Inventory/ }));
    await page.getByRole('heading', { name: 'A Grande Galeria', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="dna"]').length > 0);
    await shot(`${prefix}-arsenal`);
    return { sword, beforeClaim: relevant(beforeClaim), claimed: relevant(claimed) };
  }
  async function frames() {
    const raw = await Promise.race([page.evaluate(() => new Promise((done) => {
      const values = []; let last;
      const frame = (now) => { if (last !== undefined) values.push(now - last); last = now;
        if (values.length < 60) requestAnimationFrame(frame); else done(values); };
      requestAnimationFrame(frame);
    })), sleep(12000).then(() => { throw new Error('rAF observation timed out.'); })]);
    const sorted = [...raw].sort((a, b) => a - b);
    return { metric: 'Emulator WebView rAF scheduling interval ms', n: raw.length,
      mean: raw.reduce((a, b) => a + b, 0) / raw.length, p95: sorted[Math.ceil(raw.length * .95) - 1], raw };
  }
  async function audio() {
    try {
      const prototype = await cdp.send('Runtime.evaluate', { expression: 'AudioContext.prototype', objectGroup: 'audio-observation' });
      assert(prototype.result.objectId, 'AudioContext prototype unavailable.');
      const objects = await cdp.send('Runtime.queryObjects', { prototypeObjectId: prototype.result.objectId, objectGroup: 'audio-observation' });
      const result = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objects.objectId,
        functionDeclaration: 'function () { return Array.from(this, x => ({ state: x.state, sampleRate: x.sampleRate, currentTime: x.currentTime, baseLatency: x.baseLatency })); }', returnByValue: true });
      const contexts = result.result.value || [];
      return { status: contexts.some((context) => context.state === 'running') ? 'OBSERVED_RUNNING' : 'NOT_OBSERVED_RUNNING', contexts,
        physicalAudibility: 'NOT_PROVEN' };
    } catch (error) { return { status: 'UNAVAILABLE', error: error.message, physicalAudibility: 'NOT_PROVEN' }; }
    finally { await cdp?.send('Runtime.releaseObjectGroup', { objectGroup: 'audio-observation' }).catch(() => {}); }
  }
  function compareCheckpoint(before, after) {
    assert.equal(after?.forgeRunId, before.forgeRunId, 'Forge identity cannot change.');
    const original = checkpointOf(before), recovered = checkpointOf(after);
    assert(original?.state && recovered?.state, 'Both attempts need physical snapshots.');
    assert(recovered.revision >= original.revision, 'Checkpoint revision cannot roll back.');
    for (const key of stableFields) assert.deepEqual(recovered.state[key], original.state[key], `Checkpoint must preserve ${key}.`);
    assert.equal(after.strikesCount, before.strikesCount, 'Persisted strike count cannot reset.');
    return { before, after };
  }
  async function backgroundReturn(key, name) {
    const before = (await readSave()).activeForgeAttempt;
    guard(); shell('input', 'keyevent', String(key));
    const resumedActivity = await poll(() => shell('dumpsys', 'activity', 'activities').split(/\r?\n/)
      .filter((line) => /topResumedActivity=|mResumedActivity:/.test(line)).join('\n'),
    (text) => text.length > 0 && !text.includes(app), 8000, `${name} moves app out of foreground`);
    saveText(`${name}-background-activity.txt`, resumedActivity);
    const image = command(['exec-out', 'screencap', '-p'], true);
    writeFileSync(join(out, `${name}-background.png`), image);
    guard(); const launchResult = shell('am', 'start', '-W', '-n', component);
    await poll(readHud, (hud) => hud.phase === 'forge', 10000, `${name} returns to active forge`);
    const saved = compareCheckpoint(before, (await readSave()).activeForgeAttempt);
    assert.equal((await readHud()).strikes, before.strikesCount);
    await shot(`${name}-returned`);
    return { launchResult, resumedActivity, saved };
  }

  persist();
  try {
    report.device = Object.fromEntries(['ro.kernel.qemu', 'ro.build.version.sdk', 'ro.build.version.release',
      'ro.product.model', 'ro.product.cpu.abi', 'ro.product.cpu.abilist', 'ro.hardware']
      .map((property) => [property, shell('getprop', property)]));
    saveText('package-dump.txt', shell('dumpsys', 'package', app));
    report.sourceHashes = Object.fromEntries(['scripts/android-proof.mjs', 'mobile/main.tsx', 'capacitor.config.ts', 'package.json']
      .map((file) => [file, hash(readFileSync(join(root, file)))]));
    await step('airplane-mode', async () => {
      previousAirplane = shell('settings', 'get', 'global', 'airplane_mode_on');
      previousWifi = shell('settings', 'get', 'global', 'wifi_on');
      previousData = shell('settings', 'get', 'global', 'mobile_data');
      assert(['0', '1'].includes(previousAirplane), 'Unknown airplane state: cannot restore exactly.');
      assert(['0', '1'].includes(previousWifi) && ['0', '1'].includes(previousData), 'Unknown radio state: cannot restore exactly.');
      report.networkBefore = { airplane: previousAirplane, wifi: previousWifi, mobileData: previousData }; persist();
      networkTouched = true; guard(); shell('cmd', 'connectivity', 'airplane-mode', 'enable');
      shell('svc', 'wifi', 'disable'); shell('svc', 'data', 'disable');
      await poll(() => shell('settings', 'get', 'global', 'airplane_mode_on'), (value) => value === '1', 6000, 'airplane mode enabled');
      saveText('connectivity-airplane.txt', shell('dumpsys', 'connectivity'));
      return { previous: report.networkBefore, airplane: '1', wifi: shell('settings', 'get', 'global', 'wifi_on'),
        mobileData: shell('settings', 'get', 'global', 'mobile_data') };
    });
    await step('title-and-dna-ui', async () => {
      const startup = await launch(true); await shot('title-offline');
      const initial = await readSave();
      assert(!initial?.activeForgeAttempt, 'Dedicated emulator must have no unfinished attempt. Resume it manually through UI before rerunning; the harness never clears saves.');
      const selector = page.getByRole('button', { name: 'Alternar renderizador visual das armas', exact: true });
      const wasDna = await selector.getAttribute('aria-pressed') === 'true';
      if (wasDna) { await tap(selector); await poll(() => selector.getAttribute('aria-pressed'), (value) => value === 'false', 5000, 'legacy selected'); }
      await tap(selector);
      await poll(() => selector.getAttribute('aria-pressed'), (value) => value === 'true', 5000, 'DNA selected');
      await shot('title-dna-selected'); memory('title'); report.metrics.titleFrames = await frames();
      return { startup, initial: relevant(initial), selector: 'DNA selected using touch' };
    });
    let firstRun;
    if (option('continue-from', '') !== 'claimed') await step('normal-forge-quench-claim-arsenal', async () => {
      firstRun = (await enterForge()).forgeRunId;
      const earned = await finishAndClaim(firstRun, 'first');
      report.earned = { runId: firstRun, ...earned }; persist();
      memory('first-arsenal'); report.audio = await audio();
      return { runId: firstRun, ...earned };
    });
    else await step('previously-claimed-sword-survives-emulator-restart', async () => {
      const save = await readSave();
      const sword = save.gallery.findLast((item) => !item.isTraining && !item.broken &&
        item.structuralState !== 'broken' && save.claimedForgeRewardIds.includes(item.forgeRunId));
      assert(sword, 'Continuation requires an existing naturally earned claimed unbroken sword.');
      report.continuation = { mode: 'claimed', sword, save: relevant(save),
        previousProof: option('previous-proof', 'UNSPECIFIED') }; persist();
      return report.continuation;
    });
    await step('claimed-save-survives-force-stop', async () => {
      const before = relevant(await readSave()); await launch(true);
      const after = relevant(await readSave()); assert.deepEqual(after, before);
      assert.equal(await page.getByRole('button', { name: 'Alternar renderizador visual das armas', exact: true }).getAttribute('aria-pressed'), 'true');
      await tap(page.getByRole('button', { name: /Arsenal do Ferreiro/ }));
      await page.getByRole('heading', { name: 'A Grande Galeria', exact: true }).waitFor();
      await shot('arsenal-after-force-stop'); return { before, after };
    });
    await step('legacy-and-dna-ui-comparison', async () => {
      const before = relevant(await readSave());
      await tap(page.getByRole('button', { name: /Menu Principal/ }));
      await tap(page.getByRole('button', { name: 'Alternar renderizador visual das armas', exact: true }));
      await tap(page.getByRole('button', { name: /Arsenal do Ferreiro/ }));
      await page.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="legacy"]').length > 0);
      await shot('same-earned-sword-legacy');
      await tap(page.getByRole('button', { name: /Menu Principal/ }));
      await tap(page.getByRole('button', { name: 'Alternar renderizador visual das armas', exact: true }));
      await tap(page.getByRole('button', { name: /Arsenal do Ferreiro/ }));
      await page.waitForFunction(() => document.querySelectorAll('li canvas[data-renderer="dna"]').length > 0);
      await shot('same-earned-sword-dna');
      assert.deepEqual(relevant(await readSave()), before);
      return { modes: ['legacy', 'dna'], dataUnchanged: true };
    });
    let secondAttempt;
    await step('second-forge-two-real-touch-strikes', async () => {
      secondAttempt = await enterForge(true); await heatAndPull();
      await physicalStrike(0); await physicalStrike(1);
      memory('active-forge');
      secondAttempt = await poll(readSave, (save) => save?.activeForgeAttempt?.snapshot?.state?.strikes >= 2, 6000, 'persisted two-strike checkpoint')
        .then((save) => save.activeForgeAttempt);
      assert.equal(secondAttempt.strikesCount, 2); await shot('checkpoint-two-strikes');
      return { attempt: secondAttempt, hud: await readHud() };
    });
    await step('android-back-minimizes-and-preserves-attempt', () => backgroundReturn(4, 'back'));
    await step('android-home-return-preserves-attempt', () => backgroundReturn(3, 'home'));
    await step('force-stop-recovery-modal-physical-checkpoint', async () => {
      secondAttempt = (await readSave()).activeForgeAttempt;
      const stableSave = relevant(await readSave()); await launch(true);
      await page.getByText('Forja em Andamento Detectada', { exact: true }).waitFor();
      const reloaded = await readSave();
      const comparison = compareCheckpoint(secondAttempt, reloaded.activeForgeAttempt);
      assert.deepEqual(relevant(reloaded), stableSave);
      await shot('recovery-modal'); await tap(page.getByRole('button', { name: 'Retomar ponto salvo', exact: true }));
      const hud = await poll(readHud, (value) => value.phase === 'forge' && value.strikes === 2, 8000, 'two-strike physical state restored');
      const state = checkpointOf(reloaded.activeForgeAttempt).state;
      assert.equal(hud.shape, Math.round(state.shape * 100)); assert.equal(hud.integrity, Math.round(state.integrity));
      assert(Math.abs(hud.heat - state.heat * 100) <= 12, 'Restored heat cannot reset to ambient.');
      await shot('restored-checkpoint'); return { ...comparison, restoredHud: hud };
    });
    await step('resumed-forge-can-complete', async () => {
      const earned = await finishAndClaim(secondAttempt.forgeRunId, 'resumed');
      memory('final-arsenal'); report.audioAfterResume = await audio(); return earned;
    });
    assert.equal(report.pageErrors.length, 0, 'WebView page errors occurred.');
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = errorInfo(error); process.exitCode = 1;
    if (page && !page.isClosed()) {
      report.bodyOnFailure = await page.locator('body').innerText().catch(() => '');
      await shot('failure').catch(() => {});
      report.saveOnFailure = await readSave().catch(() => null);
    }
    try { memory('failure'); } catch (captureError) { report.failureCaptureError = captureError.message; }
  } finally {
    await touchEnd().catch(() => {}); stopLog();
    socket?.close();
    try { if (port) command(['forward', '--remove', `tcp:${port}`]); }
    catch (error) { report.forwardCleanupError = errorInfo(error); }
    if (networkTouched) {
      try {
        guard(); shell('cmd', 'connectivity', 'airplane-mode', previousAirplane === '1' ? 'enable' : 'disable');
        shell('svc', 'wifi', previousWifi === '1' ? 'enable' : 'disable');
        shell('svc', 'data', previousData === '1' ? 'enable' : 'disable');
        report.networkRestored = await poll(() => ({ airplane: shell('settings', 'get', 'global', 'airplane_mode_on'),
          wifi: shell('settings', 'get', 'global', 'wifi_on'), mobileData: shell('settings', 'get', 'global', 'mobile_data') }),
        (value) => value.airplane === previousAirplane && value.wifi === previousWifi && value.mobileData === previousData,
        8000, 'original network settings restored');
      } catch (error) { report.networkRestoreError = errorInfo(error); report.status = 'FAIL'; process.exitCode = 1; }
    }
    report.finishedAt = new Date().toISOString(); persist();
    console.log(JSON.stringify({ status: report.status, report: join(out, 'report.json'),
      next: report.status === 'PASS' ? 'Emulator observations only; real Poco touch, thermal performance and physical audio remain NOT_PROVEN.' : report.error?.message || report.networkRestoreError?.message }, null, 2));
  }
}
