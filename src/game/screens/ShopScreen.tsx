import { useMemo, useState } from "react";
import { Check, Coins, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BAZAAR_ARTICLES,
  SHOP_CATEGORIES,
  shopCategoryOf,
  type ShopArticle,
  type ShopCategoryId,
} from "../shop";
import { getMaterialStock } from "../materials";
import type { PlayerInventory, PlayerWallet } from "../types";
import { Sheet } from "../components/Sheet";

interface Props {
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  onPurchase: (article: ShopArticle) => boolean;
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
      return (inventory.unlockedBlueprints || []).includes(article.id.replace(/^recipe_/, "")) ? 1 : 0;
    default:
      return (inventory.components || []).filter((c) => c.componentKey === article.componentData?.componentKey).length;
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
 * Loja real: cada card mostra preço, moeda, saldo, efeito e destino.
 * A compra só acontece na confirmação e passa pela transação canônica.
 */
export function ShopScreen({ wallet, inventory, onPurchase }: Props) {
  const [category, setCategory] = useState<ShopCategoryId>("materials");
  const [selected, setSelected] = useState<ShopArticle | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const articles = useMemo(
    () => BAZAAR_ARTICLES.filter((article) => shopCategoryOf(article) === category),
    [category],
  );

  const buy = (article: ShopArticle) => {
    const ok = onPurchase(article);
    setFeedback(
      ok
        ? { ok: true, message: `${article.name} entregue ao inventário.` }
        : { ok: false, message: "A compra não foi concluída. Nada foi debitado." },
    );
    if (ok) setSelected(null);
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-3 pb-6">
      <header>
        <p className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-amber-400/90">Bazar da oficina</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-amber-50">Loja</h1>
        <p className="mt-1 text-xs text-muted">Tudo o que entra aqui tem uso real na forja ou no Crisol.</p>
      </header>

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="tablist" aria-label="Categorias da Loja">
        {SHOP_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            onClick={() => {
              setCategory(item.id);
              setFeedback(null);
            }}
            className={
              "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors " +
              (category === item.id
                ? "border-amber-500 bg-amber-500/20 text-amber-100"
                : "border-border bg-surface text-muted hover:text-amber-200")
            }
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

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

      <ul className="space-y-2">
        {articles.map((article) => {
          const owned = ownedCount(article, inventory);
          const ownedOutright = (article.type === "tool" || article.type === "recipe") && owned > 0;
          const canAfford = wallet.gold >= article.costGold && wallet.rubies >= (article.costRubies || 0);
          return (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setSelected(article);
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left hover:border-amber-600/60"
              >
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-black/30 text-xl">
                  {article.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display text-sm font-bold text-amber-50">{article.name}</span>
                    <span className="shrink-0 rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-300">
                      {article.rarity}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] leading-snug text-muted">{article.desc}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem]">
                    <span className={"font-semibold " + (canAfford ? "text-amber-300" : "text-red-300")}>
                      🪙 {article.costGold}
                      {article.costRubies ? ` · 💎 ${article.costRubies}` : ""}
                    </span>
                    <span className="text-muted">
                      {ownedOutright ? "✓ Adquirido" : `Possui: ${owned}`}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        eyebrow="Detalhe do produto"
        title={selected?.name || ""}
        description={selected ? `${selected.rarity} · ${selected.category}` : undefined}
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
                <ShieldAlert size={14} /> Saldo insuficiente. Venda/forje para reunir moedas.
              </p>
            ) : null}
            {ownedCount(selected, inventory) > 0 && (selected.type === "tool" || selected.type === "recipe") ? (
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
