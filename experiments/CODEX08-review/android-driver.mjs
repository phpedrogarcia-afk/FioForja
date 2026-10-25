// Harvested from scripts/android-proof.mjs: emulator guard, page-target CDP,
// UIAutomator bounds, native gestures and read-only DOM/storage observations.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const app = "com.projetofio.fioforja";
export const pause = (ms) => new Promise((done) => setTimeout(done, ms));
export async function poll(read, test, label, timeout = 15000) {
  const until = Date.now() + timeout; let last;
  while (Date.now() < until) { last = await read(); if (test(last)) return last; await pause(150); }
  throw Error(`Timeout ${label}: ${JSON.stringify(last)}`);
}

export function driver(serial, evidence) {
  assert(/^emulator-\d+$/.test(serial), "Only an explicit emulator serial is permitted.");
  mkdirSync(evidence, { recursive: true });
  const adb = join(process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA, "Android", "Sdk"), "platform-tools", "adb.exe");
  const cmd = (args, binary = false) => {
    appendFileSync(join(evidence,"android-adb-commands.jsonl"),JSON.stringify({at:new Date().toISOString(),serial,args:["-s",serial,...args]})+"\n");
    return execFileSync(adb, ["-s", serial, ...args], {
      encoding: binary ? undefined : "utf8", timeout: 30000, maxBuffer: 32 * 1024 * 1024, windowsHide: true,
    });
  };
  const shell = (...args) => cmd(["shell", ...args]).trim();
  assert.equal(shell("getprop", "ro.kernel.qemu"), "1", "The selected serial must be an emulator.");
  mkdirSync(evidence, { recursive: true });
  let socket, port, mapping; const pending = new Map(); let nextId = 0;
  const errors = [];
  const rpc = (method, params = {}) => new Promise((resolve, reject) => {
    if(!socket || socket.readyState!==WebSocket.OPEN) { reject(Error("WebView is not attached")); return; }
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (fn, arg) => {
    const result = await rpc("Runtime.evaluate", { expression: `(${fn.toString()})(${JSON.stringify(arg) ?? "undefined"})`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const detach = () => {
    socket?.close(); socket = null;
    if (port) { cmd(["forward", "--remove", `tcp:${port}`]); port = null; }
  };
  async function attach() {
    detach();
    const pid = await poll(() => shell("pidof", app), (value) => /^\d+$/.test(value), "app PID");
    await poll(() => shell("cat", "/proc/net/unix"), (value) => value.includes(`@webview_devtools_remote_${pid}`), "WebView debug socket");
    port = cmd(["forward", "tcp:0", `localabstract:webview_devtools_remote_${pid}`]).trim();
    const target = await poll(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((page) => page.type === "page" && /^https:\/\/localhost\//.test(page.url)), Boolean, "local Capacitor target");
    const url = new URL(target.webSocketDebuggerUrl); url.hostname = "127.0.0.1"; url.port = port;
    socket = new WebSocket(url); await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const request = pending.get(message.id); if (!request) return;
        pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    });
    await rpc("Runtime.enable");
    const viewport = await evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
    const hierarchyPath = join(evidence, "android-native-hierarchy.xml");
    let hierarchy;
    if(existsSync(hierarchyPath)) hierarchy = readFileSync(hierarchyPath,"utf8");
    else {
      shell("uiautomator", "dump", "/sdcard/fioforja-codex08-ui.xml");
      hierarchy = shell("cat", "/sdcard/fioforja-codex08-ui.xml");
      writeFileSync(hierarchyPath, hierarchy);
    }
    const bounds = hierarchy.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert(bounds, "Observe native WebView bounds before sending touches.");
    const [left, top, right, bottom] = bounds.slice(1).map(Number);
    assert(Math.abs(right - left - viewport.width * viewport.dpr) < 4 && Math.abs(bottom - top - viewport.height * viewport.dpr) < 4, "Native bounds must match observed CSS viewport/DPR.");
    mapping = { left, top, right, bottom, scaleX: (right - left) / viewport.width, scaleY: (bottom - top) / viewport.height, viewport };
    return { pid, url: target.url, mapping };
  }
  async function launch(forceStop = true) {
    if (forceStop) { detach(); shell("am", "force-stop", app); }
    shell("am", "start", "-W", "-n", `${app}/.MainActivity`);
    const observed = await attach();
    await poll(() => evaluate(() => document.querySelectorAll('nav[aria-label="Seções principais"] button').length), (n) => n === 5, "five sections ready");
    return observed;
  }
  const readSave = () => evaluate(() => JSON.parse(localStorage.getItem("a-forja-save") || "null"));
  const observe = (spec) => evaluate((query) => {
    const container = query.scope ? document.querySelector(query.scope) : document;
    const candidates = [...(container?.querySelectorAll(query.selector || "button") || [])].filter((node) => {
      const rect = node.getBoundingClientRect(); if (!rect.width || !rect.height || getComputedStyle(node).visibility === "hidden") return false;
      if(query.rowText && !node.closest("li")?.textContent.includes(query.rowText)) return false;
      const text = (node.getAttribute("aria-label") || node.textContent || "").trim().replace(/\s+/g, " ");
      return !query.name || (query.exact ? text === query.name : text.includes(query.name));
    });
    const node = candidates[query.index || 0]; if (!node) return null;
    const rect = node.getBoundingClientRect(); const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    let scroller = node.parentElement;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
    const scrollRect = (scroller || document.documentElement).getBoundingClientRect();
    let horizontal = node.parentElement;
    while (horizontal && !(horizontal.scrollWidth > horizontal.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(horizontal).overflowX))) horizontal = horizontal.parentElement;
    const horizontalRect = horizontal?.getBoundingClientRect();
    let top = 0, bottom = innerHeight;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (/auto|scroll|hidden/.test(getComputedStyle(parent).overflowY)) { const box = parent.getBoundingClientRect(); top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
    }
    return { text: (node.getAttribute("aria-label") || node.textContent || "").trim(), x, y, width: rect.width, height: rect.height,
      disabled: Boolean(node.disabled), hit: hit === node || node.contains(hit), top, bottom,
      horizontal: horizontalRect ? { x: horizontalRect.x, y: horizontalRect.y, width: horizontalRect.width, height: horizontalRect.height } : null,
      scroller: { x: scrollRect.x, y: scrollRect.y, width: scrollRect.width, height: scrollRect.height, scrollTop: scroller?.scrollTop } };
  }, spec);
  function nativePoint(x, y) { return [String(Math.round(mapping.left + x * mapping.scaleX)), String(Math.round(mapping.top + y * mapping.scaleY))]; }
  function swipe(x1, y1, x2, y2, duration = 350) { const [a,b] = nativePoint(x1,y1), [c,d] = nativePoint(x2,y2); shell("input", "touchscreen", "swipe", a,b,c,d,String(duration)); }
  async function tap(spec) {
    let node = await poll(() => observe(spec), Boolean, `control ${JSON.stringify(spec)}`);
    for (let attempt = 0; attempt < 9 && (!node.hit || node.y <= node.top || node.y >= node.bottom); attempt++) {
      if (node.horizontal && (node.x < node.horizontal.x || node.x > node.horizontal.x + node.horizontal.width)) {
        const box = node.horizontal; const leftward = node.x > box.x + box.width;
        swipe(box.x + box.width * (leftward ? 0.85 : 0.15), box.y + box.height / 2, box.x + box.width * (leftward ? 0.15 : 0.85), box.y + box.height / 2);
        await pause(650); node = await observe(spec); assert(node); continue;
      }
      const box = node.scroller; const lo = Math.max(box.y + 20, node.top + 20), hi = Math.min(box.y + box.height - 20, node.bottom - 20);
      assert(hi > lo + 30, "Native scroll area must be observable.");
      const down = node.y > node.bottom;
      swipe(box.x + box.width * 0.5, lo + (hi-lo) * (down ? 0.8 : 0.2), box.x + box.width * 0.5, lo + (hi-lo) * (down ? 0.2 : 0.8));
      await pause(650); node = await observe(spec); assert(node, "Control disappeared during native scrolling.");
    }
    assert(node.hit && node.y > node.top && node.y < node.bottom, `Control must be unobstructed before native tap: ${JSON.stringify(node)}`);
    assert(!node.disabled, `Control disabled: ${node.text}`);
    const [x,y] = nativePoint(node.x,node.y); shell("input", "tap", x,y); await pause(200);
    return node;
  }
  const nav = (name) => tap({ scope: 'nav[aria-label="Seções principais"]', name, exact: true });
  const screenshot = (name) => { const bytes = cmd(["exec-out", "screencap", "-p"], true); writeFileSync(join(evidence, name + ".png"), bytes); return { name, bytes: bytes.length }; };
  const body = () => evaluate(() => document.body.innerText);
  return { cmd, shell, attach, detach, launch, evaluate, readSave, observe, tap, nav, swipe, screenshot, body, nativePoint, errors,
    mapping: () => mapping, evidence,
    environment: () => Object.fromEntries(["ro.kernel.qemu", "ro.build.version.sdk", "ro.build.version.release", "ro.product.model", "ro.product.cpu.abi", "ro.hardware"].map((name) => [name, shell("getprop", name)])) };
}
