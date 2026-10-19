import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { drawFinishedSword } from "../swordDraw";
import { isWeaponDnaEnabled } from "../visuals/rendererAdapter";
import { drawWeaponGenome, fitWeaponViewport, weaponGenomeFor } from "../visuals/weaponRenderer";
import type { FinishedSword, PlayerInventory, PlayerWallet } from "../types";
import { PROFILES, STEELS, WRAPS, GUARDS, POMMELS } from "../catalog";
import { defaultInventory, defaultWallet } from "../save";

interface Props {
  sword: FinishedSword;
  onClaimRewards: () => void;
  onAgain: () => void;
  onGallery: () => void;
  onTitle: () => void;
  wallet?: PlayerWallet;
  inventory?: PlayerInventory;
  onUpgrade?: (sword: FinishedSword) => boolean;
  onInstallComponent?: (swordId: string, componentId: string) => boolean;
}

export function RevealScreen({
  sword,
  onClaimRewards,
  onAgain,
  onGallery,
  onTitle,
  wallet = defaultWallet,
  inventory = defaultInventory,
  onUpgrade,
  onInstallComponent,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lightOffset, setLightOffset] = useState(0.5);
  const [upgradeFeedback, setUpgradeFeedback] = useState<string | null>(null);

  const [currentSword, setCurrentSword] = useState<FinishedSword>(sword);
  useEffect(() => {
    setCurrentSword(sword);
  }, [sword]);

  const isBroken = currentSword.structuralState === "broken" || currentSword.quality <= 15;
  const profile = PROFILES[currentSword.design.profile];
  const steel = STEELS[currentSword.design.steel];
  const wrap = WRAPS[currentSword.design.wrap];
  const guard = GUARDS[currentSword.design.guard];
  const pommel = POMMELS[currentSword.design.pommel];

  const upgrades = currentSword.upgradesApplied || 0;
  const maxUpgrades = 3;
  const isMaxUpgraded = upgrades >= maxUpgrades;
  const goldCost = 60 * (upgrades + 1);
  const rubyCost = upgrades >= 1 ? 1 : 0;
  const canAffordUpgrade = !isBroken && !isMaxUpgraded && wallet.gold >= goldCost && wallet.rubies >= rubyCost;

  const damage = currentSword.damage ?? Math.round(180 + currentSword.quality * 1.5);
  const defense = currentSword.defense ?? Math.round(90 + currentSword.quality * 0.8);
  const agility = currentSword.agility ?? Math.round(75 + currentSword.quality * 0.6);
  const durability = currentSword.durability ?? Math.max(20, Math.round(currentSword.quenchScore * 0.9));
  const rarity = currentSword.rarity ?? (currentSword.quality >= 95 ? "Lendária" : currentSword.quality >= 85 ? "Épica" : currentSword.quality >= 70 ? "Rara" : currentSword.quality >= 50 ? "Incomum" : "Comum");

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

    // Deep royal blue-purple midnight velvet backdrop gradient
    const vg = ctx.createRadialGradient(w / 2, h * 0.5, 30, w / 2, h * 0.5, Math.max(w, h) * 0.7);
    vg.addColorStop(0, "#181a30");
    vg.addColorStop(0.45, "#0e1122");
    vg.addColorStop(1, "#05060e");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // Subtle velvet fabric weave texture
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    for (let x = 0; x < w; x += 4) {
      ctx.fillRect(x, 0, 1.5, h);
    }

    // Warm candle / lantern ambient reflection on velvet
    const cg = ctx.createRadialGradient(w * 0.22, h * 0.16, 15, w * 0.22, h * 0.16, 240);
    cg.addColorStop(0, "rgba(255, 175, 75, 0.14)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);

    // Draw the sword vertically on velvet (as in Reference Image 3)
    const swordLen = Math.min(w * 0.86, h * 0.86);
    if (isWeaponDnaEnabled() && !isBroken) {
      const genome = weaponGenomeFor(currentSword);
      drawWeaponGenome(ctx, genome, fitWeaponViewport(genome, w, h, -Math.PI / 2), {
        lightOffset,
        runicCharge: currentSword.rarity === "Relíquia" || currentSword.rarity === "Lendária" ? 0.55 : 0.25,
      });
      canvas.dataset.renderer = "dna";
      return;
    }
    canvas.dataset.renderer = "legacy";
    drawFinishedSword(ctx, currentSword.design, w / 2, h * 0.88, swordLen, {
      angle: -Math.PI / 2, // Vertical presentation
      assembled: !isBroken,
      heat: 0,
      shape: 1,
      quality: currentSword.quality,
      warp: currentSword.warp,
      cracks: currentSword.cracks ?? (isBroken ? 2 : 0),
      broken: isBroken,
      lightOffset,
    });
  }, [currentSword, lightOffset, isBroken]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = 1 - (e.clientY - rect.top) / rect.height;
    setLightOffset(Math.max(0.1, Math.min(0.9, relY)));
  };

  const handleUpgradeClick = () => {
    if (!onUpgrade || !canAffordUpgrade) return;
    const success = onUpgrade(currentSword);
    if (success) {
      setCurrentSword((prev) => ({
        ...prev,
        damage: (prev.damage ?? 180) + 8,
        durability: Math.min(100, (prev.durability ?? 90) + 2),
        upgradesApplied: (prev.upgradesApplied || 0) + 1,
      }));
      setUpgradeFeedback("Fio afiado na pedra-d'água e empunhadura ajustada! (+8 ATK / +2 Durabilidade)");
      window.setTimeout(() => setUpgradeFeedback(null), 3500);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#070912] text-fg px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
      {/* Top Inspection & Resource Header Bar (Reference Image 3) */}
      <header className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 border-b border-[#202c44] pb-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="font-display text-xs uppercase tracking-[0.24em] text-cyan-400">
              {isBroken ? "RELATÓRIO DE FALHA ESTRUTURAL" : `INSPEÇÃO: ${sword.grade.toUpperCase()}`}
            </span>
            <span className="rounded bg-[#162136] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-amber-300">
              {rarity}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-wider text-amber-100 sm:text-3xl">
            {sword.design.name ? sword.design.name.toUpperCase() : "AETHELGARD'S BANE (MASTERWORK)"}
          </h1>
        </div>

        {/* Player Wallet Display in Header (Gold | Rubies | Diamonds) */}
        <div className="flex items-center gap-4 rounded-xl border border-amber-900/50 bg-[#0c1220] px-4 py-2 font-display text-xs shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">🪙</span>
            <span className="font-bold text-amber-200 tabular-nums">{wallet.gold.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 text-sm">💎</span>
            <span className="font-bold text-red-200 tabular-nums">{wallet.rubies}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 text-sm">🔷</span>
            <span className="font-bold text-cyan-200 tabular-nums">{wallet.diamonds}</span>
          </div>
        </div>
      </header>

      {/* Subheader: Damage | Durability Bar | Rarity (Reference Image 3) */}
      {!isBroken && (
        <div className="mx-auto mt-3 flex w-full max-w-4xl flex-wrap items-center justify-center gap-4 text-xs font-display tracking-widest sm:justify-start sm:gap-8 border-b border-[#1b253b] pb-3">
          <div>
            <span className="text-muted">DAMAGE: </span>
            <span className="text-amber-300 font-bold text-sm tabular-nums">{damage}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">DURABILITY: </span>
            <span className="text-cyan-300 font-bold text-sm tabular-nums">{durability}/100</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-900 border border-slate-700">
              <div
                className="h-full bg-cyan-400 shadow-[0_0_10px_#00f2fe]"
                style={{ width: `${durability}%` }}
              />
            </div>
          </div>
          <div>
            <span className="text-muted">REFINE: </span>
            <span className="text-amber-400 font-bold text-sm tabular-nums">+{upgrades}</span>
          </div>
        </div>
      )}

      {/* Main Inspection Stage */}
      <div className="mx-auto mt-4 grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Round Node Badges for Components (Reference Image 3) */}
        {!isBroken && (
          <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted">Especificações</h2>
            <NodeBadge
              icon="⚔️"
              title="TIPO DE LÂMINA"
              value={profile.name}
              desc={profile.blurb}
            />
            <NodeBadge
              icon="✨"
              title="AÇO & MATERIAIS"
              value={steel.name}
              desc={steel.blurb}
            />
            <NodeBadge
              icon="ᚱ"
              title="RUNAS & ENTALHES"
              value={sword.design.runes ? "Runas Ciano Incandescentes" : "Sem Runas"}
              desc={sword.design.inscription || "Gume Liso"}
            />
            <NodeBadge
              icon="🛡️"
              title="GUARDA & POMO"
              value={`${guard.name} / ${pommel.name}`}
              desc={`Empunhadura: ${wrap.name}`}
            />
          </aside>
        )}

        {/* Center: Velvet Inspection Canvas with Interactive Lighting (Reference Image 3) */}
        <div
          className={`order-1 overflow-hidden rounded-xl border border-[#23314d] bg-[#0a0d18] shadow-[0_16px_50px_rgba(0,0,0,0.85)] ${
            isBroken ? "lg:col-span-12" : "lg:order-2 lg:col-span-6"
          }`}
        >
          <div className="relative">
            <canvas
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              className="h-96 w-full cursor-crosshair sm:h-[480px]"
            />
            <div className="pointer-events-none absolute bottom-2 left-3 text-[0.65rem] uppercase tracking-widest text-slate-500">
              Passe o cursor sobre a lâmina para mover a iluminação sobre o veludo
            </div>
          </div>
        </div>

        {/* Right Column: Base Stats, Perks, and Interactive UPGRADE System (Reference Image 3) */}
        {!isBroken ? (
          <aside className="order-3 flex flex-col gap-3 lg:col-span-3">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-muted">Atributos de Combate</h2>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#223049] bg-[#0f1523] p-3 text-center">
              <div>
                <span className="block font-display text-[0.6rem] text-muted">ATK</span>
                <span className="font-display text-base font-bold text-amber-300 tabular-nums">{damage}</span>
              </div>
              <div>
                <span className="block font-display text-[0.6rem] text-muted">DEF</span>
                <span className="font-display text-base font-bold text-blue-300 tabular-nums">{defense}</span>
              </div>
              <div>
                <span className="block font-display text-[0.6rem] text-muted">AGI</span>
                <span className="font-display text-base font-bold text-emerald-300 tabular-nums">{agility}</span>
              </div>
            </div>

            {/* INTERACTIVE WORKBENCH REFINEMENT PANEL (Reference Image 3 & Directive 4) */}
            <div className="rounded-lg border border-amber-600/50 bg-[#121626] p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                  Refino de Bancada ({upgrades}/{maxUpgrades})
                </span>
                {!isMaxUpgraded && (
                  <span className="rounded bg-black/40 px-2 py-0.5 text-[0.65rem] font-bold text-amber-200">
                    {goldCost.toLocaleString()} 🪙 {rubyCost > 0 ? `+ ${rubyCost} 💎` : ""}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[0.7rem] text-slate-300">
                Afiação em pedra-d&apos;água e reforço de empunhadura: adiciona <span className="text-amber-300 font-semibold">+8 ATK</span> e <span className="text-cyan-300 font-semibold">+2 Durabilidade</span>.
              </p>
              <p className="mt-1 text-[0.65rem] italic text-slate-400">
                Propriedades metalúrgicas, têmpera e defeitos físicos da forja são imutáveis.
              </p>
              {upgradeFeedback && (
                <p className="mt-1.5 text-[0.68rem] text-emerald-400 font-semibold animate-pulse">
                  ✓ {upgradeFeedback}
                </p>
              )}
              <Button
                size="sm"
                disabled={!canAffordUpgrade}
                onClick={handleUpgradeClick}
                className="mt-2.5 w-full bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 font-bold text-xs text-stone-950 shadow-[0_0_15px_rgba(217,119,6,0.4)] hover:brightness-110 disabled:opacity-50"
              >
                {isMaxUpgraded ? "✓ LIMITE DE AFIAÇÃO ATINGIDO (+3)" : "⚒️ AFIAR & AJUSTAR EMPUNHADURA"}
              </Button>
            </div>

            {/* BANCADA DE MONTAGEM DE COMPONENTES */}
            <div className="rounded-lg border border-cyan-700/50 bg-[#0e1628] p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Montagem de Peças & Componentes
                </span>
                <span className="rounded bg-black/40 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-200">
                  {(inventory?.components || []).length} no inventário
                </span>
              </div>
              <p className="mt-1 text-[0.7rem] text-slate-300">
                Instale guardas, pomos, empunhaduras ou runas para alterar a geometria visual da espada e aprimorar seus atributos de combate.
              </p>

              {(inventory?.components || []).length > 0 ? (
                <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {(inventory?.components || []).map((comp) => {
                    const bonusText = [
                      comp.statModifier?.damageBonus ? `+${comp.statModifier.damageBonus} ATK` : null,
                      comp.statModifier?.defenseBonus ? `+${comp.statModifier.defenseBonus} DEF` : null,
                      comp.statModifier?.agilityBonus ? `+${comp.statModifier.agilityBonus} AGI` : null,
                      comp.statModifier?.durabilityBonus ? `+${comp.statModifier.durabilityBonus} DUR` : null,
                    ].filter(Boolean).join(" · ");

                    return (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between gap-2 rounded border border-cyan-900/60 bg-black/40 p-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span>{comp.icon || "🛡️"}</span>
                            <span className="font-display font-semibold text-cyan-100 truncate">{comp.name}</span>
                            <span className="rounded bg-black/60 px-1 py-0.2 text-[0.6rem] text-cyan-400 shrink-0">
                              {comp.rarity}
                            </span>
                          </div>
                          {bonusText && (
                            <p className="mt-0.5 text-[0.65rem] text-emerald-400 font-semibold">{bonusText}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-7 shrink-0 bg-cyan-600 hover:bg-cyan-500 text-black font-display text-[0.68rem] font-bold"
                          onClick={() => {
                            if (!onInstallComponent) return;
                            const ok = onInstallComponent(currentSword.id, comp.id);
                            if (ok) {
                              setUpgradeFeedback(`Componente "${comp.name}" instalado na arma!`);
                              window.setTimeout(() => setUpgradeFeedback(null), 3500);
                            }
                          }}
                        >
                          Instalar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-center text-[0.68rem] text-slate-500 italic">
                  Nenhum componente avulso no inventário. Obtenha-os através de forja e do Crisol de Fusão.
                </p>
              )}
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

            {/* Flaws Section */}
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

function NodeBadge({ icon, title, value, desc }: { icon: string; title: string; value: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#202c44] bg-[#0c1220] p-3 shadow-md transition-all hover:border-cyan-500/50">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/50 text-xl shadow-[0_0_12px_rgba(6,182,212,0.3)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-display text-[0.62rem] uppercase tracking-wider text-muted">{title}</span>
        <p className="truncate font-display text-xs font-bold text-fg">{value}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.68rem] text-slate-400">{desc}</p>
      </div>
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
