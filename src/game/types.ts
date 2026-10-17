export type Screen = "title" | "design" | "forge" | "reveal" | "rewards" | "gallery";

export type ForgePhase = "heat" | "forge" | "quench";

export type ProfileId =
  | "short"
  | "long"
  | "claymore"
  | "falchion"
  | "saber"
  | "katana"
  | "elven_blade"
  | "relic_blade";

export type SteelId =
  | "iron"
  | "steel"
  | "damascus"
  | "blacksteel"
  | "elven_silver"
  | "meteor"
  | "ancient_alloy";

export type WrapId =
  | "leather"
  | "braided"
  | "linen"
  | "darkwood"
  | "bone"
  | "goldwire"
  | "tsukamaki"
  | "elven_wood";

export type GuardId =
  | "cross"
  | "curved"
  | "wings"
  | "ring"
  | "tsuba"
  | "leaf"
  | "imperial"
  | "runic";

export type PommelId =
  | "disc"
  | "sphere"
  | "wolf"
  | "cross"
  | "crescent"
  | "elven"
  | "crown"
  | "knot";

export type FamilyId =
  | "iron"
  | "royal"
  | "damascus"
  | "oriental"
  | "elven"
  | "runic"
  | "meteor"
  | "imperial"
  | "relic";

export type ForgeZone = "base" | "mid" | "tip";
export type HammerType = "precision" | "standard" | "sledge";

export type StrikeKind = "weak" | "good" | "perfect" | "hard";
export type StructuralState = "stable" | "deformed" | "damaged" | "cracked" | "broken";
export type RarityGrade = "Comum" | "Incomum" | "Rara" | "Épica" | "Lendária" | "Relíquia";

export interface SwordDesign {
  name: string;
  family?: FamilyId;
  profile: ProfileId;
  steel: SteelId;
  wrap: WrapId;
  guard: GuardId;
  pommel: PommelId;
  inscription: string;
  runes: boolean;
  length: number;
}

export interface FinishedSword {
  id: string;
  design: SwordDesign;
  quality: number;
  grade: string;
  heatScore: number;
  forgeScore: number;
  quenchScore: number;
  warp: number;
  createdAt: number;
  // Metallurgical physical attributes (Pillar 5 / User section 5)
  damage?: number; // ATK (potencial de corte e dureza)
  defense?: number; // DEF (integridade, espessura e têmpera)
  agility?: number; // AGI (equilíbrio de massa e alinhamento)
  durability?: number; // 0-100
  rarity?: RarityGrade;
  flaws?: string[];
  perks?: string[];
  structuralState?: StructuralState;
  cracks?: number;
  history?: Array<{ strike: number; kind: StrikeKind; force: number; inHeat: boolean; zone?: ForgeZone }>;
}

export interface SimState {
  phase: ForgePhase;
  heat: number;
  heatScore: number;
  shape: number;
  quality: number;
  warp: number;
  strikes: number;
  maxStrikes: number;
  force: number;
  charging: boolean;
  sweetCenter: number;
  sweetWidth: number;
  quenchFill: number;
  quenching: boolean;
  quenchScore: number;
  reheating: boolean;
  strikeKind: StrikeKind | null;
  strikeAnim: number;
  sparkAnim: number;
  done: boolean;
  lastMessage: string;
  // Risk and failure mechanics (Pillar 2 / Specification 4)
  integrity: number; // 0-100
  cracks: number;
  structuralState: StructuralState;
  broken: boolean;
  brokenReason?: string;
  runicCharge: number;
  // Multi-zone hammering & tools
  targetZone: ForgeZone;
  zoneProgress: Record<ForgeZone, number>;
  activeHammer: HammerType;
  history: Array<{ strike: number; kind: StrikeKind; force: number; inHeat: boolean; zone?: ForgeZone }>;
}

export interface HudSnapshot {
  phase: ForgePhase;
  heat: number;
  shape: number;
  quality: number;
  force: number;
  charging: boolean;
  sweetCenter: number;
  sweetWidth: number;
  strikes: number;
  maxStrikes: number;
  quenchFill: number;
  message: string;
  warp: number;
  integrity: number;
  structuralState: StructuralState;
  cracks: number;
  broken: boolean;
  targetZone?: ForgeZone;
  zoneProgress?: Record<ForgeZone, number>;
  activeHammer?: HammerType;
}

export interface ForgeRewardItem {
  id: string;
  name: string;
  type: string;
  rarity: RarityGrade;
  icon: string;
  description: string;
}

export interface ForgeRewardsData {
  rank: string;
  scorePercent: number;
  gold: number;
  rubies: number;
  diamonds: number;
  items: ForgeRewardItem[];
}
