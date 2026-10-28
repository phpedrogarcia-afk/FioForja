import type { CanonicalPreset } from "./catalog.ts";
import { CANONICAL_PRESETS } from "./catalog.ts";
import { getMaterialStock, getRequiredMaterialForSteel, type CanonicalMaterialInfo } from "./materials.ts";
import type { CareerStats, FinishedSword, FusionCore, PlayerInventory } from "./types.ts";

export type BlueprintState = "locked" | "known" | "discovered" | "ready" | "crafted" | "mastered";

export interface BlueprintStatus {
  preset: CanonicalPreset;
  state: BlueprintState;
  unlocked: boolean;
  canCraft: boolean;
  hasMaterial: boolean;
  materialStock: number;
  requiredMaterial: CanonicalMaterialInfo;
  requirementText: string;
  isMastered: boolean;
  isCrafted: boolean;
}

export function evaluateBlueprintStatus(
  preset: CanonicalPreset,
  inventory: PlayerInventory,
  career: CareerStats,
  gallery: FinishedSword[],
  activeCore?: FusionCore | null,
): BlueprintStatus {
  const reqMat = getRequiredMaterialForSteel(preset.design.steel);
  const stock = getMaterialStock(inventory?.materials, reqMat.key);
  const hasMaterial = stock >= 1;

  // Check if crafted or mastered in gallery
  const matches = (gallery || []).filter((s) => {
    // O ID explícito sobrevive à customização; saves antigos seguem a regra histórica.
    const selectedId = s.design.id;
    if (selectedId && CANONICAL_PRESETS.some((p) => p.id === selectedId)) return selectedId === preset.id;
    return s.design.name === preset.name || (s.design.family === preset.family && s.design.profile === preset.design.profile);
  });
  const isCrafted = matches.length > 0;
  const isMastered =
    inventory?.masteredBlueprints?.includes(preset.id) ||
    matches.some((s) => s.quality >= 95);

  // Check unlock conditions
  let unlocked = false;
  let requirementText = "";

  if (preset.id === "guarda_medieval") {
    unlocked = true;
    requirementText = "Projeto inicial de oficina — sempre disponível.";
  } else if (inventory?.unlockedBlueprints?.includes(preset.id)) {
    unlocked = true;
    requirementText = "Projeto desbloqueado por receita / descoberta.";
  } else if (activeCore && (activeCore.family === preset.family || activeCore.profile === preset.design.profile || activeCore.steel === preset.design.steel)) {
    unlocked = true;
    requirementText = `Autorizado pelo Núcleo de Fusão (${activeCore.name}).`;
  } else {
    // Career milestone checks
    switch (preset.id) {
      case "cimitarra_damasco":
        unlocked = (career?.totalForged ?? 0) >= 3;
        requirementText = "Requer: Concluir 3 forjas na oficina (ou receita no Bazar).";
        break;
      case "lua_silenciosa":
        unlocked = (career?.masterpieces ?? 0) >= 1 || (career?.totalForged ?? 0) >= 5;
        requirementText = "Requer: Forjar 1 Obra-prima (Rank S) ou 5 armas.";
        break;
      case "folha_aereth":
        unlocked = (career?.totalForged ?? 0) >= 7;
        requirementText = "Requer: Concluir 7 forjas na oficina (ou segredo élfico no Bazar).";
        break;
      case "queda_asterion":
        unlocked = (career?.masterpieces ?? 0) >= 2 || (career?.legendaries ?? 0) >= 1;
        requirementText = "Requer: 2 Obras-primas (Rank S) ou 1 Lendária forjada + posse de metal meteórico.";
        break;
      case "juramento_ferro":
        unlocked = (career?.totalForged ?? 0) >= 4;
        requirementText = "Requer: Concluir 4 forjas na oficina.";
        break;
      case "sol_imperial":
        unlocked = (career?.totalValueEarned ?? 0) >= 2500;
        requirementText = "Requer: Acumular 2.500 moedas de ouro em valor de armas forjadas.";
        break;
      case "cinzas_ancestrais":
        unlocked = (career?.legendaries ?? 0) >= 1;
        requirementText = "Requer: Alcançar maestria lendária (1+ Lendária) e posse de Liga Primordial.";
        break;
      default:
        unlocked = false;
        requirementText = "Requer descoberta especial ou aquisição no Bazar.";
        break;
    }
  }

  // Derive explicit BlueprintState
  let state: BlueprintState = "locked";
  if (!unlocked) {
    state = "locked";
  } else if (isMastered) {
    state = "mastered";
  } else if (isCrafted) {
    state = "crafted";
  } else if (hasMaterial) {
    state = "ready";
  } else {
    state = "discovered";
  }

  const canCraft = unlocked && hasMaterial;

  return {
    preset,
    state,
    unlocked,
    canCraft,
    hasMaterial,
    materialStock: stock,
    requiredMaterial: reqMat,
    requirementText,
    isMastered,
    isCrafted,
  };
}

export function getAllBlueprintStatuses(
  inventory: PlayerInventory,
  career: CareerStats,
  gallery: FinishedSword[],
  activeCore?: FusionCore | null,
): BlueprintStatus[] {
  return CANONICAL_PRESETS.map((p) => evaluateBlueprintStatus(p, inventory, career, gallery, activeCore));
}
