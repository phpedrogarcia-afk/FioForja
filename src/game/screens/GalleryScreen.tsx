import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword } from "../types";

interface Props {
  swords: FinishedSword[];
  onBack: () => void;
  onForge: () => void;
}

export function GalleryScreen({ swords, onBack, onForge }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
        <h1 className="font-display text-sm uppercase tracking-[0.22em] text-muted">Galeria</h1>
        <Button variant="secondary" size="sm" onClick={onForge}>
          Forjar
        </Button>
      </header>

      {swords.length === 0 ? (
        <div className="mx-auto mt-16 max-w-sm text-center text-muted">
          <p>Nenhuma lâmina ainda. O ferro espera.</p>
          <Button className="mt-6" onClick={onForge}>
            Começar
          </Button>
        </div>
      ) : (
        <ul className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          {swords.map((s) => (
            <li key={s.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <Thumb sword={s} />
              <div className="px-3 py-3">
                <p className="font-display text-base">{s.design.name || "Sem nome"}</p>
                <p className="mt-1 text-sm text-muted">
                  {s.grade} · {s.quality}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({ sword }: { sword: FinishedSword }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
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
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.58, Math.min(w, h) * 0.9, {
      assembled: true,
      quality: sword.quality,
    });
  }, [sword]);
  return <canvas ref={ref} className="h-40 w-full bg-elevated" />;
}
