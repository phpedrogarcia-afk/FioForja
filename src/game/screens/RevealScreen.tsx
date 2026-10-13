import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Hammer, Droplets, ChevronRight } from "lucide-react";
import { PROFILES, STEELS, WRAPS, GUARDS, POMMELS } from "../catalog";
import { rarityLabel } from "../rewards";
import { SwordPreview } from "./SwordPreview";
import type { FinishedSword } from "../types";
interface Props {
  sword: FinishedSword;
  onAgain: () => void;
  onGallery: () => void;
  onTitle: () => void;
  onRewards?: () => void;
  claimed?: boolean;
}
export function RevealScreen({ sword, onAgain, onGallery, onTitle, onRewards, claimed }: Props) {
  const perfects = sword.history?.filter((h) => h.kind === "perfect").length ?? 0;
  return (
    <div className="forge-page inspection-page">
      <header className="forge-header">
        <button className="icon-button" aria-label="Voltar à galeria" onClick={onGallery}>
          <ArrowLeft size={20} />
        </button>
        <span>Inspeção da obra</span>
        <button className="quiet-button" onClick={onTitle}>
          Início
        </button>
      </header>
      <main className="inspection-layout">
        <div className="inspection-hero">
          <p className={`eyebrow rarity-${sword.rarity}`}>
            {rarityLabel(sword.rarity)} · {sword.grade}
          </p>
          <h1>{sword.title}</h1>
          <p className="subtitle">
            {PROFILES[sword.design.profile].name} · {STEELS[sword.design.steel].name}
          </p>
          <SwordPreview design={sword.design} sword={sword} inspect />
          {sword.broken ? (
            <p className="failure-note">A lâmina falhou. A sucata pode voltar à oficina.</p>
          ) : null}
        </div>
        <div className="inspection-details">
          <div className="score-banner">
            <span>Desempenho da forja</span>
            <strong>
              {sword.rank ? `Rank ${sword.rank}` : "Peça anterior"}{" "}
              <small>{sword.performance ?? sword.quality}%</small>
            </strong>
            <p>
              Qualidade {sword.quality} · {sword.grade}
            </p>
          </div>
          <dl className="weapon-stats">
            <Stat label="Ataque" value={sword.stats.atk} />
            <Stat label="Defesa" value={sword.stats.def} />
            <Stat label="Agilidade" value={sword.stats.agi} />
          </dl>
          <section className="metal-panel">
            <h2>Construção modular</h2>
            <dl className="detail-list">
              <dt>Lâmina</dt>
              <dd>{PROFILES[sword.design.profile].name}</dd>
              <dt>Material</dt>
              <dd>{STEELS[sword.design.steel].name}</dd>
              <dt>Empunhadura</dt>
              <dd>{WRAPS[sword.design.wrap].name}</dd>
              <dt>Guarda / pomo</dt>
              <dd>
                {GUARDS[sword.design.guard].name} / {POMMELS[sword.design.pommel].name}
              </dd>
              <dt>Inscrição</dt>
              <dd>
                {sword.design.inscription ||
                  (sword.design.runes ? "Marca da forja" : "Sem inscrição")}
              </dd>
            </dl>
          </section>
          <section className="metal-panel">
            <h2>História da forja</h2>
            <div className="process-scores">
              <span>
                <Flame size={16} /> Fogo <b>{sword.heatScore}</b>
              </span>
              <span>
                <Hammer size={16} /> Forma <b>{sword.forgeScore}</b>
              </span>
              <span>
                <Droplets size={16} /> Têmpera <b>{sword.quenchScore}</b>
              </span>
            </div>
            <p className="subtitle">
              {sword.history?.length
                ? `${perfects} golpes perfeitos · ${sword.reheats ?? 0} reaquecimentos · empenamento ${Math.round(sword.warp * 100)}%`
                : "Esta peça foi salva antes do registro de golpes."}
            </p>
            {sword.history?.length ? (
              <ol className="strike-history">
                {sword.history.map((hit, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    <strong>{Math.round(hit.accuracy)}%</strong>
                    <small>{Math.round(hit.heat * 100)}°</small>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
          <div className="screen-actions">
            {onRewards && !claimed ? (
              <Button size="lg" onClick={onRewards}>
                Abrir baú de recompensas <ChevronRight size={18} />
              </Button>
            ) : null}
            <Button variant="secondary" size="lg" onClick={onAgain}>
              Forjar outra
            </Button>
            <Button variant="ghost" onClick={onGallery}>
              Ver arsenal
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
