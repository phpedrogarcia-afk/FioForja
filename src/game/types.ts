export type Screen = "title" | "design" | "forge" | "reveal" | "gallery";

export type ForgePhase = "heat" | "forge" | "quench";

export type ProfileId = "short" | "long" | "claymore" | "falchion" | "saber";
export type SteelId = "iron" | "steel" | "damascus" | "meteor";
export type WrapId = "leather" | "linen" | "goldwire" | "bone";
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
}
