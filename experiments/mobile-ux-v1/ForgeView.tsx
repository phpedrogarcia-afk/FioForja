import { useEffect, useRef, useState } from "react";
import { Anvil, ArrowLeft, Droplets, Flame, RotateCcw } from "lucide-react";
import { createSim, finishSword, stepSim, type SimInput } from "../../src/game/sim";
import { drawFinishedSword } from "../../src/game/swordDraw";
import { PROFILES, STEELS } from "../../src/game/catalog";
import { drawSheetFrame, loadGameImages, type GameImages } from "../../src/game/assets";
import type { FinishedSword, SimState, SwordDesign } from "../../src/game/types";

export function ForgeView({ design, onExit, onFinish }: { design: SwordDesign; onExit: () => void; onFinish: (sword: FinishedSword) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef(createSim(design, { forgeRunId: "prototype-memory-only", isTraining: true }));
  const input = useRef<SimInput>({ charging: false, action: false, reheat: false });
  const [hud, setHud] = useState({ ...sim.current });
  const [exitOpen, setExitOpen] = useState(false);
  const exitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const finishedRef = useRef(false);
  const finishRef = useRef(onFinish); finishRef.current = onFinish;
  const release = () => { input.current.charging = false; };
  const cancelCharge = () => {
    if (input.current.charging) { sim.current.charging = false; sim.current.force = 0; }
    release();
  };
  useEffect(() => {
    let raf = 0, disposed = false, images: GameImages | null = null, last = 0, nextHud = 0;
    const tick = (now: number) => {
      if (disposed) return;
      const dt = last ? Math.min((now - last) / 1000, 0.04) : 0; last = now;
      const s = sim.current;
      if (!document.hidden && !exitRef.current && images) {
        stepSim(s, dt, input.current, design, now / 1000);
        input.current.action = false; input.current.reheat = false;
        const canvas = canvasRef.current;
        if (canvas) paint(canvas, images, design, s);
        if (now > nextHud) { setHud({ ...s }); nextHud = now + 75; }
        if (s.done && !finishedRef.current) {
          finishedRef.current = true;
          setTimeout(() => { if (!disposed) finishRef.current(finishSword(s, design)); }, 750);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    void loadGameImages().then(loaded => { if (!disposed) { images = loaded; setReady(true); } });
    const hidden = () => { input.current.charging = false; sim.current.charging = false; sim.current.force = 0; last = 0; };
    document.addEventListener("visibilitychange", hidden); window.addEventListener("blur", hidden);
    raf = requestAnimationFrame(tick);
    return () => { disposed = true; cancelAnimationFrame(raf); hidden(); document.removeEventListener("visibilitychange", hidden); window.removeEventListener("blur", hidden); };
  }, [design]);
  const steel = STEELS[design.steel];
  const cold = hud.heat < steel.heatMin;
  const tooHot = hud.heat > steel.heatMax;
  // Existing sim.ts accepts reheat only below 0.58, independently of the alloy's ideal window.
  const reheatLimit = 0.58;
  const canReheat = !hud.reheating && hud.heat < reheatLimit;
  const waitingForReheat = hud.phase === "forge" && cold && !hud.reheating && !canReheat;
  const heatLabel = cold ? "Metal frio" : tooHot ? "Calor excessivo" : "Temperatura ideal";
  const guidance = hud.phase === "heat" ? cold ? "Aguarde a faixa ideal antes de retirar." : tooHot ? "Retire do fogo: o metal está quente demais." : "Pronto para trabalhar. Leve à bigorna." : hud.phase === "quench" ? "Segure para mergulhar. Solte na faixa marcada." : hud.reheating ? "Reaquecendo. O mesmo trabalho continua." : waitingForReheat ? "Abaixo do ideal. Reaquecer fica disponível abaixo de 58%." : cold ? "Reaqueça antes de golpear. Há risco de trinca." : "Segure na bigorna. Solte na faixa ideal.";
  const force = hud.phase === "quench" ? hud.quenchFill : hud.force;
  return <main className="forge-page">
    <header className="forge-header"><button className="icon-button" aria-label="Sair da fabricação demonstrativa" onClick={() => { cancelCharge(); exitRef.current = true; setExitOpen(true); }}><ArrowLeft size={21} /></button><div><p className="eyebrow">{design.name}</p><h2>A Forja</h2></div><span>{hud.strikes}/{hud.maxStrikes}<small> golpes</small></span></header>
    <div className="forge-stations" aria-label="Etapa de fabricação">{[[Flame, "Fogo", "heat"], [Anvil, "Bigorna", "forge"], [Droplets, "Têmpera", "quench"]].map(([Icon, label, phase]) => { const I = Icon as typeof Flame; return <span key={String(phase)} data-active={hud.phase === phase}><I size={15} />{String(label)}</span>; })}</div>
    <div className="forge-readings"><div className={cold ? "cold" : tooHot ? "too-hot" : "ideal"}><span>{heatLabel}</span><strong>{Math.round(hud.heat * 100)}%</strong><div className="heat-track"><i style={{ width: `${hud.heat * 100}%` }} /><em style={{ left: `${steel.heatMin * 100}%`, width: `${(steel.heatMax - steel.heatMin) * 100}%` }} /></div></div><div><span>Forma</span><strong>{Math.round(hud.shape * 100)}%</strong></div><div><span>Integridade</span><strong>{Math.round(hud.integrity)}%</strong></div></div>
    <div className="forge-scene"><canvas ref={canvasRef} aria-label="Bigorna e peça de trabalho. Segure e solte para agir." role="button" tabIndex={0} onPointerDown={e => { if (hud.phase === "heat" || exitOpen) return; e.currentTarget.setPointerCapture(e.pointerId); input.current.charging = true; }} onPointerUp={release} onPointerCancel={cancelCharge} onLostPointerCapture={cancelCharge} onKeyDown={e => { if (e.code === "Space") { e.preventDefault(); input.current.charging = true; } }} onKeyUp={e => { if (e.code === "Space") release(); }} />{!ready && <span className="scene-note">Preparando a oficina…</span>}<span className="scene-note">{hud.phase === "heat" || hud.reheating ? "Aquecendo a mesma peça" : hud.phase === "quench" ? "Banho de têmpera" : hud.strikeKind ? ({ perfect: "Golpe perfeito", good: "Bom golpe", hard: "Força excessiva", weak: "Golpe fraco" })[hud.strikeKind] : "Segure a área da bigorna para carregar"}</span></div>
    <div className="forge-controls"><p className={`forge-guidance ${cold && hud.phase === "forge" ? "danger" : ""}`} role="status">{guidance}</p>
      {hud.phase === "forge" && <div className="zone-controls" aria-label="Região da lâmina">{(["base", "mid", "tip"] as const).map((zone, i) => <button key={zone} aria-pressed={hud.targetZone === zone} onClick={() => { input.current.switchZone = zone; }}>{["Base", "Centro", "Ponta"][i]}</button>)}</div>}
      {hud.phase !== "heat" && <div className="force-control"><div className="option-heading"><span>{hud.phase === "quench" ? "TEMPO DE IMERSÃO" : "FORÇA DO GOLPE"}</span><small>Segure · solte</small></div><div className="force-track"><span className="sweet-spot" style={{ left: `${(hud.phase === "quench" ? 0.42 : hud.sweetCenter - hud.sweetWidth / 2) * 100}%`, width: `${(hud.phase === "quench" ? 0.2 : hud.sweetWidth) * 100}%` }} /><span className="force-needle" style={{ left: `${force * 100}%` }} /></div></div>}
      {hud.phase === "heat" ? <button className={cold ? "secondary warm" : "primary"} onClick={() => { input.current.action = true; }}>{cold ? "Retirar frio — risco de dano" : "Levar à bigorna"}<Anvil size={18} /></button> : hud.phase === "forge" ? <button className={cold ? "primary reheat" : "secondary"} disabled={!canReheat} onClick={() => { cancelCharge(); input.current.reheat = true; }}><Flame size={18} />{hud.reheating ? "Reaquecendo…" : !canReheat ? "Reaquecer · disponível abaixo de 58%" : cold ? "Reaquecer antes de golpear" : "Reaquecer"}</button> : <p className="hint">A ação acontece diretamente na área da oficina.</p>}
    </div>
    {exitOpen && <div className="exit-overlay" role="dialog" aria-modal="true" aria-label="Sair da demonstração"><h2>Pausar a oficina?</h2><p>Esta é uma demonstração em memória. Sair descarta somente esta tentativa de exemplo.</p><button autoFocus className="primary" onClick={() => { exitRef.current = false; setExitOpen(false); }}>Continuar na bigorna</button><button className="secondary" onClick={onExit}><RotateCcw size={16} />Voltar à preparação</button></div>}
  </main>;
}

function paint(canvas: HTMLCanvasElement, images: GameImages, design: SwordDesign, s: SimState) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const bg = images.r4bBg || images.bg;
  const heating = s.phase === "heat" || s.reheating;
  if (bg) {
    const scale = Math.max(w / bg.width, h / bg.height) * (heating || s.phase === "quench" ? 1.35 : 1);
    const x = heating ? w * 0.48 - bg.width * 0.19 * scale : s.phase === "quench" ? w * 0.5 - bg.width * 0.85 * scale : (w - bg.width * scale) / 2;
    const y = heating ? h * 0.45 - bg.height * 0.27 * scale : s.phase === "quench" ? h * 0.49 - bg.height * 0.46 * scale : 0;
    ctx.globalAlpha = 0.78; ctx.drawImage(bg, x, y, bg.width * scale, bg.height * scale); ctx.globalAlpha = 1;
  }
  const shade = ctx.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, "rgba(12,8,6,.36)"); shade.addColorStop(1, "rgba(12,8,6,.08)"); ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
  const onAnvil = s.phase === "forge" && !heating, anvilSize = w * 1.55, anvilX = -w * 0.32, anvilY = h * 0.11;
  if (onAnvil && images.r4bAnvil) ctx.drawImage(images.r4bAnvil, anvilX, anvilY, anvilSize, anvilSize);
  const blade = onAnvil ? { x: w * 0.18, y: anvilY + anvilSize * 0.36, length: w * 0.71, angle: -0.32 } : heating ? { x: w * 0.17, y: h * 0.49, length: w * 0.62, angle: -0.16 } : { x: w * 0.43, y: h * 0.68, length: Math.min(w * 0.72, h * 0.6), angle: -1.2 };
  // Match the existing legacy renderer's billet/preform length, so the contact shadow
  // cannot suggest a finished blade extending beyond the metal actually present.
  const stageLength = s.shape < 0.22 ? 0.38 : s.shape < 0.55 ? 0.38 + (s.shape - 0.22) * 0.95 : 0.45 + s.shape * 0.55;
  const metalLength = blade.length * (0.62 + design.length * 0.38) * PROFILES[design.profile].length * stageLength;
  ctx.save(); ctx.translate(blade.x, blade.y + 4); ctx.rotate(blade.angle); ctx.fillStyle = "rgba(0,0,0,.42)"; ctx.beginPath(); ctx.ellipse(metalLength * 0.5, 0, metalLength * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  drawFinishedSword(ctx, design, blade.x, blade.y, blade.length, { angle: blade.angle, assembled: false, heat: s.heat, shape: s.shape, quality: s.quality, warp: s.warp, cracks: s.cracks, broken: s.broken, physicalProfile: s.physicalProfile });
  if (onAnvil && images.strike) {
    const handSize = w * 0.64;
    const frame = s.strikeAnim > 0 ? Math.min(5, Math.floor((1 - s.strikeAnim / 0.38) * 6)) : 0;
    const handY = Math.min(h * 0.1, blade.y - handSize * 0.66 - 26) + (s.charging ? s.force * 29 : 0);
    drawSheetFrame(ctx, images.strike, 3, 2, frame, w * 0.5, handY, handSize, handSize * 0.66);
  }
  canvas.dataset.phase = s.phase;
  canvas.dataset.bladeBounds = JSON.stringify({ rootX: blade.x, rootY: blade.y, tipX: blade.x + Math.cos(blade.angle) * blade.length, tipY: blade.y + Math.sin(blade.angle) * blade.length });
}
