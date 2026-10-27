import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Coins, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BAZAAR_ARTICLES,
  SHOP_CATEGORIES,
  shopCategoryOf,
  type ShopArticle,
  type ShopCategoryId,
} from "../shop";
import { getMaterialStock } from "../materials";
import { WORKSHOP_EQUIPMENT } from "../catalog";
import { defaultEquippedGear } from "../save";
import type { PlayerInventory, PlayerWallet } from "../types";
import { Sheet } from "../components/Sheet";

interface Props {
  active?: boolean;
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  onPurchase: (article: ShopArticle) => boolean;
  onEquipTool: (toolId: string) => boolean;
}

function ownedCount(article: ShopArticle, inventory: PlayerInventory): number {
  switch (article.type) {
    case "material":
      return getMaterialStock(inventory.materials, article.id);
    case "catalyst":
      return inventory.materials?.catalyst_astral || 0;
    case "tool":
      return (inventory.unlockedTools || []).includes(article.id) ? 1 : 0;
    case "recipe":
      return (inventory.unlockedBlueprints || []).includes(article.id.replace(/^recipe_/, ""))
        ? 1
        : 0;
    default:
      return (inventory.components || []).filter(
        (c) => c.componentKey === article.componentData?.componentKey,
      ).length;
  }
}

function destinationOf(article: ShopArticle): string {
  switch (article.type) {
    case "material":
      return "Vai para o almoxarifado e é consumido em 1 unidade por forja.";
    case "catalyst":
      return "Fica no inventário e pode ser marcado no Craft para alterar as chances reais.";
    case "tool":
      return "Entra na Oficina; equipar muda o comportamento da bigorna.";
    case "recipe":
      return "Desbloqueia o projeto no Compêndio; ainda exige o metal correto.";
    default:
      return "Entra na Coleção → Componentes e pode ser instalado numa espada compatível.";
  }
}

/**
 * Cards resumem identidade, preço e posse; o detalhe explica efeito e destino.
 * A compra só acontece na confirmação e passa pela transação canônica.
 */
export function ShopScreen({ active = true, wallet, inventory, onPurchase, onEquipTool }: Props) {
  const [category, setCategory] = useState<ShopCategoryId>("materials");
  const [selected, setSelected] = useState<ShopArticle | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const panelHistory = useRef(false);
  const panelOpener = useRef<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const currentCategory =
    SHOP_CATEGORIES.find((item) => item.id === category) || SHOP_CATEGORIES[0];

  // Reuse the section history: Back closes a Shop panel before leaving Shop.
  const openPanel = (panel: { kind: "categories" } | { kind: "product"; id: string }) => {
    panelOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (panelHistory.current) return;
    try {
      window.history.pushState(
        { ...window.history.state, fioSection: "shop", fio: true, fioShopPanel: panel },
        "",
        window.location.href,
      );
      panelHistory.current = true;
    } catch {
      /* Closing by X or Escape still works if history is unavailable. */
    }
  };

  const closePanel = () => {
    setCategoriesOpen(false);
    setSelected(null);
    if (panelHistory.current) {
      panelHistory.current = false;
      if (window.history.state?.fioShopPanel) window.history.back();
    }
    requestAnimationFrame(() => panelOpener.current?.focus());
  };

  useEffect(() => {
    if (!active) return;
    const syncPanel = (
      panel: { kind?: string; id?: string } | undefined,
      restoreFocus: boolean,
    ) => {
      const product =
        panel?.kind === "product"
          ? BAZAAR_ARTICLES.find((item) => item.id === panel.id)
          : undefined;
      panelHistory.current = panel?.kind === "categories" || Boolean(product);
      setCategoriesOpen(panel?.kind === "categories");
      setSelected(product || null);
      if (restoreFocus && !panelHistory.current) {
        requestAnimationFrame(() => panelOpener.current?.focus());
      }
    };
    const onPop = (event: PopStateEvent) => syncPanel(event.state?.fioShopPanel, true);
    syncPanel(window.history.state?.fioShopPanel, false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [active]);

  const articles = useMemo(
    () => BAZAAR_ARTICLES.filter((article) => shopCategoryOf(article) === category),
    [category],
  );
  const missingFunds = selected
    ? [
        wallet.gold < selected.costGold ? `${selected.costGold - wallet.gold} ouro` : null,
        wallet.rubies < (selected.costRubies || 0)
          ? `${(selected.costRubies || 0) - wallet.rubies} rubis`
          : null,
      ]
        .filter(Boolean)
        .join(" e ")
    : "";

  const buy = (article: ShopArticle) => {
    const ok = onPurchase(article);
    setFeedback(
      ok
        ? { ok: true, message: `${article.name} entregue ao inventário.` }
        : { ok: false, message: "A compra não foi concluída. Nada foi debitado." },
    );
    if (ok) closePanel();
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-3 pb-6">
      <header>
        <p className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-amber-400/90">
          Bazar da oficina
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-amber-50">Loja</h1>
        <p className="mt-1 text-xs text-muted">
          Tudo o que entra aqui tem uso real na forja ou no Crisol.
        </p>
      </header>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={active && categoriesOpen}
        onClick={() => {
          openPanel({ kind: "categories" });
          setCategoriesOpen(true);
        }}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-amber-700/60 bg-surface px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        <span className="min-w-0">
          <span className="block text-xs text-muted">Categorias</span>
          <span className="block text-sm font-semibold text-amber-100">
            <span aria-hidden>{currentCategory.icon} </span>
            {currentCategory.label}
          </span>
        </span>
        <ChevronDown size={20} className="shrink-0 text-amber-300" aria-hidden />
      </button>

      {feedback ? (
        <p
          role="status"
          className={
            "rounded-lg border px-3 py-2 text-xs " +
            (feedback.ok
              ? "border-emerald-600/50 bg-emerald-950/30 text-emerald-200"
              : "border-red-600/50 bg-red-950/30 text-red-200")
          }
        >
          {feedback.message}
        </p>
      ) : null}

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
        {articles.map((article) => {
          const owned = ownedCount(article, inventory);
          const ownedOutright = (article.type === "tool" || article.type === "recipe") && owned > 0;
          const canAfford =
            wallet.gold >= article.costGold && wallet.rubies >= (article.costRubies || 0);
          return (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => {
                  openPanel({ kind: "product", id: article.id });
                  setFeedback(null);
                  setSelected(article);
                }}
                className="flex h-full w-full min-w-0 flex-col rounded-xl border border-border bg-surface p-2.5 text-left hover:border-amber-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                <span className="mb-2 flex w-full items-center justify-between gap-1">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-black/30 text-xl"
                  >
                    {article.icon}
                  </span>
                  <span className="rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-300">
                    {article.rarity}
                  </span>
                </span>
                <span className="min-h-12 w-full break-words font-display text-sm leading-snug font-bold text-amber-50">
                  {article.name}
                </span>
                <span className="mt-auto block w-full pt-2">
                  <span className="flex flex-wrap items-center gap-x-1 text-sm leading-snug">
                    <span
                      className={"font-semibold " + (canAfford ? "text-amber-300" : "text-red-300")}
                    >
                      🪙 {article.costGold}
                      {article.costRubies ? ` · 💎 ${article.costRubies}` : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-muted">
                    {ownedOutright ? "✓ Adquirido" : `Possui: ${owned}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {category === "tools" ? (
        <section
          aria-label="Equipamento da oficina"
          className="space-y-2 border-t border-border pt-3"
        >
          <h2 className="font-display text-sm font-bold text-amber-100">Equipamento da oficina</h2>
          <p className="text-xs text-muted">
            Escolha uma ferramenta adquirida ou volte ao equipamento padrão.
          </p>
          {WORKSHOP_EQUIPMENT.filter(
            (tool) => tool.unlockedByDefault || inventory.unlockedTools.includes(tool.id),
          ).map((tool) => {
            const equipped = inventory.equipped || defaultEquippedGear;
            const currentId =
              tool.category === "hammer" ? `hammer_${equipped.hammer}` : equipped[tool.category];
            const isEquipped = currentId === tool.id;
            return (
              <div
                key={tool.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-50">
                    {tool.icon} {tool.name}
                  </p>
                  <p className="mt-0.5 text-[0.62rem] text-muted">{tool.stats}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0 text-xs"
                  aria-label={`${isEquipped ? "Em uso" : "Equipar"} ${tool.name}`}
                  disabled={isEquipped}
                  onClick={() => {
                    const ok = onEquipTool(tool.id);
                    setFeedback({
                      ok,
                      message: ok
                        ? `${tool.name} em uso.`
                        : "Não foi possível equipar a ferramenta.",
                    });
                  }}
                >
                  {isEquipped ? "Em uso" : "Equipar"}
                </Button>
              </div>
            );
          })}
        </section>
      ) : null}

      <Sheet
        open={active && categoriesOpen}
        onOpenChange={(open) => !open && closePanel()}
        title="Categorias da Loja"
        description="Selecione o tipo de produto."
      >
        <fieldset className="grid grid-cols-2 gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <legend className="sr-only">Categorias da Loja</legend>
          {SHOP_CATEGORIES.map((item) => (
            <label
              key={item.id}
              className={
                "flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-2 py-3 text-sm leading-snug focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-400 " +
                (category === item.id
                  ? "border-amber-500 bg-amber-500/15 font-semibold text-amber-100"
                  : "border-border bg-surface text-muted")
              }
            >
              <input
                type="radio"
                name="shop-category"
                value={item.id}
                checked={category === item.id}
                onClick={() => {
                  if (category === item.id) closePanel();
                }}
                onChange={() => {
                  setCategory(item.id);
                  setFeedback(null);
                  closePanel();
                }}
                className="size-4 shrink-0 accent-amber-500"
              />
              <span className="min-w-0 break-words">{item.label}</span>
            </label>
          ))}
        </fieldset>
      </Sheet>

      <Sheet
        open={active && selected !== null}
        onOpenChange={(open) => !open && closePanel()}
        eyebrow="Detalhe do produto"
        title={selected?.name || ""}
        description={
          selected
            ? `${selected.rarity} · ${SHOP_CATEGORIES.find((item) => item.id === shopCategoryOf(selected))?.label}`
            : undefined
        }
        footer={
          selected ? (
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 font-display font-bold text-stone-950"
              disabled={
                wallet.gold < selected.costGold ||
                wallet.rubies < (selected.costRubies || 0) ||
                ((selected.type === "tool" || selected.type === "recipe") &&
                  ownedCount(selected, inventory) > 0)
              }
              onClick={() => buy(selected)}
            >
              <Coins size={17} /> Comprar por {selected.costGold} ouro
              {selected.costRubies ? ` + ${selected.costRubies} rubis` : ""}
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-black/25 p-2.5">
                <p className="text-[0.6rem] uppercase tracking-wider text-muted">Preço</p>
                <p className="font-display text-base font-bold text-amber-200">
                  🪙 {selected.costGold}
                  {selected.costRubies ? ` · 💎 ${selected.costRubies}` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-black/25 p-2.5">
                <p className="text-[0.6rem] uppercase tracking-wider text-muted">Seu saldo</p>
                <p className="font-display text-base font-bold text-amber-200">
                  🪙 {wallet.gold} · 💎 {wallet.rubies}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted">Você possui: {ownedCount(selected, inventory)}</p>
            {selected.stats ? (
              <p className="rounded-lg border border-amber-800/50 bg-amber-950/25 px-3 py-2 text-xs font-semibold text-amber-200">
                {selected.stats}
              </p>
            ) : null}
            <p className="text-xs leading-relaxed text-[#cdbb9d]">{selected.desc}</p>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
              <p className="flex items-center gap-1.5 font-semibold text-[#d8c8ab]">
                <Plus size={13} /> Destino após a compra
              </p>
              <p className="mt-0.5">{destinationOf(selected)}</p>
            </div>
            {wallet.gold < selected.costGold || wallet.rubies < (selected.costRubies || 0) ? (
              <p className="flex items-center gap-1.5 rounded-lg border border-red-600/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                <ShieldAlert size={14} className="shrink-0" /> Você precisa de mais {missingFunds}.
              </p>
            ) : null}
            {ownedCount(selected, inventory) > 0 &&
            (selected.type === "tool" || selected.type === "recipe") ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <Check size={14} /> Você já possui este item.
              </p>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
