export type ForgeRank = "S" | "A" | "B" | "C" | "F";
export type RuneSchool = "ember" | "frost" | "gold" | "ancestral";
export interface RewardDrop {
  id: string;
  name: string;
  category: "rune" | "material" | "grip" | "guard";
  tier: number;
  amount: number;
  unlocks: string[];
  description: string;
}
export interface Collection {
  claimed: string[];
  items: Record<string, number>;
  unlocked: string[];
  scrap: number;
}
export interface StrikeRecord {
  accuracy: number;
  heat: number;
  thermal: number;
  kind: StrikeKind;
}
export type Rarity = "quebrada" | "comum" | "incomum" | "rara" | "epica" | "lendaria";
export type Boon = "nenhum" | "runas" | "elfico" | "runas-elfico";

export interface SwordStats {
  atk: number;
  def: number;
  agi: number;
}

export type Screen = "title" | "design" | "forge" | "rewards" | "reveal" | "gallery";

export type ForgePhase = "heat" | "forge" | "quench";

export type ProfileId = "short" | "long" | "claymore" | "falchion" | "saber";
export type SteelId = "iron" | "steel" | "damascus" | "meteor";
export type WrapId = "leather" | "linen" | "goldwire" | "bone" | "wood" | "metal";
export type GuardId = "cross" | "curved" | "wings" | "ring";
export type PommelId = "disc" | "sphere" | "wolf" | "cross";

export type StrikeKind = "weak" | "good" | "perfect" | "hard";

export interface SwordDesign {
  name: string;
  profile: ProfileId;
  steel: SteelId;
  wrap: WrapId;
  guard: GuardId;
  pommel: PommelId;
  inscription: string;
  runes: boolean;
  runeSchool?: RuneSchool;
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
  rank?: ForgeRank;
  performance?: number;
  drops?: RewardDrop[];
  history?: StrikeRecord[];
  reheats?: number;
  rarity: Rarity;
  title: string;
  stats: SwordStats;
  boon: Boon;
  broken: boolean;
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
  integrity: number;
  missStreak: number;
  perfects: number;
  broken: boolean;
  along: number;
  history: StrikeRecord[];
  reheats: number;
  runePulse: number;
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
  missStreak: number;
  broken: boolean;
}
