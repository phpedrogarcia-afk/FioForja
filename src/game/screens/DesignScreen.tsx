import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CANONICAL_PRESETS, FAMILIES, GUARDS, POMMELS, PROFILES, STEELS, WRAPS } from "../catalog";
import { WeaponPreview } from "../components/WeaponPreview";
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
import {
  getDesignBlueprint,
  getMetallurgyBlocker,
  getPreparationBlocker,
  selectPreparationProject,
} from "../preparation";

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
  const reqMat = getRequiredMaterialForSteel(design.steel);
  const currentStock = getMaterialStock(inventory.materials, reqMat.key);
  const blocker = getPreparationBlocker(design, inventory, career, gallery, activeCore);
  const matchedPreset = getDesignBlueprint(design);
  const canForgeReal = !blocker && currentStock >= 1 && !activeAttempt;
  const status = activeAttempt
    ? "Uma forja aguarda retomada."
    : blocker
      ? blocker.code === "METALLURGY_LOCKED"
        ? "Metal bloqueado."
        : "Projeto bloqueado."
      : currentStock < 1
        ? "Metal insuficiente."
        : "Pronto para forjar.";
  const reason = blocker?.error
    .replace(/^Projeto.*?bloqueado\.\s*/, "")
    .replace(/^Metalurgia.*?:\s*/, "");

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-col bg-bg text-fg"
          : "flex h-dvh min-h-0 flex-col bg-bg text-fg"
      }
    >
      {!embedded && (
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <Button variant="ghost" onClick={onBack}>
            ← Voltar
          </Button>
          <h1 className="font-display text-sm">Preparar espada</h1>
          <span className="text-xs">🪙 {wallet.gold}</span>
        </header>
      )}
      <figure
        className="mx-auto flex h-[clamp(11rem,40dvh,24rem)] w-full max-w-3xl shrink-0 flex-col px-4 pt-2"
        aria-label="Prévia permanente da preparação"
      >
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_40px_rgb(8_5_3_/_0.45)]">
          <WeaponPreview sword={{ design, quality: 92 }} />
        </div>
        <figcaption className="py-1 text-center font-display text-sm text-amber-100">
          {design.name || "Sua espada"}
        </figcaption>
      </figure>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        aria-label="Escolhas da preparação"
      >
        <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-2">
          {activeCore && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-purple-700/50 bg-purple-950/20 p-2 text-xs text-purple-200">
              <div>
                <p className="font-display font-bold">
                  Núcleo de fusão · +{activeCore.bonusQuality}% qualidade
                </p>
              </div>
              {onCancelCore && (
                <Button size="sm" variant="ghost" onClick={onCancelCore}>
                  Liberar
                </Button>
              )}
            </div>
          )}
          {activeAttempt && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-700/50 p-2 text-xs text-amber-200">
              <p>Forja interrompida: {activeAttempt.design.name || "Lâmina"}</p>
              {onResumeAttempt && (
                <Button size="sm" onClick={onResumeAttempt}>
                  Retomar
                </Button>
              )}
            </div>
          )}
          <PreparationChoice
            label="1. Projeto"
            value={activeCore ? "core" : matchedPreset?.id || "custom"}
            selectedLabel={
              activeCore
                ? FAMILIES[activeCore.family].name
                : matchedPreset?.design.name || "Projeto personalizado"
            }
            disabled={lockToCore}
            options={CANONICAL_PRESETS.map((p) => ({
              id: p.id,
              label: p.design.name,
              disabled: !evaluateBlueprintStatus(p, inventory, career, gallery, activeCore)
                .unlocked,
            }))}
            onChange={(id) => {
              const preset = CANONICAL_PRESETS.find((p) => p.id === id);
              if (!preset || lockToCore) return;
              const next = selectPreparationProject(
                preset,
                design,
                inventory,
                career,
                gallery,
                activeCore,
              );
              if (next) onChange(next);
            }}
          />
          <PreparationChoice
            label="2. Metal · consome 1 unidade"
            value={design.steel}
            selectedLabel={STEELS[design.steel].name + " · " + currentStock + " em estoque"}
            disabled={lockToCore}
            options={Object.entries(STEELS).map(([id, steel]) => ({
              id,
              label:
                steel.name +
                " · " +
                getMaterialStock(
                  inventory.materials,
                  getRequiredMaterialForSteel(id as SteelId).key,
                ) +
                " em estoque",
              disabled: Boolean(getMetallurgyBlocker(id as SteelId, inventory, career, activeCore)),
            }))}
            onChange={(id) => {
              const steel = id as SteelId;
              if (!lockToCore && !getMetallurgyBlocker(steel, inventory, career, activeCore))
                onChange({ ...design, steel });
            }}
          />
          <div
            role="status"
            className={cn("text-xs", canForgeReal ? "text-emerald-300" : "text-amber-300")}
          >
            <p>{status}</p>
            {reason && <p className="mt-1">{reason}</p>}
            {currentStock < 1 && !blocker && <p className="mt-1">Requer 1 × {reqMat.name}.</p>}
          </div>
          {currentStock < 1 && !blocker && onOpenShop && (
            <Button variant="secondary" className="min-h-11 w-full" onClick={onOpenShop}>
              Buscar metal na Loja
            </Button>
          )}
          {currentStock < 1 &&
            !blocker &&
            reqMat.key === "iron_ingot" &&
            onRecycleScrap &&
            (inventory.materials?.scrap || 0) >= 2 && (
              <Button
                variant="secondary"
                className="min-h-11 w-full"
                onClick={() => onRecycleScrap()}
              >
                Reciclar 2 sucatas em 1 ferro
              </Button>
            )}
          <details className="rounded-lg border border-border bg-surface p-3">
            <summary className="min-h-6 cursor-pointer font-display text-xs font-bold uppercase tracking-wide text-amber-200">
              Personalizar espada
            </summary>
            <p className="mt-2 text-xs text-muted">
              Ajustes opcionais. O metal é mantido ao trocar de família.
            </p>
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
                A identidade do núcleo define família, perfil e aço. Altere apenas acabamento, nome
                e comprimento.
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
                    steel: design.steel,
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

            {!activeCore && (
              <Button
                variant="secondary"
                className="mt-5 min-h-11 w-full whitespace-normal"
                disabled={Boolean(activeAttempt)}
                onClick={() => onForge(true)}
              >
                Treino sem custo · ferro comum
              </Button>
            )}
          </details>
        </div>
      </div>
      <footer className="shrink-0 border-t border-border bg-bg/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-3xl">
          <p className="mb-1 text-center text-xs text-muted">
            1 × {reqMat.name}
            {activeCore ? " + núcleo ao concluir" : ""}
          </p>
          <Button
            size="lg"
            className="min-h-12 w-full bg-gradient-to-r from-amber-600 to-orange-700 font-display font-bold"
            disabled={!canForgeReal}
            onClick={() => onForge(false)}
          >
            {activeCore ? "Forjar o núcleo" : "Começar a fabricar"}
          </Button>
        </div>
      </footer>
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
            aria-pressed={active}
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

/** Seleção inline: nenhum portal ou picker nativo pode cobrir a prévia. */
function PreparationChoice({
  label,
  value,
  selectedLabel,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  selectedLabel: string;
  options: { id: string; label: string; disabled: boolean }[];
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const groupId = label.startsWith("1")
    ? "preparation-project-options"
    : "preparation-metal-options";
  return (
    <div>
      <button
        ref={trigger}
        type="button"
        className="min-h-16 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-left disabled:opacity-75"
        aria-label={label + ": " + selectedLabel}
        aria-expanded={open && !disabled}
        aria-controls={groupId}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="block text-xs text-muted">{label}</span>
        <span className="mt-1 flex items-center justify-between gap-2 text-sm text-fg">
          <span>{selectedLabel}</span>
          <span aria-hidden="true">{disabled ? "🔒" : open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && !disabled && (
        <fieldset id={groupId} className="mt-1 rounded-lg border border-border bg-surface p-1">
          <legend className="sr-only">{label}</legend>
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm",
                option.disabled ? "cursor-not-allowed text-muted" : "text-fg",
                option.id === value && "bg-elevated text-amber-200",
              )}
            >
              <input
                className="size-4 shrink-0 accent-ember"
                type="radio"
                name={groupId}
                value={option.id}
                checked={value === option.id}
                disabled={option.disabled}
                onChange={() => {
                  onChange(option.id);
                  setOpen(false);
                  trigger.current?.focus();
                }}
              />
              <span>
                {option.label}
                {option.disabled ? " · Bloqueado" : ""}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
