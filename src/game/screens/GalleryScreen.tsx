import { useState } from "react";
import { ArrowLeft, Plus, Trophy, Search, Archive, Flame, Check, Download } from "lucide-react";
import { PROFILES, STEELS } from "../catalog";
import { DROP_CATALOG, rarityLabel } from "../rewards";
import { SwordPreview } from "./SwordPreview";
import { DropIcon } from "./RewardsScreen";
import type { Collection, FinishedSword } from "../types";
interface Props {
  swords: FinishedSword[];
  collection: Collection;
  onBack: () => void;
  onForge: () => void;
  onInspect: (s: FinishedSword) => void;
  onRecycle: () => void;
  onExport: () => void;
}
export function GalleryScreen({
  swords,
  collection,
  onBack,
  onForge,
  onInspect,
  onRecycle,
  onExport,
}: Props) {
  const [tab, setTab] = useState("arsenal"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const sorted = swords
    .filter(
      (s) =>
        (filter === "all" || s.rarity === filter) &&
        `${s.title} ${s.design.name} ${STEELS[s.design.steel].name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const best = swords.reduce((n, s) => Math.max(n, s.performance ?? s.quality), 0);
  return (
    <div className="forge-page gallery-page">
      <header className="forge-header">
        <button className="icon-button" aria-label="Voltar ao início" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span>O legado do ferreiro</span>
        <button className="quiet-button" onClick={onForge}>
          <Plus size={16} /> Forjar
        </button>
      </header>
      <main className="gallery-content">
        <p className="eyebrow">Cada peça conta uma história</p>
        <h1>Sua oficina</h1>
        <div className="collection-summary">
          <span>
            <Archive size={18} />
            {swords.length} obras
          </span>
          <span>
            <Trophy size={18} />
            {best}% recorde
          </span>
          <span>
            <Flame size={18} />
            {collection.scrap} sucatas
          </span>
        </div>
        <nav className="forge-tabs" aria-label="Seções da galeria">
          {[
            ["arsenal", "Arsenal"],
            ["collection", "Compêndio"],
            ["legacy", "Legado"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id!)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "arsenal" ? (
          <>
            <div className="arsenal-filters">
              <label>
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar uma obra"
                  aria-label="Buscar espada"
                />
              </label>
              <select
                aria-label="Filtrar raridade"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todas as raridades</option>
                {["comum", "incomum", "rara", "epica", "lendaria", "quebrada"].map((r) => (
                  <option key={r} value={r}>
                    {rarityLabel(r as FinishedSword["rarity"])}
                  </option>
                ))}
              </select>
            </div>
            <div className="arsenal-grid">
              {sorted.map((s) => (
                <button className="weapon-card" key={s.id} onClick={() => onInspect(s)}>
                  <SwordPreview design={s.design} sword={s} compact />
                  <div className="weapon-card-info">
                    <p className={`eyebrow rarity-${s.rarity}`}>
                      {rarityLabel(s.rarity)} · {s.grade}
                    </p>
                    <h2>{s.title}</h2>
                    <p>
                      {PROFILES[s.design.profile].name} · {STEELS[s.design.steel].name}
                    </p>
                    <span>
                      Qualidade {s.quality} {s.rank ? `· Rank ${s.rank}` : ""}
                    </span>
                    {s.drops?.length && !collection.claimed.includes(s.id) ? (
                      <small className="unclaimed">Baú disponível</small>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
            {!sorted.length ? (
              <div className="empty-state">
                <Archive size={40} />
                <p>
                  {swords.length
                    ? "Nenhuma obra corresponde ao filtro."
                    : "Sua primeira obra espera na bigorna."}
                </p>
                <button className="quiet-button" onClick={onForge}>
                  Entrar na forja
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        {tab === "collection" ? (
          <>
            <p className="subtitle">
              Recompensas recebidas desbloqueiam opções permanentes para novos projetos.
            </p>
            <div className="compendium-grid">
              {Object.values(DROP_CATALOG)
                .filter((d) => d.id !== "scrap")
                .map((d) => {
                  const count = collection.items[d.id] ?? 0;
                  return (
                    <article
                      className={`drop-card ${count ? "" : "is-locked"} tier-${d.tier}`}
                      key={d.id}
                    >
                      <div className="drop-portrait">
                        <DropIcon drop={{ ...d, amount: count }} />
                      </div>
                      <p className="eyebrow">
                        Tier {d.tier} ·{" "}
                        {d.tier === 4 ? "Rank S" : d.tier === 2 ? "Rank A" : "Rank B"}
                      </p>
                      <h2>{d.name}</h2>
                      <p>{d.description}</p>
                      <span className="drop-amount">
                        {count ? (
                          <>
                            <Check size={15} /> {count} recebidos
                          </>
                        ) : (
                          "Ainda não conquistado"
                        )}
                      </span>
                    </article>
                  );
                })}
            </div>
            <section className="metal-panel recycling">
              <div>
                <h2>Ferro que renasce</h2>
                <p>Refine 3 sucatas em 1 ferro refinado para sua coleção.</p>
              </div>
              <button disabled={collection.scrap < 3} onClick={onRecycle}>
                Refinar · 3 sucatas
              </button>
            </section>
          </>
        ) : null}
        {tab === "legacy" ? (
          <>
            <div className="legacy-grid">
              <Record label="Obras forjadas" value={swords.length} />
              <Record
                label="Obras-primas"
                value={swords.filter((s) => !s.broken && s.quality >= 95).length}
              />
              <Record label="Forjas Rank S" value={swords.filter((s) => s.rank === "S").length} />
              <Record label="Melhor desempenho" value={`${best}%`} />
              <Record
                label="Golpes perfeitos"
                value={swords.reduce(
                  (n, s) => n + (s.history?.filter((h) => h.kind === "perfect").length ?? 0),
                  0,
                )}
              />
              <Record
                label="Descobertas"
                value={
                  Object.keys(collection.items).filter((id) => collection.items[id]! > 0).length
                }
              />
            </div>
            <section className="metal-panel">
              <h2>Memórias da oficina</h2>
              <p className="subtitle">
                O arsenal é salvo neste navegador. Exporte uma cópia para preservar suas obras.
              </p>
              <button className="quiet-button" onClick={onExport}>
                <Download size={18} /> Exportar arsenal
              </button>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
function Record({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metal-panel">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
