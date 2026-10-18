import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CANONICAL_PRESETS,
  FAMILIES,
  GUARDS,
  POMMELS,
  RUNES_COMPENDIUM,
  STEELS,
  WORKSHOP_EQUIPMENT,
  WRAPS,
  recalculateSwordStats,
} from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import type { BlacksmithCommission, CareerStats, CombatRole, FinishedSword, PlayerInventory, PlayerWallet, RarityGrade, SwordDesign } from "../types";
import { RevealScreen } from "./RevealScreen";
import { RewardsScreen } from "./RewardsScreen";
import { generateForgeRewards } from "../sim";
import { defaultInventory, defaultWallet } from "../save";
import { FusionStationScreen } from "./FusionStationScreen";
import type { ComponentFusionOutcome, SwordFusionOutcome } from "../fusion";
import type { FusionCore } from "../types";
import type { ShopPurchaseItem } from "../transactions";
import { isSwordEligibleForCommission, DEFAULT_COMMISSIONS } from "../commissions";

export interface ShopArticle {
  id: string;
  name: string;
  category: "materials" | "components" | "runes" | "catalysts";
  type: "material" | "component" | "rune" | "catalyst";
  costGold: number;
  costRubies?: number;
  icon: string;
  desc: string;
  stats?: string;
  rarity: RarityGrade;
  componentData?: {
    category: "guard" | "pommel" | "wrap" | "rune";
    componentKey: string;
    rarity: RarityGrade;
    icon: string;
    description: string;
    statModifier?: { damageBonus?: number; defenseBonus?: number; agilityBonus?: number; durabilityBonus?: number };
  };
}

export const BAZAAR_ARTICLES: ShopArticle[] = [
  // MATERIAIS & LINGOTES
  {
    id: "iron",
    name: "Lingote de Ferro Forjado",
    category: "materials",
    type: "material",
    costGold: 50,
    icon: "🧱",
    rarity: "Comum",
    desc: "Massa sólida de ferro maleável tradicional para forjamento básico.",
    stats: "Dureza: 75% · Faixa Térmica: 48-68%",
  },
  {
    id: "steel",
    name: "Barra de Aço Nobre do Reino",
    category: "materials",
    type: "material",
    costGold: 140,
    icon: "🪙",
    rarity: "Incomum",
    desc: "Liga de carbono balanceada para corte fino e lâminas cavalheirescas.",
    stats: "Dureza: 88% · Faixa Térmica: 55-72%",
  },
  {
    id: "damascus",
    name: "Tarugo Dobrado de Damasco",
    category: "materials",
    type: "material",
    costGold: 350,
    costRubies: 1,
    icon: "🌊",
    rarity: "Rara",
    desc: "Múltiplas dobras de aços nobres que produzem padrões ondulados e retenção elástica.",
    stats: "Dureza: 94% · Padrão Moiré Natural",
  },
  {
    id: "blacksteel",
    name: "Bloco de Aço Negro Forjado",
    category: "materials",
    type: "material",
    costGold: 450,
    costRubies: 1,
    icon: "⬛",
    rarity: "Épica",
    desc: "Aço de dureza extrema temperado em cinzas vulcânicas para retenção navalha.",
    stats: "Dureza: 98% · Retenção Extrema de Fio",
  },
  {
    id: "elven_silver",
    name: "Lingote de Prata Élfica Sagrada",
    category: "materials",
    type: "material",
    costGold: 850,
    costRubies: 3,
    icon: "✨",
    rarity: "Lendária",
    desc: "Liga ancestral luminosa forjada com harmonia natural e massa ultraleve.",
    stats: "Dureza: 92% · Leveza Mítica e Equilíbrio",
  },
  {
    id: "meteor",
    name: "Fragmento de Meteorito Celestial",
    category: "materials",
    type: "material",
    costGold: 1400,
    costRubies: 5,
    icon: "☄️",
    rarity: "Relíquia",
    desc: "Núcleo de bólido estelar colhido nas cordilheiras do norte cintilando com partículas astrais.",
    stats: "Dureza: 105% · Estrutura Estelar Inquebrável",
  },

  // GUARNIÇÕES & CABOS
  {
    id: "guard_cross_iron",
    name: "Guarda em Cruz Clássica",
    category: "components",
    type: "component",
    costGold: 120,
    icon: "🛡️",
    rarity: "Comum",
    desc: "Quilhões retos tradicionais de ferro maciço para proteção lateral confiável.",
    stats: "+10 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_cross",
      rarity: "Comum",
      icon: "🛡️",
      description: "Quilhões retos tradicionais de ferro maciço.",
      statModifier: { defenseBonus: 10 },
    },
  },
  {
    id: "guard_curved_falchion",
    name: "Guarda Curva de Falchion",
    category: "components",
    type: "component",
    costGold: 220,
    icon: "🌙",
    rarity: "Incomum",
    desc: "Quilhões sinuosos que protegem os nós dos dedos e facilitam deflexões de corte.",
    stats: "+6 ATK · +8 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_curved",
      rarity: "Incomum",
      icon: "🌙",
      description: "Quilhões sinuosos com deflexão de corte.",
      statModifier: { damageBonus: 6, defenseBonus: 8 },
    },
  },
  {
    id: "guard_tsuba_forged",
    name: "Tsuba Oriental Cinzelada",
    category: "components",
    type: "component",
    costGold: 400,
    costRubies: 1,
    icon: "🔘",
    rarity: "Rara",
    desc: "Disco octogonal cinzelado em ferro escurecido com abertura de corte.",
    stats: "+14 AGI · +8 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_tsuba",
      rarity: "Rara",
      icon: "🔘",
      description: "Disco tradicional de balanceamento para golpes rápidos.",
      statModifier: { agilityBonus: 14, defenseBonus: 8 },
    },
  },
  {
    id: "guard_leaf_elven",
    name: "Guarda em Gavinha Élfica",
    category: "components",
    type: "component",
    costGold: 700,
    costRubies: 2,
    icon: "🌿",
    rarity: "Lendária",
    desc: "Quilhões moldados como folhas entrelaçadas que absorvem vibrações de impacto.",
    stats: "+12 ATK · +12 AGI · +12 DEF",
    componentData: {
      category: "guard",
      componentKey: "guard_leaf",
      rarity: "Lendária",
      icon: "🌿",
      description: "Gavinhas florais de prata viva com absorção cinética.",
      statModifier: { damageBonus: 12, agilityBonus: 12, defenseBonus: 12 },
    },
  },
  {
    id: "guard_wings_celestial",
    name: "Guarda de Asas Celestes",
    category: "components",
    type: "component",
    costGold: 1100,
    costRubies: 4,
    icon: "🪽",
    rarity: "Relíquia",
    desc: "Asas abertas esculpidas em bronze celestial que distribuem o peso da lâmina com perfeição.",
    stats: "+18 ATK · +15 DEF · +10 DUR",
    componentData: {
      category: "guard",
      componentKey: "guard_wings",
      rarity: "Relíquia",
      icon: "🪽",
      description: "Asas heráldicas de proteção absoluta.",
      statModifier: { damageBonus: 18, defenseBonus: 15, durabilityBonus: 10 },
    },
  },

  // POMOS
  {
    id: "pommel_disc_balance",
    name: "Pomo de Disco Balanceado",
    category: "components",
    type: "component",
    costGold: 90,
    icon: "💿",
    rarity: "Comum",
    desc: "Contrapeso clássico circular chanfrado que equilibra o centro de massa.",
    stats: "+8 AGI",
    componentData: {
      category: "pommel",
      componentKey: "pommel_disc",
      rarity: "Comum",
      icon: "💿",
      description: "Disco clássico torneado de contrapeso.",
      statModifier: { agilityBonus: 8 },
    },
  },
  {
    id: "pommel_crescent_kashira",
    name: "Pomo Crescente Oriental (Kashira)",
    category: "components",
    type: "component",
    costGold: 240,
    icon: "🌘",
    rarity: "Incomum",
    desc: "Kashira metálico sóbrio que firma o aperto na base da empunhadura.",
    stats: "+10 AGI · +5 ATK",
    componentData: {
      category: "pommel",
      componentKey: "pommel_crescent",
      rarity: "Incomum",
      icon: "🌘",
      description: "Kashira curvado de ferro temperado.",
      statModifier: { agilityBonus: 10, damageBonus: 5 },
    },
  },
  {
    id: "pommel_elven_crystal",
    name: "Pomo em Gema Élfica Lapidada",
    category: "components",
    type: "component",
    costGold: 600,
    costRubies: 2,
    icon: "💎",
    rarity: "Lendária",
    desc: "Cristal gota lapidado em engaste floral que canaliza o fluxo de energia da espada.",
    stats: "+15 AGI · +10 ATK · +8 DEF",
    componentData: {
      category: "pommel",
      componentKey: "pommel_elven",
      rarity: "Lendária",
      icon: "💎",
      description: "Cristal gota lapidado em engaste de prata sagrada.",
      statModifier: { agilityBonus: 15, damageBonus: 10, defenseBonus: 8 },
    },
  },

  // EMPUNHADURAS
  {
    id: "wrap_braided_leather",
    name: "Empunhadura em Couro Trançado",
    category: "components",
    type: "component",
    costGold: 110,
    icon: "🧶",
    rarity: "Comum",
    desc: "Tiras de couro curtido trançadas com firmeza que não escorregam com suor.",
    stats: "+6 DUR · +6 AGI",
    componentData: {
      category: "wrap",
      componentKey: "wrap_braided",
      rarity: "Comum",
      icon: "🧶",
      description: "Trançado de alta aderência para combate prolongado.",
      statModifier: { durabilityBonus: 6, agilityBonus: 6 },
    },
  },
  {
    id: "wrap_tsukamaki_silk",
    name: "Empunhadura Tsukamaki em Seda",
    category: "components",
    type: "component",
    costGold: 340,
    costRubies: 1,
    icon: "🪢",
    rarity: "Rara",
    desc: "Cordão de seda vermelha entrelaçado em diamantes sobre base de arraia.",
    stats: "+16 AGI · +8 ATK",
    componentData: {
      category: "wrap",
      componentKey: "wrap_tsukamaki",
      rarity: "Rara",
      icon: "🪢",
      description: "Trançado geométrico tradicional de seda oriental.",
      statModifier: { agilityBonus: 16, damageBonus: 8 },
    },
  },
  {
    id: "wrap_goldwire_royal",
    name: "Empunhadura em Fio de Ouro",
    category: "components",
    type: "component",
    costGold: 750,
    costRubies: 2,
    icon: "👑",
    rarity: "Lendária",
    desc: "Espiral contínua de fio de ouro maciço sobre madeira nobre de ébano.",
    stats: "+14 ATK · +12 DEF · +10 DUR",
    componentData: {
      category: "wrap",
      componentKey: "wrap_goldwire",
      rarity: "Lendária",
      icon: "👑",
      description: "Fio de ouro nobre enrolado com acabamento de corte imperial.",
      statModifier: { damageBonus: 14, defenseBonus: 12, durabilityBonus: 10 },
    },
  },

  // RUNAS FUTHARK
  {
    id: "rune_fehu_stone",
    name: "Pedra Rúnica Fehu (Brasa)",
    category: "runes",
    type: "rune",
    costGold: 320,
    costRubies: 1,
    icon: "ᚠ",
    rarity: "Rara",
    desc: "Inscrita com a runa da primeira faísca arrancada do sílex. Aumenta a retenção de calor.",
    stats: "+12 ATK · +8 DUR",
    componentData: {
      category: "rune",
      componentKey: "rune_fehu",
      rarity: "Rara",
      icon: "ᚠ",
      description: "Fehu — O calor da fornalha vibra no gume.",
      statModifier: { damageBonus: 12, durabilityBonus: 8 },
    },
  },
  {
    id: "rune_uruz_stone",
    name: "Pedra Rúnica Uruz (Força Bruta)",
    category: "runes",
    type: "rune",
    costGold: 220,
    icon: "ᚢ",
    rarity: "Incomum",
    desc: "Inscrita com a runa do auroque primitivo. Aumenta o impacto e a massa dos golpes.",
    stats: "+15 ATK",
    componentData: {
      category: "rune",
      componentKey: "rune_uruz",
      rarity: "Incomum",
      icon: "ᚢ",
      description: "Uruz — Poder de impacto primordial.",
      statModifier: { damageBonus: 15 },
    },
  },
  {
    id: "rune_thurisaz_stone",
    name: "Pedra Rúnica Thurisaz (Trovão)",
    category: "runes",
    type: "rune",
    costGold: 520,
    costRubies: 2,
    icon: "ᚦ",
    rarity: "Épica",
    desc: "Inscrita com o martelo que estilhaça pedras. Libera centelhas de precisão extrema.",
    stats: "+22 ATK · +8 AGI",
    componentData: {
      category: "rune",
      componentKey: "rune_thurisaz",
      rarity: "Épica",
      icon: "ᚦ",
      description: "Thurisaz — Centelhas de ressonância no impacto.",
      statModifier: { damageBonus: 22, agilityBonus: 8 },
    },
  },
  {
    id: "rune_sowilo_stone",
    name: "Pedra Rúnica Sowilo (Raio Solar)",
    category: "runes",
    type: "rune",
    costGold: 950,
    costRubies: 3,
    icon: "ᛊ",
    rarity: "Lendária",
    desc: "Inscrita com a luz invencível que corta as trevas. Dá corte ágil sem atrito.",
    stats: "+18 ATK · +24 AGI",
    componentData: {
      category: "rune",
      componentKey: "rune_sowilo",
      rarity: "Lendária",
      icon: "ᛊ",
      description: "Sowilo — Gume de luz solar e velocidade estelar.",
      statModifier: { damageBonus: 18, agilityBonus: 24 },
    },
  },
  {
    id: "rune_tiwaz_stone",
    name: "Pedra Rúnica Tiwaz (Vitória)",
    category: "runes",
    type: "rune",
    costGold: 1600,
    costRubies: 6,
    icon: "ᛏ",
    rarity: "Relíquia",
    desc: "O juramento sagrado dos primeiros ferreiros. Concede integridade inabalável.",
    stats: "+25 ATK · +20 DEF · +15 DUR",
    componentData: {
      category: "rune",
      componentKey: "rune_tiwaz",
      rarity: "Relíquia",
      icon: "ᛏ",
      description: "Tiwaz — A lâmina nunca curva ou recua.",
      statModifier: { damageBonus: 25, defenseBonus: 20, durabilityBonus: 15 },
    },
  },

  // CRISOL & CATALISADORES
  {
    id: "catalyst_astral",
    name: "Catalisador Astral do Crisol",
    category: "catalysts",
    type: "catalyst",
    costGold: 400,
    costRubies: 1,
    icon: "🔮",
    rarity: "Rara",
    desc: "Insumo indispensável para estabilizar a fusão de espadas no crisol e elevar a probabilidade de herança mítica.",
    stats: "+1 Catalisador Astral no Inventário",
  },
];

interface Props {
  swords: FinishedSword[];
  onBack: () => void;
  onForge: () => void;
  wallet?: PlayerWallet;
  inventory?: PlayerInventory;
  career?: CareerStats;
  onBuyTool?: (toolId: string) => boolean;
  onBuyShopItem?: (item: ShopPurchaseItem) => boolean;
  onEquipTool?: (toolId: string) => void;
  onSelectPreset?: (design: SwordDesign) => void;
  onUpgrade?: (sword: FinishedSword) => boolean;
  onApplyComponentFusion?: (outcome: ComponentFusionOutcome) => void;
  onApplySwordFusion?: (outcome: SwordFusionOutcome) => void;
  onForgeCore?: (core: FusionCore) => void;
  onInstallComponent?: (swordId: string, componentId: string) => boolean;
  commissions?: BlacksmithCommission[];
  onDeliverCommission?: (commissionId: string, swordId: string) => boolean;
  onRecycleScrap?: () => boolean;
}

type GalleryTab = "arsenal" | "compendio" | "componentes" | "runas" | "oficina" | "fusao" | "legado" | "encomendas";

export function GalleryScreen({
  swords,
  onBack,
  onForge,
  wallet = defaultWallet,
  inventory = defaultInventory,
  career: _career,
  commissions = DEFAULT_COMMISSIONS,
  onBuyTool,
  onBuyShopItem,
  onEquipTool,
  onSelectPreset,
  onUpgrade,
  onApplyComponentFusion,
  onApplySwordFusion,
  onForgeCore,
  onInstallComponent,
  onDeliverCommission,
  onRecycleScrap,
}: Props) {
  const [currentTab, setCurrentTab] = useState<GalleryTab>("arsenal");
  const [selectedSword, setSelectedSword] = useState<FinishedSword | null>(null);
  const [inspectRewards, setInspectRewards] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("Todas");
  const [filterFamily, setFilterFamily] = useState<string>("Todas");

  // Weapon Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [compareSwordA, setCompareSwordA] = useState<FinishedSword | null>(null);
  const [compareSwordB, setCompareSwordB] = useState<FinishedSword | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Medieval Bazaar Category State
  const [shopCategory, setShopCategory] = useState<"tools" | "materials" | "components" | "runes" | "catalysts">("tools");

  // Keep inspected sword in sync when swords array updates in gallery
  useEffect(() => {
    if (selectedSword) {
      const match = swords.find((s) => s.id === selectedSword.id);
      if (match) setSelectedSword(match);
    }
  }, [swords, selectedSword]);

  if (selectedSword) {
    if (inspectRewards) {
      return (
        <RewardsScreen
          sword={selectedSword}
          rewards={selectedSword.pendingRewards || generateForgeRewards(selectedSword, { forgeRunId: selectedSword.forgeRunId })}
          onClaim={() => setInspectRewards(false)}
          onGallery={() => {
            setInspectRewards(false);
            setSelectedSword(null);
          }}
          onAgain={onForge}
        />
      );
    }
    return (
      <RevealScreen
        sword={selectedSword}
        onClaimRewards={() => setInspectRewards(true)}
        onAgain={onForge}
        onGallery={() => setSelectedSword(null)}
        onTitle={onBack}
        wallet={wallet}
        inventory={inventory}
        onUpgrade={(s) => {
          if (!onUpgrade) return false;
          const ok = onUpgrade(s);
          if (ok) {
            setSelectedSword((prev) => (prev ? recalculateSwordStats({ ...prev, upgradesApplied: (prev.upgradesApplied || 0) + 1 }) : null));
          }
          return ok;
        }}
        onInstallComponent={(swordId, compId) => {
          if (!onInstallComponent) return false;
          const ok = onInstallComponent(swordId, compId);
          if (ok) {
            const updated = swords.find((s) => s.id === swordId);
            if (updated) setSelectedSword({ ...updated });
          }
          return ok;
        }}
      />
    );
  }

  // Filtered Arsenal
  const filteredSwords = swords.filter((s) => {
    const matchRarity = filterRarity === "Todas" || (s.rarity || "Comum") === filterRarity;
    const matchFamily = filterFamily === "Todas" || (s.design.family || "royal") === filterFamily;
    return matchRarity && matchFamily;
  });

  // Calculate career statistics for Legado
  const totalForged = swords.length;
  const masterpieces = swords.filter((s) => s.quality >= 95).length;
  const legendaries = swords.filter((s) => s.rarity === "Lendária" || s.quality >= 95).length;
  const relics = swords.filter((s) => s.rarity === "Relíquia").length;
  const brokenBlades = swords.filter((s) => s.structuralState === "broken" || s.quality <= 15).length;
  const highestQuality = swords.length > 0 ? Math.max(...swords.map((s) => s.quality)) : 0;

  // Material masteries
  const steelCounts: Record<string, number> = {};
  swords.forEach((s) => {
    steelCounts[s.design.steel] = (steelCounts[s.design.steel] || 0) + 1;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[#070a10] px-3 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))] text-fg sm:px-6">
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-[#1e293b] pb-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Menu Principal
        </Button>
        <div className="text-center">
          <h1 className="font-display text-base font-bold uppercase tracking-[0.22em] text-amber-200">
            A Grande Galeria
          </h1>
          <p className="text-[0.7rem] uppercase tracking-wider text-slate-400">
            Arsenal · Compêndio · Coleção · Legado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 rounded-lg border border-amber-900/40 bg-black/50 px-3 py-1 font-display text-xs">
            <span className="text-amber-300 font-bold">🪙 {wallet.gold.toLocaleString()}</span>
            <span className="text-red-400 font-bold">💎 {wallet.rubies}</span>
            <span className="text-cyan-400 font-bold">🔷 {wallet.diamonds}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onForge}>
            + Forjar Nova
          </Button>
        </div>
      </header>

      {/* 8-Pillar Tab Navigation Bar */}
      <nav className="mx-auto mt-4 flex w-full max-w-5xl flex-wrap justify-center gap-1.5 border-b border-[#1b2434] pb-3 sm:justify-start">
        {[
          { id: "arsenal" as const, label: "Arsenal", count: swords.length, icon: "⚔️" },
          { id: "compendio" as const, label: "Compêndio", count: `${CANONICAL_PRESETS.length} Obras`, icon: "📜" },
          { id: "encomendas" as const, label: "Encomendas", count: `${commissions.filter((c) => !c.completed).length} Pedidos`, icon: "📋" },
          { id: "componentes" as const, label: "Componentes", count: "32", icon: "🛡️" },
          { id: "runas" as const, label: "Runas", count: RUNES_COMPENDIUM.length, icon: "ᚠ" },
          { id: "oficina" as const, label: "Oficina", count: WORKSHOP_EQUIPMENT.length, icon: "⚒️" },
          { id: "fusao" as const, label: "Crisol de Fusão", count: `${(inventory.fusionCores || []).length} Núcleos`, icon: "🔥" },
          { id: "legado" as const, label: "Legado", count: `${masterpieces} Obra(s)`, icon: "🏆" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-display tracking-wider transition-all ${
              currentTab === tab.id
                ? "border border-amber-500 bg-amber-500/20 text-amber-200 font-bold shadow-md shadow-amber-950/30"
                : "border border-border/70 bg-[#0d1320] text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="rounded-full bg-black/40 px-1.5 py-0.2 text-[0.62rem] text-slate-400">
              {tab.count}
            </span>
          </button>
        ))}
      </nav>

      {/* PILLAR 1: ARSENAL */}
      {currentTab === "arsenal" && (
        <div className="mx-auto mt-4 w-full max-w-5xl">
          {/* Filters & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1b263b] bg-[#0c121e] p-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-display text-[0.7rem] uppercase tracking-wider text-slate-400 mr-1">Raridade:</span>
              {["Todas", "Relíquia", "Lendária", "Épica", "Rara", "Incomum", "Comum"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRarity(r)}
                  className={`rounded px-2 py-0.5 text-xs font-display transition-colors ${
                    filterRarity === r
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-[#141c2c] text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[0.7rem] uppercase tracking-wider text-slate-400">Família:</span>
                <select
                  value={filterFamily}
                  onChange={(e) => setFilterFamily(e.target.value)}
                  className="rounded border border-border bg-[#141c2c] px-2 py-1 text-xs text-slate-200 focus:outline-hidden"
                >
                  <option value="Todas">Todas as Famílias</option>
                  {Object.entries(FAMILIES).map(([id, fam]) => (
                    <option key={id} value={id}>
                      {fam.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                variant={compareMode ? "danger" : "secondary"}
                onClick={() => {
                  setCompareMode(!compareMode);
                  if (compareMode) {
                    setCompareSwordA(null);
                    setCompareSwordB(null);
                  }
                }}
                className="text-xs font-display font-semibold"
              >
                {compareMode ? "✕ Cancelar Comparação" : "⚖️ Comparar Lâminas"}
              </Button>
            </div>
          </div>

          {/* Swords Grid */}
          {swords.length === 0 ? (
            <div className="mx-auto mt-20 max-w-md text-center text-muted">
              <p className="text-base text-slate-300">Nenhuma lâmina forjada ainda.</p>
              <p className="mt-2 text-xs text-slate-500">
                O fogo da forna e a bigorna esperam pelo seu primeiro projeto de maestria.
              </p>
              <Button className="mt-6" size="lg" onClick={onForge}>
                Iniciar Primeira Forja
              </Button>
            </div>
          ) : filteredSwords.length === 0 ? (
            <div className="mt-16 text-center text-slate-400">
              <p>Nenhuma espada encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredSwords.map((s) => {
                const rarity = s.rarity || "Comum";
                const isBroken = s.structuralState === "broken" || s.quality <= 15;
                const isSelectedA = compareSwordA?.id === s.id;
                const isSelectedB = compareSwordB?.id === s.id;

                const rarityStyles: Record<RarityGrade, string> = {
                  Relíquia: "border-rose-500/70 bg-rose-950/25 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
                  Lendária: "border-amber-500/70 bg-amber-950/25 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
                  Épica: "border-purple-500/70 bg-purple-950/25 text-purple-300",
                  Rara: "border-blue-500/70 bg-blue-950/25 text-blue-300",
                  Incomum: "border-emerald-500/70 bg-emerald-950/25 text-emerald-300",
                  Comum: "border-slate-700 bg-slate-900/40 text-slate-400",
                };

                const cardBorder = isSelectedA
                  ? "border-amber-400 ring-2 ring-amber-400/60 bg-[#162035]"
                  : isSelectedB
                  ? "border-cyan-400 ring-2 ring-cyan-400/60 bg-[#162035]"
                  : "border-[#202c40] bg-[#0b101a]";

                return (
                  <li
                    key={s.id}
                    onClick={() => {
                      if (compareMode) {
                        if (!compareSwordA) {
                          setCompareSwordA(s);
                        } else if (compareSwordA.id === s.id) {
                          setCompareSwordA(null);
                        } else if (!compareSwordB) {
                          setCompareSwordB(s);
                        } else if (compareSwordB.id === s.id) {
                          setCompareSwordB(null);
                        } else {
                          setCompareSwordB(s);
                        }
                      } else {
                        setSelectedSword(s);
                      }
                    }}
                    className={`group cursor-pointer overflow-hidden rounded-xl border shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/80 hover:shadow-[0_10px_35px_rgba(0,0,0,0.85)] ${cardBorder}`}
                  >
                    <Thumb sword={s} />
                    <div className="p-3.5">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-sm border px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${rarityStyles[rarity] || rarityStyles.Comum}`}>
                          {rarity}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {compareMode && (
                            <span className={`rounded px-1.5 py-0.2 text-[0.6rem] font-bold uppercase ${
                              isSelectedA
                                ? "bg-amber-500 text-black"
                                : isSelectedB
                                ? "bg-cyan-500 text-black"
                                : "bg-black/50 text-slate-400 border border-slate-700"
                            }`}>
                              {isSelectedA ? "Slot A" : isSelectedB ? "Slot B" : "+ Comparar"}
                            </span>
                          )}
                          <span className="font-display text-xs text-slate-300 tabular-nums">
                            Q: {s.quality} · {s.grade}
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold text-fg group-hover:text-amber-200">
                        {s.design.name || "Lâmina Sem Nome"}
                      </h3>

                      {/* Metallurgy Attributes Mini-Bar */}
                      <div className="mt-2.5 flex items-center justify-between rounded bg-[#131b2c] px-2 py-1 text-[0.7rem] text-slate-300">
                        <span>ATK: {s.damage ?? "--"}</span>
                        <span>DEF: {s.defense ?? "--"}</span>
                        <span>AGI: {s.agility ?? "--"}</span>
                        <span>DUR: {s.durability ?? "--"}%</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span className="text-[0.68rem] text-slate-400">
                          {isBroken ? "💥 Fratura Estrutural" : FAMILIES[s.design.family || "royal"]?.name || "Aço Nobre"}
                        </span>
                        <span className="text-[0.7rem] font-display text-amber-400/90 group-hover:translate-x-0.5 transition-transform">
                          {compareMode ? "Selecionar ⚖️" : "Mesa de Inspeção →"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Sticky Comparison Bottom Dock */}
          {compareMode && (compareSwordA || compareSwordB) && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl rounded-xl border border-amber-500/50 bg-[#0a0f18]/95 px-4 py-3 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 font-display animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-xs">
                <div className={`px-2.5 py-1 rounded border ${compareSwordA ? "border-amber-400 bg-amber-500/20 text-amber-200 font-bold" : "border-slate-700 bg-black/40 text-slate-500"}`}>
                  {compareSwordA ? `A: ${compareSwordA.design.name}` : "Selecione Lâmina A"}
                </div>
                <span className="text-slate-400 font-bold">vs</span>
                <div className={`px-2.5 py-1 rounded border ${compareSwordB ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold" : "border-slate-700 bg-black/40 text-slate-500"}`}>
                  {compareSwordB ? `B: ${compareSwordB.design.name}` : "Selecione Lâmina B"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={!compareSwordA || !compareSwordB}
                  onClick={() => setShowCompareModal(true)}
                  className="bg-amber-500 text-black font-bold hover:bg-amber-400 text-xs disabled:opacity-40"
                >
                  ⚖️ Comparar Lado a Lado
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCompareSwordA(null);
                    setCompareSwordB(null);
                    setCompareMode(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕ Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PILLAR 2: COMPÊNDIO */}
      {currentTab === "compendio" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Families Overview */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              As 9 Famílias Canônicas do FioForja
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Cada linhagem possui sua própria silhueta, resposta metalúrgica, runas e história de maestria.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {Object.entries(FAMILIES).map(([id, fam]) => {
                const count = swords.filter((s) => (s.design.family || "royal") === id).length;
                return (
                  <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold" style={{ color: fam.badgeColor }}>
                        {fam.name}
                      </span>
                      <span className="text-[0.65rem] text-slate-400">Forjadas: {count}</span>
                    </div>
                    <p className="mt-1 text-[0.72rem] text-slate-300 leading-snug">{fam.fantasy}</p>
                    <p className="mt-1 text-[0.65rem] text-slate-500 italic">{fam.naturalRarity}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canonical Masterpieces (Signed Legendaries & Relics) */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Obras-Primas e Relíquias Assinadas
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Lendárias e Relíquias únicas da mitologia do jogo. Conquiste-as forjando cada projeto com maestria.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {CANONICAL_PRESETS.map((preset) => {
                const matchingSword = swords.find((s) => s.design.name === preset.name);
                const discovered = !!matchingSword;

                return (
                  <div
                    key={preset.id}
                    className={`overflow-hidden rounded-xl border transition-all ${
                      discovered
                        ? "border-amber-500/80 bg-[#0f1524] shadow-md shadow-amber-950/20"
                        : "border-[#1e283b] bg-[#090d16] opacity-85"
                    }`}
                  >
                    <div className="relative">
                      {discovered && matchingSword ? (
                        <Thumb sword={matchingSword} />
                      ) : (
                        <div className="flex h-44 w-full flex-col items-center justify-center bg-[#070b14] text-slate-600">
                          <span className="text-4xl opacity-20">🗡️</span>
                          <span className="mt-2 font-display text-xs uppercase tracking-widest text-slate-500">
                            Silhueta Oculta
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 rounded-sm bg-black/70 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-amber-400">
                        {preset.rarity}
                      </div>
                    </div>

                    <div className="p-3.5">
                      <h3 className="font-display text-base font-bold text-fg">
                        {discovered ? preset.name : "???"}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 italic">
                        "{preset.lore}"
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-[#1a2335] pt-2 text-[0.7rem] text-slate-400">
                        <span>Família: {FAMILIES[preset.family]?.name}</span>
                        {discovered ? (
                          <span className="text-emerald-400 font-semibold">✓ Conquistada</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (onSelectPreset) {
                                onSelectPreset(preset.design);
                              } else {
                                onForge();
                              }
                            }}
                            className="font-display text-amber-400 hover:underline"
                          >
                            Forjar Projeto →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 3: COMPONENTES */}
      {currentTab === "componentes" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Cabos */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Cabos e Empunhaduras Desbloqueados
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(WRAPS).map(([id, w]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded-full border border-black/40" style={{ backgroundColor: w.color }} />
                    <span className="font-display text-xs font-semibold text-fg">{w.name}</span>
                  </div>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guardas */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Guardas e Quilhões
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(GUARDS).map(([id, g]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <span className="font-display text-xs font-semibold text-amber-200">{g.name}</span>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pomos */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Pomos de Contrapeso
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(POMMELS).map(([id, p]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <span className="font-display text-xs font-semibold text-slate-200">{p.name}</span>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metais */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Ligas e Metais Metalúrgicos
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(STEELS).map(([id, s]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-amber-100">{s.name}</span>
                    <span className="text-[0.65rem] text-slate-400">Dureza: {Math.round(s.hardness * 100)}%</span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-slate-300">{s.blurb}</p>
                  <div className="mt-2 text-[0.65rem] text-slate-500">
                    Faixa Térmica: {Math.round(s.heatMin * 100)}% – {Math.round(s.heatMax * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 4: RUNAS */}
      {currentTab === "runas" && (
        <div className="mx-auto mt-4 w-full max-w-5xl">
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-cyan-300">
              Coleção de Runas Primordiais (Elder Futhark)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Inscrições sagradas que vibram quando o ferro atinge ressonância na bigorna e despertam ao término da têmpera.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {RUNES_COMPENDIUM.map((rune) => (
                <div
                  key={rune.symbol}
                  className="rounded-lg border border-[#1c273a] bg-[#0a0f19] p-3.5 transition-all hover:border-cyan-500/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-md bg-cyan-950/40 font-display text-xl text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                        {rune.symbol}
                      </span>
                      <div>
                        <h3 className="font-display text-xs font-bold text-slate-200">{rune.name}</h3>
                        <span className="text-[0.65rem] font-semibold text-cyan-400">Escola: {rune.school}</span>
                      </div>
                    </div>
                    <span className="rounded bg-[#141b2b] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-amber-300">
                      {rune.rarity}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-300 font-medium leading-relaxed">
                    ⚡ {rune.effect}
                  </p>
                  <p className="mt-1.5 text-[0.7rem] text-slate-500 italic">
                    "{rune.lore}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 5: OFICINA & MERCADO MEDIEVAL */}
      {currentTab === "oficina" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-4">
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1b263b] pb-3">
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-300">
                  Mercado & Oficina da Ferraria
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Adquira ferramentas cinéticas, lingotes metalúrgicos nobres, peças de montagem e runas sagradas para seu arsenal.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start rounded border border-amber-500/30 bg-black/60 px-3 py-1 text-xs font-display sm:self-auto">
                <span className="font-bold text-amber-300">🪙 {wallet.gold.toLocaleString()}</span>
                <span className="font-bold text-red-400">💎 {wallet.rubies}</span>
                <span className="font-bold text-cyan-400">🔷 {wallet.diamonds}</span>
              </div>
            </div>

            {/* Sub-category selector */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {[
                { id: "tools" as const, label: "Ferramentas da Forja", icon: "⚒️" },
                { id: "materials" as const, label: "Lingotes & Metais", icon: "🧱" },
                { id: "components" as const, label: "Guarnições & Peças", icon: "🛡️" },
                { id: "runes" as const, label: "Runas Futhark", icon: "ᚠ" },
                { id: "catalysts" as const, label: "Crisol & Catalisadores", icon: "🔮" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setShopCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-display tracking-wider transition-all ${
                    shopCategory === cat.id
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500 font-bold shadow-md shadow-amber-950/30"
                      : "bg-[#0b101a] text-slate-400 border border-[#1b263b] hover:text-slate-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {shopCategory === "tools" ? (
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                {WORKSHOP_EQUIPMENT.map((tool) => {
                  const isUnlocked = tool.unlockedByDefault || inventory.unlockedTools.includes(tool.id);
                  const canAfford = wallet.gold >= tool.costGold && wallet.rubies >= tool.costRubies;
                  const eq = inventory.equipped;
                  let isEquipped = false;
                  if (tool.id.startsWith("hammer_")) {
                    isEquipped = (eq?.hammer || "standard") === tool.id.replace("hammer_", "");
                  } else if (tool.id.startsWith("anvil_")) {
                    isEquipped = (eq?.anvil || "anvil_cast") === tool.id;
                  } else if (tool.id.startsWith("furnace_")) {
                    isEquipped = (eq?.furnace || "furnace_coal") === tool.id;
                  } else if (tool.id.startsWith("quench_")) {
                    isEquipped = (eq?.quench || "quench_water") === tool.id;
                  }

                  return (
                    <div
                      key={tool.id}
                      className={`flex flex-col justify-between rounded-lg border p-3.5 transition-all ${
                        isEquipped
                          ? "border-amber-500 bg-[#141b2a] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          : "border-[#1b263b] bg-[#0a0f18] hover:border-amber-500/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{tool.icon}</span>
                            <div>
                              <h3 className="font-display text-xs font-bold text-slate-200">{tool.name}</h3>
                              <span className="text-[0.65rem] capitalize text-slate-400">{tool.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isEquipped && (
                              <span className="rounded border border-amber-500/60 bg-amber-500/20 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-amber-300">
                                Equipado
                              </span>
                            )}
                            <span className="rounded bg-[#141b2a] px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300">
                              {tool.rarity}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-amber-200">{tool.stats}</p>
                        <p className="mt-1.5 text-[0.72rem] text-slate-400">{tool.description}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#1b263b] pt-2.5 text-xs">
                        <span className="font-semibold text-amber-300">
                          {tool.costGold === 0 ? "Padrão da Oficina" : `${tool.costGold.toLocaleString()} 🪙 ${tool.costRubies ? `+ ${tool.costRubies} 💎` : ""}`}
                        </span>
                        {isUnlocked ? (
                          isEquipped ? (
                            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                              ✓ Em Uso
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onEquipTool?.(tool.id)}
                              className="border-amber-500/50 bg-[#121a2c] text-xs font-bold text-amber-200 hover:bg-[#1a253e]"
                            >
                              Equipar
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyTool?.(tool.id)}
                            className="bg-amber-600 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                          >
                            Adquirir
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                {BAZAAR_ARTICLES.filter((art) => art.category === shopCategory).map((art) => {
                  const canAfford = wallet.gold >= art.costGold && (!art.costRubies || wallet.rubies >= art.costRubies);
                  let ownedCount = 0;
                  if (art.type === "material") {
                    ownedCount = inventory.materials?.[art.id] || 0;
                  } else if (art.type === "catalyst") {
                    ownedCount = inventory.materials?.catalyst_astral || 0;
                  } else if (art.type === "component" || art.type === "rune") {
                    ownedCount = (inventory.components || []).filter((c) => c.componentKey === art.componentData?.componentKey).length;
                  }

                  return (
                    <div
                      key={art.id}
                      className="flex flex-col justify-between rounded-lg border border-[#1b263b] bg-[#0a0f18] p-3.5 transition-all hover:border-amber-500/50"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{art.icon}</span>
                            <div>
                              <h3 className="font-display text-xs font-bold text-slate-200">{art.name}</h3>
                              <span className="text-[0.65rem] text-slate-400">Possui: {ownedCount}</span>
                            </div>
                          </div>
                          <span className="rounded bg-[#141b2a] px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300">
                            {art.rarity}
                          </span>
                        </div>
                        {art.stats && <p className="mt-2 text-xs font-semibold text-amber-200">{art.stats}</p>}
                        <p className="mt-1.5 text-[0.72rem] text-slate-400">{art.desc}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#1b263b] pt-2.5 text-xs">
                        <span className="font-semibold text-amber-300">
                          {art.costGold.toLocaleString()} 🪙 {art.costRubies ? `+ ${art.costRubies} 💎` : ""}
                        </span>
                        <Button
                          size="sm"
                          disabled={!canAfford}
                          onClick={() => {
                            onBuyShopItem?.({
                              id: art.id,
                              name: art.name,
                              type: art.type,
                              costGold: art.costGold,
                              costRubies: art.costRubies,
                              quantity: 1,
                              componentData: art.componentData
                                ? {
                                    name: art.name,
                                    ...art.componentData,
                                  }
                                : undefined,
                            });
                          }}
                          className="bg-amber-600 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                        >
                          Comprar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PILLAR 6: LEGADO */}
      {currentTab === "legado" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Blacksmith Career Dashboard */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-300">
              Carreira do Mestre Ferreiro
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              O registro histórico de cada golpe, vitória e aprendizado conquistado diante da bigorna.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <StatCard label="Espadas Forjadas" value={totalForged} />
              <StatCard label="Obras-Primas (Q≥95)" value={masterpieces} color="#10b981" />
              <StatCard label="Lendárias" value={legendaries} color="#f59e0b" />
              <StatCard label="Relíquias" value={relics} color="#f43f5e" />
              <StatCard label="Maior Qualidade" value={`${highestQuality}/100`} color="#38bdf8" />
              <StatCard label="Lâminas Quebradas" value={brokenBlades} color="#ef4444" />
            </div>
          </div>

          {/* Material Masteries */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-5">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
              Domínio Metalúrgico por Material
            </h3>
            <div className="mt-3 space-y-3">
              {[
                { id: "iron", name: "Ferro do Ferreiro", goal: 5 },
                { id: "steel", name: "Aço Nobre do Reino", goal: 10 },
                { id: "damascus", name: "Aço de Damasco", goal: 15 },
                { id: "blacksteel", name: "Aço Negro", goal: 15 },
                { id: "elven_silver", name: "Prata Élfica Sagrada", goal: 20 },
                { id: "meteor", name: "Meteorito Celestial", goal: 25 },
                { id: "ancient_alloy", name: "Liga Ancestral das Relíquias", goal: 30 },
              ].map((m) => {
                const count = steelCounts[m.id] || 0;
                const pct = Math.min(100, Math.round((count / m.goal) * 100));
                return (
                  <div key={m.id} className="rounded-lg border border-[#1a2334] bg-[#0a0f19] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-semibold text-slate-200">{m.name}</span>
                      <span className="text-slate-400">
                        {count} / {m.goal} lâminas ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#131b2c]">
                      <div
                        className="h-full bg-linear-to-r from-amber-600 to-amber-400 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 7: CRISOL DE FUSÃO */}
      {currentTab === "fusao" && (
        <FusionStationScreen
          swords={swords}
          inventory={inventory}
          wallet={wallet}
          onApplyComponentFusion={onApplyComponentFusion || (() => {})}
          onApplySwordFusion={onApplySwordFusion || (() => {})}
          onForgeCore={onForgeCore}
        />
      )}

      {/* PILLAR 8: QUADRO ENXUTO DE ENCOMENDAS & RECICLAGEM */}
      {currentTab === "encomendas" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Header & Scrap Recycling Banner */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-300">
                  📜 Quadro de Encomendas da Forja
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Cumpra encomendas de patrulhas, mercenários e nobres entregando armas que atendam aos requisitos. Ganhe ouro, rubis e ligas raras.
                </p>
              </div>

              {/* Scrap Recycling Tool */}
              <div className="rounded-lg border border-amber-900/40 bg-black/40 p-3 min-w-[240px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-display">Sucata de Oficina:</span>
                  <span className="font-bold text-amber-300 font-mono">{inventory.materials?.scrap || 0} unid.</span>
                </div>
                <p className="text-[0.65rem] text-slate-400 mt-1">2 sucatas podem ser refundidas em 1 lingote de ferro.</p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!onRecycleScrap || (inventory.materials?.scrap || 0) < 2}
                  onClick={() => onRecycleScrap && onRecycleScrap()}
                  className="mt-2 w-full text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
                >
                  ♻️ Refundir Sucata em Ferro
                </Button>
              </div>
            </div>
          </div>

          {/* Active & Completed Commissions List */}
          <div className="grid grid-cols-1 gap-4">
            {commissions.map((comm) => {
              const eligibleSwords = swords.filter((s) => isSwordEligibleForCommission(comm, s).eligible);
              const deliveredSword = comm.completed && comm.deliveredSwordId
                ? swords.find((s) => s.id === comm.deliveredSwordId)
                : null;

              return (
                <div
                  key={comm.id}
                  className={cn(
                    "rounded-xl border p-5 transition-all",
                    comm.completed
                      ? "border-emerald-500/30 bg-[#0a141a]/60"
                      : "border-[#1e2a3e] bg-[#0d1320] hover:border-amber-500/40",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <span className="text-3xl p-2 rounded-lg bg-surface/80 border border-border/60">
                        {comm.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-fg">{comm.clientName}</h3>
                          <span className="text-[0.65rem] px-2 py-0.5 rounded bg-[#131b2c] border border-border text-slate-300 uppercase tracking-wider">
                            {comm.clientTitle}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-300 max-w-xl leading-relaxed">
                          {comm.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs uppercase font-display tracking-wider text-slate-400 block">
                        Recompensa
                      </span>
                      <div className="mt-1 flex items-center justify-end gap-2 text-xs font-mono font-bold">
                        <span className="text-amber-300">🪙 +{comm.rewardGold}</span>
                        {comm.rewardRubies ? <span className="text-red-400">💎 +{comm.rewardRubies}</span> : null}
                      </div>
                      {comm.rewardMaterial ? (
                        <span className="mt-0.5 block text-[0.7rem] text-cyan-300 font-mono">
                          +{comm.rewardMaterial.quantity}x {comm.rewardMaterial.name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Requirements Row */}
                  <div className="mt-4 pt-3 border-t border-[#182234] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded bg-black/30 p-2 border border-border/40">
                      <span className="text-[0.65rem] uppercase text-slate-400 block">Qualidade Mínima</span>
                      <span className="font-mono font-bold text-amber-200">≥ {comm.minQuality}%</span>
                    </div>
                    <div className="rounded bg-black/30 p-2 border border-border/40">
                      <span className="text-[0.65rem] uppercase text-slate-400 block">Material / Aço</span>
                      <span className="font-bold text-slate-200">
                        {comm.steel ? (STEELS[comm.steel]?.name || comm.steel) : "Livre"}
                      </span>
                    </div>
                    <div className="rounded bg-black/30 p-2 border border-border/40">
                      <span className="text-[0.65rem] uppercase text-slate-400 block">Especialização</span>
                      <span className="font-bold text-slate-200">{comm.requiredRole || "Qualquer"}</span>
                    </div>
                    <div className="rounded bg-black/30 p-2 border border-border/40">
                      <span className="text-[0.65rem] uppercase text-slate-400 block">Atributo Mínimo</span>
                      <span className="font-bold text-slate-200">
                        {comm.minStat ? `${comm.minStat.stat.toUpperCase()} ≥ ${comm.minStat.minValue}` : "Sem restrição"}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Action / Status */}
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    {comm.completed ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-display font-bold">
                        <span>✅ Encomenda Cumprida e Entregue</span>
                        {deliveredSword ? (
                          <span className="text-slate-400 font-normal">
                            (Arma: {deliveredSword.design.name} · {deliveredSword.quality}%)
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-slate-400">
                          {eligibleSwords.length > 0 ? (
                            <span className="text-emerald-300 font-medium">
                              ⚔️ {eligibleSwords.length} arma(s) no seu Arsenal atendem aos critérios!
                            </span>
                          ) : (
                            <span className="text-amber-400/90">
                              ⏳ Nenhuma arma elegível no Arsenal. Forje uma lâmina compatível.
                            </span>
                          )}
                        </div>

                        {eligibleSwords.length > 0 && onDeliverCommission ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                              id={`select-sword-${comm.id}`}
                              className="h-9 rounded-md border border-border bg-[#0a0f19] px-2 text-xs text-fg font-display"
                              defaultValue={eligibleSwords[0].id}
                            >
                              {eligibleSwords.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.design.name} ({s.quality}% · {s.combatRole || "Equilibrada"})
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-black font-display font-bold text-xs shrink-0"
                              onClick={() => {
                                const sel = document.getElementById(`select-sword-${comm.id}`) as HTMLSelectElement;
                                const sid = sel ? sel.value : eligibleSwords[0].id;
                                onDeliverCommission(comm.id, sid);
                              }}
                            >
                              📦 Entregar Arma
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PILLAR 5: COMPARADOR REAL DE LÂMINAS */}
      {showCompareModal && compareSwordA && compareSwordB && (
        <WeaponComparisonModal
          swordA={compareSwordA}
          swordB={compareSwordB}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-[#1b2536] bg-[#090d16] p-3 text-center">
      <p className="font-display text-[0.62rem] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function Thumb({ sword }: { sword: FinishedSword }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Deep velvet texture gradient for thumbnail
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#131828");
    bg.addColorStop(1, "#090d18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const isBroken = sword.structuralState === "broken" || sword.quality <= 15;
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.58, Math.min(w, h) * 0.92, {
      assembled: !isBroken,
      quality: sword.quality,
      warp: sword.warp,
      cracks: sword.cracks ?? (isBroken ? 2 : 0),
      broken: isBroken,
    });
  }, [sword]);
  return <canvas ref={ref} className="h-44 w-full bg-[#0d1220]" />;
}

function WeaponComparisonModal({
  swordA,
  swordB,
  onClose,
}: {
  swordA: FinishedSword;
  swordB: FinishedSword;
  onClose: () => void;
}) {
  const rarityColors: Record<RarityGrade, string> = {
    Relíquia: "text-rose-400 border-rose-500/50 bg-rose-950/30",
    Lendária: "text-amber-400 border-amber-500/50 bg-amber-950/30",
    Épica: "text-purple-400 border-purple-500/50 bg-purple-950/30",
    Rara: "text-blue-400 border-blue-500/50 bg-blue-950/30",
    Incomum: "text-emerald-400 border-emerald-500/50 bg-emerald-950/30",
    Comum: "text-slate-400 border-slate-700 bg-slate-900/30",
  };

  const roleIcons: Record<CombatRole, string> = {
    Ofensiva: "⚔️",
    Defensiva: "🛡️",
    Ágil: "⚡",
    Equilibrada: "⚖️",
    Excepcional: "👑",
  };

  const roleA: CombatRole = swordA.combatRole || "Equilibrada";
  const roleB: CombatRole = swordB.combatRole || "Equilibrada";

  const atkA = swordA.damage ?? 0;
  const atkB = swordB.damage ?? 0;
  const defA = swordA.defense ?? 0;
  const defB = swordB.defense ?? 0;
  const agiA = swordA.agility ?? 0;
  const agiB = swordB.agility ?? 0;
  const durA = swordA.durability ?? 0;
  const durB = swordB.durability ?? 0;
  const qA = swordA.quality;
  const qB = swordB.quality;

  const renderDelta = (valA: number, valB: number) => {
    const diff = valA - valB;
    if (diff === 0) return <span className="text-slate-500 text-xs font-mono font-semibold">(=)</span>;
    if (diff > 0) return <span className="text-emerald-400 text-xs font-mono font-bold">+{diff} (A)</span>;
    return <span className="text-cyan-400 text-xs font-mono font-bold">+{Math.abs(diff)} (B)</span>;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/50 bg-[#0a0f19] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1f2b40] bg-[#0d1422] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-amber-200">
                Comparador Tático de Lâminas
              </h2>
              <p className="text-xs text-slate-400">
                Análise comparativa de geometria, atributos metalúrgicos, especialização e engastes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Side by side preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slot A */}
            <div className="rounded-xl border border-amber-500/40 bg-[#0d1320] p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500 px-2 py-0.5 text-[0.65rem] font-bold text-black uppercase">
                  Slot A
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[0.65rem] font-bold uppercase ${
                    rarityColors[swordA.rarity || "Comum"]
                  }`}
                >
                  {swordA.rarity || "Comum"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-amber-100">
                {swordA.design.name || "Lâmina A"}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-[#131b2e] px-2 py-0.5 text-xs text-amber-300 font-semibold border border-amber-500/30">
                  {roleIcons[roleA]} Função: {roleA}
                </span>
                <span className="text-xs text-slate-400">
                  {STEELS[swordA.design.steel]?.name || swordA.design.steel}
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#1b263b] bg-[#070b12]">
                <Thumb sword={swordA} />
              </div>
            </div>

            {/* Slot B */}
            <div className="rounded-xl border border-cyan-500/40 bg-[#0d1320] p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="rounded bg-cyan-500 px-2 py-0.5 text-[0.65rem] font-bold text-black uppercase">
                  Slot B
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[0.65rem] font-bold uppercase ${
                    rarityColors[swordB.rarity || "Comum"]
                  }`}
                >
                  {swordB.rarity || "Comum"}
                </span>
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-cyan-100">
                {swordB.design.name || "Lâmina B"}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-[#131b2e] px-2 py-0.5 text-xs text-cyan-300 font-semibold border border-cyan-500/30">
                  {roleIcons[roleB]} Função: {roleB}
                </span>
                <span className="text-xs text-slate-400">
                  {STEELS[swordB.design.steel]?.name || swordB.design.steel}
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#1b263b] bg-[#070b12]">
                <Thumb sword={swordB} />
              </div>
            </div>
          </div>

          {/* Detailed Attributes Comparison Table */}
          <div className="rounded-xl border border-[#1d273a] bg-[#090e18] p-4">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Métricas de Combate & Forja
            </h4>
            <div className="divide-y divide-[#172030] text-xs">
              <div className="grid grid-cols-4 py-2 font-bold text-slate-400 uppercase text-[0.68rem]">
                <span>Atributo</span>
                <span className="text-amber-300">Lâmina A</span>
                <span className="text-center text-slate-400">Vantagem</span>
                <span className="text-right text-cyan-300">Lâmina B</span>
              </div>

              {/* P.ATK */}
              <div className="grid grid-cols-4 py-2.5 items-center">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  ⚔️ Poder de Ataque (P.ATK)
                </span>
                <span className="font-mono font-bold text-amber-200">{atkA}</span>
                <span className="text-center">{renderDelta(atkA, atkB)}</span>
                <span className="text-right font-mono font-bold text-cyan-200">{atkB}</span>
              </div>

              {/* DEF */}
              <div className="grid grid-cols-4 py-2.5 items-center">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  🛡️ Defesa / Bloqueio (DEF)
                </span>
                <span className="font-mono font-bold text-amber-200">{defA}</span>
                <span className="text-center">{renderDelta(defA, defB)}</span>
                <span className="text-right font-mono font-bold text-cyan-200">{defB}</span>
              </div>

              {/* AGI */}
              <div className="grid grid-cols-4 py-2.5 items-center">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  ⚡ Agilidade / Velocidade (AGI)
                </span>
                <span className="font-mono font-bold text-amber-200">{agiA}</span>
                <span className="text-center">{renderDelta(agiA, agiB)}</span>
                <span className="text-right font-mono font-bold text-cyan-200">{agiB}</span>
              </div>

              {/* DUR */}
              <div className="grid grid-cols-4 py-2.5 items-center">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  🔨 Durabilidade Estrutural (DUR)
                </span>
                <span className="font-mono font-bold text-amber-200">{durA}</span>
                <span className="text-center">{renderDelta(durA, durB)}</span>
                <span className="text-right font-mono font-bold text-cyan-200">{durB}</span>
              </div>

              {/* Qualidade */}
              <div className="grid grid-cols-4 py-2.5 items-center">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  ✨ Grau de Maestria (Qualidade)
                </span>
                <span className="font-mono font-bold text-amber-200">{qA}/100 ({swordA.grade})</span>
                <span className="text-center">{renderDelta(qA, qB)}</span>
                <span className="text-right font-mono font-bold text-cyan-200">{qB}/100 ({swordB.grade})</span>
              </div>
            </div>
          </div>

          {/* Component slots & Runes summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1c2638] bg-[#0c121e] p-3.5 text-xs">
              <h5 className="font-display font-bold text-amber-300 uppercase text-[0.7rem] mb-2">
                Peças & Gravuras de A
              </h5>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guarda:</span>
                  <span>{swordA.installedComponents?.guard?.name || "Original da Forja"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pomo:</span>
                  <span>{swordA.installedComponents?.pommel?.name || "Original da Forja"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Empunhadura:</span>
                  <span>{swordA.installedComponents?.wrap?.name || "Couro Cru"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Runa Incrustada:</span>
                  <span className="font-bold text-amber-200">{swordA.installedComponents?.rune?.name || (swordA.design.runes ? "Runa Gravada" : "Nenhuma")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#1c2638] bg-[#0c121e] p-3.5 text-xs">
              <h5 className="font-display font-bold text-cyan-300 uppercase text-[0.7rem] mb-2">
                Peças & Gravuras de B
              </h5>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guarda:</span>
                  <span>{swordB.installedComponents?.guard?.name || "Original da Forja"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pomo:</span>
                  <span>{swordB.installedComponents?.pommel?.name || "Original da Forja"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Empunhadura:</span>
                  <span>{swordB.installedComponents?.wrap?.name || "Couro Cru"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Runa Incrustada:</span>
                  <span className="font-bold text-cyan-200">{swordB.installedComponents?.rune?.name || (swordB.design.runes ? "Runa Gravada" : "Nenhuma")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-[#1f2b40] bg-[#0d1422] px-6 py-3">
          <Button onClick={onClose} className="bg-amber-600 font-bold text-stone-950 hover:bg-amber-500">
            Concluir Comparação
          </Button>
        </div>
      </div>
    </div>
  );
}

