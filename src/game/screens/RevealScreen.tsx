import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword } from "../types";
import { PROFILES, STEELS, WRAPS, GUARDS, POMMELS } from "../catalog";

interface Props {
  sword: FinishedSword;
  onClaimRewards: () => void;
  onAgain: () => void;
  onGallery: () => void;
  onTitle: () => void;
}

export function RevealScreen({ sword, onClaimRewards, onAgain, onGallery, onTitle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lightOffset, setLightOffset] = useState(0.5);

  const isBroken = sword.structuralState === "broken" || sword.quality <= 15;
  const profile = PROFILES[sword.design.profile];
  const steel = STEELS[sword.design.steel];
  const wrap = WRAPS[sword.design.wrap];
  const guard = GUARDS[sword.design.guard];
  const pommel = POMMELS[sword.design.pommel];

  const damage = sword.damage ?? Math.round(180 + sword.quality * 1.5);
  const defense = sword.defense ?? Math.round(90 + sword.quality * 0.8);
  const agility = sword.agility ?? Math.round(75 + sword.quality * 0.6);
  const durability = sword.durability ?? Math.max(20, Math.round(sword.quenchScore * 0.9));
  const rarity = sword.rarity ?? (sword.quality >= 95 ? "Lendária" : sword.quality >= 85 ? "Épica" : sword.quality >= 70 ? "Rara" : sword.quality >= 50 ? "Incomum" : "Comum");

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

    // Deep royal blue-purple velvet backdrop gradient
    const vg = ctx.createRadialGradient(w / 2, h * 0.5, 40, w / 2, h * 0.5, Math.max(w, h) * 0.65);
    vg.addColorStop(0, "#161b2e");
    vg.addColorStop(0.5, "#0d1120");
    vg.addColorStop(1, "#060810");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // Warm candle / lantern ambient reflection
    const cg = ctx.createRadialGradient(w * 0.2, h * 0.15, 10, w * 0.2, h * 0.15, 200);
    cg.addColorStop(0, "rgba(255, 170, 70, 0.12)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);

    // Draw the sword vertically on velvet (as in Reference Image 2!)
    const swordLen = Math.min(w * 0.85, h * 0.86);
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.88, swordLen, {
      angle: -Math.PI / 2, // Vertical presentation
      assembled: !isBroken,
      heat: 0,
      shape: 1,
      quality: sword.quality,
      warp: sword.warp,
      cracks: sword.cracks ?? (isBroken ? 2 : 0),
      broken: isBroken,
      lightOffset,
    });
  }, [sword, lightOffset, isBroken]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = 1 - (e.clientY - rect.top) / rect.height;
    setLightOffset(Math.max(0.1, Math.min(0.9, relY)));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#080b12] text-fg px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Top Inspection Header Bar (matching Reference Image 2) */}
      <header className="mx-auto flex w-full max-w-4xl flex-col items-center border-b border-[#243048] pb-4 text-center">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs uppercase tracking-[0.24em] text-cyan-400">
            {isBroken ? "RELATÓRIO DE FALHA" : `INSPEÇÃO: ${sword.grade.toUpperCase()}`}
          </span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-wider text-amber-100 sm:text-3xl">
          {sword.design.name ? sword.design.name.toUpperCase() : "LÂMINA SEM NOME"}
        </h1>

        {/* Stats Subheader: Damage | Durability | Rarity */}
        {!isBroken ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-display tracking-widest sm:gap-8">
            <div>
              <span className="text-muted">DAMAGE: </span>
              <span className="text-amber-300 font-bold text-sm tabular-nums">{damage}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">DURABILITY: </span>
              <span className="text-cyan-300 font-bold text-sm tabular-nums">{durability}/100</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]"
                  style={{ width: `${durability}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-muted">RARITY: </span>
              <span
                className={
                  rarity === "Lendária"
                    ? "text-amber-400 font-bold"
                    : rarity === "Épica"
                      ? "text-purple-400 font-bold"
                      : rarity === "Rara"
                        ? "text-blue-400 font-bold"
                        : "text-slate-300 font-bold"
                }
              >
                {rarity.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-red-400">
            A peça sofreu colapso estrutural durante o forjamento.
          </p>
        )}
      </header>

      {/* Main Inspection Stage */}
      <div className="mx-auto mt-4 grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Specification Column (matching Reference Image 2) */}
        {!isBroken && (
          <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted">Componentes</h2>
            <SpecCard icon="⚔️" title="TIPO DE LÂMINA" value={profile.name} desc={profile.blurb} />
            <SpecCard icon="✨" title="AÇO & MATERIAIS" value={steel.name} desc={steel.blurb} />
            <SpecCard icon="ᚱ" title="RUNAS & ENTALHES" value={sword.design.runes ? "Runas Ciano/Ouro" : "Sem Runas"} desc={sword.design.inscription || "Liso"} />
            <SpecCard icon="🛡️" title="GUARDA & POMO" value={`${guard.name} / ${pommel.name}`} desc={`Cabo: ${wrap.name}`} />
          </aside>
        )}

        {/* Center: Velvet Inspection Canvas with Interactive Lighting */}
        <div
          className={`order-1 overflow-hidden rounded-xl border border-[#23314d] bg-[#0c101c] shadow-[0_16px_50px_rgba(0,0,0,0.85)] ${
            isBroken ? "lg:col-span-12" : "lg:order-2 lg:col-span-6"
          }`}
        >
          <div className="relative">
            <canvas
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              className="h-96 w-full cursor-crosshair sm:h-[460px]"
            />
            <div className="pointer-events-none absolute bottom-2 left-3 text-[0.65rem] uppercase tracking-widest text-slate-500">
              Passe o cursor sobre a lâmina para inspecionar o gume
            </div>
          </div>
        </div>

        {/* Right Attributes and Perks Column (matching Reference Image 2) */}
        {!isBroken ? (
          <aside className="order-3 flex flex-col gap-3 lg:col-span-3">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted">Propriedades Físicas</h2>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#223049] bg-[#0f1523] p-3 text-center">
              <div>
                <span className="block font-display text-[0.6rem] text-muted">ATK</span>
                <span className="font-display text-base font-bold text-amber-300">{damage}</span>
              </div>
              <div>
                <span className="block font-display text-[0.6rem] text-muted">DEF</span>
                <span className="font-display text-base font-bold text-blue-300">{defense}</span>
              </div>
              <div>
                <span className="block font-display text-[0.6rem] text-muted">AGI</span>
                <span className="font-display text-base font-bold text-emerald-300">{agility}</span>
              </div>
            </div>

            {/* Perks Section */}
            {sword.perks && sword.perks.length > 0 && (
              <div className="rounded-lg border border-[#223049] bg-[#0f1523] p-3">
                <h3 className="font-display text-[0.65rem] uppercase tracking-wider text-cyan-400">
                  Feitos da Forja
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  {sword.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Flaws Section (if any defects occurred) */}
            {sword.flaws && sword.flaws.length > 0 && (
              <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3">
                <h3 className="font-display text-[0.65rem] uppercase tracking-wider text-red-400">
                  Defeitos Observados
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-red-300">
                  {sword.flaws.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Forge Quality Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MetricItem label="Aquecimento" value={`${sword.heatScore}%`} />
              <MetricItem label="Martelamento" value={`${sword.forgeScore}%`} />
              <MetricItem label="Têmpera" value={`${sword.quenchScore}%`} />
              <MetricItem label="Retidão" value={`${Math.max(0, Math.round(100 - sword.warp * 100))}%`} />
            </div>
          </aside>
        ) : (
          <div className="mx-auto max-w-xl text-center text-sm text-slate-300">
            <div className="rounded-lg border border-red-900 bg-red-950/30 p-5">
              <h3 className="font-display text-lg text-red-400">Lição do Ferreiro</h3>
              <p className="mt-2 leading-relaxed text-slate-300">
                O metal foi submetido a estresse mecânico fora da faixa ideal de temperatura.
                Trabalhar o aço frio acumula tensões microscópicas que propagam trincas fatais.
                Sempre mantenha a peça no calor amarelo-laranja e reaqueça quando a luminosidade diminuir.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Buttons */}
      <footer className="mx-auto mt-8 flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:justify-end">
        {!isBroken ? (
          <>
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-500 text-black font-bold tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              onClick={onClaimRewards}
            >
              ⭐ Reivindicar Recompensas
            </Button>
            <Button variant="secondary" size="lg" onClick={onGallery}>
              Ver no Arsenal
            </Button>
            <Button variant="ghost" size="lg" onClick={onAgain}>
              Forjar Outra
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onAgain}>
              Limpar a Bigorna e Tentar Novamente
            </Button>
            <Button variant="ghost" size="lg" onClick={onTitle}>
              Voltar ao Título
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}

function SpecCard({ icon, title, value, desc }: { icon: string; title: string; value: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[#202c44] bg-[#0f1422] p-2.5 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="font-display text-[0.62rem] uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="mt-1 font-display text-xs font-semibold text-fg">{value}</p>
      <p className="mt-0.5 text-[0.68rem] text-slate-400">{desc}</p>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#202c44] bg-[#0e1320] px-2.5 py-1.5">
      <span className="block font-display text-[0.6rem] text-muted">{label}</span>
      <span className="font-display text-sm font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}
