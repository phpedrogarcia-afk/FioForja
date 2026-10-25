import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CANONICAL_PRESETS, FAMILIES, GUARDS, POMMELS, PROFILES, STEELS, WRAPS } from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import type {
  CareerStats,
  FamilyId,
  FinishedSword,
  FusionCore,
  GuardId,
  PlayerInventory,
  PlayerWallet,
  PommelId,
  ProfileId,
  SteelId,
  SwordDesign,
  WrapId,
} from "../types";
import { getMaterialStock, getRequiredMaterialForSteel } from "../materials";
import { evaluateBlueprintStatus } from "../blueprints";
import { defaultCareer, defaultInventory, defaultWallet } from "../save";

interface Props {
  design: SwordDesign;
  onChange: (next: SwordDesign) => void;
  onBack: () => void;
  onForge: (isTraining?: boolean) => void;
  inventory?: PlayerInventory;
  wallet?: PlayerWallet;
  career?: CareerStats;
  gallery?: FinishedSword[];
  activeCore?: FusionCore | null;
  /** Renderiza dentro da seção Forja (sem min-h-dvh e sem barra fixa sobre a navegação). */
  embedded?: boolean;
  /** Trava família/perfil/aço na identidade do núcleo de fusão armado. */
  lockToCore?: boolean;
  onOpenShop?: () => void;
  onCancelCore?: () => void;
  activeAttempt?: import("../types").ActiveForgeAttempt | null;
  onResumeAttempt?: () => void;
  onRecycleScrap?: () => boolean;
}

export function DesignScreen({
  design,
  onChange,
  onBack,
  onForge,
  inventory = defaultInventory,
  wallet = defaultWallet,
  career = defaultCareer,
  gallery = [],
  activeCore = null,
  embedded = false,
  lockToCore = false,
  onOpenShop,
  onCancelCore,
  activeAttempt = null,
  onResumeAttempt,
  onRecycleScrap,
}: Props) {
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
    const g = ctx.createRadialGradient(w / 2, h * 0.55, 30, w / 2, h * 0.55, Math.max(w, h) * 0.6);
    g.addColorStop(0, "#161d30");
    g.addColorStop(0.65, "#0c101a");
    g.addColorStop(1, "#060810");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawFinishedSword(ctx, design, w / 2, h * 0.58, Math.min(w, h) * 0.94, {
      angle: -Math.PI / 2.05,
      assembled: true,
      heat: 0,
      shape: 1,
      quality: 92,
    });
  }, [design]);

  // Current material requirement and stock
  const reqMat = getRequiredMaterialForSteel(design.steel);
  const currentStock = getMaterialStock(inventory?.materials, reqMat.key);
  const hasMaterial = currentStock >= 1;

  // Check if current design corresponds to a preset and whether it is locked
  const matchedPreset = CANONICAL_PRESETS.find((p) => p.name === design.name);
  const presetStatus = matchedPreset
    ? evaluateBlueprintStatus(matchedPreset, inventory, career, gallery, activeCore)
    : null;

  let metallurgyLocked = false;
  let metallurgyReason = "";
  if (design.steel === "damascus") {
    const unlockedDamascus =
      career.totalForged >= 3 ||
      inventory.unlockedBlueprints?.includes("cimitarra_damasco") ||
      activeCore?.steel === "damascus";
    if (!unlockedDamascus) {
      metallurgyLocked = true;
      metallurgyReason = "Metalurgia do Damasco: Requer 3 forjas concluídas ou autorização por Núcleo/Receita.";
    }
  } else if (design.steel === "blacksteel") {
    const unlockedBlacksteel =
      career.totalForged >= 4 ||
      inventory.unlockedBlueprints?.includes("juramento_ferro") ||
      activeCore?.steel === "blacksteel";
    if (!unlockedBlacksteel) {
      metallurgyLocked = true;
      metallurgyReason = "Metalurgia do Aço Negro: Requer 4 forjas concluídas ou receita/núcleo.";
    }
  } else if (design.steel === "elven_silver") {
    const unlockedElven =
      career.totalForged >= 7 ||
      inventory.unlockedBlueprints?.includes("folha_aereth") ||
      activeCore?.steel === "elven_silver";
    if (!unlockedElven) {
      metallurgyLocked = true;
      metallurgyReason = "Metalurgia Élfica: Requer 7 forjas concluídas ou segredo élfico no Bazar.";
    }
  } else if (design.steel === "meteor") {
    const unlockedMeteor =
      career.masterpieces >= 1 ||
      career.legendaries >= 1 ||
      inventory.unlockedBlueprints?.includes("queda_asterion") ||
      activeCore?.steel === "meteor";
    if (!unlockedMeteor) {
      metallurgyLocked = true;
      metallurgyReason = "Metalurgia Meteórica: Requer 1 Obra-prima (Rank S) ou Núcleo de Fusão meteórico.";
    }
  } else if (design.steel === "ancient_alloy") {
    const unlockedAncient =
      career.legendaries >= 1 ||
      inventory.unlockedBlueprints?.includes("cinzas_ancestrais") ||
      activeCore?.steel === "ancient_alloy";
    if (!unlockedAncient) {
      metallurgyLocked = true;
      metallurgyReason = "Metalurgia Primordial: Requer 1 arma Lendária ou Núcleo de Fusão primordial.";
    }
  }

  const isLocked = (presetStatus ? presetStatus.state === "locked" : false) || metallurgyLocked;
  const canForgeReal = !isLocked && hasMaterial;

  return (
    <div className={embedded ? "flex h-full min-h-0 flex-col bg-bg text-fg" : "flex min-h-dvh flex-col bg-bg text-fg"}>
      {embedded ? null : (
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 border-b border-border/40">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Voltar
          </Button>
          <div className="text-center">
            <h1 className="font-display text-sm uppercase tracking-[0.22em] text-muted">Projeto da Forja</h1>
            <span className="text-[0.65rem] uppercase tracking-wider text-amber-400/80">
              {activeCore ? "Identidade do Núcleo" : "Almoxarifado & Metais Reais"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-surface px-2.5 py-1 text-xs font-display">
            <span className="text-amber-300 font-bold">🪙 {wallet.gold}</span>
          </div>
        </header>
      )}


      <div className={embedded ? "min-h-0 flex-1 overflow-y-auto overscroll-contain" : ""}>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {/* Sword Preview Canvas */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_40px_rgb(8_5_3_/_0.45)]">
          <canvas ref={canvasRef} className="h-56 w-full sm:h-72" />
        </div>

        {/* Fusion Core Notification Banner */}
        {activeCore ? (
          <div className="mt-4 rounded-lg border border-purple-500/40 bg-purple-950/30 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-purple-300">
                  🔮 Núcleo de Fusão Ativo
                </span>
                <p className="mt-0.5 truncate font-display text-sm font-bold text-purple-100">{activeCore.name}</p>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Herança: +{activeCore.bonusQuality}% Qualidade · {STEELS[activeCore.steel]?.name} · {FAMILIES[activeCore.family]?.name}
                </p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-purple-200/70">
                  O núcleo será consumido apenas na conclusão da forja. Projeto, perfil e aço ficam travados na
                  identidade dele.
                </p>
              </div>
              {onCancelCore ? (
                <Button variant="ghost" size="sm" className="shrink-0 text-purple-200" onClick={onCancelCore}>
                  Liberar
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeAttempt ? (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-amber-600/60 bg-amber-950/25 p-3">
            <div className="min-w-0">
              <p className="font-display text-[0.62rem] font-bold uppercase tracking-wider text-amber-300">
                Forja interrompida preservada
              </p>
              <p className="truncate text-[0.68rem] text-amber-100/80">
                {activeAttempt.design.name || "Lâmina"} · {activeAttempt.strikesCount || 0} martelada(s)
              </p>
            </div>
            {onResumeAttempt ? (
              <Button size="sm" className="shrink-0 bg-amber-600 font-display text-xs font-bold text-stone-950" onClick={onResumeAttempt}>
                Retomar
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Canonical Presets Section with explicit progression states */}
        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs uppercase tracking-[0.16em] text-amber-300 font-bold">
              📜 Compêndio de Obras Mestras (Projetos & Blueprints)
            </p>
            <span className="text-[0.7rem] text-muted">Desbloqueio Progressivo</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CANONICAL_PRESETS.map((p) => {
              const st = evaluateBlueprintStatus(p, inventory, career, gallery, activeCore);
              const isSelected = design.name === p.name || design.name === p.design.name;

              let badgeText = "Pronto";
              let badgeClass = "bg-emerald-950/60 border-emerald-500/40 text-emerald-300";

              if (st.state === "mastered") {
                badgeText = "🏆 Dominada";
                badgeClass = "bg-amber-950/70 border-amber-400 text-amber-300 font-bold";
              } else if (st.state === "crafted") {
                badgeText = "⚔️ Fabricada";
                badgeClass = "bg-sky-950/60 border-sky-400 text-sky-300";
              } else if (st.state === "ready") {
                badgeText = "✅ Pronta";
                badgeClass = "bg-emerald-950/60 border-emerald-500/40 text-emerald-300";
              } else if (st.state === "discovered") {
                badgeText = "⚠️ Falta Insumo";
                badgeClass = "bg-amber-950/40 border-amber-500/30 text-amber-400";
              } else {
                badgeText = "🔒 Bloqueada";
                badgeClass = "bg-red-950/40 border-red-500/30 text-red-300";
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={lockToCore}
                  onClick={() => !lockToCore && onChange(p.design)}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-all flex flex-col justify-between disabled:opacity-45",
                    isSelected
                      ? "border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "border-border/80 bg-surface/70 hover:border-amber-500/50 hover:bg-surface",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-xs font-bold text-fg truncate">{p.name}</span>
                    <span className={cn("text-[0.65rem] px-1.5 py-0.5 rounded border uppercase tracking-wider", badgeClass)}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[0.7rem] text-muted">
                    <span>{STEELS[p.design.steel]?.name || p.design.steel}</span>
                    <span className="font-mono text-xs">
                      {st.hasMaterial ? `Estoque: ${st.materialStock}` : "Sem Insumo"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Requirement & Stock Card for Currently Selected Weapon */}
        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs uppercase tracking-wider text-muted font-bold">
              Insumos Necessários para a Lâmina
            </span>
            <span className="text-xs font-mono text-slate-400">Consumo: 1x Insumo Base</span>
          </div>

          <div className="mt-3 flex items-center gap-3.5 rounded-lg border border-border/80 bg-elevated p-3">
            <span className="text-2xl">{reqMat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-fg">{reqMat.name}</span>
                <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-surface border border-border uppercase tracking-wider text-amber-300">
                  {reqMat.rarity}
                </span>
              </div>
              <p className="text-xs text-subtle truncate mt-0.5">{reqMat.description}</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold">
                {currentStock >= 1 ? (
                  <span className="text-emerald-400">Disponível: {currentStock}</span>
                ) : (
                  <span className="text-red-400">Faltando (0 em estoque)</span>
                )}
              </div>
              <span className="text-[0.65rem] text-slate-500">Exige 1 unidade</span>
            </div>
          </div>

          {/* Locked Status Banner if blueprint is locked */}
          {presetStatus && presetStatus.state === "locked" ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-950/20 p-2.5 text-xs text-red-300">
              <span className="font-bold">🔒 Projeto Bloqueado: </span>
              {presetStatus.requirementText}
            </div>
          ) : null}

          {/* Locked Metallurgy Banner */}
          {metallurgyLocked ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-950/20 p-2.5 text-xs text-red-300">
              <span className="font-bold">🔒 Metalurgia Bloqueada: </span>
              {metallurgyReason}
            </div>
          ) : null}

          {/* Missing Material Advice */}
          {!hasMaterial && (!presetStatus || presetStatus.state !== "locked") ? (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-300">
              <span className="font-bold">⚠️ Matéria-prima em Falta: </span>
              Adquira {reqMat.name} na Loja da oficina ou conquiste drops forjando.
              {onOpenShop ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full border-amber-600/50 text-xs text-amber-200"
                  onClick={onOpenShop}
                >
                  Comprar {reqMat.name} na Loja
                </Button>
              ) : null}
              {onRecycleScrap && (inventory.materials?.scrap || 0) >= 2 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-1.5 w-full border-amber-600/40 text-xs text-amber-200"
                  onClick={() => onRecycleScrap()}
                >
                  ♻️ Reciclar 2 sucatas em 1 {reqMat.name}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Custom Design Controls */}
        <label className="mt-5 block font-display text-xs uppercase tracking-[0.16em] text-muted">
          Nome da lâmina
          <input
            className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 font-body text-base text-fg placeholder:text-subtle"
            maxLength={28}
            value={design.name}
            onChange={(e) => onChange({ ...design, name: e.target.value })}
            placeholder="Ex.: Juramento"
          />
        </label>

        {lockToCore ? (
          <p className="mt-4 rounded-md border border-purple-700/40 bg-purple-950/20 px-3 py-2 text-[0.68rem] leading-relaxed text-purple-200">
            A identidade do núcleo define família, perfil e aço. Altere apenas acabamento, nome e comprimento.
          </p>
        ) : null}

        <Section title="Família Canônica">
          <ChipRow
            disabled={lockToCore}
            options={Object.entries(FAMILIES).map(([id, v]) => ({
              id,
              label: v.name,
              hint: v.fantasy,
            }))}
            value={design.family || "royal"}
            onChange={(id) => {
              const fam = FAMILIES[id as FamilyId];
              onChange({
                ...design,
                family: id as FamilyId,
                profile: fam.defaultProfile,
                steel: fam.defaultSteel,
                wrap: fam.defaultWrap,
                guard: fam.defaultGuard,
                pommel: fam.defaultPommel,
              });
            }}
          />
        </Section>

        <Section title="Perfil da lâmina">
          <ChipRow
            disabled={lockToCore}
            options={Object.entries(PROFILES).map(([id, v]) => ({
              id,
              label: v.name,
              hint: v.blurb,
            }))}
            value={design.profile}
            onChange={(id) => onChange({ ...design, profile: id as ProfileId })}
          />
        </Section>

        <Section title="Aço / Metal">
          <ChipRow
            disabled={lockToCore}
            options={Object.entries(STEELS).map(([id, v]) => {
              const sReq = getRequiredMaterialForSteel(id as SteelId);
              const sStock = getMaterialStock(inventory?.materials, sReq.key);
              return {
                id,
                label: v.name,
                hint: `${v.blurb} · Estoque: ${sStock}`,
              };
            })}
            value={design.steel}
            onChange={(id) => onChange({ ...design, steel: id as SteelId })}
          />
        </Section>

        <Section title="Cabo">
          <ChipRow
            options={Object.entries(WRAPS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.wrap}
            onChange={(id) => onChange({ ...design, wrap: id as WrapId })}
          />
        </Section>

        <Section title="Guarda">
          <ChipRow
            options={Object.entries(GUARDS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.guard}
            onChange={(id) => onChange({ ...design, guard: id as GuardId })}
          />
        </Section>

        <Section title="Pomo">
          <ChipRow
            options={Object.entries(POMMELS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.pommel}
            onChange={(id) => onChange({ ...design, pommel: id as PommelId })}
          />
        </Section>

        <Section title="Comprimento">
          <input
            type="range"
            min={0.75}
            max={1.2}
            step={0.01}
            value={design.length}
            onChange={(e) => onChange({ ...design, length: Number(e.target.value) })}
            className="mt-2 w-full accent-ember"
            aria-label="Comprimento da lâmina"
          />
        </Section>

        <Section title="Inscrição">
          <input
            className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 font-body text-base text-fg placeholder:text-subtle"
            maxLength={24}
            value={design.inscription}
            onChange={(e) => onChange({ ...design, inscription: e.target.value })}
            placeholder="Palavra na lâmina"
          />
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={design.runes}
              onChange={(e) => onChange({ ...design, runes: e.target.checked })}
              className="size-4 accent-ember"
            />
            Gravar em runas
          </label>
        </Section>
      </div>
      </div>

      {/* Barra de ação: inline na seção Forja, fixa no fluxo isolado */}
      <div
        className={
          embedded
            ? "shrink-0 border-t border-border bg-bg/95 px-4 py-2.5"
            : "fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        }
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-2">
          {canForgeReal ? (
            <>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 font-display uppercase tracking-wider font-bold shadow-lg"
                onClick={() => onForge(false)}
              >
                {activeCore
                  ? `🔮 Forjar o Núcleo (Consumir 1x ${reqMat.name})`
                  : `🔥 Levar ao Fogo (Consumir 1x ${reqMat.name})`}
              </Button>
              {activeCore ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-amber-300 font-display text-xs"
                  onClick={() => onForge(true)}
                >
                  🔨 Treino Básico de Oficina (Sem Custo de Metal)
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="lg" className="w-full opacity-50 cursor-not-allowed" disabled>
                {isLocked ? "🔒 Projeto Bloqueado na Carreira" : `❌ Insumos Insuficientes (Falta 1x ${reqMat.name})`}
              </Button>
              {activeCore ? null : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full border-dashed border-amber-600/50 text-amber-300 hover:bg-amber-950/30 font-display text-xs"
                  onClick={() => onForge(true)}
                >
                  🔨 Treino Básico de Oficina (Sem Custo · Ferro Comum)
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xs uppercase tracking-[0.16em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-12 rounded-md border px-3 py-2 text-left transition-colors duration-150 disabled:opacity-45",
              active
                ? "border-ember bg-elevated text-fg"
                : "border-border bg-surface text-muted hover:border-iron",
            )}
          >
            <span className="block font-display text-sm tracking-wide">{opt.label}</span>
            {opt.hint ? <span className="mt-0.5 block text-xs text-subtle">{opt.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
