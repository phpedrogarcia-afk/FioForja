import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword } from "../types";

interface Props {
  sword: FinishedSword;
  onAgain: () => void;
  onGallery: () => void;
  onTitle: () => void;
}

export function RevealScreen({ sword, onAgain, onGallery, onTitle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w * 0.45);
    g.addColorStop(0, "rgba(196,92,38,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.56, Math.min(w, h) * 0.95, {
      assembled: true,
      heat: 0,
      shape: 1,
      quality: sword.quality,
    });
  }, [sword]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <p className="text-center font-display text-xs uppercase tracking-[0.24em] text-ember-hot">
          {sword.grade}
        </p>
        <h1 className="mt-2 text-center font-display text-3xl tracking-wide">
          {sword.design.name || "Lâmina sem nome"}
        </h1>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <canvas ref={canvasRef} className="h-72 w-full sm:h-80" />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <Row label="Qualidade" value={`${sword.quality}`} />
          <Row label="Aquecimento" value={`${sword.heatScore}`} />
          <Row label="Martelo" value={`${sword.forgeScore}`} />
          <Row label="Têmpera" value={`${sword.quenchScore}`} />
        </dl>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button size="lg" onClick={onAgain}>
            Forjar outra
          </Button>
          <Button variant="secondary" size="lg" onClick={onGallery}>
            Ver galeria
          </Button>
          <Button variant="ghost" size="md" onClick={onTitle}>
            Título
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2">
      <dt className="font-display text-[0.65rem] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="font-display text-lg tabular-nums">{value}</dd>
    </div>
  );
}
