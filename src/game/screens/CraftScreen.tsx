import { useMemo, useState } from "react";
import { ArrowRight, Check, Flame, LockKeyhole, Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeaponPreview } from "../components/WeaponPreview";
import { Sheet } from "../components/Sheet";
import {
  componentFusionSelectionIssue,
  fuseComponents,
  fuseSwords,
  getComponentFusionBaseRarity,
  getComponentFusionCost,
  getFusionOdds,
  getSwordFusionCost,
  swordFusionBlockReason,
  swordFusionSelectionIssue,
  type ComponentFusionOutcome,
  type SwordFusionOutcome,
} from "../fusion";
import { getMaterialStock, getRequiredMaterialForSteel } from "../materials";
import { playFusionHum, playFusionSuccess } from "../audio";
import type {
  FinishedSword,
  FusionCore,
  InventoryComponent,
  PlayerInventory,
  PlayerWallet,
  RarityGrade,
} from "../types";

type Mode = "swords" | "components";
type Category = InventoryComponent["category"];

const CATEGORY_LABEL: Record<Category, string> = {
  guard: "Guardas",
  wrap: "Cabos",
  pommel: "Pomos",
  rune: "Runas",
};

const RARITY_COLOR: Record<string, string> = {
  Comum: "#cac5b8",
  Incomum: "#9ecf9a",
  Rara: "#93bdf0",
  Épica: "#c39bea",
  Lendária: "#f0c169",
  Relíquia: "#f39aa8",
};

function Odds({
  rarity,
  mode,
  useCatalyst,
}: {
  rarity: RarityGrade;
  mode: Mode;
  useCatalyst: boolean;
}) {
  const odds = getFusionOdds(rarity, mode, useCatalyst);
  const rank: Record<RarityGrade, number> = { Comum: 1, Incomum: 2, Rara: 3, Épica: 4, Lendária: 5, Relíquia: 6 };
  const byRank: Record<number, RarityGrade> = { 1: "Comum", 2: "Incomum", 3: "Rara", 4: "Épica", 5: "Lendária", 6: "Relíquia" };
  const cards = [
    { chance: odds.refined, grade: rarity, label: "Refinado" },
    { chance: odds.superior, grade: byRank[Math.min(6, rank[rarity] + 1)], label: "Superior +1" },
    { chance: odds.exceptional, grade: byRank[Math.min(6, rank[rarity] + 2)], label: "Excepcional +2" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-label="Probabilidades reais da fusão">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-black/30 px-1.5 py-2 text-center">
          <p className="font-display text-xl font-bold tabular-nums" style={{ color: RARITY_COLOR[card.grade] }}>
            {Math.round(card.chance * 100)}
            <span className="text-[0.6rem]">%</span>
          </p>
          <p className="text-[0.6rem] font-semibold text-[#e8dcc4]">{card.grade}</p>
          <p className="text-[0.55rem] text-muted">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function signed(value: number | undefined): string {
  const n = value || 0;
  return n >= 0 ? `+${n}` : String(n);
}

function CoreArt({ core }: { core: FusionCore }) {
  const color = RARITY_COLOR[core.rarity] || "#e8bb6a";
  return (
    <div className="relative grid h-40 place-items-center overflow-hidden" role="img" aria-label={`Núcleo de fusão ${core.rarity}`}>
      <div
        aria-hidden
        className="absolute size-44 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="relative grid h-16 w-32 -skew-x-12 rotate-[-14deg] place-items-center rounded-md border shadow-[8px_10px_0_#302923]"
        style={{
          borderColor: color,
          background: "linear-gradient(170deg,#c7b79d,#675d51 30%,#3e3530 32%,#968779 60%,#413a35)",
          color,
          boxShadow: `8px 10px 0 #302923, 0 0 34px ${color}55`,
        }}
      >
        <Flame size={22} strokeWidth={1.4} />
        <span className="absolute -bottom-6 text-[0.55rem] tracking-[0.2em] text-[#bba57e]">NÚCLEO</span>
      </div>
    </div>
  );
}

function DonorRow({ sword, index }: { sword: FinishedSword; index: number }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2">
      <div className="h-16 w-14 shrink-0 rounded border border-border bg-[radial-gradient(ellipse_at_50%_45%,#242a33,#0d1015)]">
        <WeaponPreview sword={sword} padded={false} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xs font-bold text-amber-50">
          {index + 1}. {sword.design.name || "Sem nome"}
        </p>
        <p className="text-[0.6rem]" style={{ color: RARITY_COLOR[sword.rarity || "Comum"] }}>
          {sword.rarity || "Comum"} · Q{sword.quality} · {sword.grade}
        </p>
        <p className="text-[0.58rem] tabular-nums text-muted">
          ATK {sword.damage ?? "—"} · DEF {sword.defense ?? "—"} · AGI {sword.agility ?? "—"} · DUR {sword.durability ?? "—"}
        </p>
      </div>
    </li>
  );
}

interface Props {
  swords: FinishedSword[];
  inventory: PlayerInventory;
  wallet: PlayerWallet;
  onFuseSwords: (outcome: SwordFusionOutcome) => boolean;
  onFuseComponents: (outcome: ComponentFusionOutcome) => boolean;
  onPrepareCore: (core: FusionCore) => void;
  onGoShop: () => void;
}

/**
 * Craft: o Crisol funcional. Quatro doadoras do MESMO grau geram um núcleo.
 * A transação acontece no clique de confirmação, uma única vez; a revelação
 * apenas apresenta o resultado já persistido.
 */
export function CraftScreen({
  swords,
  inventory,
  wallet,
  onFuseSwords,
  onFuseComponents,
  onPrepareCore,
  onGoShop,
}: Props) {
  const [mode, setMode] = useState<Mode>("swords");
  const [swordIds, setSwordIds] = useState<string[]>([]);
  const [componentIds, setComponentIds] = useState<string[]>([]);
  const [useCatalyst, setUseCatalyst] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<"Todas" | RarityGrade>("Todas");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [inspect, setInspect] = useState<FinishedSword | InventoryComponent | null>(null);
  const [swordOutcome, setSwordOutcome] = useState<SwordFusionOutcome | null>(null);
  const [componentOutcome, setComponentOutcome] = useState<ComponentFusionOutcome | null>(null);
  const [donors, setDonors] = useState<FinishedSword[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const catalystCount = inventory.materials?.catalyst_astral || 0;
  const hasCatalyst = catalystCount > 0;
  const catalystActive = useCatalyst && hasCatalyst;

  const selectedSwords = swordIds
    .map((id) => swords.find((sword) => sword.id === id))
    .filter((sword): sword is FinishedSword => Boolean(sword));
  const selectedComponents = componentIds
    .map((id) => (inventory.components || []).find((item) => item.id === id))
    .filter((item): item is InventoryComponent => Boolean(item));

  const swordRarity = selectedSwords[0]?.rarity || "Comum";
  const swordCost = selectedSwords.length === 4 ? getSwordFusionCost(swordRarity) : null;
  const componentBase = getComponentFusionBaseRarity(selectedComponents);
  const componentCost = selectedComponents.length === 4 ? getComponentFusionCost(componentBase) : null;

  const canAffordSwords =
    swordCost !== null && wallet.gold >= swordCost.gold && wallet.rubies >= swordCost.rubies;
  const canAffordComponents = componentCost !== null && wallet.gold >= componentCost;

  const swordIssue = swordFusionSelectionIssue(selectedSwords);
  const componentIssue = componentFusionSelectionIssue(selectedComponents);

  const cores = inventory.fusionCores || [];

  const toggleSword = (sword: FinishedSword) => {
    setError(null);
    setNotice(null);
    if (swordIds.includes(sword.id)) {
      setSwordIds(swordIds.filter((id) => id !== sword.id));
      return;
    }
    if (swordIds.length >= 4) {
      setError("Quatro doadoras já foram escolhidas. Remova uma para trocar.");
      return;
    }
    const blocked = swordFusionBlockReason(sword);
    if (blocked) {
      setError(blocked);
      return;
    }
    if (selectedSwords.length > 0 && (sword.rarity || "Comum") !== swordRarity) {
      setError(`Mesma raridade: as quatro precisam ser ${swordRarity}.`);
      return;
    }
    setSwordIds([...swordIds, sword.id]);
  };

  const toggleComponent = (item: InventoryComponent) => {
    setError(null);
    setNotice(null);
    if (componentIds.includes(item.id)) {
      setComponentIds(componentIds.filter((id) => id !== item.id));
      return;
    }
    if (componentIds.length >= 4) {
      setError("Quatro componentes já foram escolhidos.");
      return;
    }
    if (selectedComponents.length > 0 && selectedComponents[0].category !== item.category) {
      setError(`Todos os componentes devem ser de ${CATEGORY_LABEL[selectedComponents[0].category]}.`);
      return;
    }
    setComponentIds([...componentIds, item.id]);
  };

  const confirmSwords = () => {
    const issue = swordFusionSelectionIssue(selectedSwords);
    if (issue) {
      setError(issue);
      return;
    }
    if (!swordCost || !canAffordSwords) {
      setError("Recursos insuficientes para pagar a transmutação.");
      return;
    }
    try {
      playFusionHum();
      const outcome = fuseSwords(selectedSwords, { useCatalyst: catalystActive });
      if (!onFuseSwords(outcome)) {
        setError("A fusão não foi gravada. Suas quatro doadoras foram preservadas.");
        return;
      }
      playFusionSuccess();
      setDonors(selectedSwords);
      setSwordOutcome(outcome);
      setSwordIds([]);
      setReviewOpen(false);
      setPickerOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Falha na fusão de espadas.");
    }
  };

  const confirmComponents = () => {
    const issue = componentFusionSelectionIssue(selectedComponents);
    if (issue) {
      setError(issue);
      return;
    }
    if (!componentCost || !canAffordComponents) {
      setError("Ouro insuficiente para pagar a transmutação.");
      return;
    }
    try {
      playFusionHum();
      const outcome = fuseComponents(selectedComponents, { useCatalyst: catalystActive });
      if (!onFuseComponents(outcome)) {
        setError("A fusão não foi gravada. Seus componentes foram preservados.");
        return;
      }
      playFusionSuccess();
      setComponentOutcome(outcome);
      setComponentIds([]);
      setReviewOpen(false);
      setPickerOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Falha na fusão de componentes.");
    }
  };

  const pickerSwords = useMemo(
    () =>
      swords
        .filter((sword) => !sword.isTraining)
        .filter((sword) => rarityFilter === "Todas" || (sword.rarity || "Comum") === rarityFilter),
    [swords, rarityFilter],
  );

  const showSwordResult = swordOutcome !== null;
  const showComponentResult = componentOutcome !== null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-3 pb-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-amber-400/90">Craft</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-amber-50">O Crisol</h1>
          <p className="mt-1 text-xs text-muted">Quatro armas. Uma nova oportunidade.</p>
        </div>
        <Flame className="mt-1 shrink-0 text-amber-500" size={30} strokeWidth={1.3} />
      </header>

      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-surface p-1" role="tablist">
        {(["swords", "components"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => {
              setMode(item);
              setError(null);
              setReviewOpen(false);
            }}
            className={
              "min-h-9 rounded-md text-xs font-semibold " +
              (mode === item ? "bg-amber-600 text-stone-950" : "text-muted")
            }
          >
            {item === "swords" ? "Espadas" : "Componentes"}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-600/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      ) : null}

      {showSwordResult && swordOutcome ? (
        <section aria-label="Revelação do núcleo" className="space-y-2.5">
          <div className="rounded-xl border-2 border-amber-600/70 bg-[linear-gradient(180deg,#241c12,#120e0a)] p-3">
            <p className="text-center font-display text-[0.6rem] uppercase tracking-[0.2em] text-amber-400">
              {swordOutcome.tierJump === "exceptional"
                ? "Transmutação excepcional (+2)"
                : swordOutcome.tierJump === "superior"
                  ? "Transmutação superior (+1)"
                  : "Núcleo condensado"}
            </p>
            <CoreArt core={swordOutcome.resultCore} />
            <div className="text-center">
              <span className="rounded border px-1.5 py-0.5 text-[0.6rem] font-bold" style={{ color: RARITY_COLOR[swordOutcome.resultCore.rarity], borderColor: RARITY_COLOR[swordOutcome.resultCore.rarity] }}>
                {swordOutcome.resultCore.rarity}
              </span>
              <h2 className="mt-1.5 font-display text-lg leading-tight font-bold text-amber-50">
                {swordOutcome.resultCore.name}
              </h2>
              <p className="mt-1 text-[0.68rem] text-[#cdbb9d]">
                Potencial de fabricação: +{swordOutcome.resultCore.bonusQuality}% de qualidade.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-muted">
              Memória das quatro doadoras
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-200">
              {swordOutcome.resultCore.heritage
                ? [
                    swordOutcome.resultCore.heritage.attackBias >= 0 ? "Afinidade ofensiva" : null,
                    swordOutcome.resultCore.heritage.defenseBias >= 0 ? "têmpera defensiva" : null,
                    swordOutcome.resultCore.heritage.agilityBias >= 0 ? "equilíbrio ágil" : null,
                  ].filter(Boolean).join(" · ") || "Memória equilibrada"
                : "Herança registrada no núcleo"}
            </p>
            <p className="mt-0.5 text-[0.62rem] leading-relaxed text-muted">
              Tendências reais do motor (ATK {signed(swordOutcome.resultCore.heritage?.attackBias)} · DEF{" "}
              {signed(swordOutcome.resultCore.heritage?.defenseBias)} · AGI{" "}
              {signed(swordOutcome.resultCore.heritage?.agilityBias)}). Não são os atributos finais.
            </p>
            <p className="mt-1 text-[0.62rem] text-[#d8c8ab]">
              {swordOutcome.resultCore.inheritedPerks.join(" · ") || "Sem traço especial herdado."}
            </p>
            <p className="mt-1 text-[0.6rem] text-muted">
              {donors.map((donor) => `${donor.design.name} (Q${donor.quality})`).join(" · ")}
            </p>
          </div>

          <p className="rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-2 text-center text-[0.68rem] text-amber-200">
            O núcleo ainda precisa ser forjado. Nenhuma espada pronta foi entregue.
          </p>

          {(() => {
            const material = getRequiredMaterialForSteel(swordOutcome.resultCore.steel);
            const stock = getMaterialStock(inventory.materials, material.key);
            return (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[0.65rem] text-muted">
                Requer {material.icon} 1x {material.name} · estoque {stock}
                {stock < 1 ? (
                  <button type="button" onClick={onGoShop} className="ml-2 font-semibold text-amber-300">
                    Comprar metal
                  </button>
                ) : null}
              </div>
            );
          })()}

          <div className="grid gap-2">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 font-display font-bold text-stone-950"
              onClick={() => {
                onPrepareCore(swordOutcome.resultCore);
                setSwordOutcome(null);
              }}
            >
              Forjar agora <ArrowRight size={17} />
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSwordOutcome(null);
                setNotice("Núcleo guardado no inventário. Ele continua disponível após fechar o jogo.");
              }}
            >
              Guardar núcleo
            </Button>
            <p className="text-center text-[0.6rem] text-muted">O núcleo já foi gravado antes desta revelação.</p>
          </div>
        </section>
      ) : showComponentResult && componentOutcome ? (
        <section aria-label="Resultado da fusão de componentes" className="space-y-2.5">
          <div className="rounded-xl border-2 border-cyan-700/60 bg-[#12201f] p-4 text-center">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-cyan-300">
              {componentOutcome.tierJump === "exceptional" ? "Componente excepcional" : componentOutcome.tierJump === "superior" ? "Componente mestre" : "Componente refinado"}
            </p>
            <span className="mt-2 inline-grid size-14 place-items-center rounded-full border border-cyan-700/60 bg-black/30 text-2xl">
              {componentOutcome.resultComponent.icon}
            </span>
            <h2 className="mt-2 font-display text-lg font-bold text-cyan-50">{componentOutcome.resultComponent.name}</h2>
            <p className="text-[0.68rem] text-cyan-200/80">
              {componentOutcome.resultComponent.rarity} · {CATEGORY_LABEL[componentOutcome.resultComponent.category]}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[0.62rem] text-muted">
              {componentOutcome.resultComponent.description}
            </p>
            {componentOutcome.fragmentsAwarded > 0 ? (
              <p className="mt-1 text-[0.62rem] text-amber-300">
                +{componentOutcome.fragmentsAwarded} fragmentos de fusão (proteção contra azar).
              </p>
            ) : null}
            <Button
              className="mt-3 w-full bg-cyan-600 font-display font-bold text-stone-950"
              onClick={() => setComponentOutcome(null)}
            >
              Guardar no inventário
            </Button>
            <p className="mt-1 text-[0.6rem] text-muted">Já persistido. Encontre a peça em Coleção → Peças.</p>
          </div>
        </section>
      ) : mode === "swords" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="font-display text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              Doadoras · {selectedSwords.length}/4
            </p>
            <p className="text-[0.6rem] text-muted">Mesma raridade, qualidades livres</p>
          </div>

          <div className="grid grid-cols-2 gap-2" aria-label="Quatro espaços de doadoras">
            {[0, 1, 2, 3].map((slot) => {
              const sword = selectedSwords[slot];
              return (
                <div
                  key={slot}
                  className={
                    "relative min-h-32 overflow-hidden rounded-xl border " +
                    (sword ? "border-amber-600/70 bg-[radial-gradient(ellipse_at_50%_40%,#2a2419,#14100b)]" : "border-dashed border-[#625039] bg-[radial-gradient(ellipse_at_50%_40%,#231e17,#17140f)]")
                  }
                >
                  {sword ? (
                    <>
                      <button
                        type="button"
                        className="absolute inset-x-0 top-0 bottom-10"
                        aria-label={`Inspecionar ${sword.design.name}`}
                        onClick={() => setInspect(sword)}
                      >
                        <WeaponPreview sword={sword} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${sword.design.name}`}
                        onClick={() => setSwordIds(swordIds.filter((id) => id !== sword.id))}
                        className="absolute top-1 right-1 z-10 grid size-7 place-items-center rounded-full border border-border bg-black/70 text-red-300"
                      >
                        <X size={13} />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-[#17130e]/95 px-1.5 py-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="rounded border px-1 py-0.5 text-[0.52rem] font-bold" style={{ color: RARITY_COLOR[sword.rarity || "Comum"], borderColor: RARITY_COLOR[sword.rarity || "Comum"] }}>
                            {sword.rarity || "Comum"}
                          </span>
                          <span className="text-[0.55rem] text-muted">Q{sword.quality}</span>
                        </div>
                        <p className="truncate text-[0.62rem] font-semibold text-amber-50">{sword.design.name || "Sem nome"}</p>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRarityFilter("Todas");
                        setPickerOpen(true);
                      }}
                      className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1.5 text-[#c2ad8b]"
                    >
                      <span className="absolute top-1.5 left-2 text-[0.6rem] text-[#9a8058]">0{slot + 1}</span>
                      <Plus size={24} />
                      <span className="text-[0.68rem]">Selecionar espada</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-muted">Possíveis núcleos</p>
              <label className="flex items-center gap-1.5 text-[0.62rem] text-[#d8c8ab]">
                <input
                  type="checkbox"
                  className="size-4 accent-amber-500"
                  disabled={!hasCatalyst}
                  checked={catalystActive}
                  onChange={(event) => setUseCatalyst(event.target.checked)}
                />
                Catalisador ({catalystCount})
              </label>
            </div>
            <div className="mt-2">
              {selectedSwords.length === 4 ? (
                <Odds rarity={swordRarity} mode="swords" useCatalyst={catalystActive} />
              ) : (
                <p className="rounded border border-dashed border-border px-2 py-3 text-center text-[0.65rem] text-muted">
                  Escolha quatro doadoras da mesma raridade para ver as chances reais.
                </p>
              )}
            </div>
            <p className="mt-1.5 text-[0.58rem] leading-relaxed text-muted">
              {catalystActive ? "1 catalisador será consumido na fusão." : "Sem catalisador."} Chances provisórias, calculadas pelo motor.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[0.68rem] text-[#cdbb9d]" role="status">
              {swordCost
                ? `Custo: ${swordCost.gold} ouro · ${swordCost.rubies} rubis${catalystActive ? " · 1 catalisador" : ""}`
                : "Selecione quatro espadas para conferir o custo."}
              {swordCost && !canAffordSwords ? " — recursos insuficientes." : ""}
            </p>
            <Button
              size="lg"
              className="mt-2 w-full bg-gradient-to-r from-amber-600 to-amber-500 font-display font-bold text-stone-950"
              disabled={swordIssue !== null || !canAffordSwords || selectedSwords.length !== 4}
              onClick={() => setReviewOpen(true)}
            >
              Revisar fusão ({selectedSwords.length}/4) <ArrowRight size={16} />
            </Button>
            <p className="mt-1 text-center text-[0.6rem] text-muted">
              As quatro serão consumidas. O resultado é um núcleo para a bigorna.
            </p>
          </div>

          {selectedSwords.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <p className="font-display text-[0.58rem] uppercase tracking-[0.18em] text-muted">Resumo das doadoras</p>
              <ul className="mt-1.5 space-y-1">
                {selectedSwords.map((sword) => (
                  <li key={sword.id} className="flex items-center justify-between gap-2 text-[0.65rem]">
                    <span className="truncate text-[#e8dcc4]">{sword.design.name}</span>
                    <span className="shrink-0 text-muted">
                      {sword.rarity} · Q{sword.quality}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="font-display text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              Componentes · {selectedComponents.length}/4
            </p>
            <p className="text-[0.6rem] text-muted">Mesma categoria</p>
          </div>

          <div className="grid grid-cols-2 gap-2" aria-label="Quatro espaços de componentes">
            {[0, 1, 2, 3].map((slot) => {
              const item = selectedComponents[slot];
              return (
                <div
                  key={slot}
                  className={
                    "relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border p-2 " +
                    (item ? "border-cyan-600/60 bg-[#12201f]" : "border-dashed border-[#4b5a52] bg-[#0f1714]")
                  }
                >
                  {item ? (
                    <>
                      <span aria-hidden className="text-2xl">{item.icon}</span>
                      <p className="line-clamp-2 text-center font-display text-[0.65rem] font-bold text-cyan-50">{item.name}</p>
                      <span className="text-[0.55rem] text-cyan-300">{item.rarity}</span>
                      <button
                        type="button"
                        aria-label={`Remover ${item.name}`}
                        onClick={() => setComponentIds(componentIds.filter((id) => id !== item.id))}
                        className="absolute top-1 right-1 grid size-7 place-items-center rounded-full border border-border bg-black/60 text-red-300"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 text-[#9fb5aa]"
                    >
                      <Plus size={22} />
                      <span className="text-[0.65rem]">Adicionar peça</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-muted">Chances do componente</p>
              <label className="flex items-center gap-1.5 text-[0.62rem] text-[#d8c8ab]">
                <input
                  type="checkbox"
                  className="size-4 accent-cyan-500"
                  disabled={!hasCatalyst}
                  checked={catalystActive}
                  onChange={(event) => setUseCatalyst(event.target.checked)}
                />
                Catalisador ({catalystCount})
              </label>
            </div>
            <div className="mt-2">
              {selectedComponents.length === 4 ? (
                <Odds rarity={componentBase} mode="components" useCatalyst={catalystActive} />
              ) : (
                <p className="rounded border border-dashed border-border px-2 py-3 text-center text-[0.65rem] text-muted">
                  Escolha quatro peças da mesma categoria.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-[0.68rem] text-[#cdbb9d]" role="status">
              {componentCost !== null ? `Custo: ${componentCost} ouro${catalystActive ? " · 1 catalisador" : ""}` : "Selecione quatro peças para conferir o custo."}
            </p>
            <Button
              size="lg"
              className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-cyan-500 font-display font-bold text-stone-950"
              disabled={componentIssue !== null || !canAffordComponents || selectedComponents.length !== 4}
              onClick={() => setReviewOpen(true)}
            >
              Revisar fusão ({selectedComponents.length}/4) <ArrowRight size={16} />
            </Button>
            <p className="mt-1 text-center text-[0.6rem] text-muted">
              Componentes fundidos ficam prontos para instalar numa espada.
            </p>
          </div>
        </>
      )}

      {cores.length > 0 && !showSwordResult && !showComponentResult ? (
        <section className="rounded-lg border border-amber-800/50 bg-[#1d1710] p-3">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-amber-300">
            Núcleos no inventário · {cores.length}
          </p>
          <ul className="mt-1.5 space-y-1">
            {cores.map((core) => (
              <li key={core.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[0.68rem] text-[#e8dcc4]">{core.name}</span>
                <button type="button" onClick={() => onPrepareCore(core)} className="shrink-0 text-[0.65rem] font-semibold text-amber-300">
                  Forjar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Seletor de doadoras */}
      <Sheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        eyebrow={mode === "swords" ? "Arsenal" : "Inventário"}
        title={mode === "swords" ? "Escolha as doadoras" : "Escolha os componentes"}
        description={
          mode === "swords"
            ? "Quatro espadas da mesma raridade. Toque na arma para inspecionar antes de sacrificar."
            : "Quatro peças da mesma categoria (guardas, cabos, pomos ou runas)."
        }
        footer={
          <Button
            className="w-full bg-amber-600 font-display font-bold text-stone-950"
            onClick={() => setPickerOpen(false)}
          >
            <Check size={16} /> Usar seleção ({mode === "swords" ? selectedSwords.length : selectedComponents.length}/4)
          </Button>
        }
      >
        {mode === "swords" ? (
          <div className="space-y-2">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {(["Todas", "Comum", "Incomum", "Rara", "Épica", "Lendária", "Relíquia"] as const).map((rarity) => (
                <button
                  key={rarity}
                  type="button"
                  onClick={() => setRarityFilter(rarity)}
                  className={
                    "min-h-8 shrink-0 rounded-full border px-2.5 text-[0.64rem] " +
                    (rarityFilter === rarity ? "border-amber-500 bg-amber-500/20 text-amber-100" : "border-border text-muted")
                  }
                >
                  {rarity}
                </button>
              ))}
            </div>
            <ul className="space-y-1.5">
              {pickerSwords.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">Nenhuma arma neste filtro.</li>
              ) : (
                pickerSwords.map((sword) => {
                  const picked = swordIds.includes(sword.id);
                  const blocked = swordFusionBlockReason(sword);
                  const wrongRarity = !picked && selectedSwords.length > 0 && (sword.rarity || "Comum") !== swordRarity;
                  return (
                    <li key={sword.id} className={"flex items-center gap-2 rounded-lg border p-1.5 " + (picked ? "border-amber-500 bg-amber-950/20" : "border-border bg-surface")}>
                      <button type="button" onClick={() => setInspect(sword)} className="h-14 w-12 shrink-0 rounded border border-border bg-black/25" aria-label={`Inspecionar ${sword.design.name}`}>
                        <WeaponPreview sword={sword} padded={false} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[0.7rem] font-bold text-amber-50">{sword.design.name}</p>
                        <p className="text-[0.58rem] text-muted">
                          {sword.rarity} · Q{sword.quality} · ATK {sword.damage ?? "—"}
                        </p>
                        {blocked || wrongRarity ? (
                          <p className="flex items-center gap-1 text-[0.56rem] text-amber-400/90">
                            <LockKeyhole size={10} /> {blocked || `Precisa ser ${swordRarity}`}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-pressed={picked}
                        disabled={!picked && (Boolean(blocked) || wrongRarity || selectedSwords.length >= 4)}
                        onClick={() => toggleSword(sword)}
                        className={
                          "shrink-0 rounded-md border px-2 py-1.5 text-[0.62rem] font-semibold " +
                          (picked ? "border-amber-500 bg-amber-500/20 text-amber-100" : "border-border text-[#d8c8ab] disabled:opacity-40")
                        }
                      >
                        {picked ? "Remover" : "Escolher"}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {(inventory.components || []).length === 0 ? (
              <li className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                Nenhum componente solto. Compre na Loja ou funda peças no Crisol.
              </li>
            ) : (
              (inventory.components || []).map((item) => {
                const picked = componentIds.includes(item.id);
                const wrongCategory =
                  !picked && selectedComponents.length > 0 && selectedComponents[0].category !== item.category;
                return (
                  <li key={item.id} className={"flex items-center gap-2 rounded-lg border p-2 " + (picked ? "border-cyan-500 bg-cyan-950/20" : "border-border bg-surface")}>
                    <span aria-hidden className="text-xl">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[0.7rem] font-bold text-cyan-50">{item.name}</p>
                      <p className="text-[0.58rem] text-muted">{item.rarity} · {CATEGORY_LABEL[item.category]}</p>
                      {wrongCategory ? (
                        <p className="text-[0.56rem] text-amber-400/90">
                          Precisa ser {CATEGORY_LABEL[selectedComponents[0].category]}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-pressed={picked}
                      disabled={!picked && (wrongCategory || componentIds.length >= 4)}
                      onClick={() => toggleComponent(item)}
                      className={
                        "shrink-0 rounded-md border px-2 py-1.5 text-[0.62rem] font-semibold " +
                        (picked ? "border-cyan-500 bg-cyan-500/20 text-cyan-100" : "border-border text-[#d8c8ab] disabled:opacity-40")
                      }
                    >
                      {picked ? "Remover" : "Escolher"}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </Sheet>

      {/* Confirmação */}
      <Sheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        eyebrow="Confirmação"
        title={mode === "swords" ? "Confirmar as quatro doadoras" : "Confirmar os quatro componentes"}
        description={
          mode === "swords"
            ? "As quatro armas serão consumidas definitivamente para criar um núcleo."
            : "As quatro peças serão consumidas e o resultado entra no inventário."
        }
      >
        {mode === "swords" ? (
          <div className="space-y-2">
            <ul className="space-y-1.5">
              {selectedSwords.map((sword, index) => (
                <DonorRow key={sword.id} sword={sword} index={index} />
              ))}
            </ul>
            <Odds rarity={swordRarity} mode="swords" useCatalyst={catalystActive} />
            <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-2 text-[0.68rem] text-amber-200">
              <ShieldCheck size={17} className="shrink-0" />
              <p>
                Custo previsto: <strong>{swordCost?.gold ?? 0} ouro · {swordCost?.rubies ?? 0} rubis</strong>
                {catalystActive ? " · 1 catalisador" : ""}. Descontado junto com as doadoras.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 font-display font-bold text-stone-950"
              disabled={!canAffordSwords}
              onClick={confirmSwords}
            >
              Confirmar fusão <Flame size={17} />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-1.5">
              {selectedComponents.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
                  <span aria-hidden className="text-xl">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.68rem] font-bold text-cyan-50">{index + 1}. {item.name}</p>
                    <p className="text-[0.58rem] text-muted">{item.rarity} · {CATEGORY_LABEL[item.category]}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Odds rarity={componentBase} mode="components" useCatalyst={catalystActive} />
            <p className="rounded-lg border border-cyan-800/50 bg-cyan-950/25 px-3 py-2 text-[0.68rem] text-cyan-100">
              Custo previsto: <strong>{componentCost ?? 0} ouro</strong>
              {catalystActive ? " · 1 catalisador" : ""}.
            </p>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 font-display font-bold text-stone-950"
              disabled={!canAffordComponents}
              onClick={confirmComponents}
            >
              Confirmar fusão <Flame size={17} />
            </Button>
          </div>
        )}
      </Sheet>

      {/* Inspeção da doadora */}
      <Sheet
        open={inspect !== null}
        onOpenChange={(open) => !open && setInspect(null)}
        eyebrow="Inspeção"
        title={inspect ? ("design" in inspect ? inspect.design.name : inspect.name) : ""}
        description={inspect ? ("design" in inspect ? `${inspect.rarity} · Qualidade ${inspect.quality}` : `${inspect.rarity} · componente`) : undefined}
      >
        {inspect && "design" in inspect ? (
          <div className="space-y-2">
            <div className="h-48 rounded-xl border border-border bg-[radial-gradient(ellipse_at_50%_45%,#242a33,#0d1015)]">
              <WeaponPreview sword={inspect} />
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[0.62rem]">
              {[
                ["ATK", inspect.damage],
                ["DEF", inspect.defense],
                ["AGI", inspect.agility],
                ["DUR", inspect.durability],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded border border-border bg-black/25 py-1">
                  <p className="text-muted">{label}</p>
                  <p className="font-display text-sm font-bold text-[#e8dcc4]">{value ?? "—"}</p>
                </div>
              ))}
            </div>
            <p className="text-[0.68rem] text-[#d8c8ab]">
              {inspect.perks?.join(" · ") || "Sem traços especiais registrados."}
            </p>
            <p className="text-[0.62rem] text-muted">
              {inspect.broken ? "Lâmina quebrada: não pode ser fundida." : inspect.favorite ? "Protegida contra fusão. Desproteja no Arsenal." : "Elegível para o Crisol."}
            </p>
            <Button
              className="w-full bg-amber-600 font-display font-bold text-stone-950"
              disabled={Boolean(swordFusionBlockReason(inspect)) || swordIds.includes(inspect.id) || selectedSwords.length >= 4 || (selectedSwords.length > 0 && (inspect.rarity || "Comum") !== swordRarity)}
              onClick={() => {
                toggleSword(inspect);
                setInspect(null);
              }}
            >
              {swordIds.includes(inspect.id) ? "Já selecionada" : "Adicionar à fusão"}
            </Button>
          </div>
        ) : inspect ? (
          <div className="space-y-2 text-[0.68rem] text-[#d8c8ab]">
            <p className="text-lg">{inspect.icon}</p>
            <p>{inspect.description}</p>
            <p className="text-muted">{inspect.rarity} · {CATEGORY_LABEL[inspect.category]}</p>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
