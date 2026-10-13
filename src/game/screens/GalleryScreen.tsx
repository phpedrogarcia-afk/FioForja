import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PROFILES, STEELS } from "../catalog";
import { boonLabel, rarityLabel } from "../rewards";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword, Rarity } from "../types";

interface Props {
  swords: FinishedSword[];
  onBack: () => void;
  onForge: () => void;
}

const ORDER: Rarity[] = ["lendaria", "epica", "rara", "incomum", "comum", "quebrada"];

export function GalleryScreen({ swords, onBack, onForge }: Props) {
  const sorted = [...swords].sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity));
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
        <h1 className="font-display text-sm uppercase tracking-[0.22em] text-muted">Arsenal</h1>
        <Button variant="secondary" size="sm" onClick={onForge}>
          Forjar
        </Button>
      </header>

      {sorted.length === 0 ? (
        <div className="mx-auto mt-16 max-w-sm text-center text-muted">
          <p>O cabide está vazio. O ferro espera na forja.</p>
          <Button className="mt-6" onClick={onForge}>
            Começar
          </Button>
        </div>
      ) : (
        <ul className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((s) => (
            <li key={s.id} className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
              <Thumb sword={s} />
              <div className="px-4 py-3">
                <p className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-ember-hot">
                  {rarityLabel(s.rarity)}
                </p>
                <p className="mt-1 font-display text-lg leading-tight">{s.title}</p>
                {s.design.name && s.design.name !== "Lâmina sem nome" ? (
                  <p className="text-sm text-muted">{s.design.name}</p>
                ) : null}
                <p className="mt-1 text-sm text-muted">
                  {PROFILES[s.design.profile].name} · {STEELS[s.design.steel].name}
                </p>
                <p className="mt-2 font-display text-sm tabular-nums text-fg">
                  ATK {s.stats.atk} · DEF {s.stats.def} · AGI {s.stats.agi}
                </p>
                {boonLabel(s.boon) ? <p className="mt-1 text-sm text-ember-hot">{boonLabel(s.boon)}</p> : null}
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
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.62, Math.min(w, h) * 0.95, {
      assembled: true,
      quality: sword.quality,
      shape: sword.broken ? 0.7 : 1,
      broken: sword.broken,
      elven: sword.boon === "elfico" || sword.boon === "runas-elfico",
      rareRunes: sword.boon === "runas" || sword.boon === "runas-elfico" || sword.design.runes,
    });
  }, [sword]);
  return <canvas ref={ref} className="h-40 w-full bg-elevated" />;
}
