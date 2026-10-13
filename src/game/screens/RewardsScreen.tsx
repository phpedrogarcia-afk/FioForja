import { useState } from "react";
import { Archive, Flame, Gem, Shield, Sparkles, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinishedSword, RewardDrop } from "../types";
export function DropIcon({ drop }: { drop: RewardDrop }) {
  const Icon =
    drop.category === "rune"
      ? Flame
      : drop.category === "guard"
        ? Shield
        : drop.category === "grip"
          ? Archive
          : Gem;
  return <Icon size={40} strokeWidth={1.25} />;
}
export function RewardsScreen({
  sword,
  claimed,
  onClaim,
  onBack,
  onGallery,
}: {
  sword: FinishedSword;
  claimed: boolean;
  onClaim: () => void;
  onBack: () => void;
  onGallery: () => void;
}) {
  const [open, setOpen] = useState(claimed);
  return (
    <div className="forge-page rewards-page">
      <header className="forge-header">
        <button className="icon-button" aria-label="Voltar à inspeção" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span>Recompensas da forja</span>
        <span className="rank-pill">
          {sword.rank ?? "C"} · {sword.performance ?? sword.quality}%
        </span>
      </header>
      <main className="rewards-content">
        <p className="eyebrow">A habilidade deixa sua marca</p>
        <h1>
          {sword.rank === "F" ? "O ferro retorna à oficina" : `Desempenho · Rank ${sword.rank}`}
        </h1>
        <p className="subtitle">
          {sword.rank === "S"
            ? "Domínio excepcional. Materiais e inscrições ancestrais."
            : sword.rank === "F"
              ? "Uma falha também ensina. Recupere o metal e tente novamente."
              : "Novos recursos para as próximas obras."}
        </p>
        <button
          className={`reward-chest ${open ? "is-open" : ""}`}
          disabled={open}
          aria-label="Abrir baú"
          onClick={() => setOpen(true)}
        >
          <span className={`chest-art ${open ? "open" : ""}`} aria-hidden="true" />
          <Sparkles className="chest-sparks" size={36} />
          <span>{open ? "O fruto da sua forja" : "Toque para abrir o baú"}</span>
        </button>
        {open ? (
          <div className="drop-grid">
            {sword.drops?.map((drop) => (
              <article key={drop.id} className={`drop-card tier-${drop.tier}`}>
                <div className="drop-portrait">
                  <DropIcon drop={drop} />
                </div>
                <p className="eyebrow">{drop.tier ? `Tier ${drop.tier}` : "Recuperável"}</p>
                <h2>{drop.name}</h2>
                <p>{drop.description}</p>
                <span className="drop-amount">+{drop.amount}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="chest-hint">
            60% ritmo · 20% calor · 20% têmpera
            <br />
            Sem sorte promovendo sua execução.
          </p>
        )}
        <div className="screen-actions">
          {open ? (
            <Button size="lg" disabled={claimed} onClick={onClaim}>
              {claimed ? (
                <>
                  <Check size={18} /> Recompensas recebidas
                </>
              ) : (
                "Receber recompensas"
              )}
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" onClick={onGallery}>
            Ver coleção
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Inspecionar espada
          </Button>
        </div>
      </main>
    </div>
  );
}
