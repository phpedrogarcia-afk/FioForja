import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { drawSheetFrame, type GameImages } from "./assets";
import { createSim, stepSim, type SimInput } from "./sim";
import { drawFinishedSword } from "./swordDraw";
import type { HudSnapshot, SimState, SwordDesign } from "./types";
import { playClang, playHiss, playPull, playWhoosh } from "./audio";

const VW = 1280;
const VH = 720;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

interface Props {
  design: SwordDesign;
  images: GameImages;
  shake: boolean;
  reducedMotion: boolean;
  onHud: (hud: HudSnapshot) => void;
  onFinished: (sim: SimState) => void;
  inputRef: MutableRefObject<SimInput>;
}

export function ForgeCanvas({
  design,
  images,
  shake,
  reducedMotion,
  onHud,
  onFinished,
  inputRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = createSim(design);
    const sparks: Spark[] = [];
    let trauma = 0;
    let hitstop = 0;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    let finishedSent = false;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const emitSparks = (n: number, x: number, y: number, force: number) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const sp = 80 + Math.random() * 220 * force;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 40,
          life: 0.25 + Math.random() * 0.35,
          max: 0.6,
          size: 1.4 + Math.random() * 2.4,
        });
        if (sparks.length > 160) sparks.shift();
      }
    };

    const loop = (ts: number) => {
      if (!running) return;
      let dt = Math.min((ts - last) / 1000, 0.1);
      last = ts;
      const time = ts / 1000;

      if (hitstop > 0 && !reducedMotion) {
        hitstop -= dt;
        dt = 0;
      }

      const ev = stepSim(sim, dt, inputRef.current, design, time);
      inputRef.current.action = false;
      inputRef.current.reheat = false;

      if (ev.sfx === "clang") playClang(ev.force ?? 0.6, ev.kind ?? "good");
      if (ev.sfx === "whoosh") playWhoosh();
      if (ev.sfx === "hiss") playHiss();
      if (ev.sfx === "pull") playPull();
      if (ev.trauma && shake && !reducedMotion) trauma = Math.min(1, trauma + ev.trauma);
      if (ev.hitstop && !reducedMotion) hitstop = Math.max(hitstop, ev.hitstop);
      if (ev.kind) {
        const force = ev.kind === "weak" ? 0.35 : ev.kind === "hard" ? 1 : 0.7;
        emitSparks(ev.kind === "perfect" ? 42 : 22, VW * 0.4, VH * 0.66, force);
      }
      if (ev.finished && !finishedSent) {
        finishedSent = true;
        onFinished(sim);
      }

      trauma = Math.max(0, trauma - dt * 1.7);
      for (const p of sparks) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        if (sparks[i]!.life <= 0) sparks.splice(i, 1);
      }

      hudAcc += dt;
      if (hudAcc > 0.05) {
        hudAcc = 0;
        onHud({
          phase: sim.phase,
          heat: sim.heat,
          shape: sim.shape,
          quality: sim.quality,
          force: sim.force,
          charging: sim.charging,
          sweetCenter: sim.sweetCenter,
          sweetWidth: sim.sweetWidth,
          strikes: sim.strikes,
          maxStrikes: sim.maxStrikes,
          quenchFill: sim.quenchFill,
          message: sim.lastMessage,
          warp: sim.warp,
        });
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const scale = Math.max(cssW / VW, cssH / VH);
      const portraitHeat = cssW / cssH < 1 && sim.phase === "heat";
      const focusX = portraitHeat ? 310 : VW / 2;
      const ox = cssW / 2 - focusX * scale;
      const oy = (cssH - VH * scale) / 2;
      const shakeAmt = trauma * trauma;
      const sx = shake && !reducedMotion ? Math.sin(time * 47) * 16 * shakeAmt : 0;
      const sy = shake && !reducedMotion ? Math.sin(time * 53 + 1) * 12 * shakeAmt : 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.save();
      ctx.translate(ox + sx, oy + sy);
      ctx.scale(scale, scale);
      paint(ctx, images, design, sim, sparks, time);
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [design, images, shake, reducedMotion, onHud, onFinished, inputRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-bg touch-none">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  design: SwordDesign,
  sim: ReturnType<typeof createSim>,
  sparks: Spark[],
  time: number,
) {
  if (images.bg) {
    drawCover(ctx, images.bg, VW, VH);
  } else {
    ctx.fillStyle = "#140e0a";
    ctx.fillRect(0, 0, VW, VH);
  }

  if (images.fire) {
    const fi = Math.floor(time * 8) % 4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.72 + Math.sin(time * 9) * 0.08;
    drawSheetFrame(ctx, images.fire, 2, 2, fi, 120, 290, 210, 210);
    ctx.restore();
  }

  const onAnvil = sim.phase !== "heat";
  const bladeX = onAnvil ? VW * 0.4 : VW * 0.2;
  const bladeY = onAnvil ? VH * 0.655 : VH * 0.52;
  const heatBoost = sim.heat;

  if (sim.phase === "heat") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(VW * 0.18, VH * 0.55, 20, VW * 0.18, VH * 0.55, 220);
    g.addColorStop(0, `rgba(255,180,60,${0.18 + sim.heat * 0.35})`);
    g.addColorStop(1, "rgba(255,80,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  if (onAnvil) {
    ctx.save();
    ctx.fillStyle = "rgba(8,4,2,0.35)";
    ctx.beginPath();
    ctx.ellipse(bladeX, bladeY + 18, 150, 22, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFinishedSword(ctx, design, bladeX, bladeY, 300, {
    angle: onAnvil ? -0.08 : -0.4,
    heat: heatBoost,
    shape: sim.phase === "heat" ? 0.12 : sim.shape,
    assembled: false,
    quality: sim.quality,
  });

  if (sim.phase === "quench") {
    ctx.save();
    ctx.globalAlpha = 0.35 + sim.quenchFill * 0.25;
    const q = ctx.createLinearGradient(0, VH * 0.7, 0, VH);
    q.addColorStop(0, "rgba(30,50,70,0)");
    q.addColorStop(1, "rgba(20,40,60,0.65)");
    ctx.fillStyle = q;
    ctx.fillRect(VW * 0.3, VH * 0.68, 420, 160);
    ctx.restore();
  }

  for (const p of sparks) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = `rgba(255,${180 + a * 60},${80},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sim.sparkAnim > 0 && images.sparks) {
    const fi = Math.min(3, Math.floor((1 - sim.sparkAnim / 0.42) * 4));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawSheetFrame(ctx, images.sparks, 2, 2, fi, bladeX - 90, bladeY - 110, 200, 200);
    ctx.restore();
  }

  if (onAnvil && sim.phase === "forge") {
    drawHand(ctx, images, sim, time, bladeX, bladeY);
  }

  const vg = ctx.createRadialGradient(VW / 2, VH / 2, 180, VW / 2, VH / 2, 520);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,5,3,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  sim: ReturnType<typeof createSim>,
  time: number,
  bladeX: number,
  bladeY: number,
) {
  const size = 430;
  const hx = bladeX - 90;
  const hy = bladeY - 300;

  if (sim.strikeAnim > 0 && images.strike) {
    const t = 1 - sim.strikeAnim / 0.38;
    const frame = Math.min(5, Math.floor(t * 6));
    drawSheetFrame(ctx, images.strike, 3, 2, frame, hx - 10, hy + 30, size + 20, (size + 20) * 0.66);
    return;
  }

  const charge = sim.charging ? sim.force : 0;
  const bob = Math.sin(time * 2.2) * 5;
  const restLift = size * 0.225 * Math.pow(1 - charge, 3);
  ctx.save();
  const pivotX = hx + size * 0.74;
  const pivotY = hy + size * 0.16;
  ctx.translate(pivotX, pivotY);
  ctx.rotate(-0.1 - charge * 0.42);
  ctx.translate(-pivotX, -pivotY);
  if (images.hand) {
    ctx.drawImage(images.hand, hx, hy + bob - restLift, size, size);
  }
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}
