import { useMemo, useState } from "react";
import { Anvil, ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Coins, Hammer, Home, LibraryBig, Maximize, SlidersHorizontal, Store, UserRound, X } from "lucide-react";
import { CANONICAL_PRESETS, GUARDS, PROFILES, STEELS, WRAPS } from "../../src/game/catalog";
import type { FinishedSword, SwordDesign } from "../../src/game/types";
import { SwordView } from "./SwordView";
import { ForgeView } from "./ForgeView";
import { specimens } from "./specimens";

type Section = "Início" | "Coleção" | "Forja" | "Loja" | "Jogador";
const sections = [Home, LibraryBig, Hammer, Store, UserRound];
const names: Section[] = ["Início", "Coleção", "Forja", "Loja", "Jogador"];

export function Attributes({ sword }: { sword: FinishedSword }) {
  return <dl className="attributes">{[["ATK", sword.damage], ["DEF", sword.defense], ["AGI", sword.agility], ["DUR", `${sword.durability}%`]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

export function App() {
  const [section, setSection] = useState<Section>("Forja");
  const [step, setStep] = useState(0);
  const [design, setDesign] = useState<SwordDesign>({ ...CANONICAL_PRESETS[0].design });
  const [active, setActive] = useState(false);
  const [result, setResult] = useState<FinishedSword | null>(null);
  const preview = useMemo(() => ({ design, quality: specimens[0].quality, id: "prototype-preview" }), [design]);

  return <div className={`prototype ${active ? "immersive" : ""}`}>
    <div className="prototype-label"><span>PROTÓTIPO VISUAL · NÃO GRAVA PROGRESSO</span><button title="Abrir em tela cheia" aria-label="Abrir em tela cheia" onClick={() => { void document.documentElement.requestFullscreen?.().catch(() => {}); }}><Maximize size={13} /></button></div>
    {!active && <header className="app-header"><div><p className="eyebrow">OFICINA DO FERREIRO</p><h1>FIOFORJA</h1></div><span className="balance"><Coins size={16} />850 <small>exemplo</small></span></header>}
    {active ? <ForgeView design={design} onExit={() => setActive(false)} onFinish={sword => { setActive(false); setResult(sword); }} /> : result ? <main className="reveal-page">
      <div className="section-heading"><button className="icon-button" aria-label="Voltar à preparação" onClick={() => setResult(null)}><ArrowLeft /></button><div><p className="eyebrow">RESULTADO DEMONSTRATIVO</p><h2>{result.broken ? "Uma lição na bigorna" : "Sua criação"}</h2></div></div>
      <div className="reveal-sword"><SwordView sword={result} /></div><div className="weapon-summary"><span className="rarity" data-rarity={result.rarity}>{result.rarity}</span><h2>{result.design.name}</h2><p>Qualidade {result.quality} · {result.grade}</p><Attributes sword={result} /></div>
      <p className="hint">Simulação local. Esta arma e suas recompensas não são gravadas.</p><button className="primary" onClick={() => { setResult(null); setSection("Coleção"); }}>Explorar coleção de exemplo <ArrowRight size={17} /></button>
    </main> : section === "Forja" ? <main className="preparation">
      <div className="project-preview"><span className="preview-kicker">SUA PRÓXIMA CRIAÇÃO</span><SwordView sword={preview} /><div className="preview-caption"><h2>{design.name}</h2><p>{STEELS[design.steel].name} · {PROFILES[design.profile].name}</p></div></div>
      <div className="steps" role="tablist" aria-label="Etapas da preparação">{["Projeto", "Material", "Montagem"].map((label, i) => <button role="tab" aria-selected={step === i} key={label} onClick={() => setStep(i)}><span>{i < step ? <Check size={12} /> : i + 1}</span>{label}</button>)}</div>
      <div className="preparation-options">
        {step === 0 && <><div className="option-heading"><h3>Escolha o projeto</h3><small>Catálogo demonstrativo</small></div><div className="project-choices">{CANONICAL_PRESETS.slice(0, 2).map(preset => <button className="choice project-choice" aria-pressed={design.name === preset.design.name} key={preset.id} onClick={() => setDesign({ ...preset.design })}><SwordView sword={{ design: preset.design, quality: 92 }} /><strong>{preset.design.name}</strong><small>{PROFILES[preset.design.profile].name}</small></button>)}</div></>}
        {step === 1 && <><div className="option-heading"><h3>O metal da sua lâmina</h3><small>Sem consumo nesta prévia</small></div><div className="material-choices">{(["iron", "steel", "damascus"] as const).map(steel => <button className="choice material-choice" key={steel} aria-pressed={design.steel === steel} onClick={() => setDesign({ ...design, steel })}><Anvil size={22} /><span><strong>{STEELS[steel].name}</strong><small>Faixa de trabalho: {Math.round(STEELS[steel].heatMin * 100)}–{Math.round(STEELS[steel].heatMax * 100)}%</small></span>{design.steel === steel && <Check size={16} />}</button>)}</div></>}
        {step === 2 && <><div className="option-heading"><h3>Os detalhes da sua arma</h3><small>Veja cada escolha na prévia</small></div><div className="mount-options"><label>Perfil<select value={design.profile} onChange={e => setDesign({ ...design, profile: e.target.value as SwordDesign["profile"] })}>{Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label><label>Guarda<select value={design.guard} onChange={e => setDesign({ ...design, guard: e.target.value as SwordDesign["guard"] })}>{Object.entries(GUARDS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label><label>Empunhadura<select value={design.wrap} onChange={e => setDesign({ ...design, wrap: e.target.value as SwordDesign["wrap"] })}>{Object.entries(WRAPS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label></div></>}
      </div>
      <div className="preparation-action"><p className="hint">{step === 2 ? "O resultado final depende da sua execução na bigorna." : "A prévia permanece visível enquanto você prepara."}</p><button className="primary" onClick={() => step < 2 ? setStep(step + 1) : setActive(true)}>{step < 2 ? "Continuar" : "Começar fabricação de demonstração"}{step < 2 ? <ArrowRight size={18} /> : <Hammer size={18} />}</button></div>
    </main> : section === "Coleção" ? <Collection /> : <main className="navigation-demo"><div className="section-heading"><p className="eyebrow">{section === "Início" ? "BEM-VINDO À OFICINA" : "ÁREA PREVISTA NA NAVEGAÇÃO"}</p><h2>{section === "Início" ? "Cada lâmina conta uma história." : section}</h2></div><div className="featured-sword"><SwordView sword={specimens[0]} /></div><h3>{section === "Início" ? "Sua próxima criação começa aqui." : section === "Loja" ? "Materiais · Ferramentas · Componentes" : "Carreira · Equipamentos · Encomendas"}</h3><p className="hint">{section === "Início" ? "Explore as três experiências deste protótipo." : "Este acesso demonstra a organização. O conteúdo desta área será tratado após a validação das três telas."}</p><button className="primary" onClick={() => setSection("Forja")}>Preparar uma espada <ArrowRight size={17} /></button><button className="secondary" onClick={() => setSection("Coleção")}>Visitar coleção</button></main>}
    {!active && <nav className="bottom-nav" aria-label="Seções principais">{names.map((name, i) => { const Icon = sections[i]; return <button key={name} aria-current={section === name ? "page" : undefined} onClick={() => { setSection(name); setResult(null); }}><Icon size={21} strokeWidth={1.6} /><span>{name}</span></button>; })}</nav>}
  </div>;
}

function Collection() {
  const [tab, setTab] = useState("Arsenal");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("Todas");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<FinishedSword | null>(null);
  const [compare, setCompare] = useState(false);
  const [pair, setPair] = useState<FinishedSword[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const items = specimens.filter(s => filter === "Todas" || s.rarity === filter);
  const pages = Math.max(1, Math.ceil(items.length / 2));
  const shown = items.slice(Math.min(page, pages - 1) * 2, Math.min(page, pages - 1) * 2 + 2);
  return <main className="collection"><div className="section-heading"><div><p className="eyebrow">SUAS OBRAS, SUA HISTÓRIA</p><h2>Coleção</h2></div><BookOpen className="muted" size={22} /></div>
    <div className="collection-tabs" role="tablist" aria-label="Áreas da coleção">{["Arsenal", "Compêndio", "Peças", "Runas"].map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setPage(0); }}>{t}</button>)}</div>
    {tab === "Arsenal" ? <><div className="collection-tools"><span>{items.length} armas de exemplo</span><button className="text-button" onClick={() => { setCompare(!compare); setPair([]); }}>{compare ? "Cancelar comparação" : "Comparar"}</button><button className="icon-button" aria-label="Filtrar raridade" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /></button></div>
      {filtersOpen && <label className="rarity-filter">Raridade<select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>{["Todas", ...new Set(specimens.map(s => s.rarity)), "Lendária"].filter((x, i, a) => a.indexOf(x) === i).map(r => <option key={r}>{r}</option>)}</select></label>}
      <div className="weapon-grid">{shown.map(sword => <button className="weapon-card" key={sword.id} aria-pressed={compare ? pair.some(p => p.id === sword.id) : undefined} onClick={() => compare ? setPair(pair.some(p => p.id === sword.id) ? pair.filter(p => p.id !== sword.id) : [...pair.slice(-1), sword]) : setSelected(sword)}><div className="card-art"><SwordView sword={sword} /><span className="rarity" data-rarity={sword.rarity}>{sword.rarity}</span>{compare && <span className="compare-check">{pair.some(p => p.id === sword.id) ? <Check size={15} /> : "+"}</span>}</div><div className="card-caption"><h3>{sword.design.name}</h3><p>Qualidade {sword.quality} · {sword.grade}</p><Attributes sword={sword} /></div></button>)}{!shown.length && <div className="empty-state">Nenhuma arma de exemplo nesta raridade.<button className="text-button" onClick={() => setFilter("Todas")}>Mostrar todas</button></div>}</div>
      <div className="collection-bottom">{compare && <button className="primary" disabled={pair.length !== 2} onClick={() => setComparisonOpen(true)}>Comparar {pair.length}/2 armas</button>}<div className="pagination"><button className="icon-button" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></button><span>{Math.min(page, pages - 1) + 1} / {pages}</span><button className="icon-button" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight /></button></div><p className="hint">Armas reais da prova do emulador. Não é seu inventário.</p></div></> : <div className="collection-catalog"><BookOpen size={32} /><h3>{tab === "Peças" ? "Componentes da coleção" : tab}</h3><p>Categoria prevista. Este recorte valida o Arsenal, a inspeção e a comparação.</p><button className="secondary" onClick={() => setTab("Arsenal")}>Voltar ao Arsenal</button></div>}
    {(selected || comparisonOpen) && <div className="inspection" role="dialog" aria-modal="true" aria-label={comparisonOpen ? "Comparação de espadas" : "Inspeção da espada"}><header><span className="eyebrow">{comparisonOpen ? "COMPARAÇÃO" : "INSPEÇÃO DA ESPADA"}</span><button autoFocus className="icon-button" aria-label="Fechar inspeção" onClick={() => { setSelected(null); setComparisonOpen(false); }}><X /></button></header><div className={`inspection-items ${comparisonOpen ? "two" : ""}`}>{(comparisonOpen ? pair : [selected!]).map(sword => <div className="inspection-item" key={sword.id}><SwordView sword={sword} /><div className="weapon-summary"><span className="rarity" data-rarity={sword.rarity}>{sword.rarity}</span><h2>{sword.design.name}</h2><p>Qualidade {sword.quality} · {sword.grade}</p><Attributes sword={sword} /></div></div>)}</div><p className="hint">A forma e os atributos vêm da mesma arma de exemplo.</p></div>}
  </main>;
}
