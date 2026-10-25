import { useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Flame, Gem, LockKeyhole, Plus, ShieldCheck, X } from "lucide-react";
import { fuseSwords, getFusionOdds, RANK_VALUE_TO_RARITY, RARITY_RANK_VALUES, type SwordFusionOutcome } from "../../src/game/fusion";
import type { FusionCore } from "../../src/game/types";
import { SwordView } from "./SwordView";
import { craftDonors, donorBlockReason, selectionIssue, type CraftDonor } from "./craft";

function CraftDialog({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="craft-backdrop" />
    <Dialog.Content className="craft-dialog">
      <header><div><p className="eyebrow">O CRISOL · DEMONSTRAÇÃO</p><Dialog.Title>{title}</Dialog.Title></div><Dialog.Close className="icon-button" aria-label="Fechar"><X /></Dialog.Close></header>
      <Dialog.Description className="craft-description">{description}</Dialog.Description>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function DonorDetails({ donor }: { donor: CraftDonor }) {
  const s = donor.sword;
  return <><span className="rarity" data-rarity={s.rarity}>{s.rarity}</span><h3>{s.design.name}</h3><p>Qualidade {s.quality} · {s.grade}</p><dl className="attributes">{[["ATK", s.damage], ["DEF", s.defense], ["AGI", s.agility], ["DUR", s.durability]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="donor-traits">{s.perks?.slice(0, 2).join(" · ") || "Sem traços especiais registrados."}</p>{donor.synthetic && <small>Exemplo sintético para esta demonstração.</small>}</>;
}

function CoreArt({ core }: { core: FusionCore }) {
  return <div className="core-art" data-rarity={core.rarity} role="img" aria-label={`Pré-forma de fusão ${core.rarity}`}><div className="core-halo" /><div className="core-ingot"><Flame size={32} strokeWidth={1.25} /></div><span>NÚCLEO DE FUSÃO</span></div>;
}

export function CraftView({ hidden, onPreviewCore }: { hidden: boolean; onPreviewCore: (core: FusionCore) => void }) {
  const [tab, setTab] = useState<"Espadas" | "Componentes">("Espadas");
  const [session, setSession] = useState({ available: craftDonors, cores: [] as FusionCore[] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [page, setPage] = useState(0);
  const [inspected, setInspected] = useState<CraftDonor | null>(null);
  const [useCatalyst, setUseCatalyst] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [outcome, setOutcome] = useState<SwordFusionOutcome | null>(null);
  const [revealedDonors, setRevealedDonors] = useState<CraftDonor[]>([]);
  const lock = useRef(false);
  const selected = selectedIds.flatMap(id => session.available.filter(d => d.sword.id === id));
  const issue = selectionIssue(session.available, selectedIds);
  const rarity = selected[0]?.sword.rarity || "Rara";
  const rank = RARITY_RANK_VALUES[rarity];
  const odds = getFusionOdds(rarity, "swords", useCatalyst);
  // Pure engine quote: expose only the current costs, never the preview roll.
  const quote = useMemo(() => {
    if (selectionIssue(session.available, selectedIds)) return null;
    return fuseSwords(selectedIds.map(id => session.available.find(d => d.sword.id === id)!.sword), { seed: 24, useCatalyst });
  }, [session.available, selectedIds, useCatalyst]);
  const reset = () => { setSession({ available: craftDonors, cores: [] }); setSelectedIds([]); setOutcome(null); setUseCatalyst(false); lock.current = false; };
  const dismissResult = () => { setOutcome(null); lock.current = false; };
  const confirm = () => {
    if (lock.current || selectionIssue(session.available, selectedIds)) return;
    lock.current = true;
    const result = fuseSwords(selected.map(d => d.sword), { useCatalyst });
    setSession({ available: session.available.filter(d => !selectedIds.includes(d.sword.id)), cores: [...session.cores, result.resultCore] });
    setRevealedDonors(selected); setSelectedIds([]); setReviewing(false); setOutcome(result);
  };
  const probabilityCards = <div className="craft-odds" aria-label="Probabilidades da fusão">{[
    [odds.refined, rarity, "Refinado"],
    [odds.superior, RANK_VALUE_TO_RARITY[Math.min(6, rank + 1)], "Superior"],
    [odds.exceptional, RANK_VALUE_TO_RARITY[Math.min(6, rank + 2)], "Excepcional"],
  ].map(([chance, grade, label]) => <div key={label} data-rarity={grade}><strong>{Math.round(Number(chance) * 100)}<small>%</small></strong><span>{grade}</span><small>{label}</small></div>)}</div>;

  return <main className="craft-page" hidden={hidden}>
    <div className="section-heading"><div><p className="eyebrow">CRAFT</p><h2>O Crisol</h2></div><Flame className="craft-flame" size={32} strokeWidth={1.3} /></div>
    <p className="craft-subtitle">Quatro armas. Uma nova oportunidade.</p>
    <div className="craft-tabs" role="tablist" aria-label="Áreas do Craft">{(["Espadas", "Componentes"] as const).map(t => <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === "Componentes" ? <div className="craft-components"><Gem size={35} /><h3>Refinar seus componentes</h3><p>Quatro itens compatíveis geram um componente pronto para uso.</p><div>{["Runas", "Cabos", "Guardas", "Pomos"].map(c => <span key={c}>{c}</span>)}</div><p className="hint">Categorias previstas. A fusão de componentes não está conectada neste protótipo.</p><button className="secondary" onClick={() => setTab("Espadas")}>Explorar fusão de espadas</button></div> : outcome ? <div className="craft-result" aria-live="polite">
      <CoreArt core={outcome.resultCore} /><div className="core-summary"><span className="rarity" data-rarity={outcome.resultCore.rarity}>{outcome.resultCore.rarity}</span><h3>{outcome.resultCore.name.split("—")[0].trim()}</h3><p>O potencial está no metal. A espada nasce na bigorna.</p></div>
      <div className="core-heritage"><span className="eyebrow">MEMÓRIA DAS QUATRO DOADORAS</span><p>Potencial ATK {signed(outcome.resultCore.heritage?.attackBias)} · DEF {signed(outcome.resultCore.heritage?.defenseBias)} · AGI {signed(outcome.resultCore.heritage?.agilityBias)}</p><small>Tendências do motor atual; não são os atributos finais da espada.</small><p className="heritage-trait">{outcome.resultCore.inheritedPerks?.[0] || "Sem traço especial herdado."}</p><span className="donor-names">{revealedDonors.map((d, i) => `${i + 1}. ${d.sword.design.name} (Q${d.sword.quality})`).join(" · ")}</span></div>
      <div className="craft-result-actions"><button className="primary" onClick={() => { dismissResult(); onPreviewCore(outcome.resultCore); }}>Forjar agora <ArrowRight size={17} /></button><button className="secondary" onClick={dismissResult}>Guardar núcleo</button><p className="hint">Núcleo de demonstração · guardado somente nesta sessão.</p></div>
    </div> : <>
      <div className="craft-slot-heading"><span>DOADORAS · {selected.length}/4</span><small>Mesma raridade, qualidades livres</small></div>
      <div className="craft-slots">{Array.from({ length: 4 }, (_, i) => { const donor = selected[i]; return <button className="craft-slot" key={i} aria-label={donor ? `Inspecionar doadora ${i + 1}, qualidade ${donor.sword.quality}` : `Selecionar espada ${i + 1}`} onClick={() => donor ? setInspected(donor) : (setPage(0), setPicker(true))}>{donor ? <><SwordView sword={donor.sword} /><span className="craft-slot-caption"><span className="rarity" data-rarity={donor.sword.rarity}>{donor.sword.rarity}</span><strong>{donor.sword.design.name}</strong><small>Qualidade {donor.sword.quality} · tocar para inspecionar</small></span></> : <><span className="slot-number">0{i + 1}</span><Plus size={25} /><span>Selecionar espada</span></>}</button>; })}</div>
      <div className="craft-chances"><div className="craft-slot-heading"><span>POSSÍVEIS NÚCLEOS</span><label className="catalyst-toggle"><input type="checkbox" checked={useCatalyst} onChange={e => setUseCatalyst(e.target.checked)} />Catalisador</label></div>{probabilityCards}<small className="odds-caption">{selected.length ? `Para doadoras ${rarity}` : "Exemplo: quatro Raras"} · {useCatalyst ? "com" : "sem"} catalisador · chances provisórias</small></div>
      <div className="craft-action"><p className="craft-cost">{quote ? <>{quote.goldCost} ouro · {quote.rubiesCost} rubis{useCatalyst && " · 1 catalisador"}</> : "Selecione quatro espadas para conferir o custo."}</p><button className="primary" disabled={!!issue} onClick={() => setReviewing(true)}>Revisar fusão {selected.length}/4 <ArrowRight size={17} /></button><p className="hint">Arsenal de demonstração. Nenhum item ou moeda real é consumido.</p></div>
      {session.cores.length > 0 && <div className="stored-cores"><strong><Gem size={16} />Núcleo guardado nesta sessão</strong>{session.cores.map(core => <button className="text-button" key={core.id} onClick={() => onPreviewCore(core)}>{core.rarity} · ver preparação <ArrowRight size={14} /></button>)}<button className="secondary" onClick={reset}>Recomeçar demonstração</button></div>}
    </>}

    {picker && !hidden && <CraftDialog title="Escolha as doadoras" description="Selecione quatro espadas da mesma raridade. Toque em Inspecionar para conferir a arma inteira e suas propriedades." onClose={() => setPicker(false)}>
      <div className="picker-heading"><span>{selected.length}/4 selecionadas</span><button className="text-button" disabled={!selected.length} onClick={() => setSelectedIds([])}>Limpar seleção</button></div>
      <div className="craft-picker-grid">{session.available.slice(page * 2, page * 2 + 2).map(donor => { const picked = selectedIds.includes(donor.sword.id); const reason = donorBlockReason(donor, selected); return <article className="craft-candidate" data-selected={picked} key={donor.sword.id}><button className="candidate-inspect" aria-label={`Inspecionar ${donor.sword.design.name}, qualidade ${donor.sword.quality}`} onClick={() => { setPicker(false); setInspected(donor); }}><SwordView sword={donor.sword} /><span>Inspecionar</span></button><div className="candidate-caption"><span className="rarity" data-rarity={donor.sword.rarity}>{donor.sword.rarity}</span><h3>{donor.sword.design.name}</h3><p>Qualidade {donor.sword.quality} · {donor.sword.grade}</p>{donor.synthetic && <small>Exemplo sintético</small>}<button className="secondary" aria-pressed={picked} aria-label={`${picked ? "Remover" : "Selecionar"} doadora, qualidade ${donor.sword.quality}, ${donor.sword.id}`} disabled={!picked && (!!reason || selected.length >= 4)} onClick={() => setSelectedIds(picked ? selectedIds.filter(id => id !== donor.sword.id) : [...selectedIds, donor.sword.id])}>{picked ? <><Check size={14} />Selecionada</> : reason ? <><LockKeyhole size={13} />{reason}</> : <><Plus size={14} />Selecionar</>}</button></div></article>; })}</div>
      <div className="pagination"><button className="icon-button" aria-label="Doadoras anteriores" disabled={!page} onClick={() => setPage(page - 1)}><ChevronLeft /></button><span>{page + 1} / {Math.max(1, Math.ceil(session.available.length / 2))}</span><button className="icon-button" aria-label="Próximas doadoras" disabled={(page + 1) * 2 >= session.available.length} onClick={() => setPage(page + 1)}><ChevronRight /></button></div><button className="primary" onClick={() => setPicker(false)}>Usar seleção · {selected.length}/4 <Check size={17} /></button>
    </CraftDialog>}

    {inspected && !hidden && <CraftDialog title="Inspecionar doadora" description="Confira a espada inteira, sua qualidade e suas propriedades antes de sacrificá-la." onClose={() => setInspected(null)}><div className="craft-inspected-art"><SwordView sword={inspected.sword} /></div><div className="craft-inspected-details"><DonorDetails donor={inspected} /></div><div className="craft-inspect-actions">{selectedIds.includes(inspected.sword.id) ? <button className="secondary" onClick={() => { setSelectedIds(selectedIds.filter(id => id !== inspected.sword.id)); setInspected(null); }}>Remover da fusão</button> : <button className="primary" disabled={!!donorBlockReason(inspected, selected) || selected.length >= 4} onClick={() => { setSelectedIds([...selectedIds, inspected.sword.id]); setInspected(null); }}>Adicionar à fusão</button>}<button className="text-button" onClick={() => { setInspected(null); setPicker(true); }}>Voltar ao Arsenal</button></div></CraftDialog>}

    {reviewing && quote && !hidden && <CraftDialog title="Confirmar as quatro doadoras" description="No jogo, estas quatro espadas serão consumidas para criar um núcleo. Nesta demonstração, tudo acontece apenas em memória." onClose={() => setReviewing(false)}><div className="craft-review-list">{selected.map((donor, i) => <details key={donor.sword.id}><summary><span className="review-donor-art"><SwordView sword={donor.sword} /></span><span><strong>{i + 1}. {donor.sword.design.name}</strong><small>{donor.sword.rarity} · qualidade {donor.sword.quality}</small><small>ATK {donor.sword.damage} · DEF {donor.sword.defense} · AGI {donor.sword.agility} · DUR {donor.sword.durability}</small></span><span className="review-expand">+</span></summary><p>{donor.sword.perks?.join(" · ") || "Sem traços especiais."}</p></details>)}</div>{probabilityCards}<div className="craft-review-cost"><ShieldCheck size={19} /><p>Custo previsto: <strong>{quote.goldCost} ouro · {quote.rubiesCost} rubis{useCatalyst && " · 1 catalisador"}</strong><small>Nenhuma cobrança neste protótipo.</small></p></div><button className="primary" onClick={confirm}>Confirmar fusão de demonstração <Flame size={18} /></button><button className="text-button" onClick={() => setReviewing(false)}><ArrowLeft size={14} />Voltar à seleção</button></CraftDialog>}
  </main>;
}

function signed(value = 0) { return value >= 0 ? `+${value}` : String(value); }
