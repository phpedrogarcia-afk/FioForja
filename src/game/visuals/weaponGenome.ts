// FioForja — WEAPON VISUAL DNA
//
// Single source of truth for the physical identity of a weapon. Every visual
// decision the renderer makes is derived here, deterministically, from data the
// game already persists (FinishedSword / SwordDesign / PhysicalBladeProfile).
//
// Rules obeyed by this module:
//   1. No Math.random(), no Date.now(), no canvas access. Pure data.
//   2. The same persisted weapon always produces the same genome.
//   3. Attributes are interpreted, never recomputed. ATK/DEF/AGI/DUR come in
//      from the simulation and are only mapped to morphology.
//   4. Quality leaves a physical mark: symmetry, taper, edge waver, defect
//      counts, polish, inscription execution.
//   5. Components own their own sub-seed, so swapping a guard never mutates the
//      blade. This is the "isolated component mutation" invariant.

import { FAMILIES, POMMELS, PROFILES, STEELS, WRAPS, GUARDS, renderInscription } from "../catalog.ts";
import type {
  CombatRole,
  FamilyId,
  FinishedSword,
  GuardId,
  PhysicalBladeProfile,
  PommelId,
  ProfileId,
  RarityGrade,
  SteelId,
  SwordDesign,
  WrapId,
} from "../types.ts";
import { clamp, clamp01, hashString, lerp, makeGenomeRng, roundTo } from "./math.ts";

export type WeaponVisualSource = { design: SwordDesign } & Partial<Omit<FinishedSword, "design">>;

export type VisualTier = "crude" | "regular" | "good" | "excellent" | "masterwork" | "relic";
export type EdgeProfileId = "straight" | "belly" | "recurve" | "waisted" | "leaf" | "cleaver" | "arched";
export type SpineProfileId = "straight" | "arch" | "sori" | "clipped" | "stepped" | "tapered";
export type TipProfileId = "needle" | "spear" | "clip" | "chisel" | "diamond" | "leaf";
export type SectionId = "flat" | "diamond" | "lenticular" | "hexagonal" | "fullered" | "channelled";
export type FullerStyle = "none" | "single" | "double" | "bo-hi" | "ridge" | "channels";
export type FinishId = "rough" | "forged" | "satin" | "polished" | "mirror";
export type PatternId =
  | "none"
  | "damascus-waves"
  | "damascus-ripple"
  | "meteor-stars"
  | "meteor-veins"
  | "blacksteel-bands"
  | "ancient-veining"
  | "elven-sheen"
  | "royal-grain";
export type PlatingId = "steel" | "iron" | "bronze" | "gold" | "silver" | "dark-iron" | "ivory";

// ---------------------------------------------------------------------------
// Genome schema
// ---------------------------------------------------------------------------

export interface SilhouetteGenome {
  /** Blade length in unit space (1 unit ~= one blade length). */
  bladeLengthUnits: number;
  /** Half width at the ricasso / base. */
  baseHalfWidth: number;
  /** Half width around the middle of the blade. */
  midHalfWidth: number;
  /** Half width where the tip section starts. */
  tipHalfWidth: number;
  /** 0 (uniform bar) .. 1 (wedge / needle). */
  distalTaper: number;
  /** Centre-line deflection in unit space; positive bends toward -Y (spine side). */
  curvature: number;
  curveExponent: number;
  curveStart: number;
  /** -1..1 asymmetric single-edge bias (positive: edge side fuller / thinner). */
  asymmetry: number;
  edgeProfile: EdgeProfileId;
  spineProfile: SpineProfileId;
  tipProfile: TipProfileId;
  /** Fraction of the blade consumed by the tip section. */
  tipLengthRatio: number;
  ricassoRatio: number;
  ricassoHalfWidth: number;
  /** Deterministic sub-pixel wobble amplitude of the centre line. */
  wobbleAmp: number;
  wobblePhase: number;
}

export interface StructureGenome {
  section: SectionId;
  /** 0..1 relief thickness of the spine. */
  spineHeight: number;
  ridge: { enabled: boolean; prominence: number };
  fuller: {
    enabled: boolean;
    style: FullerStyle;
    start: number;
    end: number;
    /** Half width of the groove as a fraction of local blade half width. */
    halfWidth: number;
    /** Lateral offset as a fraction of local half width (+ = toward edge). */
    offset: number;
    depth: number;
    double: boolean;
  };
  bevels: { enabled: boolean; count: number; width: number; prominence: number };
  relief: { shoulder: number; transition: "soft" | "sharp" | "stepped" };
  /** 0..1 how much the blade root is reinforced. */
  rootReinforcement: number;
}

export interface MountGenome {
  guard: {
    archetype: GuardId;
    /** Half span across the blade in unit space. */
    span: number;
    thickness: number;
    quillonCurve: number;
    plating: PlatingId;
    ornament: number;
    langets: boolean;
  };
  grip: {
    lengthUnits: number;
    halfWidth: number;
    wrapId: WrapId;
    color: string;
    ribCount: number;
    ribSlant: number;
    ferruleCount: number;
    taper: number;
  };
  pommel: { archetype: PommelId; radius: number; plating: PlatingId; gem: boolean };
  ornaments: { density: number; wire: boolean; inlay: "gold" | "silver" | "none"; filigree: number };
}

export interface SurfaceGenome {
  alloy: SteelId;
  palette: {
    hue: number;
    sat: number;
    light: number;
    edgeLight: number;
    shadowLight: number;
    highlightTint: string;
    warm: number;
  };
  finish: FinishId;
  polish: number;
  oxidation: number;
  pattern: PatternId;
  patternDensity: number;
  patternPhase: number;
  patternContrast: number;
  hammerMarks: number;
  luster: number;
  grainPhase: number;
}

export interface InscriptionGenome {
  /** Text as it must be rendered (futhark transliteration when runic). */
  text: string;
  /** Original latin text from the design. */
  raw: string;
  hasRunes: boolean;
  symbol: string | null;
  script: "rune" | "latin" | "none";
  /** Position along the blade, 0..1. */
  positionT: number;
  depth: number;
  grooveWidth: number;
  fill: { kind: "silver" | "gold" | "oxide" | "amber" | "empty"; color: string };
  /** 0..0.4. Rarity never means "more glow". */
  emission: number;
  composition: "single" | "triad" | "band" | "straight";
  orientation: "along" | "across";
}

export interface QualityGenome {
  score: number;
  grade: string;
  tier: VisualTier;
  symmetry: number;
  polish: number;
  warp: number;
  warpSign: number;
  warpPhase: number;
  cracks: number;
  structuralState: string;
  defects: {
    hammerMarks: number;
    edgeChips: number;
    scaleStains: number;
    misalignment: number;
    surfacePits: number;
    scratches: number;
  };
  edgeWaver: number;
  /** Tip misalignment in unit space. */
  alignmentOffset: number;
}

export interface ProvenanceGenome {
  damage: number;
  defense: number;
  agility: number;
  durability: number;
  role: CombatRole;
  rarity: RarityGrade;
  affixes: string[];
  perks: string[];
  flaws: string[];
  refinements: number;
  componentRarity: number;
  integrity: number;
}

export interface IndividualityGenome {
  seed: number;
  subSeeds: {
    blade: number;
    surface: number;
    guard: number;
    grip: number;
    pommel: number;
    inscription: number;
    mark: number;
  };
  signature: string;
  quirks: string[];
  makerMark: { style: "punch" | "gouge" | "rosette" | "stamp"; x: number; y: number; size: number; rotation: number };
  /** 0..1 deterministic craftsmanship of this specific forging. */
  craftsmanship: number;
}

export interface IdentityGenome {
  name: string;
  family: FamilyId;
  familyName: string;
  profile: ProfileId;
  steel: SteelId;
  guard: GuardId;
  grip: WrapId;
  pommel: PommelId;
  rarity: RarityGrade;
  grade: string;
  role: CombatRole;
  runes: boolean;
}

export interface WeaponVisualGenome {
  version: 1;
  seed: number;
  identity: IdentityGenome;
  quality: QualityGenome;
  silhouette: SilhouetteGenome;
  structure: StructureGenome;
  mount: MountGenome;
  surface: SurfaceGenome;
  inscriptions: InscriptionGenome;
  individuality: IndividualityGenome;
  provenance: ProvenanceGenome;
}

// ---------------------------------------------------------------------------
// Family visual grammar — the nine canonical silhouettes
// ---------------------------------------------------------------------------

interface FamilyGrammar {
  label: string;
  /** Multiplier over PROFILES[profile].width. */
  widthBias: number;
  /** Added to the distal taper derived from the forge data. */
  taperBias: number;
  /** Multiplier applied to PROFILES[profile].curve. */
  curveBias: number;
  curveExponent: number;
  curveStart: number;
  edgeProfile: EdgeProfileId;
  spineProfile: SpineProfileId;
  tipProfile: TipProfileId;
  tipLengthRatio: number;
  ricassoRatio: number;
  section: SectionId;
  fuller: FullerStyle;
  fullerWidth: number;
  fullerDepth: number;
  bevelProminence: number;
  finish: FinishId;
  oxidation: number;
  pattern: PatternId;
  ornament: number;
  guardPlating: PlatingId;
  pommelPlating: PlatingId;
  quirkPool: readonly string[];
}

export const FAMILY_GRAMMAR: Record<FamilyId, FamilyGrammar> = {
  iron: {
    label: "ferro honesto, linhas diretas",
    widthBias: 1.1,
    taperBias: -0.06,
    curveBias: 0.25,
    curveExponent: 1,
    curveStart: 0,
    edgeProfile: "straight",
    spineProfile: "straight",
    tipProfile: "spear",
    tipLengthRatio: 0.14,
    ricassoRatio: 0.08,
    section: "flat",
    fuller: "single",
    fullerWidth: 0.3,
    fullerDepth: 0.34,
    bevelProminence: 0.45,
    finish: "forged",
    oxidation: 0.34,
    pattern: "none",
    ornament: 0.14,
    guardPlating: "iron",
    pommelPlating: "iron",
    quirkPool: ["marca de martelo funda no ricasso", "gume corrigido à mão livre", "assimetria de forja assumida"],
  },
  royal: {
    label: "aço disciplinado, simetria de guilda",
    widthBias: 1.0,
    taperBias: 0.02,
    curveBias: 0.2,
    curveExponent: 1,
    curveStart: 0,
    edgeProfile: "straight",
    spineProfile: "tapered",
    tipProfile: "needle",
    tipLengthRatio: 0.16,
    ricassoRatio: 0.09,
    section: "fullered",
    fuller: "single",
    fullerWidth: 0.24,
    fullerDepth: 0.42,
    bevelProminence: 0.68,
    finish: "satin",
    oxidation: 0.08,
    pattern: "royal-grain",
    ornament: 0.3,
    guardPlating: "steel",
    pommelPlating: "steel",
    quirkPool: ["marcas de lima finas alinhadas", "gume acetinado em toda a extensão", "encaixe da guarda esmerado"],
  },
  damascus: {
    label: "dobras visíveis, alma ondulada",
    widthBias: 0.98,
    taperBias: 0.04,
    curveBias: 0.55,
    curveExponent: 1.15,
    curveStart: 0.04,
    edgeProfile: "belly",
    spineProfile: "arch",
    tipProfile: "clip",
    tipLengthRatio: 0.17,
    ricassoRatio: 0.1,
    section: "lenticular",
    fuller: "single",
    fullerWidth: 0.2,
    fullerDepth: 0.3,
    bevelProminence: 0.6,
    finish: "polished",
    oxidation: 0.06,
    pattern: "damascus-waves",
    ornament: 0.34,
    guardPlating: "bronze",
    pommelPlating: "bronze",
    quirkPool: ["padrão de dobra único junto ao ricasso", "onda de Damasco assimétrica na metade final", "nó de solda visível sob o acabamento"],
  },
  oriental: {
    label: "curvatura sori, precisão cirúrgica",
    widthBias: 0.78,
    taperBias: 0.1,
    curveBias: 1.05,
    curveExponent: 1.3,
    curveStart: 0.12,
    edgeProfile: "arched",
    spineProfile: "sori",
    tipProfile: "chisel",
    tipLengthRatio: 0.12,
    ricassoRatio: 0.05,
    section: "diamond",
    fuller: "bo-hi",
    fullerWidth: 0.26,
    fullerDepth: 0.44,
    bevelProminence: 0.75,
    finish: "polished",
    oxidation: 0.09,
    pattern: "blacksteel-bands",
    ornament: 0.28,
    guardPlating: "dark-iron",
    pommelPlating: "dark-iron",
    quirkPool: ["hamon irregular caso a têmpera tenha hesitado", "bo-hi mais longo do que o habitual", "mune com marca de plaina"],
  },
  elven: {
    label: "escultura orgânica, leveza perigosa",
    widthBias: 0.9,
    taperBias: 0.12,
    curveBias: 0.3,
    curveExponent: 1.1,
    curveStart: 0.08,
    edgeProfile: "leaf",
    spineProfile: "arch",
    tipProfile: "leaf",
    tipLengthRatio: 0.22,
    ricassoRatio: 0.06,
    section: "lenticular",
    fuller: "ridge",
    fullerWidth: 0.16,
    fullerDepth: 0.22,
    bevelProminence: 0.82,
    finish: "mirror",
    oxidation: 0.02,
    pattern: "elven-sheen",
    ornament: 0.62,
    guardPlating: "silver",
    pommelPlating: "silver",
    quirkPool: ["veio de prata correndo pela espinha", "transição de seção quase invisível", "filigrana que segue a curva do gume"],
  },
  runic: {
    label: "aço ritual, canais talhados",
    widthBias: 1.06,
    taperBias: -0.02,
    curveBias: 0.15,
    curveExponent: 1,
    curveStart: 0,
    edgeProfile: "straight",
    spineProfile: "straight",
    tipProfile: "diamond",
    tipLengthRatio: 0.15,
    ricassoRatio: 0.12,
    section: "channelled",
    fuller: "channels",
    fullerWidth: 0.32,
    fullerDepth: 0.52,
    bevelProminence: 0.5,
    finish: "forged",
    oxidation: 0.42,
    pattern: "royal-grain",
    ornament: 0.44,
    guardPlating: "dark-iron",
    pommelPlating: "dark-iron",
    quirkPool: ["canal de runa alargado à mão", "marca de cinzel atravessada no canal", "borda da guarda martelada frio"],
  },
  meteor: {
    label: "metal estelar, inclusões minerais",
    widthBias: 1.0,
    taperBias: 0.06,
    curveBias: 0.65,
    curveExponent: 1.2,
    curveStart: 0.05,
    edgeProfile: "belly",
    spineProfile: "arch",
    tipProfile: "clip",
    tipLengthRatio: 0.18,
    ricassoRatio: 0.09,
    section: "hexagonal",
    fuller: "single",
    fullerWidth: 0.18,
    fullerDepth: 0.26,
    bevelProminence: 0.7,
    finish: "polished",
    oxidation: 0.1,
    pattern: "meteor-stars",
    ornament: 0.4,
    guardPlating: "gold",
    pommelPlating: "gold",
    quirkPool: ["inclusão mineral escura na metade da lâmina", "veio de níquel serpenteando a espinha", "microcratera polida no flanco"],
  },
  imperial: {
    label: "simetria absoluta, ouro como detalhe",
    widthBias: 1.02,
    taperBias: 0.03,
    curveBias: 0.12,
    curveExponent: 1,
    curveStart: 0,
    edgeProfile: "straight",
    spineProfile: "tapered",
    tipProfile: "spear",
    tipLengthRatio: 0.16,
    ricassoRatio: 0.1,
    section: "fullered",
    fuller: "double",
    fullerWidth: 0.22,
    fullerDepth: 0.46,
    bevelProminence: 0.85,
    finish: "mirror",
    oxidation: 0.03,
    pattern: "royal-grain",
    ornament: 0.7,
    guardPlating: "gold",
    pommelPlating: "gold",
    quirkPool: ["fio de ouro incrustado no ricasso", "canal duplo com alma dourada", "monograma gravado à mão"],
  },
  relic: {
    label: "geometria ancestral, desgaste histórico",
    widthBias: 1.12,
    taperBias: -0.01,
    curveBias: 0.35,
    curveExponent: 1.4,
    curveStart: 0.02,
    edgeProfile: "waisted",
    spineProfile: "stepped",
    tipProfile: "diamond",
    tipLengthRatio: 0.2,
    ricassoRatio: 0.14,
    section: "hexagonal",
    fuller: "channels",
    fullerWidth: 0.3,
    fullerDepth: 0.5,
    bevelProminence: 0.62,
    finish: "forged",
    oxidation: 0.5,
    pattern: "ancient-veining",
    ornament: 0.56,
    guardPlating: "gold",
    pommelPlating: "bronze",
    quirkPool: ["restauração posterior visível no gume", "entalhe quebrado de uma era esquecida", "seção da base refeita com outra liga"],
  },
};

const PLATING_BY_GUARD: Record<GuardId, PlatingId> = {
  cross: "steel",
  curved: "bronze",
  wings: "gold",
  ring: "steel",
  tsuba: "dark-iron",
  leaf: "silver",
  imperial: "gold",
  runic: "dark-iron",
};

// ---------------------------------------------------------------------------
// Seed and identity
// ---------------------------------------------------------------------------

function effectiveDesign(source: WeaponVisualSource): SwordDesign {
  const design = source.design;
  const components = Object.values(source.installedComponents ?? {});
  const pickComponent = (category: "guard" | "pommel" | "wrap" | "rune"): string | null => {
    for (const comp of components) {
      if (comp && comp.category === category && typeof comp.componentKey === "string") return comp.componentKey;
    }
    return null;
  };
  const guard = pickComponent("guard") as GuardId | null;
  const pommel = pickComponent("pommel") as PommelId | null;
  const wrap = pickComponent("wrap") as WrapId | null;
  return {
    ...design,
    guard: guard && GUARDS[guard] ? guard : design.guard,
    pommel: pommel && POMMELS[pommel] ? pommel : design.pommel,
    wrap: wrap && WRAPS[wrap] ? wrap : design.wrap,
  };
}

/** Stable identity string. Deliberately excludes nothing that is persisted and
 *  visible on the weapon; deliberately excludes volatile fields (pending
 *  rewards, claimed flags) so cosmetics never reshuffle. */
export function visualIdentityKey(source: WeaponVisualSource): string {
  // NOTE: the raw design, not the component-resolved design. Component slots own
  // their own sub-seeds (see deriveWeaponVisualGenome), so replacing a guard
  // component must never regenerate the blade's micro-variation.
  const d = source.design;
  const q = Math.round(clamp(source.quality ?? 70, 0, 100));
  const warp = roundTo(clamp(source.warp ?? 0, 0, 1), 3);
  const cracks = Math.round(clamp(source.cracks ?? 0, 0, 9));
  return [
    source.id ?? "anon",
    d.name || "",
    d.family ?? "unknown",
    d.profile,
    d.steel,
    d.wrap,
    d.guard,
    d.pommel,
    d.inscription || "",
    d.runes ? "R" : "-",
    d.runeSymbol || "",
    roundTo(clamp(d.length ?? 1, 0.4, 1.6), 3),
    q,
    warp,
    cracks,
    source.grade ?? "",
    source.structuralState ?? "",
  ].join("|");
}

export function weaponVisualSeed(source: WeaponVisualSource): number {
  return hashString(visualIdentityKey(source));
}

function subSeed(base: number, purpose: string): number {
  return hashString(base + ":" + purpose) >>> 0;
}

// ---------------------------------------------------------------------------
// Quality and provenance interpretation (never recomputation)
// ---------------------------------------------------------------------------

export function qualityTier(quality: number): VisualTier {
  if (quality >= 95) return "relic";
  if (quality >= 88) return "masterwork";
  if (quality >= 75) return "excellent";
  if (quality >= 60) return "good";
  if (quality >= 40) return "regular";
  return "crude";
}

function tierIndex(tier: VisualTier): number {
  return ["crude", "regular", "good", "excellent", "masterwork", "relic"].indexOf(tier);
}

function gradeName(quality: number): string {
  if (quality >= 95) return "Obra-prima";
  if (quality >= 88) return "Magistral";
  if (quality >= 75) return "Excelente";
  if (quality >= 60) return "Boa";
  if (quality >= 40) return "Regular";
  return "Defeituosa";
}

function resolveRole(source: WeaponVisualSource): CombatRole {
  if (source.combatRole) return source.combatRole;
  const dmg = source.damage ?? source.baseDamage ?? 0;
  const def = source.defense ?? source.baseDefense ?? 0;
  const agi = source.agility ?? source.baseAgility ?? 0;
  if (dmg <= 0 && def <= 0 && agi <= 0) {
    const profile = source.design.profile;
    if (profile === "claymore" || profile === "falchion") return "Ofensiva";
    if (profile === "katana" || profile === "short") return "Ágil";
    if (profile === "long") return "Defensiva";
    return "Equilibrada";
  }
  if (dmg >= def * 1.25 && dmg >= agi * 1.15) return "Ofensiva";
  if (def >= dmg * 1.2) return "Defensiva";
  if (agi >= dmg * 1.15) return "Ágil";
  return "Equilibrada";
}

function forgedProfile(source: WeaponVisualSource): PhysicalBladeProfile | null {
  // The simulation owns this data. When absent (legacy save, gallery preview,
  // design screen) the engine falls back to quality-derived defaults instead of
  // inventing a cross-section.
  return source.physicalProfile ?? null;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

export function deriveWeaponVisualGenome(source: WeaponVisualSource): WeaponVisualGenome {
  const design = effectiveDesign(source);
  const family = (design.family ?? "royal") as FamilyId;
  const grammar = FAMILY_GRAMMAR[family] ?? FAMILY_GRAMMAR.royal;
  const profile = PROFILES[design.profile] ?? PROFILES.long;
  const steel = STEELS[design.steel] ?? STEELS.steel;
  const wrap = WRAPS[design.wrap] ?? WRAPS.leather;
  const qualityScore = clamp(source.quality ?? 70, 0, 100);
  const tier = qualityTier(qualityScore);
  const tierIdx = tierIndex(tier);
  const seed = weaponVisualSeed(source);
  const subSeeds = {
    blade: subSeed(seed, "blade"),
    surface: subSeed(seed, "surface"),
    guard: subSeed(seed, "guard:" + design.guard),
    grip: subSeed(seed, "grip:" + design.wrap),
    pommel: subSeed(seed, "pommel:" + design.pommel),
    inscription: subSeed(seed, "inscription:" + (design.inscription ?? "")),
    mark: subSeed(seed, "maker-mark"),
  };

  const role = resolveRole(source);
  const warped = clamp01(source.warp ?? clamp((100 - qualityScore) * 0.0045, 0, 0.6));
  // Effective warp: the simulation's own record wins. A clean quench is never
  // drawn as a bent blade just to add variety.
  const quenchQuality = source.quenchScore ?? qualityScore;
  const quenchRelief = 1 - clamp01((quenchQuality - 70) / 60) * 0.45;
  const effWarp = clamp01(warped * quenchRelief);
  const symmetry = clamp01(lerp(0.42, 1, qualityScore / 100) * (1 - effWarp * 1.25) * (1 - clamp01((source.cracks ?? 0) * 0.06)));
  const polish = clamp01(qualityScore / 100);
  const phys = forgedProfile(source);

  const provenance = deriveProvenance(source, role, qualityScore);
  const quality = deriveQuality(source, qualityScore, tier, effWarp, symmetry, polish, phys);
  const silhouette = deriveSilhouette(source, design, profile, grammar, quality, qualityScore, subSeeds.blade, seed);
  const structure = deriveStructure(grammar, silhouette, quality, qualityScore, phys, subSeeds.blade);
  const mount = deriveMount(design, profile, grammar, quality, qualityScore, subSeeds);
  const surface = deriveSurface(design, steel, grammar, quality, qualityScore, provenance, subSeeds.surface);
  const inscriptions = deriveInscriptions(design, grammar, quality, qualityScore, source, subSeeds.inscription);
  const individuality = deriveIndividuality(
    design, family, grammar, silhouette, quality, qualityScore, seed, subSeeds, source,
  );

  return {
    version: 1,
    seed,
    identity: {
      name: design.name || "Lâmina sem nome",
      family,
      familyName: FAMILIES[family]?.name ?? "Aço do Reino",
      profile: design.profile,
      steel: design.steel,
      guard: design.guard,
      grip: design.wrap,
      pommel: design.pommel,
      rarity: provenance.rarity,
      grade: quality.grade,
      role,
      runes: Boolean(design.runes || design.runeSymbol),
    },
    quality,
    silhouette,
    structure,
    mount,
    surface,
    inscriptions,
    individuality,
    provenance,
  };
}

function deriveProvenance(source: WeaponVisualSource, role: CombatRole, qualityScore: number): ProvenanceGenome {
  const damage = source.damage ?? source.baseDamage ?? 0;
  const defense = source.defense ?? source.baseDefense ?? 0;
  const agility = source.agility ?? source.baseAgility ?? 0;
  const durability = source.durability ?? source.baseDurability ?? 0;
  const components = Object.values(source.installedComponents ?? {});
  const compRarity = components.length
    ? components.reduce((acc, c) => acc + rarityWeight(c?.rarity), 0) / components.length
    : 0;
  return {
    damage,
    defense,
    agility,
    durability,
    role,
    rarity: source.rarity ?? "Comum",
    affixes: [...(source.affixes ?? [])],
    perks: [...(source.perks ?? [])],
    flaws: [...(source.flaws ?? [])],
    refinements: clamp(source.upgradesApplied ?? 0, 0, 3),
    componentRarity: compRarity,
    integrity: clamp01((source.durability ?? qualityScore) / 100),
  };
}

function rarityWeight(rarity: string | undefined): number {
  switch (rarity) {
    case "Comum": return 0;
    case "Incomum": return 0.25;
    case "Rara": return 0.5;
    case "Épica": return 0.75;
    case "Lendária": return 1;
    case "Relíquia": return 1;
    default: return 0.3;
  }
}

function deriveQuality(
  source: WeaponVisualSource,
  qualityScore: number,
  tier: VisualTier,
  effWarp: number,
  symmetry: number,
  polish: number,
  phys: PhysicalBladeProfile | null,
): QualityGenome {
  const hammerMarksRecorded = clamp(Math.round(phys?.hammerMarksCount ?? 0), 0, 40);
  const crudeness = 1 - polish;
  const defects = {
    hammerMarks: clamp(Math.round(hammerMarksRecorded * 0.5 + crudeness * 26 * (1 - symmetry * 0.6)), 0, 34),
    edgeChips: qualityScore >= 90 ? 0 : Math.round(clamp01((90 - qualityScore) / 90) * 9),
    scaleStains: Math.round(clamp01((70 - qualityScore) / 70) * 7),
    misalignment: roundTo(clamp01((88 - qualityScore) / 88) * 0.012, 4),
    surfacePits: Math.round(clamp01((60 - qualityScore) / 60) * 9),
    scratches: qualityScore >= 92 ? 0 : Math.round(clamp01((95 - qualityScore) / 95) * 6),
  };
  const cracks = clamp(Math.round(source.cracks ?? 0), 0, 9);
  return {
    score: qualityScore,
    grade: source.grade || gradeName(qualityScore),
    tier,
    symmetry,
    polish,
    warp: effWarp,
    warpSign: (source.id ?? "").length % 2 === 0 ? 1 : -1,
    warpPhase: clamp01(qualityScore / 100),
    cracks,
    structuralState: source.structuralState ?? "stable",
    defects,
    edgeWaver: clamp01((1 - symmetry) * 0.9 + effWarp * 0.25) * 0.0075,
    alignmentOffset: roundTo((1 - symmetry) * 0.008, 4) * ((source.id ?? "").length % 2 === 0 ? 1 : -1),
  };
}

function deriveSilhouette(
  source: WeaponVisualSource,
  design: SwordDesign,
  profile: (typeof PROFILES)[keyof typeof PROFILES],
  grammar: FamilyGrammar,
  quality: QualityGenome,
  qualityScore: number,
  bladeSeed: number,
  seed: number,
): SilhouetteGenome {
  const rng = makeGenomeRng(bladeSeed);
  const role = resolveRole(source);

  const designLength = clamp(design.length ?? 1, 0.5, 1.5);
  const bladeLengthUnits = clamp(profile.length * (0.62 + 0.38 * designLength), 0.55, 1.45);

  const roleWidth = role === "Ofensiva" ? 1.07 : role === "Defensiva" ? 1.05 : role === "Ágil" ? 0.93 : 1;
  const roleTaper = role === "Ofensiva" ? 0.06 : role === "Defensiva" ? -0.04 : role === "Ágil" ? 0.09 : 0;

  // Forge data first: the simulation already recorded the physical cross-section.
  const phys = source.physicalProfile;
  const forgedBase = phys ? 0.78 + clamp01(phys.baseWidth) * 0.42 : 0.86 + quality.polish * 0.16;
  const forgedMid = phys ? 0.74 + clamp01(phys.midWidth) * 0.46 : 0.9 + quality.polish * 0.12;
  const forgedTip = phys ? clamp01(phys.tipWidth) : clamp01(0.16 + quality.polish * 0.16);

  const baseHalfWidth = clamp(
    rng.jitter(0.05 * profile.width * grammar.widthBias * forgedBase * roleWidth, 0.06),
    0.026,
    0.076,
  );
  const midHalfWidth = clamp(
    baseHalfWidth * rng.jitter(forgedMid * (1 + roleTaper * 0.4), 0.05),
    baseHalfWidth * 0.72,
    baseHalfWidth * 1.45,
  );
  const tipHalfWidth = clamp(
    baseHalfWidth * lerp(0.1, 0.34, forgedTip) * (grammar.tipProfile === "needle" ? 0.62 : 1),
    0.0035,
    0.019,
  );
  const distalTaper = clamp01(
    (phys ? clamp01(phys.distalTaper) : 0.32 + quality.polish * 0.26) + grammar.taperBias + roleTaper,
  );

  const curvature = clamp(
    profile.curve * grammar.curveBias * 0.3 * rng.jitter(1, 0.16) + quality.warp * 0.12 * quality.warpSign,
    0,
    0.13,
  );
  const asymmetry = clamp(
    (grammar.edgeProfile === "arched" || grammar.edgeProfile === "belly" ? 0.16 : 0) +
      (quality.symmetry < 0.7 ? rng.range(-0.08, 0.08) : rng.range(-0.03, 0.03)),
    -0.35,
    0.35,
  );

  return {
    bladeLengthUnits,
    baseHalfWidth,
    midHalfWidth,
    tipHalfWidth,
    distalTaper,
    curvature,
    curveExponent: grammar.curveExponent * rng.jitter(1, 0.06),
    curveStart: clamp01(grammar.curveStart + rng.range(-0.015, 0.015)),
    asymmetry,
    edgeProfile: grammar.edgeProfile,
    spineProfile: grammar.spineProfile,
    tipProfile: grammar.tipProfile,
    tipLengthRatio: clamp(grammar.tipLengthRatio * rng.jitter(1, 0.12), 0.08, 0.3),
    ricassoRatio: clamp(grammar.ricassoRatio * rng.jitter(1, 0.15), 0.03, 0.2),
    ricassoHalfWidth: clamp(baseHalfWidth * rng.jitter(1.04, 0.05), baseHalfWidth * 0.9, baseHalfWidth * 1.2),
    wobbleAmp: clamp01((1 - quality.symmetry) * 0.55) * 0.0045,
    wobblePhase: (seed % 1000) / 1000,
  };
}

function deriveStructure(
  grammar: FamilyGrammar,
  silhouette: SilhouetteGenome,
  quality: QualityGenome,
  qualityScore: number,
  phys: PhysicalBladeProfile | null,
  bladeSeed: number,
): StructureGenome {
  const rng = makeGenomeRng(hashString(bladeSeed + ":structure"));
  const fullerDepthPhysical = phys ? clamp01(phys.fullerDepth) : clamp01(0.3 + quality.polish * 0.4);
  const fullerEnabled =
    grammar.fuller !== "none" &&
    (grammar.fuller === "ridge" || fullerDepthPhysical > 0.16 || grammar.fuller === "channels");
  const start = clamp01(lerp(0.1, 0.06, quality.polish) + rng.range(-0.012, 0.012));
  const end = clamp01(0.62 + quality.polish * 0.14 + (grammar.fuller === "bo-hi" ? -0.05 : 0) + rng.range(-0.02, 0.02));

  return {
    section: grammar.section,
    spineHeight: clamp01(0.5 + quality.polish * 0.3 + (grammar.section === "diamond" ? 0.12 : 0)),
    ridge: { enabled: grammar.fuller === "ridge" || grammar.section === "diamond", prominence: clamp01(0.3 + grammar.bevelProminence * 0.4) },
    fuller: {
      enabled: fullerEnabled,
      style: grammar.fuller,
      start,
      end,
      halfWidth: clamp(grammar.fullerWidth * rng.jitter(1, 0.12), 0.1, 0.42),
      offset: grammar.fuller === "bo-hi" ? -0.34 : grammar.fuller === "double" ? 0 : rng.jitter(0, 0.25),
      depth: clamp01(fullerDepthPhysical * 0.6 + grammar.fullerDepth * 0.4),
      double: grammar.fuller === "double",
    },
    bevels: {
      enabled: true,
      count: grammar.section === "hexagonal" ? 2 : 1,
      width: clamp(0.2 + grammar.bevelProminence * 0.2, 0.15, 0.42),
      prominence: clamp01(grammar.bevelProminence * (0.7 + quality.polish * 0.3)),
    },
    relief: {
      shoulder: clamp01(0.3 + quality.polish * 0.4),
      transition: qualityScore >= 88 ? "soft" : qualityScore >= 60 ? "sharp" : "stepped",
    },
    rootReinforcement: clamp01(0.2 + (phys ? phys.baseWidth : quality.polish * 0.5) * 0.6),
  };
}

function deriveMount(
  design: SwordDesign,
  profile: (typeof PROFILES)[keyof typeof PROFILES],
  grammar: FamilyGrammar,
  quality: QualityGenome,
  qualityScore: number,
  subSeeds: { guard: number; grip: number; pommel: number },
): MountGenome {
  const guardRng = makeGenomeRng(subSeeds.guard);
  const gripRng = makeGenomeRng(subSeeds.grip);
  const pommelRng = makeGenomeRng(subSeeds.pommel);
  const wrap = WRAPS[design.wrap] ?? WRAPS.leather;

  const guardBaseSpan =
    design.guard === "tsuba" ? 0.115 :
    design.guard === "wings" ? 0.2 :
    design.guard === "leaf" ? 0.185 :
    design.guard === "imperial" ? 0.195 :
    design.guard === "runic" ? 0.21 :
    design.guard === "curved" ? 0.185 :
    design.guard === "ring" ? 0.15 :
    0.175;
  const roleBonus = qualityScore >= 88 ? 1.04 : 1;
  const span = clamp(guardBaseSpan * guardRng.jitter(1, 0.07) * roleBonus, 0.09, 0.26);

  const gripLength = clamp(
    (0.205 + (profile.length - 0.78) * 0.29) * gripRng.jitter(1, 0.06) * (design.profile === "claymore" ? 1.06 : 1),
    0.16,
    0.38,
  );
  const gripHalf = clamp(0.0215 + profile.width * 0.004 + quality.polish * 0.002, 0.019, 0.03);

  const pommelRadius =
    design.pommel === "sphere" ? 0.042 :
    design.pommel === "crown" ? 0.04 :
    design.pommel === "wolf" ? 0.044 :
    design.pommel === "elven" ? 0.036 :
    design.pommel === "knot" ? 0.038 :
    design.pommel === "crescent" ? 0.033 :
    design.pommel === "cross" ? 0.039 :
    0.038;

  const plating = PLATING_BY_GUARD[design.guard] ?? grammar.guardPlating;

  return {
    guard: {
      archetype: design.guard,
      span,
      thickness: clamp(0.012 + quality.polish * 0.008, 0.01, 0.024),
      quillonCurve: clamp01(0.35 + (design.guard === "curved" ? 0.4 : 0) + guardRng.range(-0.12, 0.12)),
      plating,
      ornament: clamp01(grammar.ornament * (0.5 + quality.polish * 0.65) * guardRng.jitter(1, 0.12)),
      langets: design.profile === "claymore" || design.guard === "runic" || guardRng.chance(0.25),
    },
    grip: {
      lengthUnits: gripLength,
      halfWidth: gripHalf,
      wrapId: design.wrap,
      color: wrap.color,
      ribCount: Math.round(clamp(6 + gripLength * 22 + gripRng.range(-2, 2), 5, 18)),
      ribSlant: gripRng.range(-0.35, 0.35),
      ferruleCount: qualityScore >= 75 ? 2 : 1,
      taper: gripRng.range(0.04, 0.14),
    },
    pommel: {
      archetype: design.pommel,
      radius: clamp(pommelRadius * pommelRng.jitter(1, 0.08), 0.028, 0.052),
      plating: PLATING_BY_GUARD[design.guard] === "gold" || design.pommel === "crown" ? "gold" : grammar.pommelPlating,
      gem: design.pommel === "elven" || qualityScore >= 88,
    },
    ornaments: {
      density: clamp01(grammar.ornament * (0.55 + quality.polish * 0.6)),
      wire: design.wrap === "goldwire" || design.guard === "imperial" || qualityScore >= 88,
      inlay: plating === "gold" ? "gold" : qualityScore >= 88 ? "silver" : "none",
      filigree: clamp01(grammar.ornament * quality.polish * 0.9),
    },
  };
}

function deriveSurface(
  design: SwordDesign,
  steel: (typeof STEELS)[keyof typeof STEELS],
  grammar: FamilyGrammar,
  quality: QualityGenome,
  qualityScore: number,
  provenance: ProvenanceGenome,
  surfaceSeed: number,
): SurfaceGenome {
  const rng = makeGenomeRng(surfaceSeed);
  const finishOrder: FinishId[] = ["rough", "forged", "satin", "polished", "mirror"];
  const familyFinish = finishOrder.indexOf(grammar.finish);
  const qualityFinish = qualityScore >= 95 ? 4 : qualityScore >= 88 ? 3 : qualityScore >= 75 ? 2 : qualityScore >= 55 ? 1 : 0;
  // Low quality can never achieve a mirror finish; high quality can always reach
  // at least satin. Capability is the lower of the two for mediocre forges.
  const finishIdx = qualityScore >= 88 ? Math.max(familyFinish, qualityFinish) : Math.min(familyFinish, qualityFinish);
  const finish = finishOrder[clamp(finishIdx, 0, 4)];

  const polishBase = finish === "mirror" ? 0.95 : finish === "polished" ? 0.82 : finish === "satin" ? 0.62 : finish === "forged" ? 0.4 : 0.24;
  const polish = clamp01(polishBase * (0.75 + qualityScore / 400) - quality.defects.surfacePits * 0.012);

  const pattern: PatternId = steel.ancientAura
    ? "ancient-veining"
    : steel.stars ? (rng.chance(0.5) ? "meteor-stars" : "meteor-veins")
    : steel.damascus
    ? qualityScore >= 90 && rng.chance(0.4) ? "damascus-ripple" : "damascus-waves"
    : design.steel === "blacksteel" ? "blacksteel-bands"
    : design.steel === "elven_silver" ? "elven-sheen"
    : grammar.pattern === "royal-grain" ? "royal-grain"
    : "none";

  const lightShift = (qualityScore - 70) * 0.08 + (finish === "mirror" ? 6 : finish === "polished" ? 3 : 0);
  const light = clamp(steel.light + lightShift, 12, 78);

  return {
    alloy: design.steel,
    palette: {
      hue: steel.hue + rng.range(-3, 3),
      sat: clamp(steel.sat + rng.range(-1.5, 1.5), 2, 24),
      light,
      edgeLight: clamp(light + 16 + quality.polish * 12, 20, 92),
      shadowLight: clamp(light - 14 - (1 - quality.polish) * 8, 4, 60),
      highlightTint: steel.stars ? "rgba(196,224,255,0.9)" : steel.damascus ? "rgba(226,238,255,0.85)" : "rgba(255,255,255,0.8)",
      warm: clamp01((qualityScore - 40) / 120 + rng.range(-0.02, 0.02)),
    },
    finish,
    polish,
    oxidation: clamp01(grammar.oxidation * (1.35 - quality.polish) + quality.warp * 0.1 + provenance.flaws.length * 0.03),
    pattern,
    patternDensity: clamp(6 + quality.polish * 12 + rng.range(-2, 2), 4, 22),
    patternPhase: rng.range(0, Math.PI * 2),
    patternContrast: clamp(0.34 + quality.polish * 0.36 + rng.range(-0.05, 0.08), 0.22, 0.8),
    hammerMarks: quality.defects.hammerMarks,
    luster: clamp01(0.2 + quality.polish * 0.72 + (provenance.refinements > 0 ? 0.04 : 0)),
    grainPhase: rng.range(0, 1000),
  };
}

function deriveInscriptions(
  design: SwordDesign,
  grammar: FamilyGrammar,
  quality: QualityGenome,
  qualityScore: number,
  source: WeaponVisualSource,
  inscriptionSeed: number,
): InscriptionGenome {
  const rng = makeGenomeRng(inscriptionSeed);
  const raw = (design.inscription || "").trim();
  const symbol = design.runeSymbol ?? null;
  const hasRunes = Boolean(design.runes || symbol);
  const fallbackText = hasRunes ? "ᚠ · ᚨ · ᛊ" : "AETHELGARD";
  const latinText = (raw || fallbackText).slice(0, 24);
  const rendered = symbol ?? renderInscription(latinText, hasRunes);
  const script: InscriptionGenome["script"] = symbol ? "rune" : hasRunes ? "rune" : latinText === fallbackText ? "none" : "latin";

  const rarity = source.rarity ?? "Comum";
  const composition: InscriptionGenome["composition"] =
    rarity === "Relíquia" ? "straight" : rarity === "Lendária" ? "band" : hasRunes && qualityScore >= 88 ? "triad" : "single";

  const emission =
    hasRunes && qualityScore >= 88 ? clamp(0.14 + (qualityScore - 88) * 0.005 + rng.range(0, 0.05), 0.1, 0.34)
    : hasRunes && qualityScore >= 75 ? 0.06
    : 0;

  const fill: InscriptionGenome["fill"] =
    symbol || hasRunes
      ? qualityScore >= 92 ? { kind: "gold", color: "rgba(232,206,140,0.95)" }
      : qualityScore >= 82 ? { kind: "silver", color: "rgba(208,222,236,0.92)" }
      : qualityScore >= 62 ? { kind: "oxide", color: "rgba(52,44,38,0.9)" }
      : { kind: "empty", color: "rgba(26,20,16,0.85)" }
      : qualityScore >= 85 ? { kind: "silver", color: "rgba(196,204,214,0.85)" }
      : { kind: "oxide", color: "rgba(40,34,28,0.85)" };

  return {
    text: rendered,
    raw: latinText,
    hasRunes,
    symbol,
    script,
    positionT: clamp(0.3 + rng.range(-0.04, 0.05) + (grammar.fuller === "channels" ? 0.02 : 0), 0.18, 0.52),
    depth: clamp01(0.28 + quality.polish * 0.55 + rng.range(-0.06, 0.06)),
    grooveWidth: clamp(0.012 + quality.polish * 0.012, 0.008, 0.03),
    fill,
    emission,
    composition,
    orientation: composition === "straight" ? "across" : "along",
  };
}

function deriveIndividuality(
  design: SwordDesign,
  family: FamilyId,
  grammar: FamilyGrammar,
  silhouette: SilhouetteGenome,
  quality: QualityGenome,
  qualityScore: number,
  seed: number,
  subSeeds: IndividualityGenome["subSeeds"],
  source: WeaponVisualSource,
): IndividualityGenome {
  const rng = makeGenomeRng(subSeeds.mark);
  const quirks: string[] = [];
  const quirkCount = qualityScore >= 88 ? 2 + (rng.chance(0.4) ? 1 : 0) : qualityScore >= 55 ? 2 : 1;
  const pool = [...grammar.quirkPool];
  for (let i = 0; i < quirkCount && pool.length > 0; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    quirks.push(pool.splice(idx, 1)[0]);
  }
  if (quality.warp > 0.18) quirks.push("empenamento registrado na têmpera");
  if ((source.cracks ?? 0) > 0) quirks.push("fissura de fadiga sob a guarda");

  const craftsmanship = clamp01(0.55 + qualityScore / 220 + rng.range(-0.06, 0.06));
  const signatureParts = [
    design.name || "Lâmina sem nome",
    "curv " + silhouette.curvature.toFixed(3),
    "taper " + silhouette.distalTaper.toFixed(2),
    guardLabel(design.guard),
    wrapLabel(design.wrap),
    "DNA " + (seed >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 6),
  ];

  return {
    seed,
    subSeeds,
    signature: signatureParts.join(" · "),
    quirks,
    makerMark: {
      style: qualityScore >= 88 ? "rosette" : qualityScore >= 60 ? "stamp" : rng.chance(0.5) ? "punch" : "gouge",
      x: clamp(0.052 + rng.range(0, 0.03), 0.04, 0.1),
      y: rng.range(-0.35, 0.35),
      size: clamp(0.008 + qualityScore / 100 * 0.006, 0.007, 0.016),
      rotation: rng.range(-0.5, 0.5),
    },
    craftsmanship,
  };
}

function guardLabel(id: GuardId): string {
  switch (id) {
    case "cross": return "cruz";
    case "curved": return "quilhão curvo";
    case "wings": return "asas";
    case "ring": return "anel";
    case "tsuba": return "tsuba";
    case "leaf": return "folha";
    case "imperial": return "águia imperial";
    case "runic": return "monólito rúnico";
    default: return id;
  }
}

function wrapLabel(id: WrapId): string {
  switch (id) {
    case "leather": return "couro";
    case "braided": return "trançado";
    case "linen": return "linho";
    case "darkwood": return "madeira escura";
    case "bone": return "osso";
    case "goldwire": return "fio de ouro";
    case "tsukamaki": return "tsukamaki";
    case "elven_wood": return "madeira élfica";
    case "dragon_leather": return "couro de dragão";
    default: return id;
  }
}
