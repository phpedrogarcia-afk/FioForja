import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword } from "../types";
import { RevealScreen } from "./RevealScreen";

interface Props {
  swords: FinishedSword[];
  onBack: () => void;
  onForge: () => void;
}

export function GalleryScreen({ swords, onBack, onForge }: Props) {
  const [selectedSword, setSelectedSword] = useState<FinishedSword | null>(null);
  const [filter, setFilter] = useState<string>("Todas");

  if (selectedSword) {
    return (
      <RevealScreen
        sword={selectedSword}
        onClaimRewards={() => setSelectedSword(null)}
        onAgain={onForge}
        onGallery={() => setSelectedSword(null)}
        onTitle={onBack}
      />
    );
  }

  const filteredSwords = swords.filter((s) => {
    if (filter === "Todas") return true;
    return (s.rarity || "Comum") === filter;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[#080b12] px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between border-b border-[#243048] pb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.22em] text-muted">Arsenal do Ferreiro</h1>
          <p className="text-xs text-slate-400">{swords.length} espada(s) forjada(s)</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onForge}>
          + Forjar Nova
        </Button>
      </header>

      {/* Rarity Filter Tabs */}
      {swords.length > 0 && (
        <div className="mx-auto mt-4 flex w-full max-w-4xl flex-wrap gap-2">
          {["Todas", "Lendária", "Épica", "Rara", "Incomum", "Comum"].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`rounded-md px-3 py-1 text-xs font-display tracking-wider transition-colors ${
                filter === r
                  ? "bg-amber-600 text-black font-bold shadow-xs"
                  : "bg-surface border border-border text-slate-400 hover:text-fg"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {swords.length === 0 ? (
        <div className="mx-auto mt-20 max-w-sm text-center text-muted">
          <p className="text-base text-slate-300">Nenhuma lâmina forjada ainda.</p>
          <p className="mt-2 text-xs text-slate-500">O fogo da forja e a bigorna esperam pelo seu primeiro projeto.</p>
          <Button className="mt-6" size="lg" onClick={onForge}>
            Iniciar Primeira Forja
          </Button>
        </div>
      ) : (
        <ul className="mx-auto mt-6 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filteredSwords.map((s) => {
            const rarity = s.rarity || (s.quality >= 95 ? "Lendária" : s.quality >= 85 ? "Épica" : s.quality >= 70 ? "Rara" : s.quality >= 50 ? "Incomum" : "Comum");
            const rarityColor =
              rarity === "Lendária"
                ? "border-amber-500/60 bg-amber-950/20 text-amber-300"
                : rarity === "Épica"
                  ? "border-purple-500/60 bg-purple-950/20 text-purple-300"
                  : rarity === "Rara"
                    ? "border-blue-500/60 bg-blue-950/20 text-blue-300"
                    : "border-slate-700 bg-slate-900/40 text-slate-400";

            return (
              <li
                key={s.id}
                onClick={() => setSelectedSword(s)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-[#223049] bg-[#0c101a] shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/70 hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
              >
                <Thumb sword={s} />
                <div className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-sm border px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${rarityColor}`}>
                      {rarity}
                    </span>
                    <span className="font-display text-xs text-slate-400 tabular-nums">
                      Q: {s.quality}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold text-fg group-hover:text-amber-200">
                    {s.design.name || "Lâmina Sem Nome"}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{s.grade}</span>
                    <span className="text-[0.7rem] text-slate-500">Inspecionar →</span>
                  </div>
                </div>
              </li>
            );
          })}
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

    // Deep velvet texture gradient for thumbnail
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#131828");
    bg.addColorStop(1, "#090d18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const isBroken = sword.structuralState === "broken" || sword.quality <= 15;
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.58, Math.min(w, h) * 0.92, {
      assembled: !isBroken,
      quality: sword.quality,
      warp: sword.warp,
      cracks: sword.cracks ?? (isBroken ? 2 : 0),
      broken: isBroken,
    });
  }, [sword]);
  return <canvas ref={ref} className="h-44 w-full bg-[#0d1220]" />;
}
