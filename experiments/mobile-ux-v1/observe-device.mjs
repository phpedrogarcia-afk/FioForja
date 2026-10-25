// Read-only prototype observations. UI actions remain explicit native ADB inputs.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const serial = process.argv[2], name = process.argv[3] || "observation";
if (!serial || !/^[\w-]+$/.test(serial) || !/^[\w-]+$/.test(name)) throw Error("Use serial explícito e nome simples de captura");
const adb = join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const command = (...args) => execFileSync(adb, ["-s", serial, ...args], { encoding: "utf8", timeout: 15000, windowsHide: true });
const pid = command("shell", "pidof", "com.projetofio.fioforja.prototype").trim().split(/\s+/)[0];
if (!/^\d+$/.test(pid)) throw Error("Protótipo não está aberto");
const port = command("forward", "tcp:0", `localabstract:webview_devtools_remote_${pid}`).trim();
let ws;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = pages.find(p => p.type === "page" && p.url.startsWith("https://localhost/"));
  if (!target) throw Error("Alvo local do protótipo ausente");
  const url = new URL(target.webSocketDebuggerUrl); url.hostname = "127.0.0.1"; url.port = port;
  ws = new WebSocket(url); await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
  const expression = `JSON.stringify((() => {
    const bounds = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
    const paintedBounds = canvas => {
      if(!canvas.matches('.sword-view')) return null;
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      return {left,top,right,bottom,width:canvas.width,height:canvas.height,hasInk:right>=0,margin:Math.min(left,top,canvas.width-1-right,canvas.height-1-bottom)};
    };
    return { viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio}, document:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},
      title:document.title, storageKeys:Object.keys(localStorage), navigation:!!document.querySelector('.bottom-nav'),
      text:document.body.innerText, canvases:[...document.querySelectorAll('canvas')].map(c=>({label:c.getAttribute('aria-label'),...bounds(c),renderer:c.dataset.renderer,phase:c.dataset.phase,blade:c.dataset.bladeBounds,paintedBounds:paintedBounds(c)})),
      controls:[...document.querySelectorAll('button,select')].filter(e=>e.getBoundingClientRect().width).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim(),...bounds(e),disabled:e.disabled})) };
  })())`;
  let requestId = 0;
  const evaluate = async () => {
    const id = ++requestId;
    const response = new Promise((res, rej) => {
      const receive = e => { const m = JSON.parse(String(e.data)); if (m.id === id) { clearTimeout(timer); ws.removeEventListener("message", receive); res(m); } };
      const timer = setTimeout(() => { ws.removeEventListener("message", receive); rej(Error("CDP timeout")); }, 10000);
      ws.addEventListener("message", receive);
    });
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
    const result = await response; return JSON.parse(result.result.result.value);
  };
  let observation; const until = Date.now() + 8000;
  do { observation = await evaluate(); if (observation.controls.length > 2) break; await new Promise(done => setTimeout(done, 100)); } while (Date.now() < until);
  if (observation.controls.length <= 2) throw Error("HTML carregado, mas interface não ficou pronta no intervalo observado");
  const out = join(here, "evidence"); mkdirSync(out, { recursive: true });
  observation.observedAt = new Date().toISOString();
  writeFileSync(join(out, `${name}.json`), JSON.stringify(observation, null, 2));
  const foreground = command("shell", "dumpsys", "activity", "activities").split(/\r?\n/).find(line => /topResumedActivity=|mResumedActivity:/.test(line));
  if (!foreground?.includes("com.projetofio.fioforja.prototype")) throw Error("Screenshot recusada: protótipo fora de primeiro plano");
  const image = execFileSync(adb, ["-s", serial, "exec-out", "screencap", "-p"], { windowsHide: true, maxBuffer: 12000000, timeout: 15000 });
  writeFileSync(join(out, `${name}.png`), image);
  console.log(JSON.stringify(observation));
} finally { ws?.close(); command("forward", "--remove", `tcp:${port}`); }
