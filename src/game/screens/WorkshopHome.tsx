import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Flame, Hammer, Settings, Sparkles, Store, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSwordEligibleForCommission } from "../commissions";
import { getMaterialStock, getRequiredMaterialForSteel } from "../materials";
import type {
  ActiveForgeAttempt,
  BlacksmithCommission,
  CareerStats,
  FinishedSword,
  FusionCore,
  PlayerInventory,
  PlayerWallet,
} from "../types";
import { WeaponPreview } from "../components/WeaponPreview";
import { Sheet } from "../components/Sheet";
import type { WeaponRenderMode } from "../visuals/rendererAdapter";

interface Props {
  swords: FinishedSword[];
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  career: CareerStats;
  commissions?: BlacksmithCommission[];
  activeAttempt: ActiveForgeAttempt | null;
  onResumeAttempt: () => void;
  onForge: () => void;
  onCollection: () => void;
  onCraft: () => void;
  onShop: () => void;
  onPrepareCore: (core: FusionCore) => void;
  onDeliverCommission: (commissionId: string, swordId: string) => boolean;
  weaponRenderMode: WeaponRenderMode;
  onToggleRenderer: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

interface Objective {
  eyebrow: string;
  title: string;
  detail: string;
  action: string;
  run: () => void;
}

/**
 * Início: identidade da oficina, estado real e um único próximo passo.
 * Todos os números vêm do save carregado — nunca de fixtures.
 */
export function WorkshopHome({
  swords,
  wallet,
  inventory,
  career,
  commissions = [],
  activeAttempt,
  onResumeAttempt,
  onForge,
  onCollection,
  onCraft,
  onShop,
  onPrepareCore,
  onDeliverCommission,
  weaponRenderMode,
  onToggleRenderer,
  muted,
  onToggleMute,
}: Props) {
  const [panel, setPanel] = useState<"profile" | "commissions" | "settings" | null>(null);

  const featured = useMemo(
    () =>
      [...swords]
        .filter((s) => !s.broken && s.structuralState !== "broken" && !s.isTraining)
        .sort((a, b) => b.quality - a.quality)[0] || null,
    [swords],
  );

  const activeCommissions = commissions.filter((c) => !c.completed);
  const completedCommissions = commissions.filter((c) => c.completed).length;
  const eligibleCores = inventory.fusionCores || [];
  const catalysts = inventory.materials?.catalyst_astral || 0;
  const fragments = inventory.materials?.fusion_fragment || 0;

  const fusionGroup = useMemo(() => {
    const eligible = swords.filter(
      (s) => !s.broken && s.structuralState !== "broken" && !s.isTraining && !s.favorite && !s.commissionDelivered,
    );
    const byRarity = new Map<string, FinishedSword[]>();
    for (const sword of eligible) {
      const key = sword.rarity || "Comum";
      byRarity.set(key, [...(byRarity.get(key) || []), sword]);
    }
    for (const [rarity, group] of byRarity) {
      if (group.length >= 4) return { rarity, count: group.length };
    }
    return null;
  }, [swords]);

  const ironStock = getMaterialStock(inventory.materials, "iron");
  const ironRequirement = getRequiredMaterialForSteel("iron");

  const objective: Objective = (() => {
    if (activeAttempt) {
      return {
        eyebrow: "FORJA INTERROMPIDA",
        title: "Retome a lâmina na bigorna",
        detail: `${activeAttempt.design.name || "Sua arma"} está ${activeAttempt.status === "ACTIVE" ? "no fogo, com marteladas registradas" : "preparada"} e preservada no save.`,
        action: "Retomar forja",
        run: onResumeAttempt,
      };
    }
    if (eligibleCores.length > 0) {
      const core = eligibleCores[0];
      return {
        eyebrow: "NÚCLEO AGUARDANDO",
        title: `Forje ${core.name.split("—")[0].trim()}`,
        detail: "O Crisol já fez a parte dele. A espada só nasce com o seu martelo.",
        action: "Preparar na bigorna",
        run: () => onPrepareCore(core),
      };
    }
    if (swords.filter((s) => !s.isTraining && !s.broken).length === 0) {
      return {
        eyebrow: "PRIMEIRO TROFÉU",
        title: "Acenda a forja",
        detail: "Escolha um projeto, use um lingote real e martele a sua primeira lâmina.",
        action: "Ir para a Forja",
        run: onForge,
      };
    }
    if (fusionGroup) {
      return {
        eyebrow: "O CRISOL ESTÁ PRONTO",
        title: `Quatro ${fusionGroup.rarity}s podem virar um núcleo`,
        detail: `Você tem ${fusionGroup.count} doadoras elegíveis. Mesma raridade, qualidades livres.`,
        action: "Abrir o Craft",
        run: onCraft,
      };
    }
    if (inventory.components.length > 0) {
      return {
        eyebrow: "BANCADA DE MONTAGEM",
        title: "Uma peça nova pede uma espada",
        detail: "Instale guardas, cabos, pomos ou runas e veja os atributos mudarem de verdade.",
        action: "Abrir a Coleção",
        run: onCollection,
      };
    }
    if (ironStock < 1) {
      return {
        eyebrow: "ESTOQUE VAZIO",
        title: "Falta metal para a próxima lâmina",
        detail: `Sem ${ironRequirement.name}. A Loja entrega no inventário e consome ouro real.`,
        action: "Comprar metal",
        run: onShop,
      };
    }
    return {
      eyebrow: "PRÓXIMA CONQUISTA",
      title: "Supere a sua melhor qualidade",
      detail: `Seu recorde é Q${career.highestQuality}. Cada golpe no ponto certo sobe a nota.`,
      action: "Forjar agora",
      run: onForge,
    };
  })();

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-amber-400/90">Sua oficina</p>
          <h1 className="mt-1 font-display text-2xl leading-tight font-bold text-amber-50">
            O troféu nasce<br />nas suas mãos.
          </h1>
          <p className="mt-1 text-xs text-muted">The weapon is the hero.</p>
        </div>
        <button
          type="button"
          onClick={() => setPanel("profile")}
          aria-label="Abrir perfil, carreira e configurações"
          className="grid size-11 place-items-center rounded-full border border-border bg-surface text-amber-200"
        >
          <Trophy size={19} />
        </button>
      </header>

      {/* Arma em destaque */}
      <section
        aria-label="Arma em destaque"
        className="relative overflow-hidden rounded-xl border border-amber-800/50 bg-[radial-gradient(ellipse_at_50%_20%,#2a2419,#14100b)]"
      >
        <div className="flex h-44 items-center justify-center px-3">
          {featured ? (
            <WeaponPreview sword={featured} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-muted">
              <Hammer size={36} className="text-amber-700" />
              <p className="font-display text-sm text-amber-100">Sua primeira lâmina espera.</p>
              <p className="max-w-[16rem] text-[0.68rem]">Prepare o ferro, aprenda na bigorna e comece o Arsenal.</p>
            </div>
          )}
        </div>
        {featured ? (
          <div className="flex items-end justify-between gap-3 border-t border-amber-900/40 bg-black/35 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-amber-400/90">
                {featured.rarity} · Qualidade {featured.quality}
              </p>
              <h2 className="truncate font-display text-base font-bold text-amber-50">{featured.design.name}</h2>
            </div>
            <button
              type="button"
              onClick={onCollection}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300"
            >
              Arsenal <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </section>

      {/* Próximo passo */}
      <section
        aria-label="Próximo passo recomendado"
        className="rounded-xl border border-amber-600/40 bg-[#231a10] p-4"
      >
        <p className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-amber-400">{objective.eyebrow}</p>
        <h2 className="mt-1 font-display text-base font-bold text-amber-50">{objective.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#cdbb9d]">{objective.detail}</p>
        <Button
          size="md"
          className="mt-3 w-full bg-gradient-to-r from-amber-600 to-amber-500 font-display font-bold text-stone-950"
          onClick={objective.run}
        >
          {objective.action} <ArrowRight size={16} />
        </Button>
      </section>

      {/* Carreira */}
      <section aria-label="Progresso de carreira" className="grid grid-cols-3 gap-2">
        {[
          { label: "Forjadas", value: career.totalForged },
          { label: "Melhor Q", value: career.highestQuality },
          { label: "Obras-primas", value: career.masterpieces },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-center">
            <p className="font-display text-lg font-bold tabular-nums text-amber-200">{stat.value}</p>
            <p className="text-[0.6rem] uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Estoque real */}
      <section aria-label="Estoque da oficina" className="rounded-lg border border-border bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-muted">No almoxarifado</p>
          <button type="button" onClick={onShop} className="text-[0.68rem] font-semibold text-amber-300">
            Ir à Loja
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#d8c8ab]">
          <span>🧱 {ironStock} ferro</span>
          <span>⚙️ {getMaterialStock(inventory.materials, "steel")} aço</span>
          <span>🔮 {catalysts} catalisador(es)</span>
          <span>🧩 {fragments} fragmento(s)</span>
          <span>⚒️ {inventory.components.length} peça(s)</span>
        </div>
      </section>

      {/* Atalhos */}
      <section aria-label="Atalhos" className="grid grid-cols-2 gap-2">
        {[
          { label: "Forjar", detail: "Projeto e bigorna", Icon: Hammer, run: onForge },
          { label: "Crisol", detail: "4 doadoras → núcleo", Icon: Flame, run: onCraft },
          { label: "Loja", detail: "Metais e peças", Icon: Store, run: onShop },
          { label: "Encomendas", detail: `${activeCommissions.length} em aberto`, Icon: BookOpen, run: () => setPanel("commissions") },
        ].map(({ label, detail, Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            className="flex min-h-16 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-amber-600/60"
          >
            <Icon size={20} className="shrink-0 text-amber-400" />
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold text-amber-50">{label}</span>
              <span className="block truncate text-[0.65rem] text-muted">{detail}</span>
            </span>
          </button>
        ))}
      </section>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onToggleMute}
          className="min-h-10 rounded-md border border-border px-3 text-xs text-muted"
        >
          {muted ? "Ativar som" : "Silenciar"}
        </button>
        <button
          type="button"
          onClick={onToggleRenderer}
          className="min-h-10 rounded-md border border-border px-3 text-xs text-muted"
        >
          Visual: {weaponRenderMode === "dna" ? "DNA experimental" : "Clássico"}
        </button>
        <button
          type="button"
          onClick={() => setPanel("settings")}
          aria-label="Configurações"
          className="grid size-10 place-items-center rounded-md border border-border text-muted"
        >
          <Settings size={17} />
        </button>
      </div>

      <Sheet
        open={panel === "profile"}
        onOpenChange={(open) => setPanel(open ? "profile" : null)}
        eyebrow="Legado"
        title="Carreira do ferreiro"
        description="Registro real do que já saiu da sua bigorna."
      >
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Armas forjadas", career.totalForged],
            ["Obras-primas", career.masterpieces],
            ["Lendárias", career.legendaries],
            ["Relíquias", career.relics],
            ["Lâminas quebradas", career.brokenBlades],
            ["Maior qualidade", `Q${career.highestQuality}`],
            ["Valor acumulado", `${career.totalValueEarned} ouro`],
            ["Encomendas entregues", completedCommissions],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-surface px-3 py-2">
              <dt className="text-[0.62rem] uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-amber-100">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-lg border border-amber-700/40 bg-[#2a2014] p-3 text-xs leading-relaxed text-[#d8c8ab]">
          <p className="flex items-center gap-1.5 font-display text-[0.68rem] uppercase tracking-wider text-amber-300">
            <Sparkles size={13} /> Carteira real
          </p>
          <p className="mt-1">
            🪙 {wallet.gold} ouro · 💎 {wallet.rubies} rubis · 💠 {wallet.diamonds} diamantes
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPanel("commissions")}>
            Ver encomendas
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setPanel("settings")}>
            Configurações
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={panel === "commissions"}
        onOpenChange={(open) => setPanel(open ? "commissions" : null)}
        eyebrow="Guilda"
        title="Encomendas"
        description="Entregue uma arma compatível. A arma fica vinculada à encomenda e não volta ao Crisol."
      >
        {activeCommissions.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-3 text-xs text-muted">
            Nenhuma encomenda em aberto. Continue forjando para desbloquear novos contratos.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeCommissions.map((commission) => {
              const eligible = swords.filter((sword) => isSwordEligibleForCommission(commission, sword).eligible);
              return (
                <li key={commission.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-bold text-amber-100">{commission.clientName}</p>
                      <p className="text-[0.65rem] text-muted">{commission.clientTitle}</p>
                    </div>
                    <span className="shrink-0 rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300">
                      🪙 {commission.rewardGold}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.7rem] leading-relaxed text-[#cdbb9d]">{commission.description}</p>
                  <p className="mt-1 text-[0.62rem] text-muted">
                    Q mínima {commission.minQuality}
                    {commission.requiredRole ? ` · papel ${commission.requiredRole}` : ""}
                    {commission.minStat ? ` · ${commission.minStat.stat} ≥ ${commission.minStat.minValue}` : ""}
                  </p>
                  {eligible.length > 0 ? (
                    <Button
                      size="sm"
                      className="mt-2 w-full bg-amber-600 font-display text-xs font-bold text-stone-950"
                      onClick={() => onDeliverCommission(commission.id, eligible[0].id)}
                    >
                      Entregar {eligible[0].design.name} (Q{eligible[0].quality})
                    </Button>
                  ) : (
                    <p className="mt-2 text-[0.65rem] text-amber-300/80">Nenhuma arma do Arsenal atende ainda.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={panel === "settings"}
        onOpenChange={(open) => setPanel(open ? "settings" : null)}
        eyebrow="Oficina"
        title="Configurações"
        description="Preferências locais. O save do jogo não é apagado por estas opções."
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="flex min-h-12 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <span>Som da oficina</span>
            <strong className="text-amber-300">{muted ? "Desligado" : "Ligado"}</strong>
          </button>
          <button
            type="button"
            onClick={onToggleRenderer}
            className="flex min-h-12 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <span>Visual da lâmina</span>
            <strong className="text-amber-300">{weaponRenderMode === "dna" ? "DNA experimental" : "Clássico"}</strong>
          </button>
        </div>
        <p className="mt-3 text-[0.65rem] leading-relaxed text-muted">
          O progresso fica no armazenamento local do aplicativo. Fechar o jogo não apaga a oficina.
        </p>
      </Sheet>
    </main>
  );
}
