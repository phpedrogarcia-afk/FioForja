import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { drawSheetFrame, type GameImages } from "./assets";
import { createSim, stepSim, type SimInput } from "./sim";
import { drawFinishedSword } from "./swordDraw";
import type { HudSnapshot, SimState, SwordDesign } from "./types";
import { playClang, playHiss, playPull, playWhoosh } from "./audio";

const VW = 1280;
const VH = 720;
/** Guard toward the smith. Tip follows the angle of each station. */
const SHOULDER = { x: 1140, y: 800 };
const BUCKET = { x: 990, y: 575 };

interface Pose {
  x: number;
  y: number;
  angle: number;
  len: number;
}

const HEARTH: Pose = { x: 250, y: 445, angle: -0.4, len: 310 };
const ANVIL: Pose = { x: 530, y: 595, angle: -1.08, len: 490 };
const TROUGH: Pose = { x: 870, y: 485, angle: 0.95, len: 450 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    angle: lerp(a.angle, b.angle, t),
    len: lerp(a.len, b.len, t),
  };
}

function smooth(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function bladePoint(design: SwordDesign, pose: Pose, along: number) {
  const reach = pose.len * (0.55 + design.length * 0.45) * (0.16 + along * 0.7);
  return {
    x: pose.x + Math.cos(pose.angle) * reach,
    y: pose.y + Math.sin(pose.angle) * reach,
  };
}

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
    let station: "hearth" | "anvil" | "trough" = "hearth";
    let pose: Pose = { ...HEARTH };
    let poseFrom: Pose = { ...HEARTH };
    let poseTo: Pose = { ...HEARTH };
    let carry = 1;
    let visualAlong = 0.12;
    let exitTimer = -1;

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
        const hit = bladePoint(design, ANVIL, sim.along);
        emitSparks(ev.kind === "perfect" ? 48 : 26, hit.x, hit.y, force);
      }
      if (ev.finished && exitTimer < 0) {
        exitTimer = sim.broken ? 0.2 : 0.95;
      }
      if (exitTimer >= 0) {
        exitTimer -= dt;
        if (exitTimer <= 0 && !finishedSent) {
          finishedSent = true;
          onFinished(sim);
        }
      }

      const nextStation = sim.phase === "heat" || sim.reheating ? "hearth" : sim.phase === "quench" ? "trough" : "anvil";
      if (nextStation !== station) {
        station = nextStation;
        poseFrom = { ...pose };
        poseTo = station === "hearth" ? HEARTH : station === "trough" ? TROUGH : ANVIL;
        carry = 0;
      }
      carry = Math.min(1, carry + (reducedMotion ? 1 : dt / 0.82));
      pose = lerpPose(poseFrom, poseTo, smooth(carry));
      const liftAmt = exitTimer >= 0 && !sim.broken && sim.phase === "quench" ? 1 - Math.max(0, exitTimer) / 0.95 : 0;
      if (sim.phase === "quench") {
        pose = {
          ...pose,
          y: pose.y + sim.quenchFill * 62 - liftAmt * 96,
          angle: pose.angle + sim.quenchFill * 0.28 - liftAmt * 1.05,
        };
      }
      visualAlong += (sim.along - visualAlong) * Math.min(1, dt * 4.5);

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
          integrity: sim.integrity,
          missStreak: sim.missStreak,
          broken: sim.broken,
        });
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const scale = Math.max(cssW / VW, cssH / VH);
      const portrait = cssW / cssH < 1;
      const focusX = portrait ? pose.x : VW / 2;
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
      paint(ctx, images, design, sim, sparks, time, pose, visualAlong, station, carry);
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
  pose: Pose,
  along: number,
  station: "hearth" | "anvil" | "trough",
  carry: number,
) {
  if (images.bg) drawCover(ctx, images.bg, VW, VH);
  else {
    ctx.fillStyle = "#140e0a";
    ctx.fillRect(0, 0, VW, VH);
  }

  const atFire = station === "hearth";
  if (atFire && images.fire) {
    const fi = Math.floor(time * 8) % 4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 + sim.heat * 0.35;
    drawSheetFrame(ctx, images.fire, 2, 2, fi, 70, 230, 300, 300);
    ctx.restore();
  }

  drawBucket(ctx, sim.phase === "quench" ? sim.quenchFill : 0, time);

  const formed = sim.strikes > 0 || sim.phase !== "heat";
  drawFinishedSword(ctx, design, pose.x, pose.y, pose.len, {
    angle: pose.angle,
    heat: sim.heat,
    shape: formed ? Math.max(sim.shape, 0.48) : 0.2,
    assembled: formed,
    quality: sim.quality,
    broken: sim.broken || sim.integrity < 0.42,
  });
  if (sim.heat > 0.42) drawFlames(ctx, design, pose, sim.heat, time);

  if (sim.phase === "quench" && sim.quenchFill > 0.08) {
    ctx.save();
    ctx.globalAlpha = 0.28 + sim.quenchFill * 0.35;
    ctx.fillStyle = "rgba(150, 196, 204, 0.55)";
    ctx.beginPath();
    ctx.ellipse(BUCKET.x, BUCKET.y - 8, 78, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (sim.quenchFill > 0.2) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "rgba(220, 230, 232, 0.8)";
      for (let i = 0; i < 5; i++) {
        const y = BUCKET.y - 30 - ((time * 40 + i * 18) % 70);
        ctx.beginPath();
        ctx.arc(BUCKET.x - 20 + i * 12, y, 6 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  for (const p of sparks) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = `rgba(255,${170 + a * 70},${60},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.6 + a), 0, Math.PI * 2);
    ctx.fill();
  }

  const forging = station === "anvil" && sim.phase === "forge" && !sim.reheating && carry > 0.92;
  const contact = forging ? bladePoint(design, pose, along) : { x: pose.x + 8, y: pose.y - 6 };
  let lift = forging ? (sim.charging ? 0.2 + sim.force * 0.8 : 0.22) : 0.58;
  if (forging && sim.strikeAnim > 0) {
    const t = 1 - sim.strikeAnim / 0.38;
    lift = (1 - t) * (1 - t);
  }
  const head = {
    x: contact.x + lift * 36,
    y: contact.y - lift * 148,
  };
  drawHammer(ctx, images, sim, head.x, head.y);

  if (forging && sim.sparkAnim > 0 && images.sparks) {
    const fi = Math.min(3, Math.floor((1 - sim.sparkAnim / 0.42) * 4));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawSheetFrame(ctx, images.sparks, 2, 2, fi, contact.x - 70, contact.y - 70, 150, 150);
    ctx.restore();
  }

  const vg = ctx.createRadialGradient(pose.x, pose.y, 80, VW / 2, VH / 2, 640);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,5,3,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
}

function drawHammer(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  sim: ReturnType<typeof createSim>,
  headX: number,
  headY: number,
) {
  const size = 440;
  const striking = sim.strikeAnim > 0 && images.strike;
  const w = striking ? size * 1.05 : size;
  const h = striking ? size * 0.7 : size * 0.78;
  const hotX = 0.2;
  const hotY = 0.46;
  const hx = headX - w * hotX;
  const hy = headY - h * hotY;
  ctx.save();
  const pivotX = hx + w * 0.9;
  const pivotY = hy + h * 0.62;
  ctx.translate(pivotX, pivotY);
  const lift = sim.strikeAnim > 0 ? 0 : sim.charging ? sim.force : 0.12;
  ctx.rotate(-0.05 - lift * 0.5);
  ctx.translate(-pivotX, -pivotY);
  if (striking && images.strike) {
    const t = 1 - sim.strikeAnim / 0.38;
    const frame = Math.min(5, Math.floor(t * 6));
    drawSheetFrame(ctx, images.strike, 3, 2, frame, hx, hy, w, h);
  } else if (images.hand) {
    ctx.drawImage(images.hand, hx, hy, w, h);
  }
  ctx.restore();
}

function drawFlames(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  pose: Pose,
  heat: number,
  time: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.25 + heat * 0.45;
  for (let i = 0; i < 7; i++) {
    const p = bladePoint(design, pose, 0.15 + i * 0.1);
    const flick = Math.sin(time * 14 + i) * 8;
    ctx.fillStyle = heat > 0.75 ? "rgba(255,230,180,0.9)" : "rgba(255,120,30,0.85)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 10 + flick, 7, 16 + heat * 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBucket(ctx: CanvasRenderingContext2D, dip: number, time: number) {
  const x = BUCKET.x;
  const y = BUCKET.y;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 36, 90, 18, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a3424";
  ctx.beginPath();
  ctx.moveTo(x - 78, y - 8);
  ctx.lineTo(x + 78, y - 18);
  ctx.lineTo(x + 64, y + 48);
  ctx.lineTo(x - 64, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1c12";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "#8a8070";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 74, y + 6);
  ctx.lineTo(x + 74, y - 2);
  ctx.moveTo(x - 66, y + 28);
  ctx.lineTo(x + 68, y + 22);
  ctx.stroke();
  ctx.fillStyle = dip > 0.05 ? "rgba(190, 214, 216, 0.85)" : "#1c3338";
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 76, 20, -0.15, 0, Math.PI * 2);
  ctx.fill();
  if (dip > 0.15) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 50 + Math.sin(time * 8) * 4, 12, -0.15, 0, Math.PI * 2);
    ctx.stroke();
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
