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
  | "elven_wood"
  | "dragon_leather";

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
export type CombatRole = "Ofensiva" | "Defensiva" | "Ágil" | "Equilibrada" | "Excepcional";

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
  runeSymbol?: string;
  runeKey?: string;
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
  // Intrinsic base physical attributes from the forge (pure metallurgical baseline)
  baseDamage?: number;
  baseDefense?: number;
  baseAgility?: number;
  baseDurability?: number;
  // Combat Role specialization (Ofensiva, Defensiva, Ágil, Equilibrada, Excepcional)
  combatRole?: CombatRole;
  // Composite final attributes (base + quality bonus + components + runes + refinement)
  damage?: number; // ATK (potencial de corte e dureza)
  defense?: number; // DEF (integridade, espessura e têmpera)
  agility?: number; // AGI (equilíbrio de massa e alinhamento)
  durability?: number; // 0-100
  rarity?: RarityGrade;
  value?: number; // gold valuation
  upgradesApplied?: number;
  flaws?: string[];
  perks?: string[];
  affixes?: string[]; // Distinct masterwork / fusion affixes
  fusionHistory?: {
    parentIds: string[];
    coreName: string;
    date: number;
    inheritedPerks: string[];
    coreId?: string;
    inheritedRarity?: RarityGrade;
  };
  forgeRunId?: string;
  pendingRewards?: ForgeRewardsData;
  claimedRewards?: boolean;
  installedComponents?: Record<string, InventoryComponent>;
  structuralState?: StructuralState;
  broken?: boolean;
  cracks?: number;
  physicalProfile?: PhysicalBladeProfile;
  history?: Array<{ strike: number; kind: StrikeKind; force: number; inHeat: boolean; zone?: ForgeZone }>;
  isTraining?: boolean;
  commissionDelivered?: string;
}

export interface PhysicalBladeProfile {
  baseWidth: number;   // 0 (raw billet block) -> 1 (formed ricasso)
  midWidth: number;    // 0 -> 1
  tipWidth: number;    // 0 -> 1
  distalTaper: number; // 0 (uniform bar) -> 1 (tapered wedge/needle)
  fullerDepth: number; // 0 -> 1
  bevelSharpness: number; // 0 -> 1
  hammerMarksCount: number;
}

export interface EquippedWorkshopGear {
  hammer: HammerType;
  anvil: "anvil_cast" | "anvil_master";
  furnace: "furnace_coal" | "furnace_bluefire";
  quench: "quench_water" | "quench_oil";
}

export interface SimState {
  elapsedTime: number;
  phase: ForgePhase;
  heat: number;
  heatScore: number;
  shape: number;
  physicalProfile: PhysicalBladeProfile;
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
  quenchSteam: number;
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
  equippedGear: EquippedWorkshopGear;
  history: Array<{ strike: number; kind: StrikeKind; force: number; inHeat: boolean; zone?: ForgeZone }>;
  strikeReward?: { amount: number; kind: StrikeKind; strikeIndex: number; id: string } | null;
  forgeRunId?: string;
  activeCore?: FusionCore | null;
  isTraining?: boolean;
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
  physicalProfile?: PhysicalBladeProfile;
  quenchSteam?: number;
  strikeReward?: { amount: number; kind: StrikeKind; strikeIndex: number; id: string } | null;
}

export interface ForgeRewardItem {
  id: string;
  catalogKey?: string;
  name: string;
  type: string;
  category?: "material" | "guard" | "pommel" | "wrap" | "rune" | "fusion" | "recipe";
  rarity: RarityGrade;
  icon: string;
  description: string;
  quantity?: number;
  value?: number;
  statsModifier?: {
    damageBonus?: number;
    defenseBonus?: number;
    agilityBonus?: number;
    durabilityBonus?: number;
  };
}

export interface ForgeRewardsData {
  forgeRunId?: string;
  rank: string;
  scorePercent: number;
  gold: number;
  rubies: number;
  diamonds: number;
  items: ForgeRewardItem[];
  claimed?: boolean;
}

export interface CoreHeritageProfile {
  attackBias: number;    // e.g. -10 to +25 based on donor swords' damage tendency
  defenseBias: number;   // e.g. -10 to +20 based on donor swords' defense tendency
  agilityBias: number;   // e.g. -10 to +20 based on donor swords' agility tendency
  durabilityBias: number;// e.g. -5 to +15 based on donor swords' durability tendency
  runicAffinity: number; // 0 to 1
  dominantFamily: FamilyId;
  dominantSteel: SteelId;
  donorProfiles?: Array<{ id: string; damage: number; defense: number; agility: number }>;
}

export interface FusionCore {
  id: string;
  name: string;
  rarity: RarityGrade;
  family: FamilyId;
  profile: ProfileId;
  steel: SteelId;
  bonusQuality: number;
  inheritedPerks: string[];
  consumedSwordIds: string[];
  createdAt: number;
  heritage?: CoreHeritageProfile;
}

export interface InventoryComponent {
  id: string;
  name: string;
  category: "guard" | "pommel" | "wrap" | "rune";
  componentKey: string;
  rarity: RarityGrade;
  icon: string;
  description: string;
  statModifier?: {
    damageBonus?: number;
    defenseBonus?: number;
    agilityBonus?: number;
    durabilityBonus?: number;
  };
  acquiredAt: number;
}

export interface PlayerWallet {
  gold: number;
  rubies: number;
  diamonds: number;
}

export type ForgeAttemptStatus = "PREPARED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FAILED";

export type ForgePhysicalState = Omit<SimState, "strikeAnim" | "sparkAnim" | "strikeKind" | "lastMessage" | "quenchSteam" | "strikeReward">;

export interface ForgeSnapshot {
  version: 1;
  revision: number;
  design: SwordDesign;
  state: ForgePhysicalState;
}

export interface ActiveForgeAttempt {
  attemptId: string;
  forgeRunId: string;
  status: ForgeAttemptStatus;
  design: SwordDesign;
  isTraining: boolean;
  materialConsumed?: { key: string; name: string; quantity: number } | null;
  activeCoreId?: string | null;
  startedAt: number;
  strikesCount: number;
  lastStrikeAt?: number;
  snapshot?: ForgeSnapshot;
}

export interface BlacksmithCommission {
  id: string;
  clientName: string;
  clientTitle: string;
  icon: string;
  description: string;
  family?: FamilyId;
  steel?: SteelId;
  minQuality: number;
  requiredRole?: CombatRole;
  minStat?: { stat: "damage" | "defense" | "agility" | "durability"; minValue: number };
  rewardGold: number;
  rewardMaterial?: { key: string; name: string; quantity: number };
  rewardRubies?: number;
  completed: boolean;
  deliveredSwordId?: string;
}

export interface PlayerInventory {
  unlockedProfiles: ProfileId[];
  unlockedSteels: SteelId[];
  unlockedGuards: GuardId[];
  unlockedPommels: PommelId[];
  unlockedWraps: WrapId[];
  unlockedRunes: string[];
  unlockedTools: string[];
  unlockedBlueprints?: string[];
  masteredBlueprints?: string[];
  materials: Record<string, number>;
  fusionCores: FusionCore[];
  components: InventoryComponent[];
  equipped?: EquippedWorkshopGear;
}

export interface WorkshopTool {
  id: string;
  name: string;
  category: "hammer" | "anvil" | "furnace" | "quench";
  icon: string;
  costGold: number;
  costRubies: number;
  rarity: RarityGrade;
  stats: string;
  description: string;
  unlockedByDefault?: boolean;
}

export interface CareerStats {
  totalForged: number;
  masterpieces: number;
  legendaries: number;
  relics: number;
  brokenBlades: number;
  highestQuality: number;
  totalValueEarned: number;
}

export interface SaveData {
  version: number;
  gallery: FinishedSword[];
  trainingGallery?: FinishedSword[];
  lastDesign: SwordDesign;
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  career: CareerStats;
  muted: boolean;
  shake: boolean;
  claimedForgeRewardIds: string[];
  claimedStrikeRewardIds: string[];
  activeForgeAttempt?: ActiveForgeAttempt | null;
  commissions?: BlacksmithCommission[];
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  code?: "QUOTA_EXCEEDED" | "STORAGE_UNAVAILABLE" | "SERIALIZATION_FAILED" | "UNKNOWN";
}

